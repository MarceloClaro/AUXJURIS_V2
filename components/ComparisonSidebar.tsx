import React, { useState, useEffect } from 'react';
import type { UploadedDocument, ComparisonSource } from '../types';
import LoadingSpinner from './LoadingSpinner';
import { DocumentMagnifyingGlassIcon, ArrowUpTrayIcon } from './icons';

interface ComparisonSidebarProps {
  uploadedDocuments: UploadedDocument[];
  lastAiResponse: string;
  onFileForComparisonB: (file: File | null) => void;
  onStartComparison: () => void;
  isComparing: boolean;
  comparisonError: string | null;
  setDocumentForComparisonA_Id: (id: string | null) => void;
  setDocumentForComparisonA_Source: (source: ComparisonSource) => void;
  setDocumentForComparisonA_Text: (text: string) => void;
  docBFileProcessing: boolean;
  docBFileError: string | null;
}

export const ComparisonSidebar: React.FC<ComparisonSidebarProps> = ({
  uploadedDocuments, lastAiResponse, onFileForComparisonB, onStartComparison,
  isComparing, comparisonError,
  setDocumentForComparisonA_Id, setDocumentForComparisonA_Source, setDocumentForComparisonA_Text,
  docBFileProcessing, docBFileError
}) => {
  const [selectedDocA, setSelectedDocA] = useState<string>(''); // Stores "sourceType_id" or "lastAiResponse"
  const [docBFile, setDocBFile] = useState<File | null>(null);

  useEffect(() => {
    if (selectedDocA === 'lastAiResponse') {
      setDocumentForComparisonA_Id(null);
      setDocumentForComparisonA_Source('lastAiResponse');
      setDocumentForComparisonA_Text(lastAiResponse);
    } else if (selectedDocA) {
      const doc = uploadedDocuments.find(d => d.id === selectedDocA);
      if (doc) {
        setDocumentForComparisonA_Id(doc.id);
        setDocumentForComparisonA_Source('uploadedDoc');
        setDocumentForComparisonA_Text(doc.text || '');
      }
    } else {
      setDocumentForComparisonA_Id(null);
      setDocumentForComparisonA_Source(null);
      setDocumentForComparisonA_Text('');
    }
  }, [selectedDocA, uploadedDocuments, lastAiResponse, setDocumentForComparisonA_Id, setDocumentForComparisonA_Source, setDocumentForComparisonA_Text]);

  const handleDocBFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setDocBFile(file);
    onFileForComparisonB(file);
  };

  const canCompare = !!selectedDocA && !!docBFile && !docBFileError;


  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-sky-400 border-b border-gray-700 pb-2">Comparar Documentos</h2>
      
      <div>
        <label htmlFor="docASelect" className="block text-sm font-medium text-gray-300 mb-1">
          Documento A (Referência)
        </label>
        <select
          id="docASelect"
          value={selectedDocA}
          onChange={(e) => setSelectedDocA(e.target.value)}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-sky-500 focus:border-sky-500 text-sm"
          disabled={isComparing}
        >
          <option value="">Selecione o Documento A</option>
          {uploadedDocuments.map(doc => (
            <option key={doc.id} value={doc.id}>{doc.name} (Doc. Enviado)</option>
          ))}
          {lastAiResponse && (
            <option value="lastAiResponse">Última Resposta da IA</option>
          )}
        </select>
      </div>

      <div>
        <label htmlFor="docBUpload" className="block text-sm font-medium text-gray-300 mb-1">
          Documento B (para Comparar)
        </label>
        <div className="mt-1 flex justify-center px-3 py-4 border-2 border-gray-600 border-dashed rounded-md bg-gray-700/50 hover:border-sky-500 transition-colors">
          <div className="space-y-1 text-center">
            <ArrowUpTrayIcon className="mx-auto h-8 w-8 text-gray-400" />
            <div className="flex text-sm text-gray-400">
              <label
                htmlFor="docBUploadInput"
                className="relative cursor-pointer rounded-md font-medium text-sky-400 hover:text-sky-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-sky-500"
              >
                <span>Envie um arquivo</span>
                <input id="docBUploadInput" name="docBUploadInput" type="file" className="sr-only" onChange={handleDocBFileChange} accept=".pdf,.json,.txt,.jsonl,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" disabled={isComparing || docBFileProcessing} />
              </label>
              <p className="pl-1">ou arraste e solte</p>
            </div>
            <p className="text-xs text-gray-500">PDF, DOCX, JSON, TXT até 10MB</p>
          </div>
        </div>
        {docBFileProcessing && (
            <div className="flex items-center mt-2 text-xs text-sky-300">
                <LoadingSpinner size="sm" />
                <span className="ml-2">Processando Documento B...</span>
            </div>
        )}
        {docBFile && !docBFileProcessing && !docBFileError && (
          <p className="mt-1 text-xs text-green-400">Documento B: {docBFile.name} (Carregado)</p>
        )}
         {docBFile && !docBFileProcessing && docBFileError && (
          <p className="mt-1 text-xs text-yellow-500">Documento B: {docBFile.name} (Arquivo selecionado, mas erro no processamento)</p>
        )}
        {docBFileError && (
          <p className="mt-1 text-xs text-red-400">{docBFileError}</p>
        )}
      </div>
      
      <button
        onClick={onStartComparison}
        disabled={!canCompare || isComparing || docBFileProcessing}
        className="w-full flex items-center justify-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isComparing ? (
          <LoadingSpinner size="sm" color="text-white"/>
        ) : (
          <DocumentMagnifyingGlassIcon className="w-5 h-5 mr-2" />
        )}
        {isComparing ? 'Comparando...' : 'Iniciar Comparação'}
      </button>

      {comparisonError && !isComparing && ( // Show general comparison error if not loading and error exists
        <p className="text-sm text-red-400 bg-red-900/30 p-2 rounded-md">{comparisonError}</p>
      )}
    </div>
  );
};