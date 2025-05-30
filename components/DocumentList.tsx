import React, { useState } from 'react';
import type { UploadedDocument, SwotAnalysis } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { SparklesIcon } from './icons';

interface DocumentListProps {
  documents: UploadedDocument[];
  onAnalyzeDocument: (documentId: string) => void;
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

export const DocumentList: React.FC<DocumentListProps> = ({ documents, onAnalyzeDocument }) => {
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  if (documents.length === 0) {
    return <p className="text-sm text-gray-400">Nenhum documento carregado.</p>;
  }

  const toggleExpand = (docId: string) => {
    setExpandedDocId(expandedDocId === docId ? null : docId);
  };

  return (
    <ul className="space-y-3 max-h-[calc(100vh-450px)] md:max-h-[calc(100vh-500px)] overflow-y-auto custom-scrollbar pr-1">
      {documents.map((doc) => (
        <li key={doc.id} className="p-3 bg-gray-700/70 rounded-md border border-gray-600 text-sm">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-200 truncate flex-1 mr-2" title={doc.name}>{doc.name}</span>
            {!doc.text && !doc.processingAnalysis && (
                <span className="text-xs text-yellow-400">Pendente de extração</span>
            )}
            {doc.text && !doc.summary && !doc.processingAnalysis && (
              <button
                onClick={() => onAnalyzeDocument(doc.id)}
                disabled={doc.processingAnalysis}
                className="px-2 py-1 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-md flex items-center transition-colors disabled:opacity-50"
                aria-label={`Analisar documento ${doc.name}`}
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
                aria-expanded={expandedDocId === doc.id}
                aria-controls={`analysis-content-${doc.id}`}
              >
                {expandedDocId === doc.id ? 'Ocultar Análise' : 'Mostrar Análise'}
              </button>
              {expandedDocId === doc.id && (
                <div id={`analysis-content-${doc.id}`} className="mt-2 space-y-1 text-gray-300 border-t border-gray-600 pt-2">
                  {doc.summary && (
                    <div>
                      <h5 className="font-semibold text-sky-300">Resumo</h5>
                      <p className="text-xs whitespace-pre-line">{doc.summary}</p>
                    </div>
                  )}
                  {doc.insights && (
                    <div className="mt-1">
                      <h5 className="font-semibold text-sky-300">Insights</h5>
                      <p className="text-xs whitespace-pre-line">{doc.insights}</p>
                    </div>
                  )}
                  {doc.swot && Object.keys(doc.swot).length > 0 && (
                    <div className="mt-1">
                      <h5 className="font-semibold text-sky-300">Análise SWOT</h5>
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
  );
};
