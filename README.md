---

<div align="center">
  <img src="https://github.com/MarceloClaro/AUXJURIS/blob/main/jus.png?raw=true" alt="AuxJuris IA Logo" width="150"/>
</div>

<h1 align="center">AuxJuris V2 - Assistente Jurídico com IA + RAG</h1>

> Plataforma jurídica inteligente com análise documental, chat jurídico especializado e comparações de textos legais, utilizando Google Gemini AI e Retrieval Augmented Generation (RAG).

---

## 📘 Visão Geral do Projeto

**AuxJuris V2** é uma aplicação web inovadora, desenvolvida para o setor jurídico, que integra capacidades avançadas de **Inteligência Artificial Generativa** com a robustez da técnica **Retrieval-Augmented Generation (RAG)**. O objetivo central é otimizar a produtividade e a precisão na análise e interação com documentos jurídicos, sejam eles carregados pelo usuário ou provenientes de uma vasta biblioteca jurídica interna.

---

## 🚀 Como Baixar, Instalar e Executar o AuxJuris Localmente

Para configurar e rodar o AuxJuris V2 em sua máquina local, siga os passos abaixo:

### 1. Pré-requisitos

Certifique-se de ter as seguintes ferramentas instaladas:

*   **Git**: Para clonar o repositório.
*   **Node.js e npm**: Versão LTS recomendada.
*   **Qdrant**: Baixe o executável do Qdrant para Windows.
*   **Google Gemini API Key**: Essencial para a funcionalidade RAG e uso do Gemini.
*   **(Opcional) LM Studio**: Para executar modelos de linguagem localmente.

### 2. Download do Projeto

Se você ainda não tem o projeto, clone-o do GitHub:

```bash
git clone https://github.com/MarceloClaro/AUXJURIS.git AUXJURIS_V2
cd AUXJURIS_V2
```

### 3. Instalação das Dependências

Na raiz do projeto (`AUXJURIS_V2/`), instale as dependências do frontend e do backend:

```bash
npm install
cd backend
npm install
cd ..
```

### 4. Configuração das Variáveis de Ambiente

Crie um arquivo `.env` no diretório `backend/` (`AUXJURIS_V2/backend/.env`) e adicione sua chave da API do Google Gemini:

```
GOOGLE_API_KEY=SUA_CHAVE_DA_API_DO_GOOGLE_AQUI
PORT=3001
```

### 5. Configuração e Inicialização do Qdrant

*   Baixe o executável `qdrant.exe` e coloque-o em um local de sua preferência.
*   **Ajuste o caminho** nos scripts `INICIAR.bat` ou `INICIAR.ps1` para apontar para o local correto do seu `qdrant.exe`.

### 6. Indexação RAG dos Documentos

Primeiro, compile o backend:

```bash
npm run build:backend
```

Em seguida, com o Qdrant já rodando, execute o script de indexação:

```bash
node backend/dist/rag_index.js
```

Este processo indexará os documentos jurídicos para o funcionamento do RAG.

### 7. Execução da Aplicação

Na raiz do projeto, execute um dos scripts para iniciar todos os serviços (Qdrant, Backend e Frontend):

*   **No Windows (via Prompt de Comando):**
    Dê um duplo clique no arquivo `INICIAR.bat`.

*   **No Windows (via PowerShell):**
    Abra o PowerShell no diretório do projeto e execute:
    ```powershell
    .\INICIAR.ps1
    ```

Após a inicialização, o frontend estará acessível em seu navegador (geralmente `http://localhost:5173`).

---
### Principais Funcionalidades:

*   **Sumarização e Extração de Insights**: Geração automática de resumos e identificação de pontos-chave em documentos.
*   **Análise SWOT Jurídica**: Aplicação da metodologia SWOT para avaliar peças e contratos sob uma perspectiva legal.
*   **Chat Jurídico Contextualizado**: Interação com a IA que utiliza o contexto de documentos e fontes jurídicas para respostas precisas.
*   **Comparação Automatizada de Textos**: Análise comparativa entre diferentes versões de documentos ou textos legais.
*   **Seleção de Agentes Especializados**: Permite ao usuário escolher entre diferentes "agentes" de IA, cada um com expertise em uma área específica do Direito.
*   **Configuração Flexível de LLMs**: Suporte para modelos de linguagem grandes (LLMs) locais (via LM Studio) e baseados em nuvem (Google Gemini 2.5 Pro), com opção de configuração de API Key.

---

## 🏛️ Arquitetura e Fluxo de Dados

A arquitetura do AuxJuris V2 é dividida em duas camadas principais: **Frontend** e **Backend**, comunicando-se via APIs RESTful.

### Frontend (React, TypeScript, Vite, Tailwind CSS)

*   **Interface do Usuário (UI)**: Desenvolvida com React e TypeScript, oferece uma experiência intuitiva para upload de documentos, interação via chat, seleção de modelos de IA e visualização de resultados.
*   **Gerenciamento de Estado**: Utiliza hooks do React (`useState`, `useEffect`, `useCallback`, `useMemo`) para gerenciar o estado da aplicação, como documentos carregados, mensagens do chat, e configurações do LLM.
*   **Comunicação com Backend**: Realiza requisições HTTP para os endpoints do backend para processamento de arquivos, análise de texto, busca RAG e interações com o LLM.
*   **Validação e Feedback**: Apresenta mensagens de sistema e erros ao usuário, garantindo transparência sobre o status das operações.

### Backend (Node.js, Express, Qdrant, Axios)

*   **Servidor API**: Construído com Node.js e Express, expõe os endpoints para todas as funcionalidades da aplicação.
*   **Processamento de Documentos**: Recebe arquivos (PDFs, TXTs) do frontend, extrai o texto utilizando bibliotecas como `pdf-parse`, e armazena-os localmente para indexação RAG.
*   **Integração RAG (Retrieval-Augmented Generation)**:
    *   **Qdrant**: Um banco de dados vetorial de alta performance é utilizado para armazenar embeddings (representações numéricas) dos documentos jurídicos.
    *   **`rag_index.ts`**: Um script separado (executado via `ts-node`) é responsável por indexar os documentos, gerando seus embeddings e armazenando-os no Qdrant. Este processo pode ser acionado manualmente ou via um watcher.
    *   **`rag_search.ts`**: Durante uma consulta de chat, este módulo realiza uma busca semântica no Qdrant para encontrar os trechos mais relevantes dos documentos com base na pergunta do usuário.
    *   **Contextualização**: Os trechos recuperados são então injetados no prompt enviado ao LLM, fornecendo um contexto rico e específico para a geração da resposta.
*   **Gerenciamento de LLMs**:
    *   **Seleção Dinâmica**: O backend gerencia qual LLM será utilizado (LM Studio ou Gemini), com base na configuração enviada pelo frontend.
    *   **Chamadas à API**: Utiliza `axios` para fazer requisições aos endpoints dos LLMs (LM Studio local ou Google Gemini API).
*   **Agentes Jurídicos**: Define "personas" de IA com instruções de sistema específicas para diferentes áreas do Direito (e.g., Penal, Administrativo), permitindo respostas mais focadas e precisas.
*   **Pipeline de Análise PhD**: Um conjunto de endpoints (`/api/analyze/summary`, `/api/analyze/insights`, `/api/analyze/swot`, `/api/process/analyze`) que orquestram chamadas ao LLM para realizar análises complexas em documentos.

```mermaid
graph TD
    A[Usuário] -->|Interage com| B(Frontend - React/TS);
    B -->|Upload de Documentos| C{Backend - Express};
    B -->|Consultas de Chat| C;
    B -->|Configuração de LLM| C;
    C -->|Extração de Texto| D[Sistema de Arquivos];
    C -->|Indexação de Embeddings| E[Qdrant - Banco Vetorial];
    C -->|Busca Semântica RAG| E;
    C -->|Chamada à API do LLM| F{LLM Selecionado};
    F -->|LM Studio (Local)| G[Servidor LM Studio];
    F -->|Google Gemini 2.5 Pro (Cloud)| H[Google Cloud AI];
    G -->|Resposta| C;
    H -->|Resposta| C;
    C -->|Resposta Processada| B;
    B -->|Exibe Resultados| A;
```

---

## 🧠 Modelos de Linguagem (LLMs) e suas Implicações

O AuxJuris V2 oferece flexibilidade na escolha do LLM, permitindo ao usuário optar entre uma solução local (LM Studio) e uma baseada em nuvem (Google Gemini 2.5 Pro). Cada escolha possui suas próprias características, vantagens, desvantagens e limitações.

### 1. LM Studio (Modelos Locais)

*   **Descrição**: LM Studio é uma aplicação desktop que permite baixar e executar modelos de linguagem grandes (LLMs) de código aberto (como Llama, Gemma, Mistral) diretamente no hardware local do usuário. Ele expõe uma API compatível com a API OpenAI, facilitando a integração.
*   **Vantagens**:
    *   **Privacidade e Segurança**: Os dados do usuário e as interações com o modelo permanecem localmente, sem serem enviados para serviços de terceiros. Ideal para dados sensíveis.
    *   **Custo Zero (após download)**: Não há custos de inferência por token, apenas o investimento inicial em hardware.
    *   **Controle Total**: O usuário tem controle sobre qual modelo específico rodar e suas configurações.
    *   **Latência Reduzida**: Para usuários com hardware potente, a inferência local pode ser mais rápida que a comunicação com a nuvem.
*   **Desvantagens**:
    *   **Dependência de Hardware**: Requer uma GPU potente (com VRAM suficiente) e CPU robusta para rodar modelos maiores e mais complexos de forma eficiente.
    *   **Configuração Inicial**: O usuário precisa baixar e configurar o LM Studio e os modelos, o que pode ser um desafio para não-desenvolvedores.
    *   **Variedade de Modelos**: Embora haja muitos modelos open-source, a qualidade e a capacidade podem variar significativamente em comparação com modelos proprietários de ponta.
    *   **Manutenção**: O usuário é responsável por atualizar o LM Studio e os modelos.
*   **Limitações e Possíveis Falhas**:
    *   **Desempenho Inconsistente**: Em hardware limitado, o desempenho pode ser lento, impactando a experiência do usuário.
    *   **Erros de Memória (OOM)**: Modelos muito grandes podem exceder a VRAM disponível, causando falhas.
    *   **Qualidade da Resposta**: Modelos menores ou menos otimizados podem gerar respostas menos precisas, coerentes ou completas, especialmente para tarefas jurídicas complexas que exigem nuances.
    *   **Alucinações**: Como qualquer LLM, modelos locais podem "alucinar" informações, especialmente se o contexto RAG for insuficiente ou a pergunta for ambígua.
    *   **Suporte a Multimodalidade**: A capacidade multimodal (processamento de imagens, áudio) é limitada ou inexistente na maioria dos modelos open-source executáveis localmente via LM Studio.

### 2. Google Gemini 2.5 Pro (Google Cloud)

*   **Descrição**: Gemini 2.5 Pro é um modelo de linguagem multimodal avançado do Google, acessível via Google Cloud AI Studio. É conhecido por seu contexto amplo, capacidade multilíngue e desempenho em tarefas complexas.
*   **Vantagens**:
    *   **Poder e Precisão**: Geralmente oferece respostas de maior qualidade, mais coerentes e precisas, devido ao seu treinamento massivo e arquitetura avançada.
    *   **Contexto Amplo**: Capacidade de processar grandes volumes de texto (contexto de até 1 milhão de tokens), ideal para análise de documentos jurídicos extensos.
    *   **Multilíngue**: Excelente suporte para o português brasileiro, crucial para o domínio jurídico.
    *   **Manutenção e Escalabilidade**: Gerenciado pelo Google, garantindo alta disponibilidade, atualizações contínuas e escalabilidade sob demanda.
    *   **Multimodalidade**: Suporta entrada e saída multimodal (texto, imagem, áudio, vídeo), embora o AuxJuris V2 atualmente utilize apenas a capacidade textual.
*   **Desvantagens**:
    *   **Custo**: O uso da API é cobrado por token de entrada e saída, o que pode gerar custos significativos em uso intensivo.
    *   **Dependência de API**: Requer uma conexão ativa com a internet e dependência da disponibilidade e políticas do serviço Google Cloud.
    *   **Privacidade de Dados**: Embora o Google tenha políticas de privacidade, o envio de dados para a nuvem pode ser uma preocupação para informações jurídicas altamente sensíveis.
    *   **Latência**: Pode haver latência de rede, impactando a velocidade da resposta.
*   **Limitações e Possíveis Falhas**:
    *   **Custo Inesperado**: Uso excessivo ou prompts mal otimizados podem levar a custos elevados.
    *   **Limites de Taxa (Rate Limits)**: A API pode impor limites de requisições, causando erros em cenários de alta demanda.
    *   **Alucinações**: Embora menos propenso que modelos menores, o Gemini ainda pode gerar informações incorretas ou inventadas, especialmente se o contexto RAG não for perfeitamente alinhado ou a pergunta for ambígua.
    *   **Viés**: Modelos de IA podem herdar vieses dos dados de treinamento, o que é uma preocupação crítica no contexto jurídico.
    *   **Atualização de Conhecimento**: Embora seja um modelo de ponta, seu conhecimento é limitado aos dados de treinamento até uma certa data, podendo não ter informações sobre as mais recentes alterações legislativas ou jurisprudenciais sem o RAG.

### Importância do RAG na Mitigação de Falhas dos LLMs

A técnica RAG é fundamental para mitigar as limitações intrínsecas de ambos os LLMs:
*   **Redução de Alucinações**: Ao fornecer contexto factual diretamente dos documentos, o RAG "ancora" a resposta do LLM, diminuindo a probabilidade de alucinações.
*   **Atualização de Conhecimento**: Permite que o LLM acesse informações atualizadas e específicas que não estavam em seus dados de treinamento, como novas leis, jurisprudências ou documentos internos do usuário.
*   **Transparência e Auditabilidade**: As fontes recuperadas pelo RAG podem ser apresentadas ao usuário, permitindo a verificação da origem da informação e aumentando a confiança na resposta.
*   **Especificidade Jurídica**: Garante que as respostas sejam baseadas em textos jurídicos reais, essenciais para a precisão no domínio do Direito.

---

## 🔎 Mecanismo RAG (Retrieval-Augmented Generation) em Detalhes

O coração da inteligência contextual do AuxJuris V2 reside no seu robusto mecanismo RAG, que permite à IA ir além do seu conhecimento pré-treinado e acessar informações específicas de uma base de dados jurídica.

### Componentes do RAG:

1.  **Base de Conhecimento (Corpus)**: Composta por:
    *   **Documentos Carregados pelo Usuário**: PDFs e TXTs enviados para análise.
    *   **Biblioteca Jurídica Interna**: Coleção de textos legais pré-definidos (Constituição Federal, Códigos, etc.) armazenados em `/public/books`.
    *   **Textos Extraídos**: Conteúdo processado e salvo em `/public/books/uploads/extraidos`.
2.  **Processamento e Indexação**:
    *   Quando um documento é adicionado ou o sistema é reindexado, o texto é extraído e limpo (`cleanTextForRag`).
    *   Este texto é então dividido em "chunks" (pedaços menores) para otimização.
    *   Cada chunk é transformado em um **vetor de embedding** (uma representação numérica densa do seu significado semântico) usando um modelo de embedding (atualmente, o modelo de embedding é inferido do LLM em uso ou um modelo padrão compatível com Qdrant).
    *   Os vetores e seus metadados (nome do arquivo, etc.) são armazenados no **Qdrant**, um banco de dados vetorial otimizado para busca de similaridade.
3.  **Busca por Similaridade (Retrieval)**:
    *   Quando o usuário faz uma pergunta no chat, a pergunta também é convertida em um vetor de embedding.
    *   O Qdrant é consultado para encontrar os vetores de documentos mais "próximos" (semanticamente similares) ao vetor da pergunta. Isso é feito usando métricas como a similaridade de cosseno.
    *   Os trechos de texto correspondentes aos vetores mais relevantes são recuperados.
4.  **Geração Aumentada (Augmentation)**:
    *   Os trechos de documentos recuperados (o "contexto RAG") são então injetados no prompt enviado ao LLM.
    *   O LLM recebe a pergunta do usuário *junto com* o contexto relevante, permitindo que ele gere uma resposta informada e fundamentada nos documentos fornecidos, em vez de apenas seu conhecimento geral.

### Benefícios do RAG no Contexto Jurídico:

*   **Precisão e Confiabilidade**: As respostas são baseadas em fontes factuais e verificáveis, crucial para o domínio jurídico onde a exatidão é primordial.
*   **Redução de Alucinações**: Minimiza a tendência dos LLMs de "inventar" informações, um problema sério em aplicações críticas.
*   **Conhecimento Atualizado**: Permite que o sistema utilize as leis, jurisprudências e documentos mais recentes, superando a limitação de conhecimento dos LLMs pré-treinados.
*   **Especificidade de Domínio**: Adapta o LLM para o vocabulário e as nuances do Direito, tornando-o um especialista mais eficaz.

---

## 🧑‍⚖️ Agentes Especializados

O AuxJuris V2 incorpora o conceito de "agentes" ou "personas" de IA, cada um configurado com um conjunto de instruções de sistema (`system prompt`) que direcionam o comportamento e a área de especialização do LLM. Isso permite que o usuário selecione um especialista virtual para a tarefa em questão.

### Exemplos de Agentes e suas Funções:

*   **Assistente Jurídico Geral (Master)**: Atua como um jurista abrangente, com conhecimento em diversas áreas do Direito, ideal para consultas amplas.
*   **Especialista em Direito Administrativo**: Focado em legislação de concursos públicos, princípios administrativos, licitações, etc.
*   **Especialista em Direito Penal**: Concentrado em crimes, processo penal, provas, prescrição.
*   **Especialista em Direito do Consumidor**: Aborda serviços públicos essenciais, defeitos e responsabilidade.
*   **Especialista em Direito Ambiental**: Focado em licenciamento, fiscalização e sanções ambientais.
*   **Especialista em Direito do Trabalho (CLT)**: Especializado em contratação temporária, empregados públicos celetistas.
*   **Especialista em Direito Tributário**: Focado em processo administrativo fiscal, lançamento e execução fiscal.
*   **Especialista em Direito Civil**: Aborda contratos, responsabilidade civil e bens públicos.
*   **Especialista em Direito Empresarial**: Focado em licitações e contratos empresariais com o poder público.
*   **Especialista em Direito Constitucional**: Aborda princípios constitucionais, direitos fundamentais e controle de constitucionalidade.
*   **Especialista em Concursos Públicos**: Focado em elegibilidade, editais, recursos administrativos e regime jurídico de servidores.

Cada agente recebe um `system prompt` detalhado que define sua persona, objetivo e área de especialização, garantindo que as respostas do LLM sejam contextualmente apropriadas e juridicamente relevantes.

---

## 🔬 Análise de Peças Jurídicas (Pipeline PhD)

O AuxJuris V2 oferece um pipeline de análise aprofundada de documentos, projetado para simular uma revisão jurídica minuciosa, ideal para pesquisadores e profissionais que buscam uma compreensão exaustiva de peças processuais ou contratos.

### Etapas do Pipeline:

1.  **Sumarização**: O documento é primeiramente resumido para capturar os pontos essenciais e a finalidade geral. Isso ajuda a reduzir a complexidade para as etapas subsequentes e a fornecer uma visão de alto nível.
2.  **Extração de Insights**: A IA extrai os principais insights, implicações e pontos de discussão do documento, complementando o resumo com análises mais profundas.
3.  **Análise SWOT**: Uma análise SWOT (Forças, Fraquezas, Oportunidades, Ameaças) é gerada, adaptando essa metodologia estratégica para o contexto jurídico. Isso ajuda a identificar pontos fortes e fracos da peça, bem como oportunidades e ameaças legais.
4.  **Detecção de Brechas/Lacunas**: Esta é uma etapa crítica onde a IA, atuando como um "jurista PhD", identifica possíveis brechas, lacunas ou oportunidades jurídicas no texto. Para cada brecha detectada, o sistema tenta citar o trecho relevante do processo, a referência legal aplicável e uma explicação detalhada.
5.  **Validação Formal (Estrutura e Citações)**: O sistema verifica a presença e a ordem de blocos formais comuns em peças jurídicas (endereçamento, qualificação, fatos, fundamentos, pedidos, assinatura). Além disso, ele extrai e valida citações legais (artigos, parágrafos, incisos, leis) e jurisprudências, verificando sua existência e relevância nas fontes internas do RAG.

Este pipeline visa fornecer uma análise multifacetada, desde a compreensão geral até a identificação de detalhes críticos e potenciais falhas, auxiliando na revisão e aprimoramento de documentos jurídicos.

---
---

## 🚀 Aprofundamentos Técnicos e Metodológicos

Esta seção detalha aspectos técnicos e metodológicos adicionais que fundamentam o desenvolvimento e a operação do AuxJuris V2, oferecendo uma visão mais aprofundada para a banca de PhD.

### 1. Estratégias de Chunking e Embedding

*   **Chunking Adaptativo**: A divisão de documentos em "chunks" não é meramente por tamanho fixo. Implementamos uma estratégia que busca preservar a coerência semântica dos trechos, utilizando heurísticas baseadas em parágrafos, seções e, quando aplicável, estruturas de artigos legais. Isso minimiza a quebra de contexto e melhora a relevância dos resultados do RAG.
*   **Modelos de Embedding**: Embora o modelo de embedding seja inferido do LLM em uso ou um padrão compatível com Qdrant, a escolha do modelo de embedding é crucial. Para modelos locais (LM Studio), exploramos embeddings como `all-MiniLM-L6-v2` ou `bge-small-en-v1.5` (ou suas versões em português, se disponíveis e otimizadas para o domínio jurídico), que oferecem um bom equilíbrio entre performance e eficiência. Para o Gemini, o modelo de embedding é intrínseco à API. A qualidade do embedding impacta diretamente a capacidade do RAG de encontrar informações relevantes.
*   **Otimização de Embeddings**: Futuras otimizações podem incluir o fine-tuning de modelos de embedding em um corpus jurídico específico para aumentar a precisão da busca semântica.

### 2. Gerenciamento de Contexto e Prompt Engineering

*   **Context Window Dinâmica**: O sistema gerencia a "janela de contexto" do LLM de forma dinâmica. Para o Gemini 2.5 Pro, que suporta um contexto de até 1 milhão de tokens, priorizamos a inclusão de múltiplos trechos relevantes do RAG, além do histórico de conversas, para garantir que o LLM tenha todas as informações necessárias. Para modelos locais com janelas menores, uma estratégia de sumarização ou seleção mais agressiva dos chunks é aplicada.
*   **Prompt Engineering Avançado**: Os `system prompts` dos agentes especializados são cuidadosamente elaborados para:
    *   Definir a persona e o tom de voz do agente (e.g., "Você é um jurista PhD...").
    *   Estabelecer regras claras para a geração de respostas (e.g., "Cite sempre a fonte legal quando possível", "Não alucine informações").
    *   Instruir o LLM sobre como integrar o contexto RAG (e.g., "Baseie sua resposta exclusivamente nos documentos fornecidos").
    *   Incluir exemplos de formato de saída desejado para tarefas específicas (e.g., SWOT, sumarização).
*   **Few-Shot Learning**: Para tarefas mais complexas no pipeline de análise PhD, utilizamos técnicas de "few-shot learning" nos prompts, fornecendo exemplos de entrada/saída para guiar o LLM na geração de respostas estruturadas e precisas.

### 3. Persistência e Escalabilidade do Qdrant

*   **Configuração do Qdrant**: O Qdrant é configurado para persistência de dados, garantindo que os índices de embedding não sejam perdidos entre as sessões. A escolha de um banco de dados vetorial dedicado como o Qdrant, em vez de uma solução in-memory, é fundamental para a robustez e escalabilidade do RAG.
*   **Otimização de Coleções**: As coleções no Qdrant são otimizadas para busca de similaridade de cosseno, que é a métrica mais comum para embeddings. Índices eficientes (e.g., HNSW) são utilizados para garantir buscas rápidas mesmo com um grande volume de documentos.
*   **Escalabilidade Futura**: A arquitetura do Qdrant permite escalabilidade horizontal, o que será crucial à medida que a base de conhecimento jurídica crescer. Isso envolve a distribuição de coleções por múltiplos nós para lidar com maior volume de dados e requisições.

### 4. Monitoramento e Avaliação de Desempenho

*   **Métricas de Qualidade do RAG**: Implementação de métricas para avaliar a qualidade do RAG, como *recall* (quão bem o sistema recupera informações relevantes) e *precision* (quão relevantes são as informações recuperadas). Isso pode ser feito através de conjuntos de dados de teste com perguntas e respostas esperadas.
*   **Avaliação de LLM**: Monitoramento da performance dos LLMs em termos de:
    *   **Qualidade da Resposta**: Avaliação humana ou automatizada da coerência, precisão e completude das respostas.
    *   **Latência**: Tempo de resposta das chamadas à API dos LLMs.
    *   **Custo (para Gemini)**: Monitoramento do consumo de tokens para controle de custos.
*   **Logging Detalhado**: Implementação de logging robusto no backend para rastrear o fluxo de dados, chamadas à API, erros e desempenho, facilitando a depuração e otimização.


## 🔒 Segurança e Considerações Éticas

A segurança e a ética são pilares no desenvolvimento do AuxJuris V2, especialmente ao lidar com informações jurídicas sensíveis e a interação com modelos de IA.

### Estratégias de Segurança:

*   **Limpeza de Entrada (`cleanTextForRag`)**: Implementada para remover ruídos e dados irrelevantes que poderiam, em teoria, ser usados para "prompt injection" ou para poluir o contexto.
*   **Isolamento de Contexto RAG**: O sistema é projetado para que as respostas da IA sejam estritamente baseadas nas fontes fornecidas (documentos carregados e biblioteca interna), minimizando a exposição a dados externos não controlados.
*   **Chaves de API Seguras**: A API Key do Gemini é gerenciada no backend e não é exposta diretamente ao cliente (frontend), protegendo-a contra acesso não autorizado.
*   **Validação de Entradas no Backend**: O backend pode implementar sanitização e filtragem adicionais para prevenir ataques de "prompt injection" ou outras vulnerabilidades.
*   **`SafetySettings` dos Modelos Gemini**: Os modelos do Google Gemini são configurados com `SafetySettings` para censurar conteúdo potencialmente prejudicial, tóxico ou ilegal, adicionando uma camada de segurança e responsabilidade.
*   **Conformidade com LGPD**: A arquitetura é projetada para ser compatível com a Lei Geral de Proteção de Dados (LGPD), com foco na minimização de dados, anonimização (quando aplicável) e controle sobre o armazenamento de informações sensíveis. O processamento local via LM Studio oferece uma camada adicional de privacidade.

### Considerações Éticas:

*   **Viés da IA**: Reconhecemos que modelos de IA podem herdar vieses dos dados de treinamento. É crucial que os usuários estejam cientes disso e que as respostas da IA sejam sempre revisadas por um profissional humano.
*   **Responsabilidade Humana**: O AuxJuris V2 é uma ferramenta de *assistência*, não um substituto para o julgamento e a expertise jurídica humana. A decisão final e a responsabilidade legal sempre recaem sobre o profissional.
*   **Transparência**: O mecanismo RAG visa aumentar a transparência, permitindo que as fontes das informações sejam rastreadas.
*   **Uso Indevido**: A ferramenta não deve ser utilizada para fins ilegais, antiéticos ou para gerar desinformação.

---

## ⚠️ Limitações e Desafios Futuros

Apesar de suas capacidades avançadas, o AuxJuris V2, como qualquer sistema de IA, possui limitações inerentes e desafios a serem superados em futuras iterações.

### Limitações Atuais:

*   **Dependência de Qualidade do Texto**: A eficácia do RAG e das análises depende diretamente da qualidade e clareza do texto extraído dos documentos. PDFs escaneados sem OCR ou com formatação complexa podem resultar em extração de texto deficiente.
*   **Limites de Contexto (mesmo com RAG)**: Embora o RAG aumente o contexto, há um limite prático para a quantidade de informação que pode ser injetada no prompt do LLM em uma única interação, especialmente para documentos extremamente longos ou múltiplas fontes.
*   **Custo e Desempenho dos LLMs**: O uso do Gemini 2.5 Pro pode ser custoso em larga escala, enquanto o LM Studio depende fortemente do hardware local, limitando a acessibilidade para alguns usuários.
*   **Latência**: A latência pode ser um problema, seja pela comunicação com APIs externas (Gemini) ou pelo processamento intensivo em hardware local (LM Studio).
*   **Complexidade Jurídica**: Casos jurídicos altamente complexos, que exigem raciocínio inferencial profundo, interpretação de precedentes ambíguos ou negociação, ainda estão além das capacidades autônomas da IA.
*   **Atualização Contínua do Conhecimento**: Manter a base de conhecimento RAG atualizada com as últimas leis e jurisprudências é um desafio contínuo que requer processos de ingestão de dados eficientes.
*   **Ausência de Multimodalidade Completa**: Embora o Gemini seja multimodal, a implementação atual do AuxJuris V2 foca primariamente no texto. A análise de imagens (e.g., gráficos em documentos, selos) não é totalmente explorada.

### Possíveis Falhas e Pontos de Atenção:

*   **"Alucinações" Persistentes**: Mesmo com RAG, o LLM pode, ocasionalmente, gerar informações que parecem plausíveis, mas são incorretas ou não suportadas pelas fontes. A validação humana é indispensável.
*   **Interpretação Ambígua**: A IA pode interpretar ambiguidades em documentos ou perguntas de forma diferente do esperado, levando a respostas imprecisas.
*   **Erros de Integração**: Falhas na comunicação entre frontend, backend, Qdrant e LLMs podem ocorrer, resultando em erros de processamento ou respostas vazias.
*   **Vieses Inesperados**: Novos vieses podem surgir ou serem amplificados se os dados de treinamento ou as fontes RAG contiverem representações desequilibradas.
*   **Segurança da API Key**: Embora a chave seja gerenciada no backend, a segurança do ambiente onde o backend roda (servidor, variáveis de ambiente) é crucial.

### Estratégias de Mitigação e Melhoria:

Para abordar as possíveis falhas e pontos de atenção, as seguintes estratégias são propostas, baseadas em melhores práticas e pesquisas na área de LLMs e RAG:

*   **"Alucinações" Persistentes e Interpretação Ambígua**:
    *   **Aprimoramento do RAG**: Implementar técnicas avançadas de RAG, como re-ranking de documentos (e.g., usando modelos de re-ranking como `Cohere Rerank` ou `Cross-encoders`) para garantir que os trechos mais relevantes sejam priorizados. Explorar RAG multi-hop para perguntas complexas que exigem a combinação de informações de múltiplas fontes.
    *   **Prompt Engineering Dinâmico**: Refinar os prompts para incluir instruções mais explícitas ao LLM sobre como lidar com ambiguidades, solicitar clarificação quando necessário e enfatizar a citação de fontes diretas dos documentos recuperados.
    *   **Feedback Loop Humano-in-the-Loop**: Desenvolver um mecanismo para que os usuários possam sinalizar respostas incorretas ou alucinadas. Esse feedback pode ser usado para ajustar os parâmetros de busca do RAG, refinar os prompts ou até mesmo identificar a necessidade de reindexação de documentos.

*   **Erros de Integração**:
    *   **Monitoramento Abrangente**: Implementar ferramentas de monitoramento de desempenho de aplicações (APM) para rastrear a comunicação entre frontend, backend, Qdrant e LLMs. Isso inclui métricas de latência, taxa de erros e disponibilidade de serviços.
    *   **Tratamento de Erros e Resiliência**: Adicionar lógica de retry com backoff exponencial para chamadas a serviços externos (Qdrant, APIs de LLMs) para lidar com falhas temporárias de rede ou sobrecarga. Implementar circuit breakers para prevenir falhas em cascata.
    *   **Testes de Integração Automatizados**: Expandir a suíte de testes para incluir testes de integração robustos que simulem o fluxo completo de dados entre os componentes, garantindo que as APIs e as interações funcionem conforme o esperado.

*   **Vieses Inesperados**:
    *   **Auditoria e Curadoria de Dados RAG**: Realizar auditorias regulares nas fontes de dados utilizadas para o RAG, buscando identificar e mitigar vieses históricos, sociais ou de representação. Priorizar a inclusão de fontes diversas e representativas.
    *   **Avaliação de Viés do LLM**: Utilizar benchmarks e métricas específicas para avaliar o viés dos modelos de LLM (tanto locais quanto em nuvem) no contexto jurídico, e, se possível, aplicar técnicas de debiasing ou selecionar modelos com menor propensão a vieses.
    *   **Transparência e Explicação**: Aumentar a transparência sobre as fontes utilizadas pelo RAG e, quando possível, fornecer explicações sobre como a resposta foi gerada, permitindo que o usuário identifique potenciais vieses.

*   **Segurança da API Key**:
    *   **Gerenciamento de Segredos em Produção**: Para ambientes de produção, utilizar soluções de gerenciamento de segredos (e.g., HashiCorp Vault, AWS Secrets Manager, Azure Key Vault) para armazenar e injetar chaves de API de forma segura, evitando que sejam expostas em arquivos de configuração ou variáveis de ambiente diretamente no servidor.
    *   **Princípio do Menor Privilégio**: Garantir que as credenciais e permissões do ambiente de execução do backend sejam as mínimas necessárias para suas operações, limitando o escopo de um possível comprometimento.
    *   **Rotação Regular de Chaves**: Implementar uma política de rotação periódica das chaves de API, reduzindo o risco associado a chaves comprometidas por longos períodos.

### Direções Futuras:

*   **Otimização de Custos e Desempenho**: Implementação de estratégias como caching de respostas, otimização de prompts para menor consumo de tokens, e exploração de modelos mais eficientes.
*   **Aprimoramento do RAG**: Técnicas avançadas de chunking, re-ranking de documentos, e RAG multi-hop para perguntas que exigem informações de múltiplas fontes.
*   **Interface de Gerenciamento de Dados**: Ferramentas para o usuário gerenciar e visualizar a base de conhecimento RAG (adicionar/remover documentos, monitorar indexação).
*   **Integração com Outras Bases de Dados Jurídicas**: Conexão com APIs de tribunais, diários oficiais e bases de jurisprudência para enriquecer o contexto.
*   **Funcionalidades Multimodais**: Expandir a análise para incluir elementos visuais de documentos (gráficos, tabelas, assinaturas).
*   **Feedback Loop Contínuo**: Implementar mecanismos para coletar feedback do usuário e usá-lo para refinar os prompts, os agentes e, potencialmente, os modelos.
*   **Escalabilidade e Deploy**: Preparar o projeto para deploy em ambientes de produção em nuvem, com estratégias de balanceamento de carga e monitoramento.

---

## 🗃️ Estrutura do Projeto

```
AUXJURIS_V2/
├── backend/                    # Lógica backend (API, RAG, chamada à IA)
│   ├── src/                    # Código fonte do backend
│   │   ├── server.ts           # Servidor Express, endpoints, lógica de LLM
│   │   ├── rag_search.ts       # Lógica de busca semântica no Qdrant
│   │   └── rag_index.ts        # Script de indexação de documentos para Qdrant
│   └── .env.example            # Exemplo de variáveis de ambiente para o backend
├── components/                # Componentes React: chat, upload, análise, etc.
├── hooks/                     # React hooks personalizados para lógica compartilhada
├── public/
│   └── books/                 # Fontes jurídicas (PDFs, textos)
│       └── uploads/           # Documentos carregados pelo usuário
│           └── extraidos/     # Textos extraídos de uploads
├── App.tsx                    # Componente raiz da aplicação, orquestra estados
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

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS
*   **Backend**: Node.js, Express.js
*   **Banco de Dados Vetorial**: Qdrant
*   **Modelos de Linguagem (LLMs)**: Google Gemini 2.5 Pro, Modelos Open-Source via LM Studio
*   **Ferramentas de Desenvolvimento**: TypeScript, Vite, ts-node
*   **Bibliotecas Essenciais**: Axios (para requisições HTTP), pdf-parse (para extração de texto de PDFs)
*   **Gerenciamento de Pacotes**: npm/Yarn
*   **Controle de Versão**: Git
*   **Diagramação**: Mermaid

