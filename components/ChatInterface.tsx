import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { MessageSender } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { PaperAirplaneIcon, SpeakerWaveIcon, SpeakerXMarkIcon, UserCircleIcon, BookOpenIcon } from './icons';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  isSpeaking: boolean;
  onToggleSpeak: () => void;
  chatReady: boolean;
  ragContextAvailable: boolean;
  chatTitle: string; // New prop for dynamic title
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
               Fontes:
             </p>
             <ul className="space-y-1 text-xs">
               {message.sources.map((source, index) => (
                 <li key={index} className="flex items-start">
                   <span className="text-sky-300 mr-1">•</span>
                   <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:text-sky-200 hover:underline transition-colors" title={source.uri}>
                     {source.title || source.uri}
                   </a>
                 </li>
               ))}
             </ul>
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

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages, onSendMessage, isLoading, isSpeaking, onToggleSpeak,
  chatReady, ragContextAvailable, chatTitle
}) => {
  const [userInput, setUserInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() && !isLoading) {
      onSendMessage(userInput.trim());
      setUserInput('');
    }
  };

  const getPlaceholderText = () => {
    if (!chatReady) {
      if (!ragContextAvailable) return "Envie e processe documentos para iniciar...";
      return "Contexto RAG sendo preparado ou agente iniciando...";
    }
    return `Consultar ${chatTitle}...`;
  };

  return (
    <div className="flex flex-col h-full bg-gray-850 md:border-x border-gray-700">
      <header className="p-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-850 flex justify-between items-center shadow-sm">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md mr-3">
            <BookOpenIcon className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-semibold text-white truncate" title={chatTitle}>
            <span className="text-sky-400">2aux</span>juris-<span className="text-sky-400">ia</span>: {chatTitle}
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
              <span className="text-sky-400">2aux</span>juris-<span className="text-sky-400">ia</span>
            </h3>
            <p className="text-lg mb-2">Bem-vindo ao seu Assistente Jurídico com IA!</p>
            <p className="mb-2 text-gray-300">{getPlaceholderText()}</p>
            {!ragContextAvailable && (
              <div className="mt-4 p-4 border border-gray-700 rounded-lg bg-gray-800/50 max-w-md">
                <p className="text-sm">Por favor, faça upload e processe alguns documentos na barra lateral esquerda para começar.</p>
              </div>
            )}
          </div>
        )}
        {messages.map((msg) => (
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
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700 bg-gray-800">
        <div className="flex items-center bg-gray-700 rounded-xl p-1 shadow-inner border border-gray-600/30 focus-within:border-sky-500/50 transition-all">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={isLoading ? "Aguarde..." : getPlaceholderText()}
            className="flex-grow bg-transparent p-3 text-gray-100 placeholder-gray-400 focus:outline-none rounded-l-xl"
            disabled={isLoading || !chatReady}
            aria-label="Campo de entrada para sua mensagem"
          />
          <button
            type="submit"
            disabled={isLoading || !userInput.trim() || !chatReady}
            className="p-3 bg-gradient-to-r from-sky-600 to-sky-700 text-white rounded-xl hover:from-sky-500 hover:to-sky-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            aria-label="Enviar mensagem"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="mt-2 text-xs text-center text-gray-500">
          {!chatReady && <p>Aguardando processamento dos documentos para iniciar o chat...</p>}
        </div>
      </form>
    </div>
  );
};
