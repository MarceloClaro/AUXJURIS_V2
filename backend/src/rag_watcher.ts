import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { QdrantClient } from '@qdrant/js-client-rest';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import pdfParse from 'pdf-parse';

const GEMINI_API_KEY = "AIzaSyDKZim-kg3vMXkPqQt3gNDHNqhWF7dnE9M";
const QDRANT_URL = 'http://localhost:6333';
const QDRANT_COLLECTION = 'auxjuris_rag';
const BOOKS_DIR = path.join(__dirname, '../../public/books');

async function extractText(filePath: string): Promise<string> {
  if (filePath.endsWith('.txt')) {
    return fs.readFileSync(filePath, 'utf8');
  } else if (filePath.endsWith('.pdf')) {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (err) {
      console.warn(`Aviso: não foi possível ler o PDF '${filePath}': ${err instanceof Error ? err.message : err}`);
      return '';
    }
  }
  return '';
}

async function indexFile(file: string) {
  const client = new QdrantClient({ url: QDRANT_URL });
  // Garante que a coleção existe
  try {
    await client.getCollection(QDRANT_COLLECTION);
  } catch {
    await client.createCollection(QDRANT_COLLECTION, { vectors: { size: 768, distance: 'Cosine' } });
  }
  const text = await extractText(file);
  if (!text.trim()) {
    console.log(`Arquivo ignorado (vazio ou inválido): ${file}`);
    return;
  }
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const chunks = await splitter.splitText(text);
  const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey: GEMINI_API_KEY });
  const vectors = await embeddings.embedDocuments(chunks);
  const points = vectors.map((vector: number[], idx: number) => ({
    id: Date.now() + Math.floor(Math.random() * 100000) + idx,
    vector,
    payload: {
      source: path.relative(BOOKS_DIR, file),
      chunk: chunks[idx],
    },
  }));
  await client.upsert(QDRANT_COLLECTION, {
    wait: true,
    points,
  });
  console.log(`Arquivo indexado: ${file} (${chunks.length} chunks)`);
}

// Função para remover vetores de um arquivo do Qdrant
async function removeFileVectors(file: string) {
  const client = new QdrantClient({ url: QDRANT_URL });
  const source = path.relative(BOOKS_DIR, file);
  // Remove todos os pontos cujo payload.source seja igual ao caminho relativo do arquivo
  await client.delete(QDRANT_COLLECTION, {
    filter: {
      must: [
        { key: 'source', match: { value: source } }
      ]
    }
  });
  console.log(`Vetores removidos do Qdrant para o arquivo: ${file}`);
}

console.log('Iniciando watcher de arquivos em', BOOKS_DIR);
const watcher = chokidar.watch([`${BOOKS_DIR}/**/*.txt`, `${BOOKS_DIR}/**/*.pdf`], {
  persistent: true,
  ignoreInitial: true,
});

watcher.on('add', (filePath) => {
  console.log('Novo arquivo detectado:', filePath);
  indexFile(filePath).catch(err => console.error('Erro ao indexar arquivo:', err));
});

watcher.on('unlink', (filePath) => {
  console.log('Arquivo removido detectado:', filePath);
  removeFileVectors(filePath).catch(err => console.error('Erro ao remover vetores:', err));
});

watcher.on('change', (filePath) => {
  console.log('Arquivo modificado detectado:', filePath);
  // Remove vetores antigos e reindexa
  removeFileVectors(filePath)
    .then(() => indexFile(filePath))
    .catch(err => console.error('Erro ao atualizar vetores:', err));
});

console.log('Watcher ativo. Adicione arquivos .txt ou .pdf para indexação automática.'); 