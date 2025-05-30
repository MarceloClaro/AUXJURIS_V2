# Backend do Assistente Jurídico IA

Este é o backend do Assistente Jurídico IA, construído com Node.js, Express e TypeScript.

## Requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn
- Chave de API do Google AI (Gemini)

## Configuração

1. Clone o repositório
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
   ```
   PORT=3001
   GOOGLE_API_KEY=sua_chave_api_aqui
   ```

## Desenvolvimento

Para iniciar o servidor em modo de desenvolvimento:

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3001`

## Build

Para criar a versão de produção:

```bash
npm run build
```

Para iniciar a versão de produção:

```bash
npm start
```

## Endpoints

### POST /api/chat
Envia uma mensagem para o modelo de IA.

**Request Body:**
```json
{
  "prompt": "Sua pergunta aqui"
}
```

**Response:**
```json
{
  "reply": "Resposta da IA"
}
```

### GET /health
Endpoint de verificação de saúde do servidor.

**Response:**
```json
{
  "status": "ok"
}
``` 