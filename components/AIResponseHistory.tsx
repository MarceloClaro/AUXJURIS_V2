import React from 'react';
import type { ChatMessage } from '../types';
import { MessageSender } from '../types';
import { ArrowDownTrayIcon } from './icons'; // Assuming icons.tsx is in the same directory

interface AIResponseHistoryProps {
  aiMessages: ChatMessage[];
  onDownloadCSV: () => void;
  onDownloadJSON: () => void;
}

export const AIResponseHistory: React.FC<AIResponseHistoryProps> = ({
  aiMessages,
  onDownloadCSV,
  onDownloadJSON,
}) => {
  return (
    <div className="flex flex-col h-full bg-gray-800 text-gray-200">
      <header className="p-3 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-sky-400">Histórico de Respostas da IA</h3>
      </header>

      <div className="p-3 space-y-3">
        <button
          onClick={onDownloadCSV}
          disabled={aiMessages.length === 0}
          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-sky-600 hover:bg-sky-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Baixar histórico como CSV"
        >
          <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
          Baixar CSV
        </button>
        <button
          onClick={onDownloadJSON}
          disabled={aiMessages.length === 0}
          className="w-full flex items-center justify-center px-3 py-2 text-sm bg-teal-600 hover:bg-teal-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Baixar histórico como JSON"
        >
          <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
          Baixar JSON
        </button>
      </div>

      <div className="flex-grow p-3 overflow-y-auto custom-scrollbar">
        {aiMessages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma resposta da IA ainda.</p>
        ) : (
          <ul className="space-y-3">
            {aiMessages.map((msg) => (
              <li key={msg.id} className="p-3 bg-gray-700/70 rounded-md border border-gray-600 text-sm">
                <p className="whitespace-pre-wrap text-gray-100">{msg.text}</p>
                <p className="text-xs mt-1 opacity-70 text-right text-gray-400">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' - '}
                  {msg.timestamp.toLocaleDateString([], { day: '2-digit', month: '2-digit' })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
