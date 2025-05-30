// src/App.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FileUploadArea } from './components/FileUploadArea';
import { ChatInterface } from './components/ChatInterface';
import LoadingSpinner from './components/LoadingSpinner';
import { DocumentList } from './components/DocumentList';
import { ComparisonSidebar } from './components/ComparisonSidebar';
import { ComparisonResultModal } from './components/ComparisonResultModal';
import { InternalBookSelector } from './components/InternalBookSelector';
import { AIResponseHistory } from './components/AIResponseHistory'; // New Component
import { AgentSelector } from './components/AgentSelector'; // Novo componente para seleção de agentes
import type { ChatMessage, UploadedDocument, RagData, SwotAnalysis, ComparisonSource, LegalAgent, PredefinedBook, RagDataItem } from './types';
import { MessageSender } from './types';
import {
  MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION,
  RAG_PREAMBLE,
  MAX_FILES,
  SUMMARIZER_PROMPT_TEMPLATE,
  INSIGHTS_EXTRACTOR_PROMPT_TEMPLATE,
  SWOT_ANALYSIS_PROMPT_TEMPLATE,
  COMPARISON_PROMPT_TEMPLATE,
  MASTER_LEGAL_EXPERT_REVIEW_TASK_PROMPT_TEMPLATE,
  GEMINI_CHAT_MODEL_GENERAL,
  GEMINI_ANALYSIS_MODEL,
  MAX_TEXT_LENGTH_FOR_DIRECT_ANALYSIS,
  MAX_CHARS_FOR_SUMMARIZATION_INPUT,
  LEGAL_AGENTS,
  DEFAULT_AGENT_ID,
} from './constants';
import { PREDEFINED_BOOKS } from './predefined-books';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { downloadFile } from './utils'; // New utility import

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const cleanTextForRag = (text: string | undefined | null): string => {
  if (!text) return "";
  let cleaned = text;
  // Remove common page footers/headers with page numbers or document titles
  cleaned = cleaned.replace(/^\s*\d+\s*(Constituição da República Federativa do Brasil|Dos Direitos e Garantias Fundamentais|Decreto-lei\s+n[oº]?\s*2\.848\/\d{2,4}|Código\s+Penal|Da\s+Organização\s+do\s+Estado|Da\s+Organização\s+dos\s+Poderes|Da\s+Tributação\s+e\s+do\s+Orçamento|Da\s+Ordem\s+Econômica\s+e\s+Financeira|Da\s+Ordem\s+Social|Ato\s+das\s+Disposições\s+Constitucionais\s+Transitórias|Emendas\s+Constitucionais(\s+de\s+Revisão)?)\s*$/gmi, "");
  cleaned = cleaned.replace(/\bNE:\s*ver\s*AD[PI]s?\s*n[oº]?s?\s*[\d\.]+[^\n]*/gi, ""); // Remove "NE: ver ADI/ADPF..."
  cleaned = cleaned.replace(/\s*\b(Página\s+\d+|\d+\s*\[Página \d+\])\s*/gi, ""); // Remove "Página X" artifacts
  cleaned = cleaned.replace(/\b\d+\s*$/gm, ""); // Remove trailing page numbers if they are standalone on a line (more aggressively)
  cleaned = cleaned.replace(/\b[\s]{3,}\d*$/gm, ""); // Remove placeholder junk and page numbers
  cleaned = cleaned.replace(/^o\s*([A-ZÀ-Üa-zà-ü])/gm, '$1'); // Remove "o " prefix if followed by a letter
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines
  return cleaned.trim();
};

const extractTextFromPdfBook = async (pdfBuffer: ArrayBuffer): Promise<string> => {
  if (typeof window.pdfjsLib === 'undefined' || !window.pdfjsLib.getDocument) {
    throw new Error("pdf.js não carregado. Por favor, verifique sua conexão ou a inclusão da biblioteca.");
  }
  const pdf = await window.pdfjsLib.getDocument({ data: pdfBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
  }
  return cleanTextForRag(fullText.trim());
};

const App: React.FC = () => {
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [ragData, setRagData] = useState<RagData | null>(null);
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false);

  const [currentAgentId, setCurrentAgentId] = useState<string>(DEFAULT_AGENT_ID);
  const [customSystemPromptInput, setCustomSystemPromptInput] = useState<string>('');
  const [isCustomPromptEnabled, setIsCustomPromptEnabled] = useState<boolean>(false);
  
  const [currentUiMessages, setCurrentUiMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);

  const [documentForComparisonA_Id, setDocumentForComparisonA_Id] = useState<string | null>(null);
  const [documentForComparisonA_Source, setDocumentForComparisonA_Source] = useState<ComparisonSource>(null);
  const [documentForComparisonA_Text, setDocumentForComparisonA_Text] = useState<string>('');
  const [documentForComparisonB, setDocumentForComparisonB] = useState<UploadedDocument | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [comparisonResult, setComparisonResult] = useState<string>('');
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);

  const [docBProcessing, setDocBProcessing] = useState<boolean>(false);
  const [docBError, setDocBError] = useState<string | null>(null);

  const { speak, cancelSpeech, isSpeaking, ttsError } = useTextToSpeech();

  // Encontrar o agente selecionado com base no ID atual
  const selectedAgent = useMemo(() => {
    return LEGAL_AGENTS.find(agent => agent.id === currentAgentId) || 
           LEGAL_AGENTS.find(agent => agent.id === DEFAULT_AGENT_ID) || 
           LEGAL_AGENTS[0];
  }, [currentAgentId]);

  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [internalBooksData, setInternalBooksData] = useState<Map<string, { content: string | null; isLoading: boolean; error: string | null; name: string }>>(new Map());
  const [systemMessage, setSystemMessage] = useState<string | null>(null);

  const cleanAiText = (text: string): string => {
    if (typeof text !== 'string') return '';
    let cleaned = text;
    cleaned = cleaned.replace(/^\s*[-*+]\s+/gm, '');
    cleaned = cleaned.replace(/^\s*\d+\.\s+/gm, '');

    cleaned = cleaned.replace(/(?<!\\)(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, '$2');
    cleaned = cleaned.replace(/(?<!\\)(\*|_)(?=\S)(.+?)(?<=\S)\1/g, '$2');

    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = cleaned.match(fenceRegex);
    if (match && match[2]) {
      cleaned = match[2].trim();
    }
    cleaned = cleaned.replace(/^```\s*\n?|\n?\s*```$/g, '');

    return cleaned.trim();
  };

  const addMessageToUi = useCallback((sender: MessageSender, text: string, id?: string, sources?: { uri: string; title: string }[]): ChatMessage => {
    const newMessage: ChatMessage = {
      id: id || `${sender}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sender,
      text: sender === MessageSender.AI ? cleanAiText(text) : text,
      timestamp: new Date(),
      sources,
    };
    setCurrentUiMessages((prev: ChatMessage[]) => [...prev, newMessage]);
    if (sender === MessageSender.SYSTEM) {
      setSystemMessage(text); 
      setTimeout(() => setSystemMessage(null), 5000); 
    }
    return newMessage;
  }, []); 

  useEffect(() => {
    if (typeof window !== 'undefined' && window.pdfjsLib) {
      if (window.pdfjsLib.GlobalWorkerOptions && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${window.pdfjsLib.version}/pdf.worker.min.js`;
      }
    }
  }, []);

  useEffect(() => {
    selectedBookIds.forEach((bookId: string) => {
        const book = PREDEFINED_BOOKS.find((b: PredefinedBook) => b.id === bookId);
        if (book && (!internalBooksData.has(bookId) || (!internalBooksData.get(bookId)?.content && !internalBooksData.get(bookId)?.isLoading && !internalBooksData.get(bookId)?.error))) {
            setInternalBooksData((prev: Map<string, { content: string | null; isLoading: boolean; error: string | null; name: string }>) => new Map(prev).set(bookId, { content: null, isLoading: true, error: null, name: book.name }));

            const folder = String(book.folderName || '').trim().replace(/^\/+|\/+$/g, '');
            const file = String(book.fileName || '').trim().replace(/^\/+|\/+$/g, '');
            const fetchUrlToUse = `/books/${folder}/${file}`;
            
            console.log(`Tentando carregar livro ${book.name} de ${fetchUrlToUse}`);
            
            // Removido o código de verificação de versão TXT para arquivos PDF
            // Agora estamos usando diretamente os arquivos .txt definidos no predefined-books.ts
            
            fetch(fetchUrlToUse)
                .then(async response => { 
                    if (!response.ok) {
                        const attemptedUrl = fetchUrlToUse;
                        const actualResponseUrl = response.url || "(vazio na resposta)";
                        throw new Error(`Falha ao carregar ${book.name} (HTTP ${response.status})${response.statusText ? `: ${response.statusText}` : ''}. URL Tentada: ${attemptedUrl}, URL da Resposta: ${actualResponseUrl}`);
                    }
                    if (book.fileName.endsWith('.pdf')) {
                        return await response.arrayBuffer(); 
                    }
                    return await response.text(); 
                })
                .then(async (data: ArrayBuffer | string) => {
                    let processedContent = "";
                    
                    try {
                        // Verifica se os dados são uma string (pode ser texto ou resultado do tryAlternativeFile)
                        if (typeof data === 'string') {
                            console.log(`Processando dados de texto para ${book.name}`);
                            processedContent = cleanTextForRag(data);
                        }
                        // Se não for string e o arquivo original era PDF, tenta processar como ArrayBuffer
                        else if (book.fileName.endsWith('.pdf') && data instanceof ArrayBuffer) {
                            console.log(`Processando dados de PDF para ${book.name}`);
                            processedContent = await extractTextFromPdfBook(data);
                        }
                        // Caso de erro: tipo de dados incompatível
                        else {
                            console.error(`Tipo de dados inesperado para ${book.name}: ${typeof data}`);
                            throw new Error(`Erro de processamento para ${book.name}: tipo de conteúdo inesperado.`);
                        }
                        
                        // Verifica se o conteúdo processado é válido
                        if (!processedContent || processedContent.trim().length === 0) {
                            throw new Error(`Conteúdo vazio extraído de ${book.name}`);
                        }
                        
                        console.log(`Fonte interna "${book.name}" carregada com sucesso. Tamanho: ${processedContent.length} caracteres`);
                        setInternalBooksData((prev: Map<string, { content: string | null; isLoading: boolean; error: string | null; name: string }>) => 
                            new Map(prev).set(bookId, { content: processedContent, isLoading: false, error: null, name: book.name })
                        );
                        addMessageToUi(MessageSender.SYSTEM, `Fonte interna "${book.name}" carregada.`);
                    } catch (processingError) {
                        console.error(`Erro ao processar ${book.name}:`, processingError);
                        throw processingError;
                    }
                })
                .catch(error => {
                    console.error(`Erro ao buscar livro ${book.name}:`, error);
                    setInternalBooksData((prev: Map<string, { content: string | null; isLoading: boolean; error: string | null; name: string }>) => new Map(prev).set(bookId, { content: null, isLoading: false, error: error.message, name: book.name }));
                    addMessageToUi(MessageSender.SYSTEM, `Erro ao carregar fonte interna "${book.name}": ${error.message}`);
                });
        }
    });
    // Cleanup unselected books data
    internalBooksData.forEach((data: { content: string | null; isLoading: boolean; error: string | null; name: string }, bookId: string) => {
        if (!selectedBookIds.has(bookId) && (data.content || data.isLoading || data.error)) {
            setInternalBooksData((prev: Map<string, { content: string | null; isLoading: boolean; error: string | null; name: string }>) => {
                const newMap = new Map(prev);
                newMap.delete(bookId);
                return newMap;
            });
        }
    });
  }, [selectedBookIds, internalBooksData, addMessageToUi]);


  useEffect(() => {
    const userDocsRag: RagDataItem[] = uploadedDocuments
      .filter((doc: UploadedDocument) => !!doc.text)
      .map((doc: UploadedDocument) => ({
        documentName: doc.name,
        content: doc.text!,
        sourceType: 'user_document',
        summary: doc.summary,
        insights: doc.insights,
        swot: doc.swot,
      }));

    const internalBooksRag: RagDataItem[] = [];
    selectedBookIds.forEach((bookId: string) => {
      const bookData = internalBooksData.get(bookId);
      if (bookData?.content) {
        internalBooksRag.push({
          documentName: bookData.name,
          content: bookData.content,
          sourceType: 'internal_book',
          bookId: bookId,
        });
      }
    });

    const combinedRagData = [...userDocsRag, ...internalBooksRag];
    setRagData(combinedRagData.length > 0 ? combinedRagData : null);

  }, [uploadedDocuments, selectedBookIds, internalBooksData]);


  const callBackendAnalysisAPI = useCallback(async (
    endpoint: 'summary' | 'insights' | 'swot',
    documentText: string,
    summaryText?: string,
    insightsText?: string
  ): Promise<string | SwotAnalysis> => { // Updated return type
    const url = `http://localhost:3001/api/analyze/${endpoint}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentText, summaryText, insightsText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Backend analysis error (${endpoint}): ${response.status}`);
      }

      const data = await response.json();
      // The backend now returns the processed text directly
      switch(endpoint) {
        case 'summary': return data.summary || '';
        case 'insights': return data.insights || '';
        case 'swot':
            // Backend returns SWOT as an object
            return data.swot as SwotAnalysis; // Return the object directly with type assertion
        default: return '';
      }

    } catch (error) {
      console.error(`Error calling backend analysis endpoint ${endpoint}:`, error);
      throw new Error(`Falha ao obter ${endpoint} do backend: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);


  const handleFilesSelect = (files: File[]) => {
    const newDocuments: UploadedDocument[] = files.map((file: File) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`, name: file.name, text: '', file,
      processingAnalysis: false, analysisError: null,
    }));
    setUploadedDocuments((prev: UploadedDocument[]) => [...prev, ...newDocuments].slice(0, MAX_FILES));
    addMessageToUi(MessageSender.SYSTEM, `${newDocuments.length} arquivo(s) selecionado(s). Clique em "Extrair Texto" para processar e habilitar o chat RAG.`);
  };


  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileType = file.type;
    const reader = new FileReader();

    return new Promise<string>((resolve, reject) => {
        reader.onload = async (event) => {
            try {
                if (!event.target?.result) {
                    reject(new Error('Falha ao ler o arquivo.'));
                    return;
                }
                if (fileType === 'application/pdf') {
                    if (typeof window.pdfjsLib === 'undefined' || !window.pdfjsLib.getDocument) {
                        reject(new Error("pdf.js não carregado. Por favor, verifique sua conexão ou a inclusão da biblioteca."));
                        return;
                    }
                    const pdf = await window.pdfjsLib.getDocument({ data: event.target.result as ArrayBuffer }).promise;
                    let fullText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
                    }
                    resolve(fullText.trim());
                } else if (fileType === 'application/json' || fileType === 'text/plain' || file.name.endsWith('.jsonl')) {
                    resolve(event.target.result as string);
                } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
                    reject(new Error('A extração de texto de arquivos .docx não é suportada diretamente. Por favor, converta para PDF ou TXT.'));
                } else {
                    reject(new Error('Tipo de arquivo não suportado para extração de texto. Suportados: PDF, DOCX, JSON, JSONL, TXT.'));
                }
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));

        if (fileType === 'application/pdf') {
            reader.readAsArrayBuffer(file);
        } else if (fileType === 'application/json' || fileType === 'text/plain' || file.name.endsWith('.jsonl')) {
            reader.readAsText(file);
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
            // For .docx, we don't read the file here as we'll reject immediately in onload.
            // Alternatively, could read as array buffer if a future client-side parser is added.
            // For now, this path leads to rejection in onload.
             reader.readAsArrayBuffer(file); // Read to trigger onload, which will then reject.
        } else {
             reject(new Error('Tipo de arquivo não suportado. Use PDF, DOCX, JSON, JSONL ou TXT.'));
        }
    });
  };

  const processFiles = useCallback(async () => {
    const docsToProcess = uploadedDocuments.filter(d => !d.text && !d.processingAnalysis);
    if (docsToProcess.length === 0) {
      addMessageToUi(MessageSender.SYSTEM, "Nenhum novo arquivo para extrair texto.");
      return;
    }

    setIsProcessingFiles(true);
    addMessageToUi(MessageSender.SYSTEM, `Extraindo texto de ${docsToProcess.length} arquivo(s)...`);

    const processedDocs = await Promise.all(
        uploadedDocuments.map(async doc => {
            if (doc.text || doc.processingAnalysis) return doc; // Skip already processed or currently processing

            setUploadedDocuments(prev => prev.map(d => d.id === doc.id ? {...d, processingAnalysis: true, analysisError: null} : d));
            try {
                const fileContent = await extractTextFromFile(doc.file);
                addMessageToUi(MessageSender.SYSTEM, `Texto extraído de "${doc.name}".`);
                return { ...doc, text: fileContent, processingAnalysis: false, analysisError: fileContent ? null : 'Nenhum conteúdo extraído.' };
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido.';
                addMessageToUi(MessageSender.SYSTEM, `Erro ao processar ${doc.name}: ${errorMsg}`);
                return { ...doc, text: '', processingAnalysis: false, analysisError: errorMsg };
            }
        })
    );

    setUploadedDocuments(processedDocs);
    setIsProcessingFiles(false);

    const successfullyProcessedCount = processedDocs.filter(doc => doc.text && !doc.analysisError).length;
    const erroredDocsCount = processedDocs.filter(doc => doc.analysisError).length;

    if (successfullyProcessedCount > 0) {
      addMessageToUi(MessageSender.SYSTEM, `Extração de texto concluída. ${successfullyProcessedCount} documento(s) pronto(s) para análise ou chat com RAG.`);
    }
    if (erroredDocsCount > 0) {
        addMessageToUi(MessageSender.SYSTEM, `${erroredDocsCount} arquivo(s) não puderam ser processados completamente (verifique mensagens de erro individuais).`);
    }
    if (successfullyProcessedCount === 0 && erroredDocsCount === 0 && docsToProcess.length > 0){
         addMessageToUi(MessageSender.SYSTEM, "Nenhum texto pôde ser extraído dos novos arquivos ou os arquivos estavam vazios.");
    }


  }, [uploadedDocuments, addMessageToUi]);


  const handleAnalyzeDocument = useCallback(async (documentId: string) => {
    const docToUpdate = uploadedDocuments.find(d => d.id === documentId);
    if (!docToUpdate) return; 

    setUploadedDocuments(prevDocs =>
      prevDocs.map(d => d.id === documentId ? { ...d, processingAnalysis: true, analysisError: null } : d)
    );
    
    const currentDocToAnalyze = {...docToUpdate, processingAnalysis: true, analysisError: null};


    if (!currentDocToAnalyze || !currentDocToAnalyze.text) {
      const errorMsg = `Documento "${currentDocToAnalyze?.name || documentId}" não pode ser analisado (sem texto ou erro na extração). Verifique o status do arquivo.`;
      setUploadedDocuments(prevDocs =>
        prevDocs.map(d => d.id === documentId ? { ...d, processingAnalysis: false, analysisError: currentDocToAnalyze.analysisError || errorMsg } : d)
      );
      addMessageToUi(MessageSender.SYSTEM, errorMsg);
      return;
    }

    try {
      let textForAnalysis = currentDocToAnalyze.text;
      let currentSummary: string | undefined = undefined;
      let currentInsights: string | undefined = undefined;

      addMessageToUi(MessageSender.SYSTEM, `Iniciando análise de "${currentDocToAnalyze.name}"...`);

      if (currentDocToAnalyze.text.length > MAX_TEXT_LENGTH_FOR_DIRECT_ANALYSIS) {
        addMessageToUi(MessageSender.SYSTEM, `Documento "${currentDocToAnalyze.name}" é longo, gerando resumo inicial...`);
        currentSummary = await callBackendAnalysisAPI('summary', currentDocToAnalyze.text);
        textForAnalysis = currentSummary; 
        addMessageToUi(MessageSender.SYSTEM, `Resumo de "${currentDocToAnalyze.name}" gerado e refinado.`);
      } else {
        currentSummary = await callBackendAnalysisAPI('summary', currentDocToAnalyze.text);
        addMessageToUi(MessageSender.SYSTEM, `Resumo de "${currentDocToAnalyze.name}" gerado e refinado.`);
      }

      currentInsights = await callBackendAnalysisAPI('insights', textForAnalysis, currentSummary);
      addMessageToUi(MessageSender.SYSTEM, `Insights de "${currentDocToAnalyze.name}" gerados e refinados.`);
cls
      const swotFullText = await callBackendAnalysisAPI('swot', textForAnalysis, currentSummary, currentInsights);
      addMessageToUi(MessageSender.SYSTEM, `Análise SWOT de "${currentDocToAnalyze.name}" gerada e refinada.`);

      const swotResult: SwotAnalysis = {};
      const swotSections = ["Forças:", "Fraquezas:", "Oportunidades:", "Ameaças:"];
      let currentSectionKey: keyof SwotAnalysis | null = null;
      swotFullText.split('\n').forEach(line => {
        const trimmedLine = line.trim();
        const matchedSection = swotSections.find(s => trimmedLine.toLowerCase().startsWith(s.toLowerCase().replace(':', '')));
        if (matchedSection) {
          currentSectionKey = matchedSection.toLowerCase().replace(':', '') as keyof SwotAnalysis;
          const contentAfterTitle = trimmedLine.substring(matchedSection.length).trim();
          swotResult[currentSectionKey!] = (swotResult[currentSectionKey!] || "") + (contentAfterTitle ? contentAfterTitle + "\n" : "");
        } else if (currentSectionKey && trimmedLine) {
          swotResult[currentSectionKey!] += trimmedLine + "\n";
        }
      });
      for (const key in swotResult) {
          swotResult[key as keyof SwotAnalysis] = cleanAiText(swotResult[key as keyof SwotAnalysis]?.trim() || "");
      }

      setUploadedDocuments(prevDocs =>
        prevDocs.map(d => d.id === documentId ? { ...d, summary: cleanAiText(currentSummary || currentDocToAnalyze.summary || ""), insights: cleanAiText(currentInsights || ""), swot: swotResult, processingAnalysis: false, analysisError: null } : d)
      );
      addMessageToUi(MessageSender.SYSTEM, `Análise completa de "${currentDocToAnalyze.name}" finalizada.`);
    } catch (error) {
      const errorMsg = `Erro na análise Gemini para "${currentDocToAnalyze.name}": ${error instanceof Error ? error.message : String(error)}`;
      setUploadedDocuments(prevDocs =>
        prevDocs.map(d => d.id === documentId ? { ...d, processingAnalysis: false, analysisError: errorMsg } : d)
      );
      addMessageToUi(MessageSender.SYSTEM, errorMsg);
    }
  }, [uploadedDocuments, addMessageToUi, callBackendAnalysisAPI]);

  /**
   * Handles sending a message to the backend to get a response from the AI.
   *
   * @param {string} userInput The text input from the user.
   * @returns {Promise<void>}
   */
  const handleSendMessage = useCallback(async (userInput: string) => {
    if (isLoadingChat || !userInput.trim()) return;
    cancelSpeech();

    addMessageToUi(MessageSender.USER, userInput);

    setIsLoadingChat(true);
    const aiUiMsgPlaceholder = addMessageToUi(MessageSender.AI, "Digitando...", `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: userInput,
          agentId: currentAgentId // Enviar o ID do agente selecionado
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Backend error: ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data.reply;

      const finalTextToDisplay = cleanAiText(aiReply) || "Não obtive uma resposta válida do backend.";

      setCurrentUiMessages(prev => prev.map(msg =>
        msg.id === aiUiMsgPlaceholder.id ? { ...msg, text: finalTextToDisplay, sources: undefined, sender: MessageSender.AI } : msg
      ));

      if(finalTextToDisplay !== "Não obtive uma resposta válida do backend.") speak(finalTextToDisplay);

    } catch (error) {
      let errorText = `Desculpe, ocorreu um erro ao comunicar com o backend: ${error instanceof Error ? error.message : String(error)}`;

      setCurrentUiMessages(prev => prev.map(msg =>
        msg.id === aiUiMsgPlaceholder.id ? { ...msg, text: errorText, sources: undefined, sender: MessageSender.AI } : msg
      ));
    } finally {
      setIsLoadingChat(false);
    }
  }, [isLoadingChat, addMessageToUi, speak, cancelSpeech, currentAgentId]);

  const handleToggleSpeak = useCallback(() => {
    if (isSpeaking) {
      cancelSpeech();
    } else {
      const lastAiMessage = [...currentUiMessages].reverse().find(m => m.sender === MessageSender.AI);
      if (lastAiMessage && lastAiMessage.text) {
        speak(lastAiMessage.text);
      } else {
        addMessageToUi(MessageSender.SYSTEM, "Nenhuma mensagem da IA para ler.");
      }
    }
  }, [isSpeaking, cancelSpeech, currentUiMessages, speak, addMessageToUi]);

  const handleFileForComparisonB = useCallback(async (file: File | null) => {
    setComparisonError(null);
    setDocBError(null);
    if (!file) {
      setDocumentForComparisonB(null);
      return;
    }
    setDocBProcessing(true);
    try {
      const text = await extractTextFromFile(file);
      setDocumentForComparisonB({
        id: `compare-doc-b-${Date.now()}`, name: file.name, text, file,
        processingAnalysis: false, analysisError: null
      });
      addMessageToUi(MessageSender.SYSTEM, `Documento "${file.name}" carregado para comparação.`);
    } catch (error) {
      const errorMsg = `Erro ao processar Documento B: ${error instanceof Error ? error.message : 'Desconhecido'}`;
      addMessageToUi(MessageSender.SYSTEM, errorMsg);
      setDocBError(errorMsg);
      setDocumentForComparisonB(null);
    } finally {
        setDocBProcessing(false);
    }
  }, [addMessageToUi]);

  const handleStartComparison = useCallback(async () => {
    if (!documentForComparisonA_Text || !documentForComparisonB?.text) {
      let errorMsg = "Ambos os documentos (A e B) devem ser selecionados e processados para comparação.";
      if (documentForComparisonB && documentForComparisonB.analysisError) { // If Doc B had an extraction error
        errorMsg = `Documento B ("${documentForComparisonB.name}") não pôde ser processado: ${documentForComparisonB.analysisError}. Não é possível comparar.`;
      } else if (!documentForComparisonA_Text) {
        errorMsg = "Documento A não foi selecionado ou não possui texto.";
      } else if (!documentForComparisonB?.text) {
        errorMsg = "Documento B não foi carregado ou não possui texto.";
      }
      setComparisonError(errorMsg);
      addMessageToUi(MessageSender.SYSTEM, `Erro na comparação: ${errorMsg}`);
      setShowComparisonModal(true); // Show modal to display this error
      return;
    }
    setIsComparing(true);
    setComparisonResult('');
    setComparisonError(null);
    setShowComparisonModal(true);

    let docAName = "Documento A";
    if (documentForComparisonA_Source === 'lastAiResponse') {
        docAName = "Última Resposta da IA";
    } else if (documentForComparisonA_Id) {
        const docA = uploadedDocuments.find(d => d.id === documentForComparisonA_Id);
        if (docA) docAName = docA.name;
    }
    const docBName = documentForComparisonB.name;


    addMessageToUi(MessageSender.SYSTEM, `Iniciando comparação entre "${docAName}" e "${docBName}"...`);

    try {
      const comparisonPrompt = COMPARISON_PROMPT_TEMPLATE(
        docAName, documentForComparisonA_Text,
        docBName, documentForComparisonB.text
      );
      
      addMessageToUi(MessageSender.SYSTEM, `Realizando comparação primária...`);
      const initialResponse = await genAI.models.generateContent({
        model: GEMINI_ANALYSIS_MODEL, 
        contents: comparisonPrompt,
        config: { safetySettings: modelConfig.safetySettings }
      });
      const rawComparison = initialResponse.text.trim() || "Não foi possível gerar a comparação inicial.";

      addMessageToUi(MessageSender.SYSTEM, `Refinando comparação com o Pro. Marcelo Claro...`);
      const reviewPrompt = MASTER_LEGAL_EXPERT_REVIEW_TASK_PROMPT_TEMPLATE(rawComparison, "Comparação Jurídica");
      const reviewedResponse = await genAI.models.generateContent({
        model: GEMINI_ANALYSIS_MODEL,
        contents: reviewPrompt,
        config: { 
            safetySettings: modelConfig.safetySettings,
            systemInstruction: MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION
        }
      });
      const finalComparison = cleanAiText(reviewedResponse.text.trim() || rawComparison);

      setComparisonResult(finalComparison);
      addMessageToUi(MessageSender.SYSTEM, `Comparação entre "${docAName}" e "${docBName}" concluída.`);

    } catch (error: any) {
      const errorMsg = `Erro na comparação: ${error.message || String(error)}`;
      console.error("Comparison error:", error);
      setComparisonError(errorMsg);
      addMessageToUi(MessageSender.SYSTEM, errorMsg);
    } finally {
      setIsComparing(false);
    }
  }, [
    documentForComparisonA_Text, 
    documentForComparisonA_Source, 
    documentForComparisonA_Id, 
    documentForComparisonB, 
    uploadedDocuments, 
    addMessageToUi,
  ]);

  const handleAgentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentAgentId(event.target.value);
  };

  const handleToggleBook = (bookId: string) => {
    setSelectedBookIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookId)) {
        newSet.delete(bookId);
         addMessageToUi(MessageSender.SYSTEM, `Fonte interna "${PREDEFINED_BOOKS.find(b=>b.id === bookId)?.name}" removida do contexto RAG.`);
      } else {
        newSet.add(bookId);
      }
      return newSet;
    });
  };
  
  const handleRetryBookLoadWithFile = useCallback(async (bookId: string, file: File) => {
    const book = PREDEFINED_BOOKS.find(b => b.id === bookId);
    if (!book) {
      addMessageToUi(MessageSender.SYSTEM, `Livro com ID ${bookId} não encontrado para tentativa de upload manual.`);
      return;
    }

    addMessageToUi(MessageSender.SYSTEM, `Tentando carregar manualmente "${book.name}" com o arquivo "${file.name}"...`);
    setInternalBooksData(prev => new Map(prev).set(bookId, {
      content: null,
      isLoading: true,
      error: null,
      name: book.name
    }));

    try {
      let extractedText: string;
      const bookFileName = book.fileName.toLowerCase();
      const fileType = file.type.toLowerCase();

      if (fileType === 'application/pdf' || bookFileName.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        extractedText = await extractTextFromPdfBook(arrayBuffer);
      } else if (fileType === 'text/plain' || fileType === 'application/json' || bookFileName.endsWith('.txt') || bookFileName.endsWith('.json') || bookFileName.endsWith('.jsonl')) {
        extractedText = await file.text();
        extractedText = cleanTextForRag(extractedText);
      } else {
        throw new Error(`Tipo de arquivo "${file.type}" ou nome "${book.fileName}" não suportado para upload manual de "${book.name}". Use PDF, TXT ou JSON.`);
      }
      
      if (!extractedText.trim()) { // Check if extracted text is not just whitespace
          throw new Error(`Nenhum texto útil extraído do arquivo manual para "${book.name}". O arquivo pode estar vazio ou ilegível.`);
      }

      setInternalBooksData(prev => new Map(prev).set(bookId, {
        content: extractedText,
        isLoading: false,
        error: null,
        name: book.name
      }));
      addMessageToUi(MessageSender.SYSTEM, `Fonte interna "${book.name}" carregada com sucesso via upload manual.`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Erro ao processar arquivo manual para ${book.name}:`, error);
      setInternalBooksData(prev => new Map(prev).set(bookId, {
        content: null,
        isLoading: false,
        error: `Falha no upload manual: ${errorMsg}`,
        name: book.name
      }));
      addMessageToUi(MessageSender.SYSTEM, `Erro ao carregar "${book.name}" manualmente: ${errorMsg}`);
    }
  }, [addMessageToUi]);


  const chatReady = !!uploadedDocuments.some(d => !!d.text && !d.analysisError) || selectedBookIds.size > 0;
  const ragContextAvailable = uploadedDocuments.some(d => !!d.text && !d.analysisError) || selectedBookIds.size > 0;
  const chatTitle = useMemo(() => selectedAgent ? selectedAgent.name : "Assistente jurídico avançado com múltiplos especialistas em Direito Brasileiro.", [selectedAgent]);

  const aiMessages = useMemo(() => {
    return currentUiMessages.filter(msg => msg.sender === MessageSender.AI);
  }, [currentUiMessages]);

  const handleDownloadCSV = useCallback(() => {
    if (aiMessages.length === 0) return;
    const csvHeader = "ID,Timestamp,Texto\n";
    const csvRows = aiMessages.map(msg => {
      const escapedText = msg.text.replace(/"/g, '""'); // Escape double quotes
      return `"${msg.id}","${msg.timestamp.toISOString()}","${escapedText}"`;
    }).join("\n");
    downloadFile(csvHeader + csvRows, "historico_respostas_ia.csv", "text/csv;charset=utf-8;");
    addMessageToUi(MessageSender.SYSTEM, "Histórico de respostas da IA baixado como CSV.");
  }, [aiMessages, addMessageToUi]);

  const handleDownloadJSON = useCallback(() => {
    if (aiMessages.length === 0) return;
    const jsonContent = JSON.stringify(aiMessages.map(m => ({id: m.id, timestamp: m.timestamp, text: m.text, sources: m.sources})), null, 2);
    downloadFile(jsonContent, "historico_respostas_ia.json", "application/json;charset=utf-8;");
    addMessageToUi(MessageSender.SYSTEM, "Histórico de respostas da IA baixado como JSON.");
  }, [aiMessages, addMessageToUi]);


  return (
    <div className="grid grid-cols-1 md:grid-cols-[384px_1fr_320px] h-screen antialiased text-gray-200">
      {/* Left Panel */}
      <aside className="bg-gray-800 p-4 space-y-4 border-r border-gray-700 flex flex-col overflow-y-auto custom-scrollbar md:h-screen h-auto">
        <div className="flex items-center space-x-2 pb-3 border-b border-gray-700">
          <img src="https://github.com/MarceloClaro/AUXJURIS/blob/main/jus.png?raw=true" alt="AuxJuris Logo" className="w-24 h-24 md:w-28 md:h-28 rounded-full border-2 border-sky-500 shadow-lg mx-auto" />
          <div>
             <h1 className="text-xl font-bold text-sky-400 text-center md:text-left">Assistente Jurídico IA</h1>
             <p className="text-xs text-gray-400 text-center md:text-left">Potencializado por Gemini & RAG</p>
          </div>
        </div>
        
        {systemMessage && (
          <div aria-live="polite" className="p-2 my-2 bg-sky-800/50 text-sky-200 text-xs rounded-md">
            {systemMessage}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="agent-select" className="block text-sm font-medium text-gray-300">
            Selecionar Especialista (Agente):
          </label>
          <select
            id="agent-select"
            value={currentAgentId}
            onChange={handleAgentChange}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-sky-500 focus:border-sky-500 text-sm"
          >
            {LEGAL_AGENTS.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="custom-prompt-toggle" className="flex items-center text-sm font-medium text-gray-300 cursor-pointer">
            <input
              id="custom-prompt-toggle"
              type="checkbox"
              checked={isCustomPromptEnabled}
              onChange={(e) => setIsCustomPromptEnabled(e.target.checked)}
              className="form-checkbox h-4 w-4 text-sky-500 bg-gray-700 border-gray-600 rounded focus:ring-sky-600 mr-2"
            />
            Ativar Prompt de Sistema Personalizado (Avançado)
          </label>
          {isCustomPromptEnabled && (
            <>
              <textarea
                id="custom-system-prompt"
                value={customSystemPromptInput}
                onChange={(e) => setCustomSystemPromptInput(e.target.value)}
                placeholder="Digite seu prompt de sistema avançado aqui. Ele será combinado com as instruções do especialista selecionado."
                rows={4}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-sky-500 focus:border-sky-500 text-sm custom-scrollbar"
                aria-label="Prompt de Sistema Personalizado"
              />
              <p className="text-xs text-gray-400">
                Seu prompt personalizado terá prioridade e será complementado pelo especialista.
                Para revisões formais pelo "Pro. Marcelo Claro", utilize as funções de análise de documentos.
              </p>
            </>
          )}
        </div>


        <FileUploadArea 
          onFilesSelect={handleFilesSelect} 
          onProcessFiles={processFiles}
          isProcessing={isProcessingFiles}
          maxFiles={MAX_FILES}
          currentFileCount={uploadedDocuments.length}
        />

        <button
          onClick={processFiles}
          disabled={isProcessingFiles || uploadedDocuments.every(d => d.text || d.processingAnalysis || d.analysisError)}
          className="w-full px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessingFiles ? <LoadingSpinner size="sm" color="text-white"/> : 'Extrair Texto dos Documentos'}
        </button>

        <DocumentList 
          documents={uploadedDocuments} 
          onAnalyzeDocument={handleAnalyzeDocument}
        />
        
        <InternalBookSelector
          books={PREDEFINED_BOOKS}
          selectedBookIds={selectedBookIds}
          onToggleBook={handleToggleBook}
          internalBooksData={internalBooksData}
          onRetryBookLoadWithFile={handleRetryBookLoadWithFile}
        />
        
        <ComparisonSidebar
            uploadedDocuments={uploadedDocuments.filter(d => !!d.text && !d.analysisError)} 
            lastAiResponse={[...currentUiMessages].reverse().find(m => m.sender === MessageSender.AI)?.text || ""}
            onFileForComparisonB={handleFileForComparisonB}
            onStartComparison={handleStartComparison}
            isComparing={isComparing}
            comparisonError={comparisonError}
            setDocumentForComparisonA_Id={setDocumentForComparisonA_Id}
            setDocumentForComparisonA_Source={setDocumentForComparisonA_Source}
            setDocumentForComparisonA_Text={setDocumentForComparisonA_Text}
            docBFileProcessing={docBProcessing}
            docBFileError={docBError}
        />
      </aside>

      {/* Middle Panel (Chat) */}
      <main className="flex flex-col h-full bg-gray-850 md:border-x border-gray-700 md:h-screen">
        {/* Adicionado o seletor de agentes */}
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <AgentSelector 
            agents={LEGAL_AGENTS} 
            currentAgentId={currentAgentId} 
            onAgentChange={setCurrentAgentId} 
          />
        </div>
        <ChatInterface
          messages={currentUiMessages}
          onSendMessage={handleSendMessage}
          isLoading={isLoadingChat}
          isSpeaking={isSpeaking}
          onToggleSpeak={handleToggleSpeak}
          chatReady={chatReady}
          ragContextAvailable={ragContextAvailable}
          chatTitle={chatTitle}
        />
      </main>

      {/* Right Panel (AI Response History) */}
      <aside className="bg-gray-800 border-l border-gray-700 flex flex-col overflow-y-auto custom-scrollbar md:h-screen h-auto">
        <AIResponseHistory
            aiMessages={aiMessages}
            onDownloadCSV={handleDownloadCSV}
            onDownloadJSON={handleDownloadJSON}
        />
      </aside>
      
      <ComparisonResultModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        result={comparisonResult}
        error={comparisonError}
        isLoading={isComparing}
        docAName={
            documentForComparisonA_Source === 'lastAiResponse' ? "Última Resposta da IA" : 
            uploadedDocuments.find(d => d.id === documentForComparisonA_Id)?.name
        }
        docBName={documentForComparisonB?.name}
      />
    </div>
  );
};

export default App;
