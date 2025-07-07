import React, { useState } from 'react';
import { ArrowUpTrayIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';
import { pdfjs } from 'react-pdf';

interface FileUploadAreaProps {
  onFilesSelect: (files: File[]) => void;
  isProcessing: boolean;
  maxFiles: number;
  currentFileCount: number;
}

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  onFilesSelect,
  isProcessing,
  maxFiles,
  currentFileCount,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [isPhdLoading, setIsPhdLoading] = useState(false);
  const [phdResult, setPhdResult] = useState<any>(null);
  const [phdError, setPhdError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);

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
  
  const handlePhdAnalyze = async () => {
    setPhdError(null);
    setPhdResult(null);
    if (selectedFiles.length !== 1) return;
    const file = selectedFiles[0];
    const formData = new FormData();
    formData.append('file', file);
    setIsPhdLoading(true);
    try {
      const response = await fetch('/api/process/analyze', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao analisar processo.');
      }
      const data = await response.json();
      setPhdResult(data);
    } catch (err: any) {
      setPhdError(err.message || 'Erro ao analisar processo.');
    } finally {
      setIsPhdLoading(false);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    console.log('Arquivo selecionado para extração:', file);
    const formData = new FormData();
    formData.append('file', file);
    console.time('extractTextFromFile-fetch'); // Início da medição
    const response = await fetch('http://localhost:3001/api/process/extract-text', {
      method: 'POST',
      body: formData,
    });
    console.timeEnd('extractTextFromFile-fetch'); // Fim da medição
    if (!response.ok) throw new Error('Erro ao extrair texto do arquivo.');
    const data = await response.json();
    return data.text;
  };

  const handleValidatePiece = async () => {
    setValidationError(null);
    setValidationResult(null);
    setExtractedText(null);
    if (selectedFiles.length !== 1) return;
    const file = selectedFiles[0];
    setIsValidating(true);
    try {
      const text = await extractTextFromFile(file);
      setExtractedText(text);
      const response = await fetch('/api/validate-piece', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao validar peça.');
      }
      const data = await response.json();
      setValidationResult(data);
    } catch (err: any) {
      setValidationError(err.message || 'Erro ao validar peça.');
    } finally {
      setIsValidating(false);
    }
  };

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
      {selectedFiles.length === 1 && (selectedFiles[0].type === 'application/pdf' || selectedFiles[0].name.endsWith('.pdf') || selectedFiles[0].name.endsWith('.txt')) && (
        <div className="flex gap-2 mt-3">
          <button
            className="flex-1 px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-md font-semibold shadow hover:from-sky-500 hover:to-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handlePhdAnalyze}
            disabled={isPhdLoading || isProcessing}
          >
            {isPhdLoading ? <LoadingSpinner size="sm" /> : 'Analisar Processo (PhD)'}
          </button>
          <button
            className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-md font-semibold shadow hover:from-green-500 hover:to-emerald-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleValidatePiece}
            disabled={isValidating || isProcessing}
          >
            {isValidating ? <LoadingSpinner size="sm" /> : 'Validar Peça Jurídica'}
          </button>
        </div>
      )}
      {phdError && (
        <div className="mt-3 text-red-400 bg-red-900/30 p-2 rounded-md text-sm">{phdError}</div>
      )}
      {phdResult && (
        <div className="mt-4 p-4 rounded-lg bg-gray-800 border border-sky-700/40 shadow-lg animate-fade-in">
          <h3 className="text-lg font-bold text-sky-400 mb-2">Análise PhD do Processo</h3>
          <div className="mb-3">
            <span className="font-semibold text-gray-300">Resumo:</span>
            <p className="text-gray-100 whitespace-pre-wrap bg-gray-900/60 p-2 rounded mt-1 text-sm">{phdResult.summary}</p>
          </div>
          <div className="mb-3">
            <span className="font-semibold text-gray-300">Análise SWOT:</span>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
              {Object.entries(phdResult.swot || {}).map(([key, value]) => (
                <li key={key as string} className="bg-gray-900/60 p-2 rounded text-sm">
                  <span className="font-semibold text-sky-300">{key}:</span> {String(value)}
                </li>
              ))}
            </ul>
          </div>
          <div className="mb-3">
            <span className="font-semibold text-gray-300">Brechas/Lacunas Jurídicas:</span>
            {phdResult.gaps && phdResult.gaps.length > 0 ? (
              <ul className="mt-1 space-y-2">
                {phdResult.gaps.map((gap: any, idx: number) => (
                  <li key={idx} className="bg-gray-900/60 p-2 rounded text-sm">
                    <span className="font-semibold text-sky-300">Descrição:</span> {gap.description}<br />
                    {gap.trecho && <><span className="font-semibold text-sky-300">Trecho:</span> <span className="italic">{gap.trecho}</span><br /></>}
                    {gap.reference && <><span className="font-semibold text-sky-300">Referência:</span> {gap.reference}</>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm mt-1">Nenhuma brecha jurídica identificada.</p>
            )}
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-sky-400 font-semibold">Ver texto completo extraído</summary>
            <pre className="bg-gray-900/70 p-2 rounded text-xs text-gray-200 mt-2 max-h-64 overflow-y-auto custom-scrollbar whitespace-pre-wrap">{phdResult.fullText}</pre>
          </details>
        </div>
      )}
      {validationError && (
        <div className="mt-3 text-red-400 bg-red-900/30 p-2 rounded-md text-sm">{validationError}</div>
      )}
      {validationResult && (
        <div className="mt-4 p-4 rounded-lg bg-gray-800 border border-green-700/40 shadow-lg animate-fade-in">
          <h3 className="text-lg font-bold text-green-400 mb-2">Validação da Peça Jurídica</h3>
          <div className="mb-3">
            <span className="font-semibold text-gray-300">Blocos Formais:</span>
            <ul className="list-disc ml-5 text-sm text-gray-100">
              {validationResult.blocosFormais && Object.entries(validationResult.blocosFormais).map(([key, bloco]: [string, any], idx: number) => (
                <li key={idx}>
                  <b>{key}</b>: {bloco.presente ? 'Detectado' : 'Não detectado'}
                  {bloco.trecho && (<span className="italic"> (Trecho: "{bloco.trecho}")</span>)}
                  <span className="block text-xs text-gray-400">{bloco.presente ? `Detectado pelo padrão: ${bloco.trecho?.slice(0, 40)}...` : 'Não detectado, esperado conforme estrutura formal.'}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mb-3">
            <span className="font-semibold text-gray-300">Citações de Lei/Artigo:</span>
            <ul className="list-disc ml-5 text-sm text-gray-100">
              {validationResult.citacoes && validationResult.citacoes.map((cit: any, idx: number) => (
                <li key={idx}>
                  <b>{cit.citacao}</b>: {cit.encontrado ? 'Encontrada' : 'Não encontrada'}
                  {cit.documento && (<span> em <i>{cit.documento}</i></span>)}
                  {cit.trecho && (<span className="italic"> (Trecho: "{cit.trecho}")</span>)}
                  <span className="block text-xs text-gray-400">Busca realizada por: art. {cit.artigo}{cit.lei ? ` na lei ${cit.lei}` : ''}. {cit.sugestao ? cit.sugestao : ''}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mb-3">
            <span className="font-semibold text-gray-300">Jurisprudência Detectada:</span>
            <ul className="list-disc ml-5 text-sm text-gray-100">
              {validationResult.jurisprudencia?.length > 0 ? validationResult.jurisprudencia.map((j: any, idx: number) => (
                <li key={idx}>{j.citacao}</li>
              )) : <li>Nenhuma jurisprudência detectada.</li>}
            </ul>
          </div>
          {validationResult.sugestoes && (
            <div className="mb-3">
              <span className="font-semibold text-gray-300">Sugestões de Melhoria:</span>
              <ul className="list-disc ml-5 text-sm text-gray-100">
                {validationResult.sugestoes.map((s: any, idx: number) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          <details className="mt-3">
            <summary className="cursor-pointer text-green-400 font-semibold">Ver texto completo analisado</summary>
            <pre className="bg-gray-900/70 p-2 rounded text-xs text-gray-200 mt-2 max-h-64 overflow-y-auto custom-scrollbar whitespace-pre-wrap">{validationResult.fullText}</pre>
          </details>
          <button
            className="mt-4 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-md font-semibold shadow hover:from-green-500 hover:to-emerald-500 transition"
            onClick={() => {
              if (validationResult) {
                const msg = `📄 **Validação da Peça Jurídica**\n\n**Blocos Formais:**\n${Object.entries(validationResult.blocosFormais).map(([k, b]: [string, any]) => `- ${k}: ${b.presente ? 'Detectado' : 'Não detectado'}${b.trecho ? ` (Trecho: ${b.trecho})` : ''}`).join('\n')}\n\n**Citações de Lei/Artigo:**\n${validationResult.citacoes?.map((c: any) => `- ${c.citacao}: ${c.encontrado ? 'Encontrada' : 'Não encontrada'}${c.documento ? ` em ${c.documento}` : ''}${c.trecho ? ` (Trecho: ${c.trecho})` : ''}`).join('\n')}\n\n**Jurisprudência Detectada:**\n${validationResult.jurisprudencia?.length > 0 ? validationResult.jurisprudencia.map((j: any) => j.citacao).join('\n- ') : 'Nenhuma'}\n\n**Sugestões de Melhoria:**\n${validationResult.sugestoes?.join('\n- ') || 'Nenhuma'}\n\n<details><summary>Ver texto completo analisado</summary>\n<pre>${validationResult.fullText}</pre>\n</details>`;
                if (window.dispatchEvent) {
                  window.dispatchEvent(new CustomEvent('sendValidationToChat', { detail: msg }));
                }
              }
            }}
          >Enviar resultado ao chat</button>
        </div>
      )}
      {extractedText && (
        <div className="mt-4 p-2 bg-gray-900/60 rounded text-xs text-gray-200 max-h-40 overflow-y-auto">
          <div className="font-semibold text-green-300 mb-1">Texto extraído para validação:</div>
          <pre>{extractedText}</pre>
          <button
            className="mt-2 px-3 py-1 bg-gradient-to-r from-green-700 to-emerald-700 text-white rounded shadow hover:from-green-600 hover:to-emerald-600"
            onClick={() => {
              if (extractedText) {
                const msg = `📝 **Texto extraído para revisão IA:**\n\n${extractedText}`;
                if (window.dispatchEvent) {
                  window.dispatchEvent(new CustomEvent('sendValidationToChat', { detail: msg }));
                }
              }
            }}
          >Enviar texto ao chat para revisão IA</button>
        </div>
      )}
    </div>
  );
};