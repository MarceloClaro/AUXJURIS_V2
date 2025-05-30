Claro, Prof. Marcelo. Abaixo está a **versão completa e otimizada para o `README.md` do repositório [AuxJuris V2](https://github.com/MarceloClaro/AUXJURIS_V2)**, incluindo:

* descrição geral;
* funções principais;
* estrutura técnica detalhada com base real;
* práticas de segurança em RAG;
* e **insights específicos para desenvolvedores** sobre extensibilidade, arquitetura e oportunidades de inovação.

---

<div align="center">
  <img src="https://github.com/MarceloClaro/AUXJURIS/blob/main/jus.png?raw=true" alt="AuxJuris IA Logo" width="150"/>
</div>

<h1 align="center">AuxJuris V2 - Assistente Jurídico com IA + RAG</h1>

> Plataforma jurídica inteligente com análise documental, chat jurídico especializado e comparações de textos legais, utilizando Gemini AI e Retrieval Augmented Generation (RAG).

---

## 📘 Visão Geral

**AuxJuris V2** é uma aplicação web voltada para o setor jurídico que combina **IA generativa (Google Gemini)** com a técnica **RAG (Retrieval-Augmented Generation)** para oferecer funcionalidades como:

* Sumarização de documentos;
* Extração de insights jurídicos;
* Análise SWOT de peças e contratos;
* Chat contextual com linguagem jurídica;
* Comparação automatizada entre textos.

Seu objetivo é **aumentar a produtividade e precisão na análise jurídica** com base em documentos carregados pelo usuário ou bibliotecas jurídicas internas.

---

## 🔧 Funcionalidades

### 📥 Upload e Processamento

* Suporte a `.pdf`, `.txt`, `.json`, `.jsonl`;
* Extração e limpeza de texto (`cleanTextForRag`);
* Visualização e histórico dos documentos enviados.

### 🧠 Análise Jurídica com IA

* **Sumarização automática** de petições e contratos;
* **Extração de argumentos-chave** e teses legais;
* **Análise SWOT** adaptada para conteúdo jurídico;
* Processamento assíncrono via backend/API.

### 💬 Chat Jurídico Inteligente (RAG)

* Interface tipo chat com IA contextualizada;
* Baseada em arquivos carregados + fontes jurídicas internas;
* Seleção de agentes IA especializados (ex: Penal, Civil);
* Suporte a prompts customizados (avançado).

### 📚 Fontes Jurídicas Internas

* Constituição Federal, Códigos (Penal, Civil), etc.;
* Seleção dinâmica com fallback para upload manual;
* Armazenadas localmente em `/public/books`.

### 📑 Comparação de Documentos

* Compare versões de contratos, pareceres, sentenças;
* Escolha entre documentos enviados ou respostas anteriores;
* Revisão por prompt jurídico do tipo "Master Legal Expert".

### 🧾 Exportação e Histórico

* Exportação de respostas em `.csv` e `.json`;
* Histórico da sessão com controle de sessão local;
* Opção de leitura em voz alta (Text-to-Speech).

---

## 🗃️ Estrutura do Projeto

```
AUXJURIS_V2/
├── backend/                    # Lógica backend (API, RAG, chamada à IA)
├── components/                # Componentes React: chat, upload, análise, etc.
├── hooks/                     # React hooks personalizados para lógica compartilhada
├── public/
│   └── books/                 # Fontes jurídicas (PDFs, textos)
├── App.tsx                    # Componente raiz da aplicação
├── constants.ts               # Prompts, limites e variáveis fixas
├── predefined-books.ts        # Mapeamento de livros jurídicos internos
├── utils.ts                   # Funções auxiliares como cleanTextForRag
├── types.ts                   # Tipagens TypeScript para consistência
├── index.tsx                  # Ponto de entrada do React
├── vite.config.ts             # Configurações de build com Vite
├── tsconfig.json              # Configurações do compilador TypeScript
├── INICIAR.bat                # Script para inicialização em Windows
└── README.md                  # Este documento
```

---

## ⚙️ Tecnologias Utilizadas

| Camada     | Stack Tecnológico                        |
| ---------- | ---------------------------------------- |
| Frontend   | React + TypeScript + Vite + Tailwind CSS |
| Backend    | Node.js + Express (presumido)            |
| IA         | Google Gemini API                        |
| Build Tool | Vite                                     |

---

## 🔐 Segurança em Sistemas RAG

| Área                       | Estratégia Aplicada                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------- |
| **Limpeza de Entrada**     | `cleanTextForRag` remove ruídos do texto (rodapés, headers, páginas)                  |
| **Isolamento de Contexto** | RAG responde apenas com base em fontes fornecidas pelo usuário                        |
| **Chaves Seguras**         | API Gemini é utilizada via backend (não exposta ao cliente)                           |
| **Validação**              | Backend pode sanitizar entradas e filtrar comandos maliciosos (anti-prompt-injection) |
| **SafetySettings**         | Modelos Gemini configurados para censurar conteúdo prejudicial                        |
| **LGPD-ready**             | Estrutura compatível com anonimização e proteção de dados                             |

---

## 💡 Insight para Desenvolvedores

O AuxJuris V2 foi construído com uma arquitetura modular e altamente extensível, tornando-o ideal como base para:

* **Plataformas jurídicas SaaS**;
* **Painéis internos para escritórios ou tribunais**;
* **Ferramentas de estudo e análise de jurisprudência**;
* **Customização por área do Direito via agentes especializados**.

### Oportunidades de Extensão

| Feature                          | Como Expandir                                              |
| -------------------------------- | ---------------------------------------------------------- |
| 📜 Integração com bases públicas | Ex: CNJ DataJud, JusBrasil, LEXML, TJ-CE                   |
| 🧾 OCR Automático                | Incluir suporte a imagens escaneadas via Tesseract         |
| 🔐 Autenticação                  | JWT, OAuth2, ou login social via Firebase/Auth0            |
| 📦 Deploy Cloud                  | Docker + Vercel (frontend) + Render/Fly.io (backend)       |
| 🧠 IA Alternativa                | Substituir Gemini por OpenAI, Claude, Mistral ou Llama.cpp |
| 🧰 Painel Admin                  | Monitoramento de sessões, logs, métricas e uso de API      |

---

## 🚀 Rodando Localmente

```bash
# Clonar o repositório
git clone https://github.com/MarceloClaro/AUXJURIS_V2.git
cd AUXJURIS_V2

# Instalar dependências
npm install

# Iniciar frontend (Vite)
npm run dev

# Backend pode ser iniciado separadamente em /backend
```

---

## 📄 Licença

Este projeto está sob a licença MIT. Sinta-se à vontade para usar, adaptar e contribuir.

---

## 📬 Contato

**Autor:** Prof. Marcelo Claro
**WhatsApp:** (88) 98158-7145
**Projeto:** [github.com/MarceloClaro/AUXJURIS\_V2](https://github.com/MarceloClaro/AUXJURIS_V2)

---

Se desejar, posso converter esse conteúdo em PDF, Markdown `.md` já formatado ou README direto para colar. Deseja exportar como algum desses?
