import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import { ragSemanticSearch } from './rag_search';
import type { Request, Response, NextFunction } from 'express';
import { spawn } from 'child_process';
import { QdrantClient } from '@qdrant/js-client-rest';
import axios from 'axios';

// Load environment variables from multiple possible locations
const loadEnvFile = () => {
  // Try loading from .env first
  dotenv.config({ path: __dirname + '/../.env' });
  
  // If LM Studio URL is not set, try .env.new
  if (!process.env.LM_STUDIO_URL) {
    console.log('LM_STUDIO_URL not found in .env, trying .env.new');
    dotenv.config({ path: __dirname + '/../.env.new' });
  }

  // If still not set, try .env.example as last resort
  if (!process.env.LM_STUDIO_URL) {
    console.log('LM_STUDIO_URL not found in .env.new, trying .env.example');
    dotenv.config({ path: __dirname + '/../.env.example' });
  }
};

loadEnvFile();

const app = express();
const port = process.env.PORT || 3001;
console.log(`[DEBUG] Porta configurada para o backend: ${port}`);

// Middleware global de log de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use((req, res, next) => {
  console.log(`[CORS DEBUG] Requisição para ${req.url} após CORS middleware. Origin: ${req.headers.origin}`);
  next();
});
app.use(express.json({ limit: '50mb' }));
// Servir arquivos estáticos da pasta public/books
app.use('/books', express.static(path.join(__dirname, '../../public/books')));

// --- Constants for LM Studio (Adjusted as needed) ---
const LM_STUDIO_MODEL = process.env.LM_STUDIO_MODEL || 'granite-vision-3.2-2b';
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1/chat/completions';
console.log(`[DEBUG] LM_STUDIO_URL: ${LM_STUDIO_URL}`);
console.log(`[DEBUG] LM_STUDIO_MODEL: ${LM_STUDIO_MODEL}`);

// Definição dos agentes especialistas jurídicos
const LEGAL_AGENTS = {
  master: {
    id: 'master',
    name: 'Assistente Jurídico Geral',
    description: 'Especialista em todas as áreas do direito com conhecimento abrangente',
    instruction: `IMPORTANTE: Você DEVE responder SEMPRE em português brasileiro jurídico. Nunca responda em inglês ou qualquer outro idioma.

Persona: Você é um assistente avançado em Direito Administrativo, penal, processo penal, código do consumidor, código ambiental, direito do trabalho (CLT), direito tributário, direito civil, direito empresarial, direito constitucional e concursos públicos, com técnica RAG. Você é um assistente de inteligência artificial avançado, especialmente projetado para fornecer suporte especializado no campo do Direito e preparação para concursos públicos. Com a integração da técnica RAG (Recuperar, Agregar e Gerar), você oferece serviços únicos como análise de documentos, consultoria jurídica, e elaboração de peças processuais. Você é capaz de analisar legislações e jurisprudências atualizadas, comparar documentos legais, oferecer orientações em casos específicos e desenvolver petições iniciais e revisão de contratos.

Objetivo: Você é programado para interagir de forma respeitosa e informativa, tratando o usuário como um 'Mestre na área jurídica'. Você é equipado com capacidades avançadas de adaptação e automação, permitindo uma personalização eficiente da experiência do usuário. Com sua técnica de reflection, você aprende continuamente com o feedback dos usuários para se aprimorar constantemente. Você é projetado para ser detalhado e personalizado em suas respostas, assegurando conformidade legal e precisão nas informações fornecidas.

Área de especialização: Direito Administrativo, penal, processo penal, código do consumidor, código ambiental, direito do trabalho (CLT), direito tributário, direito civil, direito empresarial, direito constitucional e concursos públicos.

Você é capaz de realizar tarefas como:
- Análise aprofundada de legalidade e constitucionalidade de atos administrativos
- Elaboração de pareceres jurídicos sobre licitações e contratos
- Consultoria especializada em responsabilidade civil do Estado
- Defesa e acusação em crimes contra a administração pública
- Elaboração de peças processuais complexas
- Consultoria em questões trabalhistas para servidores públicos
- Análise de contratos administrativos
- Consultoria em licitações e contratos empresariais
- Orientação estratégica para candidatos em concursos públicos

Lembre-se: TODAS as suas respostas devem ser em português brasileiro, utilizando terminologia jurídica apropriada.`
  },
  administrativo: {
    id: 'administrativo',
    name: 'Especialista em Direito Administrativo',
    description: 'Especialista em Direito Administrativo e Concursos Públicos',
    instruction: `IMPORTANTE: Você DEVE responder SEMPRE em português brasileiro jurídico. Nunca responda em inglês ou qualquer outro idioma.

Persona: Você é um especialista em Direito Administrativo e Concursos Públicos. Seu conhecimento abrange legislação de concursos públicos, princípios do direito administrativo, processos administrativos, atos administrativos, contratos administrativos, serviço público, responsabilidade civil do Estado, intervenção do Estado na propriedade, controle da Administração Pública e jurisprudência relevante.

Você é capaz de analisar editais, elaborar recursos administrativos, interpretar normativas de concursos, fornecer consultoria sobre direitos e deveres de servidores públicos, auxiliar em processos de licitação e contratos administrativos, e orientar sobre responsabilidade civil do Estado.

Lembre-se: TODAS as suas respostas devem ser em português brasileiro, utilizando terminologia jurídica apropriada.`
  },
  penal: {
    id: 'penal',
    name: 'Especialista em Direito Penal',
    description: 'Especialista em Direito Penal e Processo Penal',
    instruction: `IMPORTANTE: Você DEVE responder SEMPRE em português brasileiro jurídico. Nunca responda em inglês ou qualquer outro idioma.

Persona: Você é um especialista em Direito Penal e Processo Penal. Seu conhecimento abrange crimes contra a Administração Pública, imputação subjetiva, concurso de pessoas, Lei Anticorrupção, processo penal administrativo, provas e meios de obtenção de prova, prescrição e princípios do Direito Penal aplicáveis ao Direito Administrativo Sancionador.

Você é capaz de elaborar respostas à acusação, alegações finais, recursos criminais, habeas corpus e pedidos de revogação/relaxamento de prisão.

Lembre-se: TODAS as suas respostas devem ser em português brasileiro, utilizando terminologia jurídica apropriada.`
  },
  consumidor: {
    id: 'consumidor',
    name: 'Especialista em Direito do Consumidor',
    description: 'Especialista em Código de Defesa do Consumidor',
    instruction: `IMPORTANTE: Você DEVE responder SEMPRE em português brasileiro jurídico. Nunca responda em inglês ou qualquer outro idioma.

Persona: Você é um especialista em Direito do Consumidor. Seu conhecimento abrange serviços públicos essenciais e direitos do usuário, defeitos na prestação de serviços públicos e responsabilidade da Administração Pública nas relações de consumo.

Você é capaz de atuar em demandas judiciais envolvendo direitos do consumidor, elaborar pareceres sobre a aplicação do CDC a serviços públicos, fornecer consultoria em casos de defeitos na prestação de serviços públicos essenciais e desenvolver estratégias para ações coletivas e individuais.

Lembre-se: TODAS as suas respostas devem ser em português brasileiro, utilizando terminologia jurídica apropriada.`
  },
  ambiental: {
    id: 'ambiental',
    name: 'Especialista em Direito Ambiental',
    description: 'Especialista em Código Ambiental',
    instruction: `IMPORTANTE: Você DEVE responder SEMPRE em português brasileiro jurídico. Nunca responda em inglês ou qualquer outro idioma.

Persona: Você é um especialista em Direito Ambiental. Seu conhecimento abrange licenciamento ambiental, fiscalização ambiental, sanções administrativas ambientais e Termo de Ajustamento de Conduta (TAC).

Você é capaz de fornecer consultoria jurídica em licenciamento ambiental, defender em processos administrativos e judiciais envolvendo sanções ambientais, elaborar pareceres sobre a aplicação da legislação ambiental e atuar em casos de TAC.

Lembre-se: TODAS as suas respostas devem ser em português brasileiro, utilizando terminologia jurídica apropriada.`
  },
  trabalho: {
    id: 'trabalho',
    name: 'Especialista em Direito do Trabalho',
    description: 'Especialista em Direito do Trabalho (CLT)',
    instruction: `IMPORTANTE: Você DEVE responder SEMPRE em português brasileiro jurídico. Nunca responda em inglês ou qualquer outro idioma.

Persona: Você é um especialista em Direito do Trabalho (CLT). Seu conhecimento abrange contratação temporária, empregados públicos celetistas e direitos trabalhistas no setor público.

Você é capaz de fornecer consultoria especializada em questões trabalhistas aplicáveis a servidores públicos celetistas, atuar em reclamações trabalhistas, elaborar pareceres sobre direitos trabalhistas específicos, analisar questões de terceirização e desenvolver estratégias para negociações coletivas.

Lembre-se: TODAS as suas respostas devem ser em português brasileiro, utilizando terminologia jurídica apropriada.`
  },
  tributario: {
    id: 'tributario',
    name: 'Especialista em Direito Tributário',
    description: 'Especialista em Direito Tributário',
    instruction: `IMPORTANTE: Você DEVE responder SEMPRE em português brasileiro jurídico. Nunca responda em inglês ou qualquer outro idioma.

Persona: Você é um especialista em Direito Tributário. Seu conhecimento abrange processo administrativo fiscal, lançamento tributário, defesas e recursos em matéria tributária e execução fiscal.

Você é capaz de fornecer consultoria tributária estratégica para órgãos públicos e entidades estatais, defender em processos administrativos fiscais complexos, elaborar pareceres sobre interpretação e aplicação de normas tributárias, atuar em casos de lançamento tributário e desenvolver teses em matéria tributária administrativa.

Lembre-se: TODAS as suas respostas devem ser em português brasileiro, utilizando terminologia jurídica apropriada.`
  },
  civil: {
    id: 'civil',
    name: 'Especialista em Direito Civil',
    description: 'Especialista em Direito Civil',
    instruction: `IMPORTANTE: Você DEVE responder SEMPRE em português brasileiro jurídico. Nunca responda em inglês ou qualquer outro idioma.

Persona: Você é um especialista em Direito Civil. Seu conhecimento abrange contratos em geral e sua aplicação aos contratos administrativos, responsabilidade civil contratual e extracontratual e bens públicos.

Você é capaz de analisar contratos administrativos sob a ótica do direito civil, atuar em ações de responsabilidade civil envolvendo a administração pública, fornecer consultoria especializada em questões de bens públicos, elaborar pareceres sobre a aplicação de institutos do direito civil à atividade administrativa e atuar em casos de intervenção do Estado na propriedade.

Lembre-se: TODAS as suas respostas devem ser em português brasileiro, utilizando terminologia jurídica apropriada.`
  },
  empresarial: {
    id: 'empresarial',
    name: 'Especialista em Direito Empresarial',
    description: 'Especialista em Direito Empresarial',
    instruction: `IMPORTANTE: Você DEVE responder SEMPRE em português brasileiro jurídico. Nunca responda em inglês ou qualquer outro idioma.

Persona: Você é um especialista em Direito Empresarial. Seu conhecimento abrange licitações e contratos empresariais com o poder público, parcerias público-privadas (PPPs) e regulação econômica.

Você é capaz de fornecer consultoria especializada em licitações e contratos empresariais com o poder público, analisar questões regulatórias e econômicas em PPPs, elaborar pareceres sobre a interface entre o direito empresarial e a administração pública, atuar em questões de responsabilidade empresarial em contratos administrativos e desenvolver estratégias para empresas que contratam com o setor público.

Lembre-se: TODAS as suas respostas devem ser em português brasileiro, utilizando terminologia jurídica apropriada.`
  },
  constitucional: {
    id: 'constitucional',
    name: 'Especialista em Direito Constitucional',
    description: 'Especialista em Direito Constitucional',
    instruction: `IMPORTANTE: Você DEVE responder SEMPRE em português brasileiro jurídico. Nunca responda em inglês ou qualquer outro idioma.

Persona: Você é um especialista em Direito Constitucional. Seu conhecimento abrange princípios constitucionais aplicáveis à administração pública, direitos fundamentais e sua aplicação na atividade administrativa, repartição de competências administrativas e controle de constitucionalidade dos atos administrativos.

Você é capaz de realizar análise aprofundada de princípios constitucionais, atuar em controle de constitucionalidade de leis e atos administrativos, elaborar pareceres sobre direitos fundamentais e sua aplicação na atividade administrativa, fornecer consultoria especializada em repartição de competências administrativas e desenvolver teses constitucionais em matéria administrativa.

Lembre-se: TODAS as suas respostas devem ser em português brasileiro, utilizando terminologia jurídica apropriada.`
  },
  concursos: {
    id: 'concursos',
    name: 'Especialista em Concursos Públicos',
    description: 'Especialista em Concursos Públicos',
    instruction: `IMPORTANTE: Você DEVE responder SEMPRE em português brasileiro jurídico. Nunca responda em inglês ou qualquer outro idioma.

Persona: Você é um especialista em Concursos Públicos. Seu conhecimento abrange elegibilidade e requisitos para diversos cargos e concursos públicos, análise de editais e legislação pertinente, recursos administrativos em todas as fases de concursos, direitos, deveres e responsabilidades de servidores públicos e regime jurídico de servidores públicos.

Você é capaz de fornecer consultoria estratégica para candidatos em concursos de alta complexidade, elaborar recursos administrativos e ações judiciais contra concursos com teses avançadas, realizar análise aprofundada de editais e normas de concursos públicos, desenvolver estratégias para impugnação de questões e critérios de avaliação e atuar em casos envolvendo o regime jurídico de servidores públicos.

Lembre-se: TODAS as suas respostas devem ser em português brasileiro, utilizando terminologia jurídica apropriada.`
  }
};

// Usar a instrução do agente mestre como padrão
const MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION = LEGAL_AGENTS.master.instruction;

// New comparison prompt template for the backend
const COMPARISON_PROMPT_TEMPLATE_BACKEND = (docAName: string, docAText: string, docBName: string, docBText: string): string => 
  `Como um especialista jurídico avançado, compare os dois documentos a seguir. Realize uma análise detalhada das semelhanças, diferenças, pontos chave, conflitos (se houver) e implicações legais de cada documento em relação ao outro. Organize sua resposta de forma clara, destacando os pontos de comparação.

Documento A (${docAName}):
---
${docAText}
---

Documento B (${docBName}):
---
${docBText}
---

Análise de Comparação Detalhada:`;

const SUMMARIZER_PROMPT_TEMPLATE = (documentText: string): string => 
  `Por favor, resuma o seguinte documento. O foco principal do resumo deve ser nos pontos essenciais e na finalidade do documento.

Documento:
---
${documentText}
---
Resumo Detalhado:`;

const INSIGHTS_EXTRACTOR_PROMPT_TEMPLATE = (documentText: string, summaryText?: string): string => 
  `Por favor, extraia os principais insights, implicações e pontos de discussão do seguinte documento (e seu resumo, se fornecido).

Documento:
---
${documentText}
---${summaryText ? `
Resumo do Documento:
---
${summaryText}
---` : ''}
Principais Insights e Implicações:`;

const SWOT_ANALYSIS_PROMPT_TEMPLATE = (documentText: string, summaryText?: string, insightsText?: string): string => 
  `Por favor, realize uma análise SWOT (Forças, Fraquezas, Oportunidades, Ameaças) com base no seguinte documento (e seu resumo/insights, se fornecidos).

Documento:
---
${documentText}
---${summaryText ? `
Resumo do Documento:
---
${summaryText}
---` : ''}${insightsText ? `
Insights Extraídos:
---
${insightsText}
---` : ''}
Análise SWOT Detalhada (liste cada ponto claramente sob o respectivo título - Forças, Fraquezas, Oportunidades, Ameaças):`;

const MAX_CHARS_FOR_SUMMARIZATION_INPUT = 4000; // Ajustado para ser mais conservador com o limite de 4096 tokens do LM Studio

// --- Função para chamar LM Studio (ajustada para seleção de modelo e prompt no campo user) ---
async function callLMStudio(
  prompt: string,
  task: string = '',
  model: string = SELECTED_LMSTUDIO_MODEL,
  temperature: number = 0.7,
  max_tokens: number = 2048
): Promise<string> {
  try {
    // Coloca tudo no campo user, sem system
    let userPrompt = `${task ? `Tarefa: ${task}.\n` : ''}${prompt}`;
    const MAX_LM_STUDIO_INPUT_CHARS = 4000; // Ajustado para ser mais conservador com o limite de 4096 tokens do LM Studio

    if (userPrompt.length > MAX_LM_STUDIO_INPUT_CHARS) {
      console.warn(`[AVISO] Prompt para LM Studio truncado de ${userPrompt.length} para ${MAX_LM_STUDIO_INPUT_CHARS} caracteres.`);
      userPrompt = userPrompt.substring(0, MAX_LM_STUDIO_INPUT_CHARS) + '\n... [conteúdo truncado devido ao limite de tokens do modelo]';
    }
    
    console.log(`[DEBUG] Tamanho final do prompt para LM Studio: ${userPrompt.length} caracteres.`);

    const response = await axios.post(LM_STUDIO_URL, {
      model,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      temperature,
      max_tokens,
      stream: false
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    const result = response.data;
    if (result && result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
      return result.choices[0].message.content.trim();
    }
    throw new Error('Resposta inesperada do LM Studio');
  } catch (error) {
    console.error('Erro ao chamar LM Studio:', error);
    throw new Error('Falha ao obter resposta do LM Studio. Verifique se o LM Studio está rodando e o modelo está carregado na porta correta.');
  }
}

// Chat endpoint usando LLM selecionado
app.post('/api/chat', async (req, res) => {
  try {
    let { prompt, agentId: rawAgentId } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt é obrigatório.' });
      return;
    }
    let agentId: keyof typeof LEGAL_AGENTS = 'master';
    const validAgentKeys = Object.keys(LEGAL_AGENTS) as Array<keyof typeof LEGAL_AGENTS>;
    if (typeof rawAgentId === 'string' && validAgentKeys.includes(rawAgentId as keyof typeof LEGAL_AGENTS)) {
      agentId = rawAgentId as keyof typeof LEGAL_AGENTS;
    }
    const agentInstruction = LEGAL_AGENTS[agentId].instruction;
    const agentName = LEGAL_AGENTS[agentId].name;
    console.log(`[DEBUG] Tamanho da instrução do agente (${agentId}): ${agentInstruction.length} caracteres.`);

    // INTEGRAÇÃO RAG: buscar contexto relevante
    const { ragSemanticSearch } = require('./rag_search');
    let ragContext = '';
    try {
      // Passa o provedor selecionado para ragSemanticSearch
      const ragResults = await ragSemanticSearch(prompt, 3, SELECTED_PROVIDER);
      if (ragResults && ragResults.length > 0) {
        ragContext = ragResults.map((r: any, i: number) => `Fonte ${i+1}:\n${r.text}`).join('\n\n');
      }
    } catch (err) {
      console.warn('Falha ao buscar contexto RAG:', err);
    }

    // Limitar o tamanho do ragContext para evitar estouro de tokens no LLM
    // Assumindo um limite de 4096 tokens para o modelo, e que 1 token ~ 4 caracteres
    // Deixamos espaço para a instrução do agente e a pergunta do usuário
    const MAX_RAG_CONTEXT_CHARS = 4000; // Ajustado para ser mais conservador com o limite de 4096 tokens do LM Studio

    let finalRagContext = ragContext;
    console.log(`[DEBUG] Tamanho original do contexto RAG: ${ragContext.length} caracteres.`);
    if (ragContext.length > MAX_RAG_CONTEXT_CHARS) {
      finalRagContext = ragContext.substring(0, MAX_RAG_CONTEXT_CHARS) + '\n... [contexto RAG truncado devido ao limite de tokens]';
      console.warn(`Contexto RAG truncado de ${ragContext.length} para ${finalRagContext.length} caracteres.`);
    }
    console.log(`[DEBUG] Tamanho final do contexto RAG: ${finalRagContext.length} caracteres.`);

    // Adicionar contexto RAG ao prompt
    const promptComInstrucao = `${agentInstruction}\n\n${finalRagContext ? `Contexto relevante dos documentos:\n${finalRagContext}\n` : ''}Pergunta do usuário: ${prompt}\n\nLembre-se de responder SEMPRE em português brasileiro como um ${agentName}.`;

    // Chamar LLM selecionado
    const resposta = await callLLM(promptComInstrucao);
    res.json({ text: resposta });
  } catch (err) {
    console.error('Erro no endpoint /api/chat:', err);
    res.status(500).json({ error: 'Erro ao processar requisição de chat.' });
  }
});

// --- New Analysis Endpoints ---

app.post('/api/analyze/summary', async (req, res) => {
  try {
    const { documentText } = req.body;
    if (!documentText) {
      res.status(400).json({ error: 'documentText é obrigatório para sumarização.' });
      return;
    }

    let effectiveDocumentText = documentText;
    if (documentText.length > MAX_CHARS_FOR_SUMMARIZATION_INPUT) {
      effectiveDocumentText = documentText.substring(0, MAX_CHARS_FOR_SUMMARIZATION_INPUT);
      console.log(`Documento truncado para ${effectiveDocumentText.length} caracteres para sumarização.`);
    }

    const taskPrompt = SUMMARIZER_PROMPT_TEMPLATE(effectiveDocumentText);
    const summary = await callLMStudio(taskPrompt, "Resumo");

    res.json({ summary });
  } catch (error) {
    console.error("Erro ao gerar resumo:", error);
    res.status(500).json({ error: 'Falha ao gerar resumo.' });
  }
});

app.post('/api/analyze/insights', async (req, res) => {
  try {
    const { documentText, summaryText } = req.body;
    if (!documentText) {
      res.status(400).json({ error: 'documentText é obrigatório para extrair insights.' });
      return;
    }

    // Assuming documentText passed here might be a summary if original was too long
    const taskPrompt = INSIGHTS_EXTRACTOR_PROMPT_TEMPLATE(documentText, summaryText);
    const insights = await callLMStudio(taskPrompt, "Insights");

    res.json({ insights });
  } catch (error) {
    console.error("Erro ao extrair insights:", error);
    res.status(500).json({ error: 'Falha ao extrair insights.' });
  }
});

interface SwotAnalysis {
  [key: string]: string;
}

app.post('/api/analyze/swot', async (req, res) => {
  try {
    const { documentText, summaryText, insightsText } = req.body;
    if (!documentText) {
      res.status(400).json({ error: 'documentText é obrigatório para análise SWOT.' });
      return;
    }
     // Assuming documentText passed here might be a summary if original was too long
    const taskPrompt = SWOT_ANALYSIS_PROMPT_TEMPLATE(documentText, summaryText, insightsText);
    const swot = await callLMStudio(taskPrompt, "Análise SWOT");

    // Basic parsing of SWOT text into object (can be improved)
    const swotResult: { [key: string]: string } = {};
    const sections = ["Forças:", "Fraquezas:", "Oportunidades:", "Ameaças:"];
    let currentSection = "";
    swot.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      const matchedSection = sections.find(s => trimmedLine.startsWith(s));
      if (matchedSection) {
        currentSection = matchedSection.replace(':', '').trim();
        swotResult[currentSection] = trimmedLine.substring(matchedSection.length).trim() + '\n';
      } else if (currentSection && trimmedLine) {
        swotResult[currentSection] += trimmedLine + '\n';
      }
    });
     for (const key in swotResult) {
        swotResult[key] = swotResult[key]?.trim() || "";
     }

    res.json({ swot: swotResult });
  } catch (error) {
    console.error("Erro ao gerar análise SWOT:", error);
    res.status(500).json({ error: 'Falha ao gerar análise SWOT.' });
  }
});

// --- New Comparison Endpoint ---

app.post('/api/compare', async (req, res) => {
  try {
    const { documentAText, documentBText, docAName, docBName, agentId: rawAgentId } = req.body;

    if (!documentAText || !documentBText) {
      res.status(400).json({ error: 'Os textos dos dois documentos (documentAText, documentBText) são obrigatórios para comparação.' });
      return;
    }

    // Validate and fallback agentId
    let agentId: keyof typeof LEGAL_AGENTS = 'master'; // Default to master
    const validAgentKeys = Object.keys(LEGAL_AGENTS) as Array<keyof typeof LEGAL_AGENTS>;
    if (typeof rawAgentId === 'string' && validAgentKeys.includes(rawAgentId as keyof typeof LEGAL_AGENTS)) {
      agentId = rawAgentId as keyof typeof LEGAL_AGENTS; // Assign and assert
    }

    console.log(`Recebida solicitação de comparação para o agente ${LEGAL_AGENTS[agentId].name}`);

    const taskPrompt = COMPARISON_PROMPT_TEMPLATE_BACKEND(
      docAName || 'Documento A',
      documentAText,
      docBName || 'Documento B',
      documentBText
    );

    const comparisonResult = await callLMStudio(taskPrompt, "Comparação Jurídica");

    // Salvar cópias dos textos extraídos
    const saveDir = path.join(__dirname, '../../public/books/uploads/extraidos');
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    const saveTextIfNotExists = (name: string, text: string) => {
      const safeName = name.replace(/[^a-zA-Z0-9_\-.]/g, '_') + '.txt';
      const savePath = path.join(saveDir, safeName);
      if (!fs.existsSync(savePath)) {
        fs.writeFileSync(savePath, text, 'utf8');
      }
    };
    saveTextIfNotExists(docAName || 'DocumentoA', documentAText);
    saveTextIfNotExists(docBName || 'DocumentoB', documentBText);

    res.json({ comparison: comparisonResult });
  } catch (error) {
    console.error("Erro ao realizar comparação:", error);
    res.status(500).json({ error: 'Falha ao realizar comparação.' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Endpoint de upload para disco (opcional, para uploads gerais)
const uploadDir = path.join(__dirname, '../../public/books/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadToDisk = multer({ storage: diskStorage });

app.post('/api/upload', uploadToDisk.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'Arquivo não enviado.' });
    return;
  }
  res.json({ filename: req.file.filename, path: req.file.path });
});

// Função utilitária para ler todos os arquivos .txt e .pdf de public/books e subpastas
async function getAllTextAndPdfFiles(dirPath: string): Promise<{ filename: string, folder: string, content: string, type: string }[]> {
  const results: { filename: string, folder: string, content: string, type: string }[] = [];
  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      const subResults = await getAllTextAndPdfFiles(fullPath);
      results.push(...subResults);
    } else if (file.isFile() && file.name.endsWith('.txt')) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        results.push({ filename: file.name, folder: path.basename(path.dirname(fullPath)), content, type: 'txt' });
      } catch (err) {
        console.error('Erro ao ler arquivo', fullPath, err);
      }
    } else if (file.isFile() && file.name.endsWith('.pdf')) {
      try {
        const dataBuffer = fs.readFileSync(fullPath);
        const pdfData = await pdfParse(dataBuffer);
        results.push({ filename: file.name, folder: path.basename(path.dirname(fullPath)), content: pdfData.text, type: 'pdf' });
      } catch (err) {
        console.error('Erro ao ler PDF', fullPath, err);
      }
    }
  }
  return results;
}

// Endpoint para retornar todos os documentos RAG (txt e pdf)
app.get('/api/rag-documents', async (req, res) => {
  try {
    const booksDir = path.join(__dirname, '../../public/books');
    const docs = await getAllTextAndPdfFiles(booksDir);
    // Inclui também arquivos de uploads/extraidos
    const extraidosDir = path.join(booksDir, 'uploads/extraidos');
    let extraidos: string[] = [];
    if (fs.existsSync(extraidosDir)) {
      const extraidosFiles = await getAllTextAndPdfFiles(extraidosDir);
      extraidos = extraidosFiles.map((d: { filename: string }) => d.filename);
    }
    res.json({ documents: [...docs, ...extraidos.map((f: string) => ({ filename: f, folder: 'extraidos', type: 'txt' }))] });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao ler documentos RAG.' });
  }
});


function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

app.post('/api/rag-multimodal', uploadToDisk.single('image'), async (req, res) => {
  // Este endpoint é para funcionalidades multimodais que dependem de embeddings e modelos específicos.
  // Para LM Studio, a implementação de multimodalidade e embeddings pode variar ou não ser suportada diretamente.
  // Por enquanto, este endpoint retornará um erro 501 (Não Implementado).
  res.status(501).json({ error: 'RAG Multimodal não implementado para LM Studio ainda. Esta funcionalidade requer um modelo de embedding e um modelo multimodal compatível com a API do LM Studio.' });
});

// Novo endpoint para salvar texto extraído para uso futuro no RAG
app.post('/api/save-extracted-text', async (req, res) => {
  try {
    console.log('REQ.BODY em /api/save-extracted-text:', req.body);
    const { fileName, text } = req.body;
    if (!fileName || !text) {
      res.status(400).json({ error: 'fileName e text são obrigatórios.' });
      return;
    }
    const saveDir = path.join(__dirname, '../../public/books/uploads/extraidos');
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    // Garante nome único
    const safeName = fileName.replace(/[^a-zA-Z0-9_\-.]/g, '_');
    const savePath = path.join(saveDir, safeName);
    fs.writeFileSync(savePath, text, 'utf8');
    res.json({ success: true, path: `/books/uploads/extraidos/${safeName}` });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar texto extraído.' });
  }
});

// Endpoint RAG Search
app.post('/api/rag-search', async (req, res) => {
  try {
    const { query, topK } = req.body;
    if (!query) {
      res.status(400).json({ error: 'Query obrigatória.' });
      return;
    }
    const results = await ragSemanticSearch(query, topK || 5, SELECTED_PROVIDER); // Passa o provedor selecionado
    console.log(`[DEBUG server] Enviando resposta RAG. Resultados: ${JSON.stringify(results)}`);
    res.json({ results });
  } catch (err) {
    console.error('Erro no RAG Search:', err);
    res.status(500).json({ error: 'Erro na busca RAG.' });
  }
});

// --- NOVO ENDPOINT: Análise PhD de Processo Jurídico ---
app.post('/api/process/analyze', uploadToDisk.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      console.error('Erro: Nenhum arquivo enviado.');
      res.status(400).json({ error: 'Nenhum arquivo enviado.' });
      return;
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    let extractedText = '';

    console.log(`[DEBUG] Recebido arquivo: ${fileName}, Caminho: ${filePath}`);

    if (fileName.endsWith('.pdf')) {
      try {
        console.log('[DEBUG] Tentando ler PDF com pdf-parse...');
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        extractedText = data.text.replace(/\n{2,}/g, '\n').trim();
        console.log(`[DEBUG] Texto extraído do PDF (tamanho: ${extractedText.length}): ${extractedText.substring(0, 200)}...`);
      } catch (pdfError) {
        console.error(`[ERRO] Falha ao extrair texto do PDF ${fileName}:`, pdfError);
        res.status(500).json({ error: 'Falha ao extrair texto do PDF. O arquivo pode estar corrompido ou protegido.' });
        return;
      }
    } else if (fileName.endsWith('.txt')) {
      extractedText = fs.readFileSync(filePath, 'utf8');
      console.log(`[DEBUG] Texto extraído do TXT (tamanho: ${extractedText.length}): ${extractedText.substring(0, 200)}...`);
    } else {
      console.error(`[ERRO] Tipo de arquivo não suportado: ${fileName}`);
      res.status(400).json({ error: 'Tipo de arquivo não suportado.' });
      return;
    }

    if (!extractedText || extractedText.trim().length === 0) {
      console.warn(`[AVISO] Nenhum texto extraído do arquivo ${fileName}.`);
      res.status(400).json({ error: 'Nenhum texto pôde ser extraído do arquivo. O PDF pode estar vazio, protegido ou conter apenas imagens.' });
      return;
    }

    // Salvar texto extraído em public/books/PROCESSOS/extraidos
    const saveDir = path.join(__dirname, '../../public/books/PROCESSOS/extraidos');
    if (!fs.existsSync(saveDir)) {
      console.log(`[DEBUG] Criando diretório de salvamento: ${saveDir}`);
      fs.mkdirSync(saveDir, { recursive: true });
    }
    const baseName = fileName.replace(/\.[^.]+$/, '');
    const savePath = path.join(saveDir, baseName + '.txt');
    
    try {
      fs.writeFileSync(savePath, extractedText, 'utf8');
      console.log(`[DEBUG] Texto extraído salvo em: ${savePath}`);
    } catch (writeError) {
      console.error(`[ERRO] Falha ao salvar texto extraído em ${savePath}:`, writeError);
      res.status(500).json({ error: 'Falha ao salvar texto extraído no disco.' });
      return;
    }

    // 1. SUMARIZAÇÃO
    let effectiveDocumentText = extractedText;
    if (extractedText.length > MAX_CHARS_FOR_SUMMARIZATION_INPUT) {
      effectiveDocumentText = extractedText.substring(0, MAX_CHARS_FOR_SUMMARIZATION_INPUT);
      console.log(`[DEBUG] Documento truncado para sumarização (${effectiveDocumentText.length} caracteres).`);
    }
    const summaryPrompt = SUMMARIZER_PROMPT_TEMPLATE(effectiveDocumentText);
    const summary = await callLMStudio(summaryPrompt, "Resumo");
    console.log('[DEBUG] Sumarização concluída.');

    // 2. INSIGHTS (opcional, pode ser usado para enriquecer SWOT)
    const insightsPrompt = INSIGHTS_EXTRACTOR_PROMPT_TEMPLATE(effectiveDocumentText, summary);
    const insights = await callLMStudio(insightsPrompt, "Insights");
    console.log('[DEBUG] Extração de insights concluída.');

    // 3. SWOT
    const swotPrompt = SWOT_ANALYSIS_PROMPT_TEMPLATE(effectiveDocumentText, summary, insights);
    const swotText = await callLMStudio(swotPrompt, "Análise SWOT");
    console.log('[DEBUG] Análise SWOT concluída.');

    // Parse SWOT
    const swotResult: { [key: string]: string } = {};
    const sections = ["Forças:", "Fraquezas:", "Oportunidades:", "Ameaças:"];
    let currentSection = "";
    swotText.split('\n').forEach((line: string) => {
      const trimmedLine = line.trim();
      const matchedSection = sections.find((s: string) => trimmedLine.startsWith(s));
      if (matchedSection) {
        currentSection = matchedSection.replace(':', '').trim();
        swotResult[currentSection] = trimmedLine.substring(matchedSection.length).trim() + '\n';
      } else if (currentSection && trimmedLine) {
        swotResult[currentSection] += trimmedLine + '\n';
      }
    });
    for (const key in swotResult) {
      swotResult[key] = swotResult[key]?.trim() || "";
    }

    // 4. BRECHAS/LACUNAS
    const GAPS_PROMPT_TEMPLATE = (documentText: string, summaryText: string, swotText: string) =>
      `Você é um jurista PhD em direito brasileiro. Analise o processo abaixo, seu resumo e análise SWOT, e identifique possíveis brechas, lacunas ou oportunidades jurídicas relevantes. Para cada brecha, cite o trecho do processo, a referência legal (se aplicável) e explique por que é uma brecha.\n\nPROCESSO:\n---\n${documentText}\n---\nRESUMO:\n---\n${summaryText}\n---\nSWOT:\n---\n${swotText}\n---\nListe as brechas de forma estruturada, exemplo:\n- Descrição: ...\n  Trecho: ...\n  Referência: ...`;
    const gapsPrompt = GAPS_PROMPT_TEMPLATE(effectiveDocumentText, summary, swotText);
    const gapsText = await callLMStudio(gapsPrompt, "Brechas Jurídicas");
    console.log('[DEBUG] Análise de brechas concluída.');

    // Parse gaps (simples: cada item começa com '- Descrição:')
    const gaps: Array<{ description: string; trecho?: string; reference?: string }> = [];
    let currentGap: { description?: string; trecho?: string; reference?: string } = {};
    gapsText.split('\n').forEach((line: string) => {
      if (line.startsWith('- Descrição:')) {
        if (Object.keys(currentGap).length > 0) gaps.push(currentGap as { description: string; trecho?: string; reference?: string });
        currentGap = { description: line.replace('- Descrição:', '').trim() };
      } else if (line.startsWith('Trecho:')) {
        currentGap.trecho = line.replace('Trecho:', '').trim();
      } else if (line.startsWith('Referência:')) {
        currentGap.reference = line.replace('Referência:', '').trim();
      }
    });
    if (Object.keys(currentGap).length > 0) gaps.push(currentGap as { description: string; trecho?: string; reference?: string });

    // Resposta final
    res.json({
      summary,
      swot: swotResult,
      gaps,
      fullText: extractedText
    });
    console.log('[DEBUG] Resposta final enviada com sucesso.');

  } catch (err) {
    console.error('Erro no pipeline PhD:', err);
    res.status(500).json({ error: 'Erro ao analisar processo.' });
  }
});

// Função utilitária para ler todos os arquivos .txt da pasta public/books (e subpastas)
function getAllBookTexts(): Array<{ file: string; content: string }> {
  const booksDir = path.join(__dirname, '../../public/books');
  const bookFiles: string[] = [];
  function walk(dir: string) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        walk(fullPath);
      } else if (file.endsWith('.txt')) {
        bookFiles.push(fullPath);
      }
    }
  }
  walk(booksDir);
  // Retorna array de { file, content }
  return bookFiles.map(file => ({
    file: path.basename(file),
    content: fs.readFileSync(file, 'utf8')
  }));
}

// Função para detectar e extrair blocos formais detalhados
function extractFormalBlocks(text: string): { result: Record<string, { presente: boolean, trecho: string | null, exemploRAG?: string | null, fonte?: string | null, explicacao?: string | null }>, ordemDetectada: { key: string, idx: number }[] } {
  // Regexes para blocos comuns
  const blocks = [
    { key: 'enderecamento', label: 'Endereçamento', regex: /(excelent[ií]ssim[oa][^\n]{0,80}\n?)/i },
    { key: 'qualificacao', label: 'Qualificação', regex: /([A-Z][^\n,]+,\s*(brasileir[ao]|nacionalidade|estado civil|profiss[aã]o|portador[ae]?|residente|domiciliad[ao]))[^\n]{0,200}/i },
    { key: 'fatos', label: 'Fatos', regex: /(dos?\s+fatos[^\n]*\n[\s\S]{0,800}?)(?=\n(do direito|dos fundamentos|fundamenta|pedido|requer|ante o exposto|diante do exposto|assinatura|advogado|oab|procurador|$))/i },
    { key: 'fundamentos', label: 'Fundamentos', regex: /(do\s+direito|dos?\s+fundamentos)[^\n]*\n[\s\S]{0,800}?((pedido|requer|ante o exposto|diante do exposto|assinatura|advogado|oab|procurador|$))/i },
    { key: 'pedidos', label: 'Pedidos', regex: /(pede[rs]?|requer[ei]?|ante o exposto|diante do exposto)[^\n]{0,200}/i },
    { key: 'requerimentosFinais', label: 'Requerimentos Finais', regex: /(nestes termos|pede deferimento|termos em que|espera deferimento)[^\n]{0,200}/i },
    { key: 'assinatura', label: 'Assinatura', regex: /(advogado|oab|assinatura|procurador)[^\n]{0,100}/i }
  ];
  const result: Record<string, { presente: boolean, trecho: string | null, exemploRAG?: string | null, fonte?: string | null, explicacao?: string | null }> = {};
  for (const block of blocks) {
    const match = text.match(block.regex);
    result[block.key] = {
      presente: !!match,
      trecho: match ? match[0].trim() : null
    };
  }
  // Ordem dos blocos detectados
  const ordemDetectada = blocks.map(b => ({ key: b.key, idx: text.indexOf(result[b.key]?.trecho || '') })).filter(b => b.idx >= 0);
  return { result, ordemDetectada };
}

// Função para extrair citações detalhadas
function extractCitationsDetailed(text: string): Array<{ citacao: string, artigo: string, paragrafo: string | null, inciso: string | null, lei: string | null }> {
  // Ex: art. 5º, §2º, inciso I, CF/88
  const regex = /art\.\s*(\d+[ºo]?)(,?\s*§\s*\d+[ºo]?)?(,?\s*inciso\s*[IVXLCDM]+)?(,?\s*(CF\/88|CLT|CPC|CPP|CP|CDC|Código Civil|Código Penal|Constituição Federal|Lei [\d\.\/]+))?/gi;
  const matches = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    matches.push({
      citacao: m[0],
      artigo: m[1],
      paragrafo: m[2] ? m[2].replace(/,?\s*/, '') : null,
      inciso: m[3] ? m[3].replace(/,?\s*/, '') : null,
      lei: m[5] || null
    });
  }
  return matches;
}

// Função para buscar citação nos livros (detalhada)
function findCitationInBooksDetailed(citation: { artigo: string, lei: string | null }, books: Array<{ file: string, content: string }>): { encontrado: boolean, documento: string | null } {
  const art = citation.artigo ? citation.artigo.replace(/[ºo]/g, '') : null;
  if (!art) return { encontrado: false, documento: null };
  for (const book of books) {
    // Busca por "art. N" no texto do livro
    const artRegex = new RegExp(`art\.\s*${art}\b`, 'i');
    if (artRegex.test(book.content)) {
      // Se especificou lei/código, tenta casar com o nome do arquivo
      if (citation.lei) {
        const law = citation.lei.toLowerCase();
        if (book.file.toLowerCase().includes(law.replace(/[^a-z0-9]/gi, ''))) {
          return { encontrado: true, documento: book.file };
        }
      } else {
        return { encontrado: true, documento: book.file };
      }
    }
  }
  return { encontrado: false, documento: null };
}

// Função para detectar jurisprudência
function extractJurisprudencia(text: string): string[] {
  // Ex: STF, RE 123456; STJ, AgRg no REsp 123456
  const regex = /(STF|STJ|TST|TRF|TJ[\w]*)[\s,;\-]+([A-Za-z]+\s+)?(REsp|RE|AgRg|HC|MS|AI|ARE|EDcl|ED|AgInt|AgIn|AgRg|Ag|RMS|Rcl|ADI|ADPF|AP)[\s\-]*n?[ºo]?\s*\d{3,}/gi;
  const matches = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    matches.push(m[0]);
  }
  return matches;
}

// Função para sugerir ordem correta dos blocos
function sugerirOrdemBlocos(ordemDetectada: { key: string, idx: number }[], ordemPadrao: string[]): string | null {
  const ordemAtual = ordemDetectada.map(b => b.key);
  if (ordemAtual.join(',') !== ordemPadrao.join(',')) {
    return `A ordem dos blocos está fora do padrão: recomenda-se [${ordemPadrao.join(' > ')}].`;
  }
  return null;
}

// Função para buscar exemplo de bloco no RAG
function buscarExemploBlocoNoRAG(blocoKey: string, books: { file: string, content: string }[]): { exemplo: string | null, fonte: string | null } {
  const regexes: Record<string, RegExp> = {
    enderecamento: /(excelent[ií]ssim[oa][^\n]{0,80}\n?)/i,
    qualificacao: /([A-Z][^\n,]+,\s*(brasileir[ao]|nacionalidade|estado civil|profiss[aã]o|portador[ae]?|residente|domiciliad[ao]))[^\n]{0,200}/i,
    fatos: /(dos?\s+fatos[^\n]*\n[\s\S]{0,800}?)(?=\n(do direito|dos fundamentos|fundamenta|pedido|requer|ante o exposto|diante do exposto|assinatura|advogado|oab|procurador|$))/i,
    fundamentos: /(do\s+direito|dos?\s+fundamentos)[^\n]*\n[\s\S]{0,800}?((pedido|requer|ante o exposto|diante do exposto|assinatura|advogado|oab|procurador|$))/i,
    pedidos: /(pede[rs]?|requer[ei]?|ante o exposto|diante do exposto)[^\n]{0,200}/i,
    requerimentosFinais: /(nestes termos|pede deferimento|termos em que|espera deferimento)[^\n]{0,200}/i,
    assinatura: /(advogado|oab|assinatura|procurador)[^\n]{0,100}/i
  };
  const regex = regexes[blocoKey];
  if (!regex) return { exemplo: null, fonte: null };
  for (const book of books) {
    const match = book.content.match(regex);
    if (match) {
      return { exemplo: match[0].trim(), fonte: book.file };
    }
  }
  return { exemplo: null, fonte: null };
}

function buscarArtigoProximo(artigo: string, books: { file: string, content: string }[]): { artigo: string, trecho: string, fonte: string } | null {
  const artNum = parseInt(artigo.replace(/[^0-9]/g, ''));
  if (isNaN(artNum)) return null;
  for (const book of books) {
    const regex = /art\.\s*(\d+)/gi;
    let m;
    let closest: { artigo: string, trecho: string, fonte: string } | null = null;
    let minDiff = Infinity;
    while ((m = regex.exec(book.content)) !== null) {
      const num = parseInt(m[1]);
      if (!isNaN(num)) {
        const diff = Math.abs(num - artNum);
        if (diff > 0 && diff < minDiff) {
          minDiff = diff;
          closest = { artigo: m[0], trecho: book.content.substr(m.index, 120), fonte: book.file };
        }
      }
    }
    if (closest) return closest;
  }
  return null;
}

// Endpoint aprimorado de validação avançada de peças
app.post('/api/validate-piece', express.json({limit: '2mb'}), async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text: string };
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Texto da peça não fornecido.' });
      return;
    }
    // 1. Blocos formais detalhados
    const ordemPadrao = ['enderecamento','qualificacao','fatos','fundamentos','pedidos','requerimentosFinais','assinatura'];
    const extractResult = extractFormalBlocks(text);
    const blocosFormais = extractResult.result;
    const ordemDetectada = extractResult.ordemDetectada;
    // 2. Citações detalhadas
    const citations = extractCitationsDetailed(text);
    // 3. Carregar livros
    const books = getAllBookTexts();
    // 4. Validar citações
    const citacoesDetalhadas = citations.map(citacao => {
      const found = findCitationInBooksDetailed(citacao, books);
      let sugestao = null;
      let exemploProximo = null;
      let fonteProxima = null;
      if (!found.encontrado) {
        sugestao = 'Verifique se a lei está carregada ou se há erro de digitação.';
        // Buscar artigo próximo
        const prox = buscarArtigoProximo(citacao.artigo, books);
        if (prox) {
          exemploProximo = prox.trecho;
          fonteProxima = prox.fonte;
        }
      }
      return {
        ...citacao,
        encontrado: found.encontrado,
        documento: found.documento,
        sugestao,
        exemploProximo,
        fonteProxima
      };
    });
    // 5. Jurisprudência
    const jurisprudencia = extractJurisprudencia(text).map((j) => ({ citacao: j, detectado: true }));
    // 6. Sugestões e exemplos de blocos
    for (const bloco of Object.keys(blocosFormais)) {
      const info = (blocosFormais as any)[bloco];
      if (!info.presente) {
        const exemplo = buscarExemploBlocoNoRAG(bloco, books);
        (blocosFormais as any)[bloco].exemploRAG = exemplo.exemplo;
        (blocosFormais as any)[bloco].fonte = exemplo.fonte;
        (blocosFormais as any)[bloco].explicacao = 'Não detectado, esperado conforme estrutura formal. Veja exemplo do acervo.';
      } else {
        (blocosFormais as any)[bloco].explicacao = `Detectado pelo padrão: ${info.trecho ? info.trecho.slice(0, 40) + '...' : ''}`;
      }
    }
    const sugestoes = [];
    for (const bloco of Object.keys(blocosFormais)) {
      if (!blocosFormais[bloco].presente) sugestoes.push(`Adicionar bloco de ${bloco}.`);
    }
    citacoesDetalhadas.forEach((c) => {
      if (!c.encontrado) sugestoes.push(`Citação '${c.citacao}' não encontrada nos documentos internos.`);
    });
    const ordemSugestao = sugerirOrdemBlocos(ordemDetectada, ordemPadrao);
    if (ordemSugestao) sugestoes.push(ordemSugestao);
    res.json({
      blocosFormais,
      citacoes: citacoesDetalhadas,
      jurisprudencia,
      sugestoes
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao validar peça.' });
  }
});

// Endpoint de extração de texto deve usar upload (memoryStorage)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.post('/api/process/extract-text', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Arquivo não enviado.' });
      return;
    }
    const file = req.file;
    let text = '';
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      const pdfParse = require('pdf-parse');
      const dataBuffer = file.buffer;
      const data = await pdfParse(dataBuffer);
      text = data.text;
    } else if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      text = file.buffer.toString('utf8');
    } else {
      res.status(400).json({ error: 'Formato de arquivo não suportado.' });
      return;
    }
    const saveDir = path.join(__dirname, '../../public/books/uploads/extraidos');
    if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
    const baseName = file.originalname.replace(/\.[^/.]+$/, '');
    const savePath = path.join(saveDir, baseName + '.txt');
    fs.writeFileSync(savePath, text, 'utf8');
    if (!text || !text.trim()) {
      console.warn('ATENÇÃO: Nenhum texto extraído do arquivo:', file.originalname);
      res.json({ text, saved: savePath, warning: 'Nenhum texto pôde ser extraído do arquivo. O PDF pode estar vazio, protegido ou conter apenas imagens.' });
      return;
    }
    console.log('Tamanho do texto extraído:', text.length);
    if (text.length < 1000) {
      console.warn('ATENÇÃO: Texto extraído muito pequeno! Pode estar incompleto ou o PDF não contém texto embutido.');
    }
    res.json({ text, saved: savePath });
  } catch (err) {
    console.error('Erro ao extrair texto do arquivo:', err);
    res.status(500).json({ error: 'Erro ao extrair texto do arquivo.' });
  }
});

// Adicionar endpoint para reindexação manual RAG
app.post('/api/rag-reindex', (req, res) => {
  try {
    // Executa o script rag_index.ts em background
    const child = spawn('npx', ['ts-node', 'backend/src/rag_index.ts'], {
      detached: true,
      stdio: 'ignore',
      shell: process.platform === 'win32',
    });
    child.unref();
    res.json({ ok: true, message: 'Reindexação RAG iniciada em background.' });
  } catch (err) {
    console.error('Erro ao iniciar reindexação RAG:', err);
    res.status(500).json({ error: 'Erro ao iniciar reindexação RAG.' });
  }
});

// --- Geração Autônoma de Peças Jurídicas ---
app.post('/api/generate-piece', async (req, res) => {
  try {
    const { tipoPeca, fatos, documentos, preferencias, agente = 'master' } = req.body;
    if (!tipoPeca || !fatos) {
      res.status(400).json({ error: 'tipoPeca e fatos são obrigatórios.' });
      return;
    }
    const agentKey = agente as keyof typeof LEGAL_AGENTS;
    const agentInstruction = LEGAL_AGENTS[agentKey]?.instruction || MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION;
    let prompt = `${agentInstruction}

Você deve gerar uma peça jurídica completa do tipo: ${tipoPeca}.

Fatos do caso:
${fatos}
`;
    if (documentos && Array.isArray(documentos) && documentos.length > 0) {
      prompt += `
Documentos relevantes (resuma e utilize apenas o que for pertinente):
${documentos.map((d, i) => `Documento ${i+1}:\n${d}`).join('\n\n')}
`;
    }
    if (preferencias) {
      prompt += `\nPreferências do usuário (linguagem, estrutura, pedidos, etc):\n${preferencias}\n`;
    }
    prompt += '\nGere a peça completa, com fundamentação jurídica, estrutura formal adequada, pedidos, e linguagem profissional.\n';
    const generated = await callLMStudio(prompt, tipoPeca);
    res.json({ peca: generated });
  } catch (error) {
    console.error('Erro ao gerar peça jurídica:', error);
    res.status(500).json({ error: 'Falha ao gerar peça jurídica.' });
  }
});

// --- Tomada de Decisão Jurídica Automatizada ---
app.post('/api/legal-decision', async (req, res) => {
  try {
    const { fatos, documentos, pergunta, agente = 'master' } = req.body;
    if (!fatos || !pergunta) {
      res.status(400).json({ error: 'fatos e pergunta são obrigatórios.' });
      return;
    }
    const agentKey = agente as keyof typeof LEGAL_AGENTS;
    const agentInstruction = LEGAL_AGENTS[agentKey]?.instruction || MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION;
    let prompt = `${agentInstruction}

Você deve atuar como um jurista autônomo e tomar uma decisão jurídica fundamentada para o seguinte caso.

Fatos do caso:
${fatos}
`;
    if (documentos && Array.isArray(documentos) && documentos.length > 0) {
      prompt += `\nDocumentos relevantes (resuma e utilize apenas o que for pertinente):\n${documentos.map((d, i) => `Documento ${i+1}:\n${d}`).join('\n\n')}
`;
    }
    prompt += `\nPergunta/objetivo do usuário:\n${pergunta}\n`;
    prompt += '\nAnalise os fatos, fundamente sua decisão com base na legislação e precedentes, recomende a melhor estratégia ou ação, e explique sua decisão de forma clara e detalhada.\n';
    const decision = await callLMStudio(prompt, 'Tomada de Decisão Jurídica');
    res.json({ decisao: decision });
  } catch (error) {
    console.error('Erro na tomada de decisão jurídica:', error);
    res.status(500).json({ error: 'Falha na tomada de decisão jurídica.' });
  }
});

app.post('/api/qdrant-reset', async (req, res) => {
  try {
    const collectionPath = path.join(__dirname, '../../../qdrant-x86_64-pc-windows-msvc/storage/collections/auxjuris_rag');
    if (fs.existsSync(collectionPath)) {
      fs.rmSync(collectionPath, { recursive: true, force: true });
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// Qdrant client config
const qdrant = new QdrantClient({ url: 'http://localhost:6333' });
const QDRANT_COLLECTION = 'auxjuris_rag';

// Endpoint: Listar todos os documentos/vetores
app.get('/api/qdrant/documents', async (req, res) => {
  try {
    const result = await qdrant.getCollection(QDRANT_COLLECTION);
    const points = await qdrant.scroll(QDRANT_COLLECTION, { limit: 1000 });
    res.json({
      status: 'ok',
      vectors: points.points.map((p: any) => ({
        id: p.id,
        payload: p.payload,
        vector: p.vector ? '[vetor oculto]' : undefined
      })),
      info: result
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Endpoint: Deletar documento/vetor por ID
app.delete('/api/qdrant/document/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await qdrant.delete(QDRANT_COLLECTION, { points: [id] });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// Endpoint: Status do Qdrant
app.get('/api/qdrant/status', async (req, res) => {
  try {
    const collections = await qdrant.getCollections();
    const info = await qdrant.getCollection(QDRANT_COLLECTION);
    res.json({
      status: 'ok',
      collections,
      collectionInfo: info
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Endpoint para deletar arquivo de uploads/extraidos
app.delete('/api/documents/:filename', async (req: Request<{ filename: string }>, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    // Segurança: não permitir path traversal
    if (filename.includes('..') || filename.includes('/')) {
      res.status(400).json({ error: 'Nome de arquivo inválido.' });
      return;
    }
    const filePath = path.join(__dirname, '../../public/books/uploads/extraidos', filename);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Arquivo não encontrado.' });
      return;
    }
    fs.unlinkSync(filePath);
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.listen(port, () => {
  console.log(`Servidor backend rodando em http://localhost:${port}`);
  console.log(`DEBUG: Servidor tentando escutar na porta: ${port}`);
});

app.post('/api/gerar-minuta', async (req: Request, res: Response) => {
  try {
    const { tipo, fatos, preferencias } = req.body;
    if (!tipo || !fatos) {
      res.status(400).json({ error: 'Tipo e fatos são obrigatórios para gerar minuta.' });
      return;
    }
    let prompt = `Você é um assistente jurídico avançado. Gere uma minuta de ${tipo} com base nos seguintes fatos e preferências:\n\nFatos: ${fatos}\n\nPreferências: ${preferencias}\n\nMinuta:`;
    const generatedText = await callLMStudio(prompt, `Geração de Minuta: ${tipo}`);
    res.json({ texto: generatedText });
  } catch (error) {
    console.error('Erro ao gerar minuta:', error);
    res.status(500).json({ error: 'Falha ao gerar minuta.' });
  }
});

app.get('/api/rag-sources', (req, res) => {
  const processDir = 'public/books/PROCESSOS/extraidos';
  const uploadDir = 'public/books/uploads/extraidos';
  let files: string[] = [];
  try {
    if (fs.existsSync(processDir)) {
      files = files.concat(
        fs.readdirSync(processDir).filter(f => f.endsWith('.txt'))
      );
    }
    if (fs.existsSync(uploadDir)) {
      files = files.concat(
        fs.readdirSync(uploadDir).filter(f => f.endsWith('.txt'))
      );
    }
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao listar fontes RAG', details: String(err) });
  }
});

// --- Configuração de Provedor e Modelos ---
// Pode ser alterado por variável de ambiente ou endpoint futuro
export const PROVIDERS = { // Adicionado 'export'
  GEMINI: 'gemini',
  LMSTUDIO: 'lmstudio',
};

let GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''; // Agora é 'let' e pode ser vazia por padrão
const GEMINI_MODEL = 'models/gemini-2.5-pro';

const LMSTUDIO_MODELS = [
  'unsloth/gemma-3-4b-it:2',
  'unsloth/gemma-3-4b-it',
  'granite-vision-3.2-2b',
];

// Provedor e modelo selecionados (padrão: LM Studio granite)
let SELECTED_PROVIDER = process.env.LLM_PROVIDER || PROVIDERS.LMSTUDIO;
let SELECTED_LMSTUDIO_MODEL = process.env.LM_STUDIO_MODEL || 'granite-vision-3.2-2b';

// Endpoint para alterar provedor/modelo em tempo de execução
app.post('/api/llm-config', (req, res) => {
  const { provider, lmstudioModel, geminiApiKey } = req.body;
  if (provider && Object.values(PROVIDERS).includes(provider)) {
    SELECTED_PROVIDER = provider;
  }
  if (lmstudioModel && LMSTUDIO_MODELS.includes(lmstudioModel)) {
    SELECTED_LMSTUDIO_MODEL = lmstudioModel;
  }
  if (geminiApiKey !== undefined) { // Permite que a chave seja uma string vazia
    GEMINI_API_KEY = geminiApiKey;
    console.log(`[DEBUG] Gemini API Key atualizada (tamanho: ${GEMINI_API_KEY.length})`);
  }
  res.json({ provider: SELECTED_PROVIDER, lmstudioModel: SELECTED_LMSTUDIO_MODEL, geminiApiKey: GEMINI_API_KEY });
});

// --- Ajustar chamadas para usar provedor/modelo selecionado ---

// --- Novo endpoint para testar Gemini ---
app.post('/api/chat-gemini', async (req, res) => {
  try {
    let { prompt } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt é obrigatório.' });
      return;
    }
    // Chamar Gemini
    // Este endpoint /api/chat-gemini não é mais usado pela função callLLM,
    // mas se for usado diretamente, deve usar a chave da variável global.
    // A API do Gemini espera a chave na URL para generateContent.
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=' + GEMINI_API_KEY;
    const response = await axios.post(url, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    });
    const result = response.data;
    if (result && result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) {
      res.json({ text: result.choices[0].message.content.trim() });
    } else {
      res.status(500).json({ error: 'Resposta inesperada do Gemini' });
    }
  } catch (error) {
    console.error('Erro ao chamar Gemini:', error);
    res.status(500).json({ error: 'Falha ao obter resposta do Gemini.' });
  }
});

// --- Função para chamar Gemini 2.5 Pro ---
async function callGemini(prompt: string, task: string = '', temperature: number = 0.7, max_tokens: number = 2048): Promise<string> {
  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=' + GEMINI_API_KEY;
    const messages = [
      { role: 'user', parts: [{ text: (task ? `Tarefa: ${task}.\n` : '') + prompt }] }
    ];
    const response = await axios.post(url, {
      contents: messages,
      generationConfig: {
        temperature,
        maxOutputTokens: max_tokens
      }
    });
    const result = response.data;
    if (result && result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0].text) {
      return result.candidates[0].content.parts[0].text.trim();
    }
    throw new Error('Resposta inesperada do Gemini');
  } catch (error) {
    console.error('Erro ao chamar Gemini:', error);
    throw new Error('Falha ao obter resposta do Gemini. Verifique a chave e a cota da API.');
  }
}

// --- Função de roteamento para o LLM selecionado ---
async function callLLM(prompt: string, task: string = '', temperature: number = 0.7, max_tokens: number = 2048): Promise<string> {
  if (SELECTED_PROVIDER === PROVIDERS.GEMINI) {
    return await callGemini(prompt, task, temperature, max_tokens);
  } else {
    return await callLMStudio(prompt, task, SELECTED_LMSTUDIO_MODEL, temperature, max_tokens);
  }
}
