import React, { useCallback, useState } from 'react';
import { ArrowUpTrayIcon, DocumentTextIcon } from './icons'; // Assuming icons.tsx is in the same directory

interface FileUploadAreaProps {
  onFilesSelect: (files: File[]) => void;
  onProcessFiles: () => void;
  isProcessing: boolean;
  maxFiles: number;
  currentFileCount: number;
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  onFilesSelect,
  onProcessFiles,
  isProcessing,
  maxFiles,
  currentFileCount,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAlertMessage(null);
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      if (filesArray.length + currentFileCount > maxFiles) {
        setAlertMessage(`Você pode enviar no máximo ${maxFiles} arquivos no total.`);
        const remainingSlots = maxFiles - currentFileCount;
        if (remainingSlots > 0) {
            setSelectedFiles(filesArray.slice(0, remainingSlots));
            onFilesSelect(filesArray.slice(0, remainingSlots));
        } else {
            setSelectedFiles([]); 
        }
        event.target.value = ''; 
        return;
      }
      setSelectedFiles(filesArray);
      onFilesSelect(filesArray);
    }
  };
  
  const canProcess = selectedFiles.length > 0 || currentFileCount > 0;


  return (
    <div className="space-y-3 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
      {alertMessage && (
        <div className="text-red-400 text-sm p-2 bg-red-900/30 rounded-md" role="alert" aria-live="assertive">
          {alertMessage}
        </div>
      )}
      <label
        htmlFor="file-upload"
        className="flex flex-col items-center justify-center w-full h-32 px-4 transition bg-gray-700 border-2 border-gray-500 border-dashed rounded-md appearance-none cursor-pointer hover:border-sky-400 focus:outline-none"
      >
        <span className="flex items-center space-x-2">
          <ArrowUpTrayIcon className="w-6 h-6 text-gray-400" />
          <span className="font-medium text-gray-300">
            Clique para enviar ou arraste arquivos
            <span className="text-xs text-gray-400 block text-center">(PDF, DOCX, JSON, TXT. Máx: {maxFiles})</span>
          </span>
        </span>
        <input
          id="file-upload"
          name="file-upload"
          type="file"
          multiple
          accept=".pdf,.json,.txt,.jsonl,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          onChange={handleFileChange}
          disabled={isProcessing || currentFileCount >= maxFiles}
        />
      </label>

      {selectedFiles.length > 0 && (
        <div className="mt-2 text-sm text-gray-300">
          <p className="font-semibold">Arquivos selecionados para novo upload:</p>
          <ul className="list-disc list-inside max-h-24 overflow-y-auto custom-scrollbar">
            {selectedFiles.map((file, index) => (
              <li key={index} className="truncate">{file.name}</li>
            ))}
          </ul>
        </div>
      )}
      {currentFileCount > 0 && selectedFiles.length === 0 && (
         <p className="text-sm text-gray-400"> {currentFileCount} arquivo(s) carregado(s) e pronto(s) para processamento ou já processado(s).</p>
      )}
    </div>
  );
};