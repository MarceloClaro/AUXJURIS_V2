import React, { useState } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { SparklesIcon } from './icons';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid';

interface DocumentListProps {
  documents: any[]; // Ajuste temporário, troque para UploadedDocument[] se o tipo existir
  onAnalyzeDocument: (documentId: string) => void;
  onSendToChat?: (text: string) => void;
}

const SwotSection: React.FC<{ title: string; content?: string }> = ({ title, content }) => {
  if (!content) return null;
  return (
    <div>
      <h5 className="font-semibold text-sky-300 mt-1">{title}</h5>
      <p className="text-xs whitespace-pre-line">{content}</p>
    </div>
  );
};

export const DocumentList: React.FC<DocumentListProps> = ({ documents, onAnalyzeDocument, onSendToChat }) => {
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleQdrantReset = async () => {
    if (!window.confirm('Tem certeza que deseja limpar toda a base Qdrant? Esta ação é irreversível!')) return;
    setIsResetting(true);
    try {
      const res = await fetch('/api/qdrant-reset', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('Base Qdrant limpa com sucesso! Reindexe os documentos para continuar.');
      } else {
        alert('Falha ao limpar Qdrant: ' + (data.error || 'Erro desconhecido.'));
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert('Erro ao tentar limpar Qdrant: ' + errorMsg);
    } finally {
      setIsResetting(false);
    }
  };

  if (documents.length === 0) {
    return <p className="text-sm text-gray-400">Nenhum documento carregado.</p>;
  }

  const toggleExpand = (docId: string) => {
    setExpandedDocId(expandedDocId === docId ? null : docId);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded shadow-lg disabled:opacity-50"
          onClick={handleQdrantReset}
          disabled={isResetting}
          title="Limpar toda a base Qdrant (atenção: ação irreversível!)"
        >
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-300" />
          {isResetting ? 'Limpando Qdrant...' : 'Limpar Base Qdrant'}
        </button>
      </div>
    <ul className="space-y-3 max-h-[calc(100vh-450px)] md:max-h-[calc(100vh-500px)] overflow-y-auto custom-scrollbar pr-1">
      {documents.map((doc, idx) => (
        <li key={doc.id || `doc-idx-${idx}`} className="p-3 bg-gray-700/70 rounded-md border border-gray-600 text-sm">
          <div className="flex justify-between items-center">
              <div className="flex items-center">
            <span className="font-medium text-gray-200 truncate flex-1 mr-2" title={doc.name}>{doc.name}</span>
                {/* Verificador de status de extração */}
                {doc.pendingExtraction ? (
                  <ExclamationCircleIcon className="w-5 h-5 text-yellow-400 ml-2" title="Pendente de extração de texto" />
                ) : (
                  <CheckCircleIcon className="w-5 h-5 text-green-500 ml-2" title="Texto extraído com sucesso" />
                )}
              </div>
            {!doc.text && !doc.processingAnalysis && (
                <span className="text-xs text-yellow-400">Pendente de extração</span>
            )}
            {doc.text && !doc.analysisError && onSendToChat && (
              <button
                className="text-xs text-green-400 hover:underline flex items-center gap-1"
                onClick={() => onSendToChat(doc.text)}
                title="Usar este trecho no chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V10a2 2 0 012-2h2"></path></svg>
                Usar no Chat
              </button>
            )}
              {(!doc.summary && !doc.processingAnalysis) && (
              <button
                onClick={() => onAnalyzeDocument(doc.id)}
                  disabled={!doc.text || !!doc.analysisError || doc.processingAnalysis}
                className="px-2 py-1 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-md flex items-center transition-colors disabled:opacity-50"
                aria-label={`Analisar documento ${doc.name}`}
                  title={
                    !doc.text ? 'Extraia o texto do documento antes de analisar.' :
                    doc.analysisError ? 'Não é possível analisar devido a erro na extração.' :
                    doc.processingAnalysis ? 'Análise em andamento.' : ''
                  }
              >
                <SparklesIcon className="w-3 h-3 mr-1" />
                Analisar
              </button>
            )}
          </div>

          {doc.processingAnalysis && (
            <div className="flex items-center mt-2 text-xs text-sky-300" aria-live="polite" aria-atomic="true">
              <LoadingSpinner size="sm" />
              <span className="ml-2">Analisando {doc.name}...</span>
            </div>
          )}
          {doc.analysisError && (
            <p className="mt-1 text-xs text-red-400" role="alert" aria-live="assertive">Erro em {doc.name}: {doc.analysisError}</p>
          )}

          {doc.text && (doc.summary || doc.insights || doc.swot) && (
            <div className="mt-2">
              <button
                onClick={() => toggleExpand(doc.id)}
                className="text-xs text-sky-400 hover:underline"
                {...(doc.id !== undefined && doc.id !== null ? { 'aria-expanded': expandedDocId === doc.id } : {})}
                aria-controls={doc.id ? `analysis-content-${doc.id}` : undefined}
              >
                {expandedDocId === doc.id ? 'Ocultar Análise' : 'Mostrar Análise'}
              </button>
              {expandedDocId === doc.id && (
                <div id={doc.id ? `analysis-content-${doc.id}` : undefined} className="mt-2 space-y-1 text-gray-300 border-t border-gray-600 pt-2">
                  {doc.summary && (
                    <div>
                        <h5 className="font-semibold text-sky-300 flex items-center">Resumo
                          {onSendToChat && (
                            <button onClick={() => onSendToChat(doc.summary)} className="ml-2 px-2 py-1 text-xs bg-sky-700 hover:bg-sky-800 text-white rounded">Enviar para o Chat</button>
                          )}
                        </h5>
                      <p className="text-xs whitespace-pre-line">{doc.summary}</p>
                    </div>
                  )}
                  {doc.insights && (
                    <div className="mt-1">
                        <h5 className="font-semibold text-sky-300 flex items-center">Insights
                          {onSendToChat && (
                            <button onClick={() => onSendToChat(doc.insights)} className="ml-2 px-2 py-1 text-xs bg-sky-700 hover:bg-sky-800 text-white rounded">Enviar para o Chat</button>
                          )}
                        </h5>
                      <p className="text-xs whitespace-pre-line">{doc.insights}</p>
                    </div>
                  )}
                  {doc.swot && Object.keys(doc.swot).length > 0 && (
                    <div className="mt-1">
                        <h5 className="font-semibold text-sky-300 flex items-center">Análise SWOT
                          {onSendToChat && (
                            <button onClick={() => onSendToChat(
                              Object.entries(doc.swot).map(([k, v]) => `${k[0].toUpperCase() + k.slice(1)}: ${v}`).join('\n')
                            )} className="ml-2 px-2 py-1 text-xs bg-sky-700 hover:bg-sky-800 text-white rounded">Enviar para o Chat</button>
                          )}
                        </h5>
                      <SwotSection title="Forças" content={doc.swot.forças} />
                      <SwotSection title="Fraquezas" content={doc.swot.fraquezas} />
                      <SwotSection title="Oportunidades" content={doc.swot.oportunidades} />
                      <SwotSection title="Ameaças" content={doc.swot.ameaças} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
    </div>
  );
};
