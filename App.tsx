// src/App.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileUploadArea } from './components/FileUploadArea';
import { ChatInterface } from './components/ChatInterface';
import { DocumentList } from './components/DocumentList';
import { ComparisonResultModal } from './components/ComparisonResultModal';
import { InternalBookSelector } from './components/InternalBookSelector';
import { AIResponseHistory } from './components/AIResponseHistory'; // New Component
import { AgentSelector } from './components/AgentSelector'; // Novo componente para seleção de agentes
import { LLMConfigSelector } from './components/LLMConfigSelector';
import type { ChatMessage, UploadedDocument, SwotAnalysis, PredefinedBook, RagDataItem } from './types';
import { MessageSender } from './types';
import {
  MAX_FILES,
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
  console.time('extractTextFromPdfBook');
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
  const cleanedText = cleanTextForRag(fullText.trim());
  console.timeEnd('extractTextFromPdfBook');
  return cleanedText;
};

const App: React.FC = () => {
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false);

  const [currentAgentId, setCurrentAgentId] = useState<string>(DEFAULT_AGENT_ID);
  const [customSystemPromptInput, setCustomSystemPromptInput] = useState<string>('');
  const [isCustomPromptEnabled, setIsCustomPromptEnabled] = useState<boolean>(false);
  
  const [currentUiMessages, setCurrentUiMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);

  const { speak, cancelSpeech, isSpeaking } = useTextToSpeech();

  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [internalBooksData, setInternalBooksData] = useState<Map<string, { content: string | null; isLoading: boolean; error: string | null; name: string }>>(new Map());
  const [systemMessage, setSystemMessage] = useState<string | null>(null);

  const [internalSources, setInternalSources] = useState<string[]>([]);

  const [chatInput, setChatInput] = useState('');

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

  const addMessageToUi = useCallback((
    sender: MessageSender,
    text: string,
    id?: string,
    sources?: { uri: string; title: string }[],
    rawResponse?: any,
    error?: string
  ): ChatMessage => {
    const newMessage: ChatMessage = {
      id: id || `${sender}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      sender,
      text: sender === MessageSender.AI ? cleanAiText(text) : text,
      timestamp: new Date(),
      sources,
      rawResponse,
      error,
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

  }, [uploadedDocuments, selectedBookIds, internalBooksData]);

  const saveExtractedText = async (fileName: string, text: string) => {
    try {
      if (!fileName || !text || !text.trim()) {
        addMessageToUi(MessageSender.SYSTEM, 'Nenhum texto pôde ser extraído do arquivo. O PDF pode estar vazio, protegido ou conter apenas imagens.');
        return;
      }
      const res = await fetch('/api/save-extracted-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, text })
      });
      if (!res.ok) {
        if (res.status === 422) {
          addMessageToUi(MessageSender.SYSTEM, 'Nenhum texto pôde ser extraído do arquivo. O PDF pode estar vazio, protegido ou conter apenas imagens.');
        } else {
          addMessageToUi(MessageSender.SYSTEM, 'Erro ao salvar texto extraído para RAG.');
        }
      }
    } catch (err) {
      addMessageToUi(MessageSender.SYSTEM, 'Erro ao salvar texto extraído para RAG.');
      console.error('Erro ao salvar texto extraído para RAG:', err);
    }
  };

  const reloadRagSources = async () => {
    try {
      const res = await fetch('/api/rag-sources');
      const data = await res.json();
      setInternalSources(Array.isArray(data.files) ? [...data.files] : []);
      if (!Array.isArray(data.files)) {
        alert('Erro ao carregar fontes RAG: resposta inesperada do backend.');
        console.error('Resposta inesperada de /api/rag-sources:', data);
      }
    } catch (err) {
      setInternalSources([]);
      alert('Erro ao carregar fontes RAG. Veja o console para detalhes.');
      console.error('Erro ao buscar /api/rag-sources:', err);
    }
  };

  const callBackendAnalysisAPI = useCallback(async (
    endpoint: 'summary' | 'insights' | 'swot',
    documentText: string,
    summaryText?: string,
    insightsText?: string
  ): Promise<string | SwotAnalysis> => { // Updated return type
    const url = `/api/analyze/${endpoint}`;
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

  const handleAnalyzeDocument = async (documentId: string) => {
    console.time(`handleAnalyzeDocument-${documentId}`);
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
      console.timeEnd(`handleAnalyzeDocument-${documentId}`);
      return;
    }

    try {
      let textForAnalysis = currentDocToAnalyze.text;
      let currentSummary: string | undefined = undefined;
      let currentInsights: string | undefined = undefined;

      addMessageToUi(MessageSender.SYSTEM, `Iniciando análise de "${currentDocToAnalyze.name}"...`);

      // The check for MAX_TEXT_LENGTH_FOR_DIRECT_ANALYSIS and initial summarization is handled in the backend now.

      const summaryResult = await callBackendAnalysisAPI('summary', currentDocToAnalyze.text);
       if (typeof summaryResult === 'string') { // Ensure it's a string before assigning
        currentSummary = summaryResult;
      } else {
         throw new Error("Received non-string summary from backend.");
      }
      addMessageToUi(MessageSender.SYSTEM, `Resumo de "${currentDocToAnalyze.name}" gerado e refinado.`);

      const insightsResult = await callBackendAnalysisAPI('insights', textForAnalysis, currentSummary);
       if (typeof insightsResult === 'string') { // Ensure it's a string before assigning
        currentInsights = insightsResult;
      } else {
        throw new Error("Received non-string insights from backend.");
      }
      addMessageToUi(MessageSender.SYSTEM, `Insights de "${currentDocToAnalyze.name}" gerados e refinados.`);

      const swotResult = await callBackendAnalysisAPI('swot', textForAnalysis, currentSummary, currentInsights);
      addMessageToUi(MessageSender.SYSTEM, `Análise SWOT de "${currentDocToAnalyze.name}" gerada e refinada.`);

      const swotAnalysis: SwotAnalysis = {}; // Initialize as SwotAnalysis object
      if (typeof swotResult !== 'string' && swotResult !== null && typeof swotResult === 'object') { // Check if it's an object (SwotAnalysis)
          // Assuming the backend returns a correctly structured SwotAnalysis object now
          Object.assign(swotAnalysis, swotResult);
      } else if (typeof swotResult === 'string') {
          // Fallback for parsing string format if needed, but backend should return object
          const swotSections = ["Forças:", "Fraquezas:", "Oportunidades:", "Ameaças:"];
          let currentSectionKey: keyof SwotAnalysis | null = null;
          swotResult.split('\n').forEach(line => { // Use swotResult here, it's a string in this branch
            const trimmedLine = line.trim();
            const matchedSection = swotSections.find(s => trimmedLine.toLowerCase().startsWith(s.toLowerCase().replace(':', '')));
            if (matchedSection) {
              currentSectionKey = matchedSection.toLowerCase().replace(':', '') as keyof SwotAnalysis;
              const contentAfterTitle = trimmedLine.substring(matchedSection.length).trim();
              swotAnalysis[currentSectionKey!] = (swotAnalysis[currentSectionKey!] || "") + (contentAfterTitle ? contentAfterTitle + "\n" : "");
            } else if (currentSectionKey && trimmedLine) {
              swotAnalysis[currentSectionKey!] += trimmedLine + "\n";
            }
          });
          for (const key in swotAnalysis) {
              swotAnalysis[key as keyof SwotAnalysis] = cleanAiText(swotAnalysis[key as keyof SwotAnalysis]?.trim() || "");
          }
      } else {
          console.error("Unexpected SWOT analysis result format:", swotResult);
          throw new Error("Received unexpected SWOT analysis format from backend.");
      }


      setUploadedDocuments(prevDocs =>
        prevDocs.map(d => d.id === documentId ? { ...d, summary: cleanAiText(currentSummary || currentDocToAnalyze.summary || ""), insights: cleanAiText(currentInsights || ""), swot: swotAnalysis, processingAnalysis: false, analysisError: null } : d) // Assign swotAnalysis object
      );
      addMessageToUi(MessageSender.SYSTEM, `Análise completa de "${currentDocToAnalyze.name}" finalizada.`);
    } catch (error) {
      const errorMsg = `Erro na análise Gemini para "${currentDocToAnalyze.name}": ${error instanceof Error ? error.message : String(error)}`;
      setUploadedDocuments(prevDocs =>
        prevDocs.map(d => d.id === documentId ? { ...d, processingAnalysis: false, analysisError: errorMsg } : d)
      );
      addMessageToUi(MessageSender.SYSTEM, errorMsg);
    } finally {
      console.timeEnd(`handleAnalyzeDocument-${documentId}`);
    }
  };

  const processFiles = useCallback(async () => {
    console.time('processFiles');
    const docsToProcess = uploadedDocuments.filter(d => !d.text && !d.processingAnalysis);
    if (docsToProcess.length === 0) {
      addMessageToUi(MessageSender.SYSTEM, "Nenhum novo arquivo para extrair texto.");
      console.timeEnd('processFiles');
      return;
    }

    setIsProcessingFiles(true);
    addMessageToUi(MessageSender.SYSTEM, `Extraindo texto de ${docsToProcess.length} arquivo(s)...`);

    const processedDocs = await Promise.all(
      uploadedDocuments.map(async doc => {
        if (doc.text || doc.processingAnalysis) return doc; // Skip already processed or currently processing
        // Set processingAnalysis to true for the current document being processed
        try {
          // Enviar arquivo para o backend
          const formData = new FormData();
          formData.append('file', doc.file);
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro ao extrair texto do backend.');
          }
          const data = await response.json();
          addMessageToUi(MessageSender.SYSTEM, `Texto extraído de "${doc.name}".`);
          // Salvar texto extraído para RAG
          await saveExtractedText(doc.name.endsWith('.txt') ? doc.name : doc.name + '.txt', data.text);
          await new Promise(r => setTimeout(r, 500));
          await reloadRagSources();
          // Return the updated document object
          return { ...doc, text: data.text, processingAnalysis: false, analysisError: data.text ? null : 'Nenhum conteúdo extraído.' };
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido.';
          addMessageToUi(MessageSender.SYSTEM, `Erro ao processar ${doc.name}: ${errorMsg}`);
          return { ...doc, text: '', processingAnalysis: false, analysisError: errorMsg };
        }
      })
    );

    // Update the state once after all documents have been processed
    setUploadedDocuments(processedDocs);
    setIsProcessingFiles(false);

    const successfullyProcessedCount = processedDocs.filter(doc => doc.text && !doc.analysisError).length;
    const erroredDocsCount = processedDocs.filter(doc => doc.analysisError).length;

    if (successfullyProcessedCount > 0) {
      addMessageToUi(MessageSender.SYSTEM, `Extração de texto concluída. ${successfullyProcessedCount} documento(s) pronto(s) para análise ou chat com RAG.`);
      // Iniciar análise automaticamente para documentos processados com sucesso
      processedDocs.filter(doc => doc.text && !doc.analysisError).forEach(doc => {
        handleAnalyzeDocument(doc.id);
      });
    }
    if (erroredDocsCount > 0) {
      addMessageToUi(MessageSender.SYSTEM, `${erroredDocsCount} arquivo(s) não puderam ser processados completamente (verifique mensagens de erro individuais).`);
    }
    if (successfullyProcessedCount === 0 && erroredDocsCount === 0 && docsToProcess.length > 0){
      addMessageToUi(MessageSender.SYSTEM, "Nenhum texto pôde ser extraído dos novos arquivos ou os arquivos estavam vazios.");
    }
    console.timeEnd('processFiles');
  }, [uploadedDocuments, addMessageToUi, handleAnalyzeDocument, reloadRagSources, saveExtractedText]);

  const handleFilesSelect = (files: File[]) => {
    if (!files || files.length === 0) return;
    const newDocuments = files.map(file => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      text: '',
      file,
      processingAnalysis: false,
      analysisError: null,
    }));
    setUploadedDocuments((prev: UploadedDocument[]) => {
      const updatedDocs = [...prev, ...newDocuments].slice(0, MAX_FILES);
      // Chamar processFiles diretamente aqui, após a atualização do estado
      // Isso garante que processFiles seja chamada apenas quando novos arquivos são selecionados
      // e evita o loop de re-renderização do useEffect
      if (newDocuments.length > 0) {
        // Usar setTimeout para garantir que o estado seja atualizado antes de processFiles
        // ou passar os newDocuments diretamente para processFiles se a lógica permitir
        // Por simplicidade, vamos chamar processFiles diretamente e ela vai operar sobre o estado atualizado
        // (que será o 'updatedDocs' no próximo render)
        processFiles();
      }
      return updatedDocs;
    });
    // addMessageToUi removida: não exibe mais mensagem de instrução
  };

  /**
   * Handles sending a message to the backend to get a response from the AI.
   *
   * @param {string} userInput The text input from the user.
   * @returns {Promise<void>}
   */
  const handleSendMessage = useCallback(async (userInput: string) => {
    console.log("Enviando mensagem:", userInput, "isLoadingChat:", isLoadingChat);
    if (isLoadingChat || !userInput.trim()) return;
    cancelSpeech();

    addMessageToUi(MessageSender.USER, userInput);

    setIsLoadingChat(true);
    const aiUiMsgPlaceholder = addMessageToUi(MessageSender.AI, "Digitando...", `ai-${Date.now()}-${Math.random().toString(16).slice(2)}`);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt: userInput,
          agentId: currentAgentId // Enviar o ID do agente selecionado
        }),
      });

      let data: any = null;
      let aiReply = '';
      let finalTextToDisplay = '';
      if (!response.ok) {
        try {
          data = await response.json();
        } catch (e) {
          data = null;
        }
        throw new Error((data && data.error) || `Backend error: ${response.status}`);
      }
      data = await response.json();
      aiReply = data.text; // Alterado de data.reply para data.text
      finalTextToDisplay = cleanAiText(aiReply) || "Não obtive uma resposta válida do backend.";

      setCurrentUiMessages(prev => prev.map(msg =>
        msg.id === aiUiMsgPlaceholder.id
          ? {
              ...msg,
              text: finalTextToDisplay,
              sources: undefined,
              sender: MessageSender.AI,
              rawResponse: data,
              error: undefined
            }
          : msg
      ));

      if(finalTextToDisplay !== "Não obtive uma resposta válida do backend.") speak(finalTextToDisplay);

    } catch (error) {
      let errorText = `Desculpe, ocorreu um erro ao comunicar com o backend: ${error instanceof Error ? error.message : String(error)}`;
      setCurrentUiMessages(prev => prev.map(msg =>
        msg.id === aiUiMsgPlaceholder.id
          ? {
              ...msg,
              text: errorText,
              sources: undefined,
              sender: MessageSender.AI,
              error: errorText,
              rawResponse: undefined
            }
          : msg
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


  const chatTitle = useMemo(() => PREDEFINED_BOOKS.find(b => b.id === currentAgentId)?.name || "Assistente jurídico avançado com múltiplos especialistas em Direito Brasileiro.", [currentAgentId]);

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

  // Substituir a função de remoção de fonte interna para usar o endpoint padronizado
  const handleRemoveInternalSource = async (filePath: string) => {
    // Extrai apenas o nome do arquivo
    const filename = filePath.split('/').pop();
    if (!filename) return;
    try {
      const res = await fetch(`http://localhost:3001/api/documents/${encodeURIComponent(filename)}`, { method: 'DELETE' });
      if (res.status === 404) {
        alert('Arquivo não encontrado. Ele já pode ter sido removido.');
      } else if (!res.ok) {
        const data = await res.json();
        alert('Erro ao remover arquivo: ' + (data.error || res.statusText));
      } else {
        alert('Arquivo removido com sucesso!');
        // Atualize a lista de documentos, removendo o arquivo deletado
        await reloadRagSources();
      }
    } catch (err) {
      alert('Erro ao remover arquivo: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  // 1. Adicionar estados para busca RAG:
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<any[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);

  // 2. Função handleRagSearch:
  const handleRagSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;
    setRagLoading(true);
    setRagError(null);
    setRagResults([]);
    try {
      const res = await fetch('/api/rag-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ragQuery })
      });
      console.log(`[DEBUG frontend] Resposta RAG - Status: ${res.status}, StatusText: ${res.statusText}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({})); // Tenta ler JSON de erro, se houver
        console.error(`[ERRO frontend] Resposta RAG não OK. Erro do backend:`, errorData);
        throw new Error(errorData.error || `Erro na busca RAG (HTTP ${res.status})`);
      }
      const data = await res.json();
      console.log(`[DEBUG frontend] Dados recebidos da busca RAG:`, data);
      setRagResults(data.results || []);
    } catch (err: any) {
      console.error(`[ERRO frontend] Falha na busca RAG:`, err);
      setRagError(err.message || 'Erro desconhecido');
    } finally {
      setRagLoading(false);
    }
  };

  // 1. Adicionar estado para feedback de reindexação:
  const [reindexing, setReindexing] = useState(false);
  const [reindexStatus, setReindexStatus] = useState<string | null>(null);

  // 2. Função para chamar o endpoint de reindexação:
  const handleForceReindex = async () => {
    setReindexing(true);
    setReindexStatus(null);
    try {
      const res = await fetch('/api/rag-reindex', { method: 'POST' });
      if (!res.ok) throw new Error('Erro ao reindexar');
      setReindexStatus('Reindexação iniciada com sucesso! Aguarde alguns minutos para a atualização dos resultados.');
    } catch (err: any) {
      setReindexStatus('Erro ao iniciar reindexação: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setReindexing(false);
    }
  };

  // Separar arquivos RAG carregados pelo usuário (uploads) dos demais
  const userRagSources = internalSources.filter(f => f && f.toLowerCase().includes('processos/extraidos'));
  const otherRagSources = internalSources.filter(f => !f.toLowerCase().includes('processos/extraidos'));

  // Modelos e provedores LLM
  const LLM_PROVIDERS = [
    { value: 'lmstudio', label: 'LM Studio' },
    { value: 'gemini', label: 'Gemini 2.5 Pro (Google)' },
  ];
  const LLM_LMSTUDIO_MODELS = [
    'unsloth/gemma-3-4b-it-GGUF/gemma-3-4b-it-Q4_K_S.gguf',
    'lmstudio-community/gemma-3-4b-it-GGUF/gemma-3-4b-it-Q4_K_M.gguf',
    'hugging-quants/Llama-3.2-1B-Instruct-Q8_0-GGUF/llama-3.2-1b-instruct-q8_0.gguf',
    'lmstudio-community/Qwen2.5-0.5B-Instruct-GGUF/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf',
    'lmstudio-community/granite-vision-3.2-2b-GGUF/granite-vision-3.2-2b-Q4_K_M.gguf',
  ];

  const [llmProvider, setLlmProvider] = useState<string>('lmstudio');
  const [lmstudioModel, setLmstudioModel] = useState<string>('granite-vision-3.2-2b');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');

  // Sincronizar com backend ao alterar
  useEffect(() => {
    fetch('/api/llm-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: llmProvider, lmstudioModel, geminiApiKey }),
    });
  }, [llmProvider, lmstudioModel, geminiApiKey]);

  // Renomear para corresponder às props esperadas pelo LLMConfigSelector
  const provider = llmProvider;
  const onProviderChange = setLlmProvider;
  const onLmstudioModelChange = setLmstudioModel;
  const onGeminiApiKeyChange = setGeminiApiKey;

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
            title="Selecione o especialista ou agente"
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
          isProcessing={isProcessingFiles}
          maxFiles={5}
          currentFileCount={0}
        />

        <DocumentList 
          documents={uploadedDocuments} 
          onAnalyzeDocument={handleAnalyzeDocument}
          onSendToChat={setChatInput}
        />
        
        <InternalBookSelector
          books={PREDEFINED_BOOKS}
          selectedBookIds={selectedBookIds}
          onToggleBook={handleToggleBook}
          internalBooksData={internalBooksData}
          onRetryBookLoadWithFile={handleRetryBookLoadWithFile}
        />
        
        <div className="mt-4">
          <h4 className="text-sky-400 font-semibold mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /></svg>
            Fontes de Conhecimento Interno RAG
          </h4>
          {userRagSources.length > 0 && (
            <div className="mb-2">
              <h4 className="text-xs font-bold text-sky-400 uppercase mb-1">Fontes carregadas pelo usuário (uploads)</h4>
              <ul className="text-xs text-gray-200 space-y-1">
                {userRagSources.map(f => (
                  <li key={f}>{f.replace('public/books/PROCESSOS/extraidos/', '')}</li>
                ))}
              </ul>
            </div>
          )}
          <ul className="space-y-2">
            {otherRagSources.map(fileName => (
              <li key={fileName} className="bg-gray-700 rounded p-2 text-xs text-gray-200 truncate flex items-center justify-between">
                <span>{fileName}</span>
                <button
                  className="ml-2 text-red-400 hover:text-red-600"
                  title="Remover fonte"
                  onClick={() => handleRemoveInternalSource(fileName)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
        
        <form onSubmit={handleRagSearch} className="flex items-center gap-2 p-2 bg-gray-900 border-b border-gray-700 mt-2 rounded">
          <input
            type="text"
            value={ragQuery}
            onChange={e => setRagQuery(e.target.value)}
            placeholder="Busca semântica RAG (ex: jurisprudência, artigo, tese...)"
            className="flex-1 p-2 rounded bg-gray-800 text-white border border-gray-700"
          />
          <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded" disabled={ragLoading}>
            {ragLoading ? 'Buscando...' : 'Buscar RAG'}
          </button>
        </form>
        {ragError && <div className="p-4 text-red-400">{ragError}</div>}
        {ragResults.length > 0 && (
          <div className="p-4 bg-gray-800 border-b border-gray-700 mt-2 rounded">
            <h4 className="text-sky-400 font-semibold mb-2 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              Resultados RAG:
            </h4>
            <ul className="space-y-4">
              {ragResults
                .slice()
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .map((res, idx) => {
                  const fileName = res.metadata?.fileName || res.metadata?.source || 'Desconhecida';
                  const friendlyNameMap: Record<string, string> = {
                    'constituicao_federal_1988.txt': 'Constituição Federal de 1988',
                    'CLT_normas_correlatas_7ed.txt': 'Consolidação das Leis do Trabalho',
                    'CP_normas_correlatas_8ed.txt': 'Código Penal',
                    'CPP_normas_correlatas_7ed.txt': 'Código de Processo Penal',
                    'cdc-portugues-2013.txt': 'Código de Defesa do Consumidor',
                  };
                  const friendlyName = friendlyNameMap[fileName] || fileName.replace(/_/g, ' ').replace(/\.txt|\.pdf/gi, '').replace(/\b([a-z])/g, (l: string) => l.toUpperCase());
                  const score = res.score || 0;
                  let badgeColor = 'bg-gray-500';
                  if (score > 0.8) badgeColor = 'bg-green-600';
                  else if (score > 0.6) badgeColor = 'bg-yellow-500';
                  const copyToClipboard = (text: string) => {
                    navigator.clipboard.writeText(text);
                  };
                  return (
                    <li key={idx} className="bg-gray-700 rounded-lg p-4 shadow-md border border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sky-300 flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6" /></svg>
                          {friendlyName}
                        </span>
                        <span className="text-xs flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-white ${badgeColor}`}>{Math.round(score * 100)}%</span>
                          Relevância
                        </span>
                      </div>
                        <div
                        className={`score-bar ${badgeColor}`}
                        data-score={score}
                        ></div>
                      <details>
                        <summary className="cursor-pointer text-sky-400 hover:underline flex items-center gap-1">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m6 0a6 6 0 11-12 0 6 6 0 0112 0z" /></svg>
                          Mostrar trecho do documento
                        </summary>
                        <pre className="whitespace-pre-wrap text-gray-100 text-xs mt-2 bg-gray-800 p-2 rounded max-h-64 overflow-y-auto border border-gray-700">
                          {res.text}
                        </pre>
                        <div className="flex gap-2 mt-2">
                          <button
                            className="text-xs text-sky-400 hover:underline flex items-center gap-1"
                            onClick={() => copyToClipboard(res.text)}
                            title="Copiar trecho para a área de transferência"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-6 8h6a2 2 0 002-2V8a2 2 0 00-2-2h-6a2 2 0 00-2 2v12z" /></svg>
                            Copiar trecho
                          </button>
                          <button
                            className="text-xs text-green-400 hover:underline flex items-center gap-1"
                            onClick={() => setChatInput(res.text)}
                            title="Usar este trecho no chat"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2h2" /></svg>
                            Usar no Chat
                          </button>
                        </div>
                      </details>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}

        <button onClick={handleForceReindex} disabled={reindexing} className="w-full px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-md mt-2 disabled:opacity-50">
          {reindexing ? 'Reindexando...' : 'Forçar Reindexação RAG'}
        </button>
        {reindexStatus && <div className="text-xs text-sky-300 mt-1">{reindexStatus}</div>}

        <LLMConfigSelector
          provider={provider}
          onProviderChange={onProviderChange}
          lmstudioModel={lmstudioModel}
          onLmstudioModelChange={onLmstudioModelChange}
          geminiApiKey={geminiApiKey}
          onGeminiApiKeyChange={onGeminiApiKeyChange}
          availableProviders={LLM_PROVIDERS}
          availableLmstudioModels={LLM_LMSTUDIO_MODELS}
        />

        {/* Autor e Contato */}
        <div className="flex flex-col items-center mt-6 mb-2 p-3 bg-gray-900 rounded-lg border border-gray-700">
          <img
            src="https://github.com/MarceloClaro/logos/blob/main/EU1.jpg?raw=true"
            alt="Autor Marcelo Claro"
            className="w-24 h-24 rounded-full object-cover border-2 border-sky-500 shadow mb-2 autor-img-bg"
          />
          <div className="text-xs text-gray-300 text-center mt-1">
            <div className="font-semibold text-sky-400">Prof. Marcelo Claro</div>
            <div className="mt-1">
              <span className="font-semibold">WhatsApp:</span> <a href="https://wa.me/5588981587145" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">(88) 98158-7145</a>
            </div>
            <div className="mt-1">
              <span className="font-semibold">E-mail:</span> <a href="mailto:marceloclaro@gmail.com" className="text-sky-400 hover:underline">marceloclaro@gmail.com</a>
            </div>
          </div>
        </div>
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
          chatTitle={chatTitle}
          chatInput={chatInput}
          setChatInput={setChatInput}
          setMessages={setCurrentUiMessages}
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
        isOpen={false}
        onClose={() => {}}
        result={''}
        error={null}
        isLoading={false}
        docAName={''}
        docBName={''}
      />
    </div>
  );
};

export default App;
