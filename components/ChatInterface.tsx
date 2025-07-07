import React, { useState, useRef, useEffect } from 'react';
import type { JSX } from 'react';
import type { ChatMessage } from '../types';
import { MessageSender } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { PaperAirplaneIcon, SpeakerWaveIcon, SpeakerXMarkIcon, UserCircleIcon, BookOpenIcon } from './icons';
import Modal from './Modal'; // Supondo que exista um componente Modal, ou crie um simples inline

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isSpeaking: boolean;
  onToggleSpeak: () => void;
  chatTitle: string; // New prop for dynamic title
  chatInput?: string;
  setChatInput?: (value: string) => void;
  setMessages?: (msgs: ChatMessage[]) => void;
}

// Tipos auxiliares para resultados de análise e validação
interface SWOT { [key: string]: string; }
interface PhdResult {
  summary: string;
  swot: SWOT;
  gaps: any[];
  fullText: string;
}
interface ValidationResult {
  formalBlocks: any[];
  citacoes: any[];
  jurisprudencia: string[];
  sugestoes: string[];
  fullText: string;
}

const ChatMessageItem: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.sender === MessageSender.USER;
  const isSystem = message.sender === MessageSender.SYSTEM;
  const isAI = message.sender === MessageSender.AI;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      {/* Avatar for AI or System messages */}
      {!isUser && (
        <div className="flex-shrink-0 mr-2">
          {isAI ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <BookOpenIcon className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      )}
      
      {/* Message bubble */}
      <div
        className={`max-w-xl lg:max-w-2xl px-4 py-3 rounded-2xl shadow-md transition-all ${
          isUser
            ? 'bg-gradient-to-r from-sky-600 to-sky-700 text-white'
            : isSystem
            ? 'bg-gray-600 text-gray-200 italic'
            : 'bg-gradient-to-r from-gray-700 to-gray-800 text-gray-100 border border-gray-600/30'
        } ${isAI ? 'hover:border-sky-500/30' : ''}`}
      >
        <p className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">{message.text}</p>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-500/30">
            <p className="text-xs font-medium text-gray-300 mb-1 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
              </svg>
              Fontes utilizadas ({message.sources.length}):
            </p>
            <ul className="space-y-1 text-xs">
              {message.sources.map((source, index) => (
                <FontePopover key={index} index={index} source={source} />
              ))}
            </ul>
          </div>
        )}
        {/* Bloco explicativo do raciocínio da IA */}
        {isAI && (
          <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-900">
            <b>Como a IA chegou a esta resposta:</b><br />
            A IA analisou os documentos indexados e buscou os trechos mais relevantes, priorizando artigos e contextos próximos ao tema solicitado. As fontes acima foram selecionadas por similaridade semântica e citação direta no texto.
          </div>
        )}
        <p className="text-xs mt-2 opacity-70 text-right">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      
      {/* Avatar for user messages */}
      {isUser && (
        <div className="flex-shrink-0 ml-2">
          <div className="w-8 h-8 rounded-full bg-sky-700 flex items-center justify-center text-white shadow-md">
            <UserCircleIcon className="w-4 h-4" />
          </div>
        </div>
      )}
    </div>
  );
};

function FontePopover({ index, source }: { index: number, source: any }) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    function onClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest(`#fonte-popover-${index}`)) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onClick);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onClick); };
  }, [open, index]);
  return (
    <li className="flex items-start relative" id={`fonte-popover-${index}`}> 
      <button type="button" className="text-sky-300 mr-1 font-bold focus:outline-none focus:ring-2 focus:ring-sky-400 rounded" onClick={() => setOpen(o => !o)} aria-label={`Ver contexto da fonte ${index + 1}`}>[{index + 1}]</button>
      <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:text-sky-200 hover:underline transition-colors font-semibold" title={source.uri}>
        {source.title || source.uri}
      </a>
      {source.type && (
        <span className="ml-2 text-gray-400 italic">({source.type})</span>
      )}
      {open && (
        <div className="absolute left-0 top-6 z-50 bg-gray-900 border border-sky-700 rounded shadow-lg p-3 w-80 max-w-xs text-xs text-gray-100 animate-fade-in" tabIndex={-1}>
          <div className="font-bold text-sky-300 mb-1">Trecho/Contexto da Fonte [{index + 1}]</div>
          <div className="whitespace-pre-wrap max-h-40 overflow-y-auto">
            {source.context ? source.context : <span className="text-gray-400 italic">Sem trecho disponível.</span>}
          </div>
        </div>
      )}
    </li>
  );
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages, onSendMessage, isLoading, isSpeaking, onToggleSpeak,
  chatTitle, chatInput, setChatInput, setMessages
}) => {
  const [userInput, setUserInput] = useState('');
  const [isPhdLoading, setIsPhdLoading] = useState(false);
  const [phdError, setPhdError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileValidateInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showGenModal, setShowGenModal] = useState(false);
  const [pieceType, setPieceType] = useState('Petição Inicial');
  const [decisionType, setDecisionType] = useState('Recomendação de Estratégia');
  const [caseFacts, setCaseFacts] = useState('');
  const [caseDocs, setCaseDocs] = useState<string[]>([]);
  const [piecePreferences, setPiecePreferences] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('master');
  const [pieceResult, setPieceResult] = useState<string | null>(null);
  const [decisionResult, setDecisionResult] = useState<string | null>(null);
  const [isGeneratingPiece, setIsGeneratingPiece] = useState(false);
  const [isMakingDecision, setIsMakingDecision] = useState(false);
  const [pieceHistory, setPieceHistory] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pieceHistory') || '[]');
    } catch { return []; }
  });
  const [decisionHistory, setDecisionHistory] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('decisionHistory') || '[]');
    } catch { return []; }
  });
  const [showMinutaModal, setShowMinutaModal] = useState(false);
  const [minutaTipo, setMinutaTipo] = useState('Petição Inicial');
  const [minutaFatos, setMinutaFatos] = useState('');
  const [minutaPreferencias, setMinutaPreferencias] = useState('');
  const [minutaGerada, setMinutaGerada] = useState<string | null>(null);
  const [isGerandoMinuta, setIsGerandoMinuta] = useState(false);
  const [minutaRespostaBruta, setMinutaRespostaBruta] = useState<any>(null);
  const [minutaErro, setMinutaErro] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Foca o input sempre que mensagens mudam (ou seja, após carregar fonte/processo)
  useEffect(() => {
    inputRef.current?.focus();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inputValue = chatInput !== undefined ? chatInput : userInput;
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      if (setChatInput) setChatInput('');
      else setUserInput('');
    }
  };

  const handlePhdFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setPhdError(null);
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    if (!(file.name.endsWith('.pdf') || file.name.endsWith('.txt'))) {
      setPhdError('Apenas arquivos PDF ou TXT são suportados.');
      return;
    }
    setIsPhdLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/process/analyze', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao analisar processo.');
      }
      const data: PhdResult = await response.json();
      // Monta mensagem estruturada para o chat
      let msg = `🧑‍⚖️ **Análise PhD do Processo**\n\n`;
      msg += `**Resumo:**\n${data.summary}\n\n`;
      msg += `**Análise SWOT:**\n`;
      for (const [key, value] of Object.entries(data.swot || {} as Record<string, string>)) {
        msg += `- ${key}: ${value}\n`;
      }
      msg += `\n**Brechas/Lacunas Jurídicas:**\n`;
      if (data.gaps && data.gaps.length > 0) {
        data.gaps.forEach((gap: any) => {
          msg += `• ${gap.description}`;
          if (gap.trecho) msg += `\n  Trecho: _${gap.trecho}_`;
          if (gap.reference) msg += `\n  Referência: ${gap.reference}`;
          msg += '\n';
        });
      } else {
        msg += 'Nenhuma brecha jurídica identificada.\n';
      }
      msg += `\n<details><summary>Ver texto completo extraído</summary>\n<pre>${data.fullText}</pre>\n</details>`;
      onSendMessage(msg);
    } catch (err: any) {
      setPhdError(err.message || 'Erro ao analisar processo.');
    } finally {
      setIsPhdLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleValidateFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    if (!(file.name.endsWith('.pdf') || file.name.endsWith('.txt'))) {
      setValidationError('Apenas arquivos PDF ou TXT são suportados.');
      return;
    }
    setIsValidating(true);
    try {
      // Passo 1: extrair texto do arquivo
      const formData = new FormData();
      formData.append('file', file);
      const extractRes = await fetch('/api/process/extract-text', {
        method: 'POST',
        body: formData,
      });
      if (!extractRes.ok) {
        const err = await extractRes.json();
        throw new Error(err.error || 'Erro ao extrair texto do arquivo.');
      }
      const extractData = await extractRes.json();
      const text = extractData.text;
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new Error('Não foi possível extrair texto do arquivo.');
      }
      // Passo 2: validar peça jurídica
      const response = await fetch('/api/validate-piece', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao validar peça.');
      }
      const data: ValidationResult = await response.json();
      let msg = `📄 **Validação da Peça Jurídica**\n\n`;
      msg += `**Blocos Formais:**\n${data.formalBlocks?.map((b: any) => `- ${b.nome}: ${b.status}${b.trecho ? ` (${b.trecho})` : ''}${b.ordem ? ` Ordem: ${b.ordem}` : ''}\n`).join('\n')}\n\n`;
      msg += `**Citações de Lei/Artigo:**\n${data.citacoes?.map((c: any) => `- ${c.citacao}: ${c.encontrado ? 'Encontrado' : 'Não encontrado'}${c.documento ? ` em ${c.documento}` : ''}${c.sugestao ? ` - Sugestão: ${c.sugestao}` : ''}${c.trecho ? ` (${c.trecho})` : ''}\n`).join('\n')}\n\n`;
      msg += `**Jurisprudência Detectada:**\n${data.jurisprudencia?.length > 0 ? data.jurisprudencia.join('\n- ') : 'Nenhuma'}\n\n`;
      msg += `**Sugestões de Melhoria:**\n${data.sugestoes?.join('\n- ') || 'Nenhuma'}\n\n`;
      msg += `<details><summary>Ver texto completo analisado</summary>\n<pre>${data.fullText}</pre>\n</details>`;
      onSendMessage(msg);
    } catch (err: any) {
      setValidationError(err.message || 'Erro ao validar peça.');
    } finally {
      setIsValidating(false);
      if (fileValidateInputRef.current) fileValidateInputRef.current.value = '';
    }
  };

  const getPlaceholderText = () => {
    if (messages.length === 0) {
      return 'Digite sua pergunta jurídica abaixo e pressione Enter.';
    }
    return 'Pergunte sobre o processo ou fonte carregada...';
  };

  // Função para identificar área predominante (simples, pode ser expandida)
  const getAreaFromMessage = (msg: string) => {
    if (/trabalh/i.test(msg)) return 'Direito do Trabalho';
    if (/civil/i.test(msg)) return 'Direito Civil';
    if (/penal|crime/i.test(msg)) return 'Direito Penal';
    if (/consumidor/i.test(msg)) return 'Direito do Consumidor';
    if (/ambiental/i.test(msg)) return 'Direito Ambiental';
    if (/constitucional/i.test(msg)) return 'Direito Constitucional';
    if (/tribut/i.test(msg)) return 'Direito Tributário';
    if (/empresarial/i.test(msg)) return 'Direito Empresarial';
    if (/concurs/i.test(msg)) return 'Concursos Públicos';
    return 'Geral';
  };

  // Função para checklist por área
  const getChecklistByArea = (area: string) => {
    switch(area) {
      case 'Direito do Trabalho':
        return [
          'Verificar vínculo empregatício',
          'Analisar contrato de trabalho',
          'Checar pagamentos (salário, férias, FGTS)',
          'Verificar estabilidade e direitos rescisórios',
          'Reunir documentos: CTPS, recibos, avisos prévios',
        ];
      case 'Direito Civil':
        return [
          'Identificar partes e relação jurídica',
          'Reunir contratos e documentos comprobatórios',
          'Verificar prazos prescricionais',
          'Analisar responsabilidade civil',
          'Checar bens e direitos envolvidos',
        ];
      case 'Direito Penal':
        return [
          'Verificar tipificação penal',
          'Analisar provas e depoimentos',
          'Checar antecedentes e reincidência',
          'Reunir documentos: BO, laudos, certidões',
          'Avaliar possibilidade de defesa técnica',
        ];
      // ... outras áreas ...
      default:
        return ['Reunir documentos principais', 'Identificar partes', 'Analisar contexto legal', 'Verificar prazos', 'Consultar legislação e jurisprudência'];
    }
  };

  // Função para sugerir documentos do RAG
  const suggestRagDocs = (ragDocs: string[], msg: string) => {
    return ragDocs.filter(doc => msg.toLowerCase().includes(doc.toLowerCase()));
  };

  // Função para anonimizar texto (simples)
  const anonymizeText = (text: string) => {
    return text.replace(/\b([A-Z][a-z]+\s[A-Z][a-z]+)\b/g, '[NOME]')
               .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '[CPF]')
               .replace(/\d{2}\/\d{2}\/\d{4}/g, '[DATA]');
  };

  // Função para logar ações (simples, pode ser expandida)
  const logAction = (action: string, details?: any) => {
    console.log('[LOG JURISTA DIGITAL]', action, details || '');
  };

  // Função para sugerir próximos passos após resposta da IA
  const renderNextActions = (): JSX.Element | null => {
    const lastAiMsg = messages.slice().reverse().find(m => m.sender === MessageSender.AI);
    if (!lastAiMsg) return null;
    const area = getAreaFromMessage(lastAiMsg.text);
    const checklist = getChecklistByArea(area);
    const ragDocs = (window as any).RAG_DOCS || [];
    const suggestedDocs = suggestRagDocs(ragDocs, lastAiMsg.text);
    return (
      <div className="action-buttons-container">
        <button className="action-button" onClick={() => { logAction('Checklist', { area }); alert('Checklist para ' + area + ':\n- ' + checklist.join('\n- ')); }}>Checklist de Fluxo</button>
        <button className="action-button" onClick={() => onSendMessage('Quero mais detalhes sobre a análise acima.')}>Quero mais detalhes</button>
        <button className="action-button" onClick={() => onSendMessage('Resumir a análise acima.')}>Resumir Análise</button>
        <button className="action-button" onClick={() => { logAction('Feedback', { util: true }); alert('Obrigado pelo feedback!'); }}>Resposta foi útil</button>
        <button className="action-button" onClick={() => { logAction('Feedback', { util: false }); onSendMessage('A resposta não foi útil, por favor, reformule com mais clareza e exemplos.'); }}>Não foi útil</button>
        <button className="action-button" onClick={() => onSendMessage('Explique os termos jurídicos complexos presentes na análise acima.')}>Explicar Termos Jurídicos</button>
        <button className="action-button" onClick={() => { const anon = anonymizeText(lastAiMsg.text); logAction('Anonimização', { original: lastAiMsg.text, anon }); alert('Texto anonimizado:\n' + anon); }}>Anonimizar Texto</button>
        {suggestedDocs.length > 0 && (
          <button className="action-button rag-suggestion" onClick={() => alert('Sugestão de documentos do RAG:\n- ' + suggestedDocs.join('\n- '))}>Sugestão de Documentos RAG</button>
        )}
        <button className="action-button" onClick={() => onSendMessage('Gerar petição inicial com base na análise acima.')}>Gerar Petição Inicial</button>
        <button className="action-button" onClick={() => onSendMessage('Gerar contestação com base na análise acima.')}>Gerar Contestação</button>
        <button className="action-button" onClick={() => onSendMessage('Gerar recurso com base na análise acima.')}>Gerar Recurso</button>
        <button className="action-button" onClick={() => setShowGenModal(true)}>Geração Autônoma de Peça/Decisão</button>
      </div>
    );
  };

  const PAGE_SIZE = 30;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const totalMessages = messages.length;
  const hasMore = totalMessages > visibleCount;
  const visibleMessages = messages.slice(-visibleCount);

  const handleCaseDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCaseDocs(prev => [...prev, String(ev.target?.result || '')]);
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const handleGeneratePiece = async () => {
    setIsGeneratingPiece(true);
    setPieceResult(null);
    try {
      const res = await fetch('http://localhost:3001/api/generate-piece', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoPeca: pieceType,
          fatos: caseFacts,
          documentos: caseDocs,
          preferencias: piecePreferences,
          agente: selectedAgent,
        })
      });
      if (!res.ok) throw new Error('Erro ao gerar peça jurídica.');
      const data = await res.json();
      if (!data.peca) { setPieceResult('Erro: resposta do backend não contém o campo "peca". Resposta completa: ' + JSON.stringify(data)); return; }
      setPieceResult(data.peca);
      const log = { tipo: pieceType, agente: selectedAgent, data: new Date().toISOString(), resumo: caseFacts.slice(0, 100), resultado: data.peca };
      setPieceHistory(prev => {
        const updated = [log, ...prev].slice(0, 20);
        localStorage.setItem('pieceHistory', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      setPieceResult('Erro ao gerar peça jurídica.');
    } finally {
      setIsGeneratingPiece(false);
    }
  };

  const handleLegalDecision = async () => {
    setIsMakingDecision(true);
    setDecisionResult(null);
    try {
      const res = await fetch('http://localhost:3001/api/legal-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fatos: caseFacts,
          documentos: caseDocs,
          pergunta: decisionType,
          agente: selectedAgent,
        })
      });
      if (!res.ok) throw new Error('Erro na tomada de decisão jurídica.');
      const data = await res.json();
      if (!data.decisao) { setDecisionResult('Erro: resposta do backend não contém o campo "decisao". Resposta completa: ' + JSON.stringify(data)); return; }
      setDecisionResult(data.decisao);
      const log = { tipo: decisionType, agente: selectedAgent, data: new Date().toISOString(), resumo: caseFacts.slice(0, 100), resultado: data.decisao };
      setDecisionHistory(prev => {
        const updated = [log, ...prev].slice(0, 20);
        localStorage.setItem('decisionHistory', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      setDecisionResult('Erro na tomada de decisão jurídica.');
    } finally {
      setIsMakingDecision(false);
    }
  };

  const handleGerarMinuta = async () => {
    setIsGerandoMinuta(true);
    setMinutaGerada(null);
    setMinutaRespostaBruta(null);
    setMinutaErro(null);
    try {
      const res = await fetch('/api/gerar-minuta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: minutaTipo, fatos: minutaFatos, preferencias: minutaPreferencias })
      });
      const data = await res.json();
      setMinutaRespostaBruta(data);
      setMinutaGerada(data.texto || 'Minuta gerada.');
    } catch (err: any) {
      setMinutaErro(err?.message || 'Erro ao gerar minuta.');
    } finally {
      setIsGerandoMinuta(false);
    }
  };

  const SUGGESTED_QUESTIONS = [
    'Quais artigos tratam de responsabilidade civil?',
    'Gerar minuta de petição inicial',
    'Resumo do processo 098309_2025_11',
    'Quais os prazos recursais do processo civil?',
    'Cite jurisprudência relevante sobre dano moral',
  ];

  return (
    <div className="flex flex-col h-full bg-gray-850 md:border-x border-gray-700">
      {/* Botão para abrir modal de geração de minuta */}
      <div className="flex justify-end mb-2">
        <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-semibold" onClick={() => setShowMinutaModal(true)}>
          Gerar Minuta/Petição
        </button>
      </div>
      {/* Modal de geração de minuta */}
      {showMinutaModal && (
        <Modal onClose={() => setShowMinutaModal(false)}>
          <h2 className="text-lg font-bold mb-2">Gerar Minuta/Petição</h2>
          <label className="block mb-1 font-semibold">Tipo de Peça</label>
          <select value={minutaTipo} onChange={e => setMinutaTipo(e.target.value)} className="border px-2 py-1 rounded mb-2 w-full" title="Tipo de Peça">
            <option>Petição Inicial</option>
            <option>Contestação</option>
            <option>Recurso</option>
            <option>Manifestação</option>
            <option>Outro</option>
          </select>
          <label className="block mb-1 font-semibold">Fatos do Caso</label>
          <textarea value={minutaFatos} onChange={e => setMinutaFatos(e.target.value)} className="border px-2 py-1 rounded mb-2 w-full" rows={3} placeholder="Descreva os fatos relevantes..." />
          <label className="block mb-1 font-semibold">Preferências/Opcional</label>
          <textarea value={minutaPreferencias} onChange={e => setMinutaPreferencias(e.target.value)} className="border px-2 py-1 rounded mb-2 w-full" rows={2} placeholder="Ex: linguagem formal, citar jurisprudência, etc." />
          <button className="bg-purple-700 text-white px-4 py-2 rounded hover:bg-purple-800 font-semibold mt-2" onClick={handleGerarMinuta} disabled={isGerandoMinuta}>
            {isGerandoMinuta ? 'Gerando...' : 'Gerar Minuta'}
          </button>
          {minutaErro && (
            <div className="mt-4 p-2 bg-red-100 rounded text-red-900">
              <b>Erro:</b> {minutaErro}
            </div>
          )}
          {minutaGerada && (
            <div className="mt-4 p-2 bg-gray-100 rounded text-gray-900 whitespace-pre-wrap max-h-60 overflow-y-auto">
              <b>Minuta Gerada:</b>
              <div>{minutaGerada}</div>
            </div>
          )}
          {minutaRespostaBruta && (
            <div className="mt-2 p-2 bg-gray-200 rounded text-xs text-gray-700 max-h-32 overflow-y-auto">
              <b>Resposta bruta do backend:</b>
              <pre>{JSON.stringify(minutaRespostaBruta, null, 2)}</pre>
            </div>
          )}
        </Modal>
      )}
      {/* Sugestões automáticas de perguntas */}
      {/* Removido bloco de sugestões automáticas */}
      <header className="p-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-850 flex justify-between items-center shadow-sm">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md mr-3">
            <BookOpenIcon className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-semibold text-white truncate" title="AUXJURIS">
            AUXJURIS
          </h2>
        </div>
        <button
          onClick={onToggleSpeak}
          className="p-2 rounded-full hover:bg-sky-600/20 transition-all text-gray-300 hover:text-sky-400 border border-transparent hover:border-sky-500/30"
          title={isSpeaking ? "Parar Leitura" : "Ler Última Resposta"}
          aria-label={isSpeaking ? "Parar Leitura da Resposta da IA" : "Ler Última Resposta da IA em Voz Alta"}
          disabled={messages.filter(m => m.sender === MessageSender.AI).length === 0}
        >
          {isSpeaking ? <SpeakerXMarkIcon className="w-5 h-5" /> : <SpeakerWaveIcon className="w-5 h-5" />}
        </button>
      </header>

      <div className="flex-grow p-4 overflow-y-auto custom-scrollbar bg-gradient-to-b from-gray-850 to-gray-900">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-6">
            <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <BookOpenIcon className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              AUXJURIS
            </h3>
            <p className="text-lg mb-2">Bem-vindo ao seu Assistente Jurídico com IA!</p>
            <p className="mb-2 text-gray-300">Digite sua pergunta jurídica abaixo e pressione Enter.</p>
          </div>
        )}
        {hasMore && (
          <div className="text-center my-2">
            <button
              className="action-button"
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            >
              Carregar mais mensagens
            </button>
          </div>
        )}
        {visibleMessages.map((msg) => (
          <ChatMessageItem key={msg.id} message={msg} />
        ))}
        {isLoading && messages.length > 0 && (
          <div className="flex justify-start mb-3" aria-live="polite" aria-atomic="true">
            <div className="flex items-center space-x-3 ml-10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md opacity-75">
                <BookOpenIcon className="w-4 h-4" />
              </div>
              <div className="px-4 py-3 rounded-2xl shadow-md bg-gradient-to-r from-gray-700 to-gray-800 text-gray-100 border border-gray-600/30">
                <LoadingSpinner size="sm" />
              </div>
            </div>
          </div>
        )}
        {renderNextActions()}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 border-t border-gray-700 bg-gray-850">
        <input
          ref={inputRef}
          type="text"
          value={chatInput !== undefined ? chatInput : userInput}
          onChange={e => {
            if (setChatInput) setChatInput(e.target.value);
            else setUserInput(e.target.value);
          }}
          placeholder={getPlaceholderText()}
          className="flex-1 p-2 rounded bg-gray-800 text-white border border-gray-700"
          disabled={isLoading || isPhdLoading}
          autoFocus
        />
        <button type="submit" className="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded" disabled={isLoading || isPhdLoading} title="Enviar mensagem">
          <PaperAirplaneIcon className="w-5 h-5" />
        </button>
      </form>
      <div className="flex flex-col items-center gap-2 p-4 pt-0">
        <button
          type="button"
          className="w-full px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-md font-semibold shadow hover:from-sky-500 hover:to-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPhdLoading}
        >
          {isPhdLoading ? <LoadingSpinner size="sm" /> : 'Analisar Processo (PhD)'}
        </button>
        <label htmlFor="phd-file-upload" className="sr-only">Selecionar arquivo PDF ou TXT para análise PhD</label>
        <input
          id="phd-file-upload"
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          className="sr-only"
          onChange={handlePhdFileSelect}
        />
        <button
          type="button"
          className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-md font-semibold shadow hover:from-green-500 hover:to-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => fileValidateInputRef.current?.click()}
          disabled={isValidating}
        >
          {isValidating ? <LoadingSpinner size="sm" /> : 'Validar Peça Jurídica'}
        </button>
        <label htmlFor="validate-file-upload" className="sr-only">Selecionar arquivo PDF ou TXT para validação de peça</label>
        <input
          id="validate-file-upload"
          ref={fileValidateInputRef}
          type="file"
          accept=".pdf,.txt"
          className="sr-only"
          onChange={handleValidateFileSelect}
        />
        {phdError && <div className="text-red-400 text-xs mt-1">{phdError}</div>}
        {validationError && <div className="text-red-400 text-xs mt-1">{validationError}</div>}
      </div>

      {/* Botão para apagar o cache do chat e começar nova interação */}
      <div className="my-2">
        <button
          className="action-button bg-red-800 w-full"
          onClick={() => {
            if (window.confirm('Tem certeza que deseja apagar o histórico do chat e começar uma nova interação?')) {
              // Limpa o estado do chat (mensagens)
              if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('chatHistory');
              }
              if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem('chatHistory');
              }
              // Se houver função para limpar mensagens no estado, chame-a
              if (setMessages) {
                setMessages([]);
              }
              // Opcional: resetar input do chat
              if (typeof setChatInput === 'function') {
                setChatInput('');
              }
            }
          }}
        >
          🗑️ Apagar Chat e Começar Nova Interação
        </button>
      </div>

      {showGenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-900 p-6 rounded-lg shadow-lg w-full max-w-2xl relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-red-400" onClick={() => setShowGenModal(false)} title="Fechar">✕</button>
            <h3 className="text-lg font-bold text-sky-400 mb-2 flex items-center gap-2">
              <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 01-8 0" /></svg>
              Geração Autônoma de Peça Jurídica / Decisão
            </h3>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Área do Direito / Perfil do Agente</label>
                <select value={selectedAgent} onChange={e => setSelectedAgent(e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 mb-2" title="Selecione a área do direito ou perfil do agente">
                  <option value="master">Geral</option>
                  <option value="administrativo">Administrativo</option>
                  <option value="penal">Penal</option>
                  <option value="consumidor">Consumidor</option>
                  <option value="ambiental">Ambiental</option>
                  <option value="trabalho">Trabalho</option>
                  <option value="tributario">Tributário</option>
                  <option value="civil">Civil</option>
                  <option value="empresarial">Empresarial</option>
                  <option value="constitucional">Constitucional</option>
                  <option value="concursos">Concursos</option>
                </select>
                <label className="block text-xs text-gray-400 mb-1">Tipo de Peça Jurídica</label>
                <input type="text" value={pieceType} onChange={e => setPieceType(e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 mb-2" placeholder="Ex: Petição Inicial, Contestação, Recurso, Contrato..." />
                <label className="block text-xs text-gray-400 mb-1">Tipo de Decisão/Objetivo</label>
                <input type="text" value={decisionType} onChange={e => setDecisionType(e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 mb-2" placeholder="Ex: Recomendação de Estratégia, Viabilidade, Melhor Ação..." />
                <label className="block text-xs text-gray-400 mb-1">Fatos do Caso</label>
                <textarea value={caseFacts} onChange={e => setCaseFacts(e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 mb-2" rows={3} placeholder="Descreva os fatos do caso..." />
                <label className="block text-xs text-gray-400 mb-1">Documentos (opcional, TXT)</label>
                <input type="file" accept=".txt" onChange={handleCaseDocUpload} className="mb-2" title="Anexar documento em texto (.txt)" placeholder="Selecione um arquivo .txt" />
                <label className="block text-xs text-gray-400 mb-1">Preferências (opcional)</label>
                <input type="text" value={piecePreferences} onChange={e => setPiecePreferences(e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white border border-gray-700 mb-2" placeholder="Ex: linguagem formal, pedidos específicos..." />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleGeneratePiece} disabled={isGeneratingPiece} className="flex-1 px-4 py-2 bg-green-700 hover:bg-green-800 text-white rounded font-semibold disabled:opacity-50">{isGeneratingPiece ? 'Gerando Peça...' : 'Gerar Peça Jurídica'}</button>
                  <button onClick={handleLegalDecision} disabled={isMakingDecision} className="flex-1 px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded font-semibold disabled:opacity-50">{isMakingDecision ? 'Analisando...' : 'Tomar Decisão Jurídica'}</button>
                </div>
              </div>
              <div className="flex-1">
                {pieceResult && (
                  <div className="mb-4 p-3 bg-gray-800 border border-green-700/40 rounded animate-fade-in">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-green-400">Peça Gerada</span>
                      <button className="text-xs text-sky-400 hover:underline" onClick={() => navigator.clipboard.writeText(pieceResult!)}>Copiar</button>
                    </div>
                    <pre className="whitespace-pre-wrap text-gray-100 text-xs max-h-64 overflow-y-auto">{pieceResult}</pre>
                  </div>
                )}
                {decisionResult && (
                  <div className="mb-4 p-3 bg-gray-800 border border-indigo-700/40 rounded animate-fade-in">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-indigo-400">Decisão/Análise</span>
                      <button className="text-xs text-sky-400 hover:underline" onClick={() => navigator.clipboard.writeText(decisionResult!)}>Copiar</button>
                    </div>
                    <pre className="whitespace-pre-wrap text-gray-100 text-xs max-h-64 overflow-y-auto">{decisionResult}</pre>
                  </div>
                )}
                <div className="mt-2">
                  <h4 className="text-xs text-gray-400 font-bold mb-1">Histórico de Peças/Decisões</h4>
                  <ul className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar text-xs">
                    {pieceHistory.concat(decisionHistory).sort((a, b) => (b.data > a.data ? 1 : -1)).map((item, idx) => (
                      <li key={idx} className="bg-gray-700/60 rounded p-2 border border-gray-600">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sky-300">{item.tipo}</span>
                          <span className="text-gray-400">{new Date(item.data).toLocaleString()}</span>
                        </div>
                        <div className="text-gray-300 truncate">{item.resumo}</div>
                        <details>
                          <summary className="text-sky-400 cursor-pointer text-xs">Ver resultado</summary>
                          <pre className="whitespace-pre-wrap text-gray-100 text-xs max-h-32 overflow-y-auto">{item.resultado}</pre>
                        </details>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
