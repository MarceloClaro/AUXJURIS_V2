import { useState, useCallback, useEffect } from 'react';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

  const speak = useCallback((text: string) => {
    if (!synth) {
      setTtsError("API de Síntese de Voz não suportada neste navegador.");
      return;
    }
    if (isSpeaking) {
      synth.cancel(); // Cancel current speech before starting new one
    }

    const utterance = new SpeechSynthesisUtterance(text);
    // Optional: Configure voice, rate, pitch
    // const voices = synth.getVoices();
    // const ptVoice = voices.find(voice => voice.lang.startsWith('pt'));
    // if (ptVoice) utterance.voice = ptVoice;
    utterance.lang = 'pt-BR';
    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setTtsError(null);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = (event) => {
      setIsSpeaking(false);
      setTtsError(`Erro na síntese de voz: ${event.error}`);
    };
    synth.speak(utterance);
  }, [synth, isSpeaking]);

  const cancelSpeech = useCallback(() => {
    if (synth && isSpeaking) {
      synth.cancel();
      setIsSpeaking(false);
    }
  }, [synth, isSpeaking]);

  useEffect(() => {
    // Cleanup: cancel speech if component unmounts while speaking
    return () => {
      if (synth && isSpeaking) {
        synth.cancel();
      }
    };
  }, [synth, isSpeaking]);
  
  // Ensure voices are loaded for language selection
  useEffect(() => {
    if (synth && synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = () => { /* Voices loaded, can update UI or re-select voice */ };
    }
  }, [synth]);


  return { speak, cancelSpeech, isSpeaking, ttsError };
};
