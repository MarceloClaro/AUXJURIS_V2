import fs from 'fs';
import path from 'path';
import glob from 'glob';
import { QdrantClient } from '@qdrant/js-client-rest';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

const GEMINI_API_KEY = "AIzaSyDKZim-kg3vMXkPqQt3gNDHNqhWF7dnE9M";
const COLLECTION_NAME = 'auxjuris_rag';
const BOOKS_DIR = path.resolve(__dirname, '../public/books');

async function getAllTextFiles(dir: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    glob(`${dir}/**/*.txt`, (err, files) => {
      if (err) reject(err);
      else resolve(files);
    });
  });
}

async function readTextFile(filePath: string): Promise<string> {
  return fs.promises.readFile(filePath, 'utf-8');
}

async function main() {
  const qdrant = new QdrantClient({ url: 'http://localhost:6333' });
  const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey: GEMINI_API_KEY });
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });

  // 1. Listar todos os arquivos .txt
  const files = await getAllTextFiles(BOOKS_DIR);
  if (files.length === 0) {
    console.log('Nenhum arquivo .txt encontrado para indexar.');
    return;
  }
  console.log(`Encontrados ${files.length} arquivos para indexar.`);

  // 2. Criar coleção se não existir
  const collections = await qdrant.getCollections();
  if (!collections.collections.some((c: any) => c.name === COLLECTION_NAME)) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: { size: 768, distance: 'Cosine', on_disk: true }, // Gemini embedding size
    });
    console.log(`Coleção '${COLLECTION_NAME}' criada.`);
  } else {
    console.log(`Coleção '${COLLECTION_NAME}' já existe.`);
  }

  let totalChunks = 0;
  // 3. Para cada arquivo, dividir em chunks, gerar embeddings e indexar
  for (const file of files) {
    const text = await readTextFile(file);
    const chunks = await splitter.splitText(text);
    totalChunks += chunks.length;
    console.log(`Arquivo: ${path.basename(file)} - ${chunks.length} chunks`);
    const vectors = await embeddings.embedDocuments(chunks);
    // Indexar no Qdrant
    const points = vectors.map((vector: number[], idx: number) => ({
      id: Date.now() + Math.floor(Math.random() * 100000) + idx,
      vector,
      payload: {
        source: path.relative(BOOKS_DIR, file),
        chunk: chunks[idx],
        pageContent: chunks[idx],
      },
    }));
    await qdrant.upsert(COLLECTION_NAME, {
      wait: true,
      points,
    });
  }
  console.log(`Indexação concluída. Total de chunks: ${totalChunks}`);
}

main().catch((err) => {
  console.error('Erro ao indexar:', err);
  process.exit(1);
}); 