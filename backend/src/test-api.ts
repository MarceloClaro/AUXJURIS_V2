import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Definir a chave API diretamente para teste
const apiKey = 'AIzaSyDKZim-kg3vMXkPqQt3gNDHNqhWF7dnE9M';
console.log('API Key definida diretamente no código para teste');

async function testGeminiAPI() {
  try {
    const genAI = new GoogleGenerativeAI(apiKey || '');
    // Tentar com o modelo gemini-1.5-pro que é mais recente
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    console.log('Testando conexão com a API do Google Gemini com o modelo gemini-1.5-pro...');
    const result = await model.generateContent('Olá, por favor responda com "API do Google Gemini funcionando corretamente"');
    const response = result.response;
    const text = response.text();
    
    console.log('Resposta da API:', text);
    console.log('Teste concluído com sucesso!');
  } catch (error) {
    console.error('Erro ao testar a API do Google Gemini:', error);
    
    try {
      console.log('Tentando com o modelo alternativo gemini-1.0-pro...');
      const genAI = new GoogleGenerativeAI(apiKey || '');
      const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.0-pro" });
      
      const result = await fallbackModel.generateContent('Olá, por favor responda com "API do Google Gemini funcionando corretamente"');
      const response = result.response;
      const text = response.text();
      
      console.log('Resposta da API com modelo alternativo:', text);
      console.log('Teste com modelo alternativo concluído com sucesso!');
    } catch (fallbackError) {
      console.error('Erro ao testar com o modelo alternativo:', fallbackError);
    }
  }
}

testGeminiAPI();
