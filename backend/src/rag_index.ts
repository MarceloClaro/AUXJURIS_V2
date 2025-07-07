import fs from 'fs';
import path from 'path';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { QdrantVectorStore } from '@langchain/community/vectorstores/qdrant'; 
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { QdrantClient } from '@qdrant/js-client-rest';
import pdfParse from 'pdf-parse';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });

const BOOKS_DIR = path.join(__dirname, '../../public/books');
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_COLLECTION = 'auxjuris_rag';
const GEMINI_API_KEY = process.env.GOOGLE_API_KEY; // Ler do .env

async function getAllTextAndPdfFiles(dir: string): Promise<string[]> {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(await getAllTextAndPdfFiles(filePath));
    } else if (file.endsWith('.txt') || file.endsWith('.pdf')) {
      results.push(filePath);
    }
  }
  return results;
}

async function extractText(filePath: string): Promise<string> {
  if (filePath.endsWith('.txt')) {
    return fs.readFileSync(filePath, 'utf8');
  } else if (filePath.endsWith('.pdf')) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (err) {
      console.warn(`[AVISO] Não foi possível ler o PDF '${filePath}': ${err instanceof Error ? err.message : String(err)}`);
      return ''; // Retorna string vazia para continuar o processo
    }
  }
  return '';
}

async function main() {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY (ou GOOGLE_API_KEY) não definida no .env');
  const files = await getAllTextAndPdfFiles(BOOKS_DIR);
  // Reduzir o tamanho dos chunks para evitar estouro de payload no Qdrant
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 100 });
  const docs: { pageContent: string, metadata: any }[] = [];

  for (const file of files) {
    const text = await extractText(file);
    const chunks = await splitter.createDocuments([text]);
    for (const chunk of chunks) {
      docs.push({
        pageContent: chunk.pageContent,
        metadata: {
          source: file.replace(BOOKS_DIR, ''),
          fileName: path.basename(file),
          filePath: file,
        }
      });
    }
  }

  // Conectar ao Qdrant
  const client = new QdrantClient({ url: QDRANT_URL });
  // Criar coleção se não existir
  try {
    await client.getCollection(QDRANT_COLLECTION);
  } catch {
    await client.createCollection(QDRANT_COLLECTION, { vectors: { size: 768, distance: 'Cosine' } });
  }

  // Embeddings Google Generative AI
  const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey: GEMINI_API_KEY });
  console.log(`[DEBUG rag_index] Inicializando embeddings com API Key: ${GEMINI_API_KEY ? 'Definida' : 'Não definida'}`);

  // Indexar no Qdrant
  console.log(`[DEBUG rag_index] Preparando para gerar embeddings para ${docs.length} documentos.`);
  const contentsToEmbed = docs.map(doc => doc.pageContent);
  
  // Logar os primeiros 5 conteúdos para depuração
  contentsToEmbed.slice(0, 5).forEach((content, index) => {
    console.log(`[DEBUG rag_index] Conteúdo para embedding (chunk ${index + 1}, tamanho ${content.length}): ${content.substring(0, 100)}...`);
  });

  let vectors: number[][];
  try {
    vectors = await embeddings.embedDocuments(contentsToEmbed);
    console.log(`[DEBUG rag_index] Embeddings gerados. Total de vetores: ${vectors.length}. Dimensão do primeiro vetor: ${vectors[0]?.length || 'N/A'}`);
  } catch (embedError) {
    console.error(`[ERRO rag_index] Falha ao gerar embeddings: ${embedError instanceof Error ? embedError.message : String(embedError)}`);
    throw new Error(`Falha ao gerar embeddings. Verifique a GOOGLE_API_KEY e a conectividade com a API do Google.`);
  }

  const points = vectors.map((vector: number[], idx: number) => {
    if (!vector || vector.length === 0) {
      console.warn(`[AVISO rag_index] Vetor vazio ou inválido encontrado para o documento ${docs[idx].metadata.fileName} (chunk ${idx}).`);
      // Opcional: filtrar pontos com vetores vazios ou lançar erro
      return null; // Retorna null para filtrar depois
    }
    return {
      id: Date.now() + Math.floor(Math.random() * 100000) + idx,
      vector,
      payload: {
        source: path.relative(BOOKS_DIR, docs[idx].metadata.filePath),
        pageContent: docs[idx].pageContent,
        chunk: docs[idx].pageContent,
      },
    } as any; // Adiciona asserção de tipo para satisfazer o TypeScript
  }).filter(Boolean); // Filtra os nulos
  
  if (points.length === 0) {
    console.error('[ERRO rag_index] Nenhum ponto válido para indexar após a geração de embeddings.');
    throw new Error('Nenhum ponto válido para indexar. Verifique a geração de embeddings.');
  }

  console.log(`[DEBUG rag_index] Total de pontos a serem indexados: ${points.length}`);
  // Dividir os pontos em lotes menores para evitar o erro de payload muito grande
  const BATCH_SIZE = 1000; // Ajuste conforme a memória e o limite do Qdrant
  for (let i = 0; i < points.length; i += BATCH_SIZE) {
    const batch = points.slice(i, i + BATCH_SIZE);
    console.log(`[DEBUG rag_index] Indexando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(points.length / BATCH_SIZE)} com ${batch.length} pontos...`);
    await client.upsert(QDRANT_COLLECTION, {
      wait: true,
      points: batch,
    });
  }

  console.log(`Indexação RAG concluída: ${docs.length} chunks indexados em ${QDRANT_COLLECTION}`);
}

main().catch(console.error); 