
<div align="center">
  <img src="https://github.com/MarceloClaro/AUXJURIS/blob/main/jus.png?raw=true" alt="AuxJuris IA Logo" width="150"/>
</div>

# AuxJuris IA - Assistente Jurídico Avançado

**AuxJuris IA** é uma aplicação web de página única (SPA) sofisticada, projetada para servir como um assistente jurídico inteligente para profissionais do Direito brasileiro. Ele integra o poder dos modelos de linguagem de ponta da Google (Gemini) com a técnica de Geração Aumentada por Recuperação (RAG) para fornecer análises de documentos, consultoria jurídica contextualizada, auxílio na elaboração de peças processuais e comparação detalhada de textos legais.

## Funcionalidades Principais

O AuxJuris IA oferece um conjunto robusto de ferramentas para otimizar o trabalho jurídico:

1.  **Upload e Processamento de Documentos:**
    *   Suporte para arquivos PDF, TXT e JSON (DOCX com instrução de conversão).
    *   Extração de texto de PDFs realizada no cliente (navegador) usando `pdf.js`.
    *   Gerenciamento de múltiplos arquivos (até 5).
    *   Feedback visual durante o processo de extração.

2.  **Análise Individual de Documentos:**
    *   Após a extração, cada documento pode ser analisado individualmente para:
        *   **Geração de Resumo:** Cria um sumário conciso.
        *   **Extração de Insights:** Identifica implicações legais, riscos e oportunidades.
        *   **Análise SWOT:** Produz uma análise de Forças, Fraquezas, Oportunidades e Ameaças.
    *   **Revisão Simulada "Pro. Marcelo Claro":** Todas as análises passam por uma etapa de "revisão" por um agente mestre configurado para refinar e garantir a qualidade jurídica.

3.  **Base de Conhecimento Interno (RAG - Livros Pré-definidos):**
    *   Seleção de obras jurídicas brasileiras fundamentais (Constituição Federal, Códigos, CLT) para enriquecer o contexto da IA.
    *   Carregamento automático do conteúdo textual (principalmente PDFs).
    *   **Fallback de Upload Manual:** Se o carregamento automático de um livro falhar, o usuário pode enviar o arquivo manualmente.

4.  **Chat com Agentes Especializados:**
    *   Interface de chat interativa com múltiplos "especialistas" de IA, cada um com instruções de sistema (prompts) direcionadas a áreas específicas do Direito (Administrativo, Penal, Civil, Constitucional, etc.).
    *   Respostas contextualizadas pelo RAG (documentos do usuário e livros selecionados).
    *   **Prompt de Sistema Personalizado:** Usuários avançados podem fornecer suas próprias instruções de sistema, priorizadas e complementadas pelas do agente.
    *   Respostas da IA são transmitidas em tempo real (streaming).

5.  **Leitura em Voz Alta (Text-to-Speech):**
    *   Funcionalidade para ouvir as respostas da IA, utilizando a API de Síntese de Voz do navegador.

6.  **Comparação Detalhada de Documentos:**
    *   Permite comparar um "Documento A" (documento enviado ou última resposta da IA) com um "Documento B" (novo upload).
    *   A IA realiza uma análise comparativa jurídica detalhada.
    *   O resultado da comparação também é "revisado" pelo "Pro. Marcelo Claro".
    *   A análise é exibida em uma janela modal.

7.  **Histórico de Respostas da IA:**
    *   Um painel dedicado exibe um log das respostas fornecidas pela IA durante a sessão.
    *   Opções para baixar o histórico nos formatos CSV e JSON.

8.  **Interface e Experiência do Usuário:**
    *   Design responsivo e moderno utilizando Tailwind CSS.
    *   Tema escuro para conforto visual.
    *   Indicadores visuais de carregamento e processamento.
    *   Mensagens de sistema para feedback contínuo.

## Tecnologias e Técnicas Utilizadas

O desenvolvimento do AuxJuris IA emprega um stack moderno e técnicas avançadas:

*   **Frontend:**
    *   **React 19:** Biblioteca JavaScript para construção de interfaces de usuário declarativas e componentizadas.
    *   **TypeScript:** Superset do JavaScript que adiciona tipagem estática, aumentando a robustez e a manutenibilidade do código.
    *   **Tailwind CSS:** Framework CSS utility-first para estilização rápida e responsiva.
*   **Integração com IA:**
    *   **Google Gemini API:** Utilização do SDK oficial `@google/genai` para interagir com os modelos de linguagem da Google.
    *   **Modelo Principal (Chat e Análise):** `gemini-2.5-flash-preview-04-17`.
*   **Técnica de IA Central:**
    *   **Retrieval Augmented Generation (RAG):** A capacidade da IA é enriquecida através da recuperação de informações de documentos fornecidos pelo usuário e de uma base de conhecimento interna (livros jurídicos). Os textos são processados e incluídos no prompt enviado ao modelo Gemini.
*   **Processamento de Documentos:**
    *   **Client-side PDF Parsing:** A biblioteca `pdf.js` (incluída via CDN) é utilizada para extrair texto de arquivos PDF diretamente no navegador do usuário.
    *   Arquivos TXT e JSON são lidos usando a API `FileReader`.
*   **Gerenciamento de Estado:**
    *   Hooks do React (`useState`, `useEffect`, `useCallback`, `useRef`, `useMemo`) para gerenciar o estado local dos componentes e a lógica da aplicação.
*   **Estrutura do Código:**
    *   **Componentização:** A UI é dividida em componentes reutilizáveis (e.g., `FileUploadArea`, `ChatInterface`, `DocumentList`).
    *   **Módulos ES6:** Código organizado em módulos para melhor separação de responsabilidades.
    *   `index.html` utiliza `importmap` para gerenciar dependências de bibliotecas externas como React e `@google/genai` via ESM.sh.
*   **Comunicação com API:**
    *   Uso de `async/await` para chamadas assíncronas à API Gemini.
    *   Streaming de respostas no chat para uma experiência interativa.
*   **Tratamento de Erros:**
    *   Mecanismos para capturar e exibir erros da API Gemini, do processamento de arquivos e da síntese de voz.
*   **Engenharia de Prompt:**
    *   Prompts de sistema detalhados e dinamicamente construídos para guiar os agentes de IA, incluindo o contexto RAG e instruções personalizadas.
    *   Prompts específicos para tarefas de sumarização, extração de insights, análise SWOT e comparação de documentos.
    *   Um "Agente Mestre" (Pro. Marcelo Claro) é usado para refinar as saídas das análises, aplicando um prompt de revisão.

## Análise SWOT

### Aplicabilidade e Utilidade da Ferramenta

*   **Forças (Strengths):**
    *   Especialização jurídica com múltiplos agentes de IA.
    *   Contextualização RAG avançada, aumentando a relevância das respostas.
    *   Automação de tarefas jurídicas demoradas (análise, resumo, comparação).
    *   Base de conhecimento com suporte nativo a documentos jurídicos essenciais do Brasil.
    *   Framework de análise estruturada (Resumo, Insights, SWOT).
    *   Simulação de revisão qualificada ("Pro. Marcelo Claro").
    *   Alta flexibilidade com prompts de sistema personalizados.

*   **Fraquezas (Weaknesses):**
    *   Qualidade das respostas dependente da capacidade do modelo Gemini subjacente e sua data de corte de conhecimento.
    *   Não se integra dinamicamente a bases de jurisprudência ou legislação em tempo real (depende do RAG estático e da capacidade de busca do Gemini, se aplicável).
    *   Extração de texto de PDFs complexos ou mal formatados pode ser imperfeita.
    *   Pode apresentar uma curva de aprendizado para funcionalidades mais avançadas.

*   **Oportunidades (Opportunities):**
    *   Expansão da base de conhecimento interna com mais obras e especialidades.
    *   Integração com APIs jurídicas para RAG dinâmico.
    *   Fine-tuning de modelos Gemini para nichos jurídicos específicos.
    *   Implementação de funcionalidades colaborativas.
    *   Aprimoramento das técnicas de RAG (chunking, embedding, vector search).

*   **Ameaças (Threats):**
    *   Questões éticas e de responsabilidade no uso de IA para aconselhamento jurídico.
    *   Risco de super-confiança do usuário, negligenciando a revisão humana crítica.
    *   Rápida evolução da tecnologia de IA, podendo tornar abordagens atuais obsoletas.
    *   Preocupações com privacidade e segurança de dados ao interagir com APIs externas (mesmo com processamento client-side para extração).
    *   Dependência da API Gemini (mudanças em termos, preços, disponibilidade).

### Codificação e Implementação

*   **Forças (Strengths):**
    *   Stack tecnológico moderno e robusto (React, TypeScript, Tailwind CSS).
    *   Arquitetura modular e componentizada, facilitando a manutenção.
    *   Integração direta e correta com o SDK `@google/genai`.
    *   Tipagem estática para maior robustez.
    *   Bom tratamento de assincronicidade e estados de carregamento.
    *   Mecanismos de tratamento de erros.
    *   Processamento de texto de PDF no cliente, reduzindo a necessidade de backend para essa tarefa.

*   **Fraquezas (Weaknesses):**
    *   Gerenciamento de estado global pode se tornar complexo com `useState` e props drilling em aplicações muito maiores (poderia evoluir para Zustand/Redux).
    *   Tamanho do bundle pode ser considerável devido a bibliotecas como `pdf.js` se não otimizado (e.g., com code splitting mais granular).
    *   Referência global a `window.pdfjsLib` é menos ideal que importações diretas, mas é uma prática comum ao usar CDNs.
    *   Limpeza de texto baseada em heurísticas pode necessitar de ajustes contínuos.

*   **Oportunidades (Opportunities):**
    *   Adoção de um gerenciador de estado dedicado (Zustand, Redux Toolkit) para maior escalabilidade.
    *   Otimizações de performance (code splitting, lazy loading, Web Workers para tarefas pesadas).
    *   Expansão da cobertura de testes.
    *   Melhorar suporte a formatos como DOCX com bibliotecas client-side.

*   **Ameaças (Threats):**
    *   Breaking changes em dependências (API Gemini, `pdf.js`).
    *   Variações de comportamento de APIs do navegador (como `SpeechSynthesis`) entre diferentes browsers.
    *   Gargalos de performance com contextos RAG excessivamente grandes processados no cliente.

## Configuração e Execução

AuxJuris IA é uma aplicação frontend pura que interage com a API Google Gemini.

1.  **Chave da API Google Gemini:**
    *   A aplicação **requer** que uma chave da API Google Gemini válida seja configurada como uma variável de ambiente chamada `API_KEY`.
    *   Esta variável `process.env.API_KEY` deve estar disponível no ambiente de execução onde a aplicação é servida ou construída.
    *   **A aplicação NÃO fornece interface para inserir a chave da API. Sua configuração é um pré-requisito do ambiente.**

2.  **Dependências:**
    *   As dependências de frontend (React, Tailwind CSS, `pdf.js`, `@google/genai`) são gerenciadas via `importmap` no `index.html` e carregadas de CDNs (ESM.sh, cdnjs).

3.  **Execução:**
    *   Sirva o diretório raiz da aplicação (contendo `index.html`, `index.tsx`, etc.) através de um servidor web local.
    *   Certifique-se de que o servidor possa substituir `process.env.API_KEY` no código ou que esta variável esteja definida no ambiente de build/runtime de forma que o JavaScript possa acessá-la. Um método comum é usar um processo de build (como Vite, Create React App) que suporte variáveis de ambiente.

## Estrutura de Arquivos (Principais)

```
.
├── public/
│   └── books/              # Contém os arquivos PDF/TXT dos livros pré-definidos
│       ├── CF88/
│       │   └── CF88_EC134_livro.pdf
│       └── ...             # Outros livros
├── src/
│   ├── components/         # Componentes React reutilizáveis
│   │   ├── AIResponseHistory.tsx
│   │   ├── ChatInterface.tsx
│   │   ├── ComparisonResultModal.tsx
│   │   ├── ComparisonSidebar.tsx
│   │   ├── DocumentList.tsx
│   │   ├── FileUploadArea.tsx
│   │   ├── icons.tsx
│   │   ├── InternalBookSelector.tsx
│   │   └── LoadingSpinner.tsx
│   ├── hooks/              # Hooks React personalizados
│   │   └── useTextToSpeech.ts
│   ├── App.tsx             # Componente principal da aplicação
│   ├── constants.ts        # Constantes, prompts, definições de agentes
│   ├── index.tsx           # Ponto de entrada React (renderiza App)
│   ├── types.ts            # Definições de tipos TypeScript
│   └── utils.ts            # Funções utilitárias
├── index.html              # Arquivo HTML principal com importmap
├── metadata.json           # Metadados da aplicação
├── README.md               # Este arquivo
└── tailwind.config.js      # (Implícito, pois usa CDN, mas seria para customização)
```

---

Desenvolvido para auxiliar e potencializar a prática jurídica através da inteligência artificial.
```