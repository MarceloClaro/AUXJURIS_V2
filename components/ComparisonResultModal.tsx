import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import { XMarkIcon } from './icons';

interface ComparisonResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: string;
  error: string | null;
  isLoading: boolean;
  docAName?: string;
  docBName?: string;
}

export const ComparisonResultModal: React.FC<ComparisonResultModalProps> = ({
  isOpen, onClose, result, error, isLoading, docAName, docBName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-gray-700">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-sky-400">
            Resultado da Comparação
            {docAName && docBName && <span className="text-xs text-gray-400 block">entre "{docAName}" e "{docBName}"</span>}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-grow">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-48">
              <LoadingSpinner size="lg" />
              <p className="mt-3 text-gray-300">Comparando documentos...</p>
            </div>
          )}
          {!isLoading && error && (
            <div className="text-red-400 bg-red-900/30 p-3 rounded-md">
              <h4 className="font-semibold">Erro na Comparação</h4>
              <p className="text-sm whitespace-pre-wrap">{error}</p>
            </div>
          )}
          {!isLoading && !error && result && (
            <div className="prose prose-sm prose-invert max-w-none text-gray-200 whitespace-pre-wrap">
              {result}
            </div>
          )}
           {!isLoading && !error && !result && (
            <p className="text-gray-400">Nenhum resultado de comparação para exibir.</p>
          )}
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
