import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Load environment variables from multiple possible locations
const loadEnvFile = () => {
  // Try loading from .env first
  dotenv.config({ path: __dirname + '/../.env' });
  
  // If API key is not set, try .env.new
  if (!process.env.GOOGLE_API_KEY) {
    console.log('API key not found in .env, trying .env.new');
    dotenv.config({ path: __dirname + '/../.env.new' });
  }

  // If still not set, try .env.example as last resort
  if (!process.env.GOOGLE_API_KEY) {
    console.log('API key not found in .env.new, trying .env.example');
    dotenv.config({ path: __dirname + '/../.env.example' });
  }
};

loadEnvFile();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Get API key from environment variables
const apiKey = process.env.GOOGLE_API_KEY || 'AIzaSyDKZim-kg3vMXkPqQt3gNDHNqhWF7dnE9M';

if (process.env.GOOGLE_API_KEY) {
  console.log('API Key do Google Gemini carregada das variáveis de ambiente');
} else {
  console.log('AVISO: Usando API Key de fallback. Recomendado configurar GOOGLE_API_KEY no arquivo .env');
}

// Initialize Google AI
const genAI = new GoogleGenerativeAI(apiKey);

// --- Constants from Frontend (Adjusted as needed) ---
const GEMINI_ANALYSIS_MODEL = 'gemini-1.5-pro'; // Modelo que foi testado e funciona

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

const MASTER_LEGAL_EXPERT_REVIEW_TASK_PROMPT_TEMPLATE = (original_analysis_text: string, analysis_type: string): string => 
  `Como um revisor especializado e experiente Prof. Marcelo Claro no direito brasileiro, revise e aprimore o seguinte texto de análise/resposta para garantir a precisão jurídica, clareza, profundidade e aderência ao contexto de ${analysis_type}. Corrija quaisquer imprecisões, adicione insights relevantes e formate a resposta de maneira profissional e juridicamente robusta. O texto original para revisão é:

---
${original_analysis_text}
---

Sua revisão e aprimoramento (resposta final):`;

const MAX_CHARS_FOR_SUMMARIZATION_INPUT = 200000; // Max chars do doc original para a *primeira* sumarização

const modelConfig = {
  safetySettings: [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ],
};

// --- Helper function to call Gemini with review step ---
async function callGeminiWithReview(
  taskPrompt: string,
  analysisTypeForReview: string
): Promise<string> {
  let rawAnalysisText = "";
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_ANALYSIS_MODEL });
    const result = await model.generateContent({
      contents: [
        { role: 'user', parts: [{ text: taskPrompt }] }
      ],
      safetySettings: modelConfig.safetySettings
    });
    const response = result.response;
    if (!response.text) {
        throw new Error("API did not return text in the response.");
    }
    rawAnalysisText = response.text().trim() || "";
  } catch (error) {
    console.error(`Error in initial Gemini API call for ${analysisTypeForReview}:`, error);
    throw new Error(`Falha na análise primária de ${analysisTypeForReview}: ${error instanceof Error ? error.message : String(error)}`);
  }

  let reviewedText = "";
  try {
    const reviewUserPrompt = MASTER_LEGAL_EXPERT_REVIEW_TASK_PROMPT_TEMPLATE(rawAnalysisText, analysisTypeForReview);
    const reviewModel = genAI.getGenerativeModel({
      model: GEMINI_ANALYSIS_MODEL,
    });
    // Pass system instruction as the first item in the contents array
    const reviewedResult = await reviewModel.generateContent({
      contents: [
        { role: 'system', parts: [{ text: MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION }] },
        { role: 'user', parts: [{ text: reviewUserPrompt }] },
      ],
      safetySettings: modelConfig.safetySettings
    });
    const reviewedResponse = reviewedResult.response;
     if (!reviewedResponse.text) {
        console.log(`Review API did not return text. Using raw analysis for ${analysisTypeForReview}.`);
        return rawAnalysisText; // Use raw if review fails to return text
    }
    reviewedText = reviewedResponse.text().trim() || rawAnalysisText; // Use raw if text is empty

  } catch (error) {
    console.error(`Error in Master Agent review for ${analysisTypeForReview}:`, error);
    console.log(`Falha na revisão pelo Pro. Marcelo Claro para ${analysisTypeForReview.toLowerCase()}. Exibindo resultado primário.`);
    return rawAnalysisText; // Return raw analysis if review fails
  }

  return reviewedText;
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    let { prompt, agentId: rawAgentId } = req.body; // Use rawAgentId for the potentially unvalidated input

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório.' });
    }

    // Validate and fallback agentId
    let agentId: keyof typeof LEGAL_AGENTS = 'master'; // Default to master
    const validAgentKeys = Object.keys(LEGAL_AGENTS) as Array<keyof typeof LEGAL_AGENTS>;
    if (typeof rawAgentId === 'string' && validAgentKeys.includes(rawAgentId as keyof typeof LEGAL_AGENTS)) {
      agentId = rawAgentId as keyof typeof LEGAL_AGENTS; // Assign and assert
    }

    // Obter a instrução e nome do agente selecionado using the validated agentId
    const agentInstruction = LEGAL_AGENTS[agentId].instruction;
    const agentName = LEGAL_AGENTS[agentId].name;

    console.log(`Recebida solicitação de chat para o agente ${agentName} com prompt: ${prompt.substring(0, 100)}...`);

    // Preparar o modelo
    const model = genAI.getGenerativeModel({ model: GEMINI_ANALYSIS_MODEL });
    
    // Configurar a geração
    const generationConfig = {
      temperature: 0.7,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 8192,
    };

    // Configurar segurança
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    // Adicionar instrução para responder em português brasileiro ao prompt
    const promptComInstrucao = `${agentInstruction}

Pergunta do usuário: ${prompt}

Lembre-se de responder SEMPRE em português brasileiro como um ${agentName}.`;

    // Configurar a sessão de chat
    const chat = model.startChat({
      generationConfig,
      safetySettings,
      history: [
        {
          role: "user",
          parts: [{ text: agentInstruction }],
        },
        {
          role: "model",
          parts: [{ text: `Entendido. Estou pronto para fornecer assistência jurídica especializada como ${agentName} em português brasileiro. Como posso ajudar hoje?` }],
        },
      ],
    });

    // Enviar o prompt com instrução e obter a resposta
    const result = await chat.sendMessage(promptComInstrucao);
    const response = await result.response;
    const text = response.text();
    console.log('Resposta recebida da API do Google Gemini com sucesso');
    res.json({ reply: text });
  } catch (error) {
    console.error("Erro específico da API do Google Gemini:", error);
    
    // Tentar com modelo alternativo se o primeiro falhar
    try {
      console.log('Tentando com modelo alternativo gemini-1.0-pro...');
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
      const result = await fallbackModel.generateContent(req.body.prompt);
      const response = await result.response;
      const text = response.text();
      console.log('Resposta recebida do modelo alternativo com sucesso');
      res.json({ reply: text });
    } catch (fallbackError) {
      console.error("Erro com modelo alternativo:", fallbackError);
      
      // Tentar com segundo modelo alternativo
      try {
        console.log('Tentando com modelo alternativo gemini-pro...');
        const fallbackModel2 = genAI.getGenerativeModel({ model: "gemini-pro" });
        const result = await fallbackModel2.generateContent(req.body.prompt);
        const response = await result.response;
        const text = response.text();
        console.log('Resposta recebida do segundo modelo alternativo com sucesso');
        res.json({ reply: text });
      } catch (fallbackError2) {
        console.error("Erro com segundo modelo alternativo:", fallbackError2);
        res.status(500).json({ error: 'Falha ao processar a requisição com todos os modelos disponíveis.' });
      }
    }
  }
});

// --- New Analysis Endpoints ---

app.post('/api/analyze/summary', async (req, res) => {
  try {
    const { documentText } = req.body;

    if (!documentText) {
      return res.status(400).json({ error: 'documentText é obrigatório para sumarização.' });
    }

    let effectiveDocumentText = documentText;
    if (documentText.length > MAX_CHARS_FOR_SUMMARIZATION_INPUT) {
      effectiveDocumentText = documentText.substring(0, MAX_CHARS_FOR_SUMMARIZATION_INPUT);
      console.log(`Documento truncado para ${effectiveDocumentText.length} caracteres para sumarização.`);
    }

    const taskPrompt = SUMMARIZER_PROMPT_TEMPLATE(effectiveDocumentText);
    const summary = await callGeminiWithReview(taskPrompt, "Resumo");

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
      return res.status(400).json({ error: 'documentText é obrigatório para extrair insights.' });
    }

    // Assuming documentText passed here might be a summary if original was too long
    const taskPrompt = INSIGHTS_EXTRACTOR_PROMPT_TEMPLATE(documentText, summaryText);
    const insights = await callGeminiWithReview(taskPrompt, "Insights");

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
      return res.status(400).json({ error: 'documentText é obrigatório para análise SWOT.' });
    }
     // Assuming documentText passed here might be a summary if original was too long
    const taskPrompt = SWOT_ANALYSIS_PROMPT_TEMPLATE(documentText, summaryText, insightsText);
    const swot = await callGeminiWithReview(taskPrompt, "Análise SWOT");

    // Basic parsing of SWOT text into object (can be improved)
    const swotResult: SwotAnalysis = {};
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
      return res.status(400).json({ error: 'Os textos dos dois documentos (documentAText, documentBText) são obrigatórios para comparação.' });
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

    const comparisonResult = await callGeminiWithReview(taskPrompt, "Comparação Jurídica");

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

app.listen(port, () => {
  console.log(`Servidor backend rodando em http://localhost:${port}`);
});
