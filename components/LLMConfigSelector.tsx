import React from 'react';

interface LLMConfigSelectorProps {
  provider: string;
  lmstudioModel: string;
  geminiApiKey: string;
  onProviderChange: (provider: string) => void;
  onLmstudioModelChange: (model: string) => void;
  onGeminiApiKeyChange: (key: string) => void;
  availableProviders: { value: string; label: string }[];
  availableLmstudioModels: string[];
}

const LMSTUDIO_MODEL_LABELS: Record<string, string> = {
  'unsloth/gemma-3-4b-it-GGUF/gemma-3-4b-it-Q4_K_S.gguf': 'Gemma 3 4B IT (Unsloth, Q4_K_S, GGUF)',
  'lmstudio-community/gemma-3-4b-it-GGUF/gemma-3-4b-it-Q4_K_M.gguf': 'Gemma 3 4B IT (LM Studio Community, Q4_K_M, GGUF)',
  'hugging-quants/Llama-3.2-1B-Instruct-Q8_0-GGUF/llama-3.2-1b-instruct-q8_0.gguf': 'Llama 3.2 1B Instruct (Q8_0, GGUF)',
  'lmstudio-community/Qwen2.5-0.5B-Instruct-GGUF/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf': 'Qwen 2.5 0.5B Instruct (LM Studio Community, Q4_K_M, GGUF)',
  'lmstudio-community/granite-vision-3.2-2b-GGUF/granite-vision-3.2-2b-Q4_K_M.gguf': 'Granite Vision 3.2 2B (LM Studio Community, Q4_K_M, GGUF)',
};

const PROVIDER_LABELS: Record<string, string> = {
  'lmstudio': 'LM Studio (Modelos Locais)',
  'gemini': 'Gemini 2.5 Pro (Google Cloud, multilíngue, contexto amplo, recomendado para respostas longas e precisas)',
};

export const LLMConfigSelector: React.FC<LLMConfigSelectorProps> = ({
  provider,
  lmstudioModel,
  geminiApiKey,
  onProviderChange,
  onLmstudioModelChange,
  onGeminiApiKeyChange,
  availableProviders,
  availableLmstudioModels,
}) => {
  return (
    <div className="space-y-2 p-2 bg-gray-900 border border-gray-700 rounded mb-2">
      <label className="block text-sm font-medium text-gray-300 mb-1">Modelo de IA</label>
      <select
        value={provider}
        onChange={e => onProviderChange(e.target.value)}
        className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-sky-500 focus:border-sky-500 text-sm mb-2"
        title="Selecione o provedor de IA"
      >
        {availableProviders.map(opt => (
          <option key={opt.value} value={opt.value}>{PROVIDER_LABELS[opt.value] || opt.label}</option>
        ))}
      </select>
      {provider === 'lmstudio' && (
        <>
          <label className="block text-xs font-medium text-gray-400 mb-1">Modelo LM Studio</label>
          <select
            value={lmstudioModel}
            onChange={e => onLmstudioModelChange(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-sky-500 focus:border-sky-500 text-xs"
            title="Selecione o modelo LM Studio"
          >
            {availableLmstudioModels.map(m => (
              <option key={m} value={m}>{LMSTUDIO_MODEL_LABELS[m] || m}</option>
            ))}
          </select>
        </>
      )}
      {provider === 'gemini' && (
        <>
          <div className="text-xs text-gray-400 mt-1">
            Gemini 2.5 Pro (Google Cloud): modelo multilíngue, contexto amplo, recomendado para respostas longas, precisas e tarefas complexas.
          </div>
          <label className="block text-xs font-medium text-gray-400 mb-1 mt-2">API Key do Gemini</label>
          <input
            type="password"
            value={geminiApiKey}
            onChange={e => onGeminiApiKeyChange(e.target.value)}
            placeholder="Cole sua API Key aqui"
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-sky-500 focus:border-sky-500 text-xs"
            title="Insira sua API Key do Google AI Studio"
          />
          <p className="text-xs text-gray-500 mt-1">
            Obtenha sua API Key em <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">aistudio.google.com/apikey</a>
          </p>
        </>
      )}
    </div>
  );
};
