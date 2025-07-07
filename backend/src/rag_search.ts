import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../.env' }); // Garante que o .env seja carregado
console.log(`[DEBUG rag_search] process.env.GOOGLE_API_KEY no topo do arquivo: ${process.env.GOOGLE_API_KEY ? 'Definido' : 'Não definido'}`);

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_COLLECTION = 'auxjuris_rag';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY; // Usar a chave do ambiente

// Importar PROVIDERS do server.ts para consistência
import { PROVIDERS } from './server'; // Precisaremos exportar PROVIDERS do server.ts

export async function ragSemanticSearch(query: string, topK: number = 5, llmProvider: string) {
  console.log(`[DEBUG rag_search] Início da ragSemanticSearch. Query: "${query.substring(0, 50)}...", TopK: ${topK}, Provedor LLM: ${llmProvider}`);
  try {
    if (llmProvider === PROVIDERS.LMSTUDIO) {
      console.warn('[AVISO rag_search] Provedor LM Studio selecionado. Atualmente, os embeddings para RAG são gerados via Google Gemini. A busca RAG pode não funcionar como esperado ou ser desabilitada se a chave da API do Google não estiver configurada.');
      // Por enquanto, vamos permitir que continue para ver se há um modelo de embedding configurado no LM Studio
      // ou se o usuário deseja usar embeddings do Gemini mesmo com o LLM do LM Studio.
      // Se não houver GOOGLE_API_KEY, a próxima verificação irá falhar.
    }

    if (!GOOGLE_API_KEY) {
      console.error('[ERRO rag_search] GOOGLE_API_KEY não definido para embeddings. A busca RAG não pode ser realizada com o provedor Gemini.');
      throw new Error('GOOGLE_API_KEY não definido para embeddings.');
    }

    const client = new QdrantClient({ url: QDRANT_URL });
    console.log(`[DEBUG rag_search] Conectando ao Qdrant em: ${QDRANT_URL}`);
    
    // Verificar se a coleção existe
    try {
      const collectionInfo = await client.getCollection(QDRANT_COLLECTION);
      console.log(`[DEBUG rag_search] Coleção Qdrant '${QDRANT_COLLECTION}' encontrada. Status: ${collectionInfo.status}`);
    } catch (e) {
      console.error(`[ERRO rag_search] Coleção Qdrant '${QDRANT_COLLECTION}' não encontrada ou erro ao acessá-la:`, e);
      throw new Error(`Coleção Qdrant '${QDRANT_COLLECTION}' não encontrada ou inacessível. Certifique-se de que o Qdrant está rodando e a coleção foi inicializada.`);
    }

    const embeddings = new GoogleGenerativeAIEmbeddings({ apiKey: GOOGLE_API_KEY });
    console.log('[DEBUG rag_search] Gerando embedding para a query...');
    const queryEmbedding = await embeddings.embedQuery(query);
    console.log('[DEBUG rag_search] Embedding gerado. Realizando busca semântica no Qdrant...');

    // Busca semântica no Qdrant
    const searchResult = await client.search(QDRANT_COLLECTION, {
      vector: queryEmbedding,
      limit: topK,
      with_payload: true,
      with_vector: false,
      score_threshold: 0.1,
    });
    console.log(`[DEBUG rag_search] Busca Qdrant concluída. Resultados: ${searchResult?.length || 0}`);

    // Monta resposta
    const results = (searchResult ?? []).map((hit: any) => ({
      text: hit.payload.pageContent || hit.payload.chunk || hit.payload.text || '',
      metadata: hit.payload.metadata || hit.payload,
      score: hit.score,
    }));

    return results;
  } catch (err) {
    console.error('[ERRO rag_search] Erro geral na função ragSemanticSearch:', err);
    throw err; // Re-lança o erro para ser capturado pelo endpoint do servidor
  }
}