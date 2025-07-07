# Backend AUXJURIS V2

## Instalação

1. Instale as dependências:
   ```sh
   npm install
   ```

2. Configure o arquivo `.env`:
   - Copie `.env.example` ou `.env.new` para `.env`.
   - Preencha a chave da API Gemini e outras variáveis.

3. Rode o backend:
   ```sh
   npm run dev
   ```
   (ou `npm start` para produção)

4. Para rodar scripts manualmente:
   ```sh
   npx ts-node src/rag_index.ts
   npx ts-node src/rag_watcher.ts
   ```

5. Observações para Windows:
   - Use PowerShell ou CMD.
   - Rode como administrador se necessário.
   - Se baixar ZIP, extraia tudo antes de rodar.

6. Problemas comuns:
   - Porta ocupada: feche processos antigos ou mude a porta no `.env`.
   - Dependências faltando: rode `npm install`.

7. Rodando backend separado do frontend:
   - Basta rodar `npm run dev` na pasta backend.
   - O frontend pode ser rodado em outro terminal na raiz do projeto.

---

Dúvidas? Consulte o README principal ou abra uma issue.

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