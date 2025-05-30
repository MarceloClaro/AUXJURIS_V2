import React from 'react';
import type { PredefinedBook } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { BookOpenIcon, CheckCircleIcon, ExclamationCircleIcon, DocumentTextIcon } from './icons';

interface InternalBookSelectorProps {
  books: PredefinedBook[];
  selectedBookIds: Set<string>;
  onToggleBook: (bookId: string) => void;
  internalBooksData: Map<string, { content: string | null; isLoading: boolean; error: string | null; name: string }>;
  onRetryBookLoadWithFile: (bookId: string, file: File) => void; // New prop
}

export const InternalBookSelector: React.FC<InternalBookSelectorProps> = ({
  books,
  selectedBookIds,
  onToggleBook,
  internalBooksData,
  onRetryBookLoadWithFile, // Destructure new prop
}) => {
  if (!books || books.length === 0) {
    return <p className="text-sm text-gray-400">Nenhuma fonte de conhecimento interno definida.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-md font-semibold text-white flex items-center">
          <BookOpenIcon className="w-5 h-5 mr-2 text-sky-400" />
          <span>Fontes de Conhecimento Interno</span>
          <span className="ml-2 px-2 py-0.5 text-xs bg-sky-600/20 text-sky-300 rounded-full border border-sky-500/30">RAG</span>
        </h3>
      </div>
      <ul className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1 pb-1">
        {books.map((book) => {
          const bookData = internalBooksData.get(book.id);
          const isSelected = selectedBookIds.has(book.id);
          return (
            <li key={book.id} className={`p-3 rounded-lg transition-all ${isSelected ? 'bg-gradient-to-r from-gray-700/90 to-gray-700/70 border border-sky-500/30 shadow-md' : 'bg-gray-800/50 border border-gray-700/50 hover:border-gray-600/80'}`}>
              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer group flex-1">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleBook(book.id)}
                      className="sr-only"
                      aria-labelledby={`book-label-${book.id}`}
                    />
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${isSelected ? 'bg-sky-500 text-white' : 'bg-gray-700 border border-gray-500 group-hover:border-sky-400/50'}`}>
                      {isSelected && <CheckCircleIcon className="w-4 h-4" />}
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center">
                      <DocumentTextIcon className={`w-4 h-4 mr-2 ${isSelected ? 'text-sky-400' : 'text-gray-400'}`} />
                      <span 
                        id={`book-label-${book.id}`} 
                        className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'} transition-colors`} 
                        title={book.description}
                      >
                        {book.name}
                      </span>
                    </div>
                    {isSelected && book.description && (
                      <p className="text-xs text-gray-400 mt-1 ml-6">{book.description}</p>
                    )}
                  </div>
                </label>
                <div aria-live="polite" className="ml-2">
                  {bookData?.isLoading && isSelected && (
                    <div className="flex items-center">
                      <LoadingSpinner size="sm" color="text-sky-400" />
                      <span className="text-xs text-sky-300 ml-2">Carregando...</span>
                    </div>
                  )}
                  {!bookData?.isLoading && !bookData?.error && bookData?.content && isSelected && (
                    <div className="flex items-center text-green-400">
                      <CheckCircleIcon className="w-4 h-4" />
                      <span className="text-xs ml-1">Carregado</span>
                    </div>
                  )}
                </div>
              </div>
              {bookData?.error && isSelected && (
                <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-md"> 
                  <div className="flex items-start">
                    <ExclamationCircleIcon className="w-4 h-4 text-red-400 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-xs text-red-300" title={bookData.error}>
                      Erro ao carregar: <span className="font-normal text-gray-300">({bookData.error.length > 50 ? bookData.error.substring(0,50) + '...' : bookData.error})</span>
                    </p>
                  </div>
                  <div className="mt-2">
                    <label htmlFor={`retry-upload-${book.id}`} className="block text-xs font-medium text-sky-300 mb-1 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Tentar enviar manualmente:
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        id={`retry-upload-${book.id}`}
                        aria-label={`Enviar arquivo para ${book.name} manualmente`}
                        className="text-xs text-gray-300 w-full mt-0.5 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-sky-600 file:text-white hover:file:bg-sky-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 cursor-pointer"
                        accept=".pdf,.txt,.json,.jsonl"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            onRetryBookLoadWithFile(book.id, e.target.files[0]);
                            e.target.value = ''; // Clear the input
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
