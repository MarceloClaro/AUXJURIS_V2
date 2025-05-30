
<div align="center">
  <img src="https://github.com/MarceloClaro/AUXJURIS/blob/main/jus.png?raw=true" alt="AuxJuris IA Logo" width="150"/>
</div>

AuxJuris V2: Assistente Jurídico Inteligente
1. Descrição Completa do Projeto
O AuxJuris V2 é uma aplicação web projetada para atuar como um assistente jurídico avançado, potencializado por Inteligência Artificial (IA), especificamente os modelos Gemini do Google, e a técnica de Retrieval Augmented Generation (RAG). Seu objetivo principal é auxiliar profissionais e estudantes da área jurídica (e áreas correlatas) a processar, analisar, comparar e obter insights de documentos legais e textos jurídicos de forma eficiente.

A plataforma permite que os usuários façam upload de seus próprios documentos, selecionem fontes de conhecimento jurídico predefinidas (como leis e códigos internos) e interajam com um sistema de chat inteligente que utiliza esses materiais como base para fornecer respostas contextuais e relevantes. Além disso, oferece ferramentas para análise detalhada de documentos, incluindo sumarização, extração de insights e análise SWOT, e comparação entre diferentes textos.

2. Funções Principais
O AuxJuris V2 oferece um conjunto robusto de funcionalidades:

Upload e Processamento de Documentos:
Suporte para upload de múltiplos arquivos (PDF, TXT, JSON, JSONL).
Extração de texto otimizada a partir desses arquivos, com limpeza preliminar (cleanTextForRag) para remover ruídos como cabeçalhos, rodapés e números de página, melhorando a qualidade dos dados para a IA.
Análise de Documentos via Backend:
Sumarização: Gera resumos concisos de documentos extensos.
Extração de Insights: Identifica e extrai informações e pontos-chave relevantes dos textos.
Análise SWOT: Realiza uma análise de Forças (Strengths), Fraquezas (Weaknesses), Oportunidades (Opportunities) e Ameaças (Threats) com base no conteúdo do documento.
As análises são processadas por um backend, que lida com a lógica de interação com os modelos Gemini.
Chat Inteligente com RAG (Retrieval Augmented Generation):
Interface de chat para interagir com a IA.
As respostas da IA são fundamentadas no conteúdo dos documentos carregados pelo usuário e nos livros/textos jurídicos internos selecionados.
Seleção de Agentes (Especialistas): Permite escolher diferentes "agentes" de IA, cada um com um prompt de sistema especializado (ex: Especialista em Direito Civil, Especialista em Direito Penal), para refinar o comportamento e o foco da IA.
Prompt de Sistema Personalizado: Usuários avançados podem fornecer seus próprios prompts de sistema para customizar ainda mais a interação.
Gerenciamento de Fontes de Conhecimento Internas:
Seleção de livros e documentos jurídicos predefinidos (ex: Constituição Federal, Código Penal) que são carregados e processados para integrar o contexto RAG.
Sistema de carregamento dinâmico desses livros, com tratamento de erros e opção de upload manual pelo usuário caso o carregamento automático falhe.
Comparação de Documentos:
Permite comparar o conteúdo de dois documentos. O "Documento A" pode ser um documento carregado pelo usuário ou a última resposta da IA, e o "Documento B" é um arquivo carregado especificamente para a comparação.
A comparação é realizada utilizando modelos Gemini, com um possível passo de revisão por um prompt que simula um "Master Legal Expert" para refinar o resultado.
Histórico de Respostas da IA:
Visualização das respostas geradas pela IA durante a sessão.
Opção de download do histórico em formatos CSV e JSON.
Text-to-Speech (TTS):
Funcionalidade para ouvir as respostas da IA, melhorando a acessibilidade.
Interface de Usuário Intuitiva:
Organizada em painéis: um para upload de arquivos, seleção de fontes e configurações; um central para o chat; e um para o histórico de respostas da IA.
Feedback visual para operações em andamento (loading spinners, mensagens de status).
3. Insights e Aplicabilidade
Insights Gerados:

Compreensão Rápida: Resumos de longos documentos legais, petições ou jurisprudências.
Identificação de Pontos Críticos: Extração de argumentos chave, teses jurídicas, e informações relevantes de um texto.
Análise Estratégica: Avaliação SWOT de um caso, contrato ou peça processual, identificando seus pontos fortes, fracos, oportunidades e riscos.
Análise Comparativa Detalhada: Identificação de semelhanças, diferenças, e nuances entre leis, versões de contratos, ou argumentações.
Respostas Contextualizadas: Esclarecimento de dúvidas jurídicas com base estritamente nos documentos fornecidos, aumentando a relevância e precisão.
Suporte à Tomada de Decisão: Ao consolidar e analisar informações, auxilia na formulação de estratégias e decisões jurídicas.
Aplicabilidade:

Advogados e Escritórios de Advocacia: Para análise de casos, pesquisa de jurisprudência, preparação de petições, revisão de contratos e due diligence.
Departamentos Jurídicos de Empresas: Análise de contratos, conformidade regulatória, gestão de riscos legais.
Estudantes de Direito e Acadêmicos: Ferramenta de estudo, pesquisa e análise de textos legais complexos.
Consultores Jurídicos: Para agilizar a análise de documentos e a formulação de pareceres.
Setor Público (Judiciário, Ministério Público, etc.): Auxílio na análise de processos e legislação.
Qualquer Profissional que Lide com Documentação Jurídica: Simplifica a interpretação e o manejo de grandes volumes de informação legal.
4. Descrição Técnica (para Desenvolvedores e Startups)
Stack Tecnológico e Arquitetura:

Frontend:
Framework: React (com TypeScript).
Componentização: Uso extensivo de componentes funcionais e React Hooks (useState, useEffect, useCallback, useMemo, useRef) para gerenciamento de estado e lógica.
Processamento Client-Side:
Leitura de arquivos (PDF, TXT, JSON) via FileReader API.
Extração de texto de PDFs no cliente usando pdf.js (window.pdfjsLib).
Comunicação com Backend: Utiliza a fetch API para chamadas a um servidor backend (presumivelmente em http://localhost:3001/api/).
Estilização: Provavelmente Tailwind CSS (inferido pelas classes CSS como grid, bg-gray-800, p-4).
Gerenciamento de Estado: Principalmente através de hooks do React, adequado para a complexidade da aplicação.
Backend (Inferido a partir das chamadas API):
Linguagem/Framework: Não especificado, mas comumente Node.js/Express em conjunto com frontends React.
Responsabilidades:
Orquestração das chamadas aos modelos de IA Gemini.
Implementação da lógica RAG (busca e contextualização de informações).
Processamento das análises de documentos (sumarização, insights, SWOT).
Gerenciamento das interações de chat.
Endpoints API: /api/analyze/{summary|insights|swot} e /api/chat.
Integração com IA (Google Gemini):
A maior parte da interação com Gemini parece ser abstraída pelo backend.
A funcionalidade de comparação de documentos (handleStartComparison) sugere uma interação direta do frontend com os modelos Gemini (genAI.models.generateContent), utilizando configurações de segurança (modelConfig.safetySettings) e prompts de sistema. Nota: As variáveis genAI e modelConfig não são definidas no arquivo App.tsx fornecido, indicando que são injetadas globalmente ou fazem parte de um contexto mais amplo do projeto.
Uso de modelos específicos como GEMINI_CHAT_MODEL_GENERAL e GEMINI_ANALYSIS_MODEL.
Estrutura do Projeto (Frontend):
Modular, com componentes bem definidos para cada funcionalidade (FileUploadArea, ChatInterface, DocumentList, etc.).
Uso de constantes (constants.ts) para prompts, configurações e limites, facilitando a manutenção.
Dados predefinidos (livros internos) gerenciados em predefined-books.ts.
Para Startups:

MVP Viável: A arquitetura permite construir um Produto Mínimo Viável (MVP) focado em funcionalidades chave e expandir gradualmente.
Tecnologia Moderna: O uso de React, TypeScript e modelos de IA de ponta (Gemini) torna o projeto atraente e alinhado com as tendências atuais.
Valor Agregado Claro: Resolve dores reais no setor jurídico, como o tempo gasto na análise de documentos e pesquisa.
Escalabilidade: A separação frontend/backend e a componentização do React facilitam a escalabilidade da aplicação. O backend pode ser escalado independentemente para lidar com mais usuários e processamento de IA.
Customização: A arquitetura de "Agentes" e prompts personalizáveis oferece flexibilidade para adaptar a IA a nichos jurídicos específicos.
5. Segurança nos RAGs (Retrieval Augmented Generation)
A segurança em sistemas RAG como o AuxJuris V2 é multifacetada e depende tanto do frontend quanto, crucialmente, do backend (cujo código não foi fornecido) e das práticas de interação com o LLM.

Como o AuxJuris V2 (com base no código do frontend) contribui para um RAG mais controlado e potencialmente mais seguro:

Limpeza e Preparação de Dados no Cliente (cleanTextForRag):

Ao remover informações irrelevantes (cabeçalhos, rodapés, números de página, anotações específicas) antes de enviar o texto para o RAG, o sistema reduz o "ruído". Isso não é uma medida de segurança direta, mas melhora a qualidade dos dados que alimentam o modelo, tornando menos provável que a IA se baseie em artefatos indesejados ou os exponha.
Contexto Controlado:

O RAG, por natureza, fundamenta as respostas da IA em um conjunto específico de documentos: aqueles carregados pelo usuário e os livros internos selecionados. Isso limita o "conhecimento" da IA ao contexto fornecido, reduzindo o risco de alucinações ou de fornecer informações de fontes não verificadas ou irrelevantes para o caso em questão. É uma forma de "sandboxing" do conhecimento da IA.
Abstração pelo Backend (para Chat e Análise):

A maioria das interações com a IA (chat, sumarização, insights, SWOT) passa por um backend (http://localhost:3001/api/...). Esta camada de abstração é crucial para a segurança:
Gerenciamento Seguro de Chaves de API: O backend pode armazenar e usar as chaves de API do Gemini de forma segura, sem expô-las no cliente.
Validação e Sanitização: O backend pode implementar validação e sanitização adicionais nos dados recebidos do cliente e nas respostas da IA.
Controle de Acesso e Rate Limiting: O backend é o local ideal para implementar autenticação, autorização e políticas de uso.
Engenharia de Prompts e Agentes:

O uso de prompts de sistema específicos para diferentes "agentes" (ex: MASTER_LEGAL_EXPERT_SYSTEM_INSTRUCTION, prompts dos LEGAL_AGENTS) ajuda a direcionar o comportamento da IA. Prompts bem elaborados podem instruir o modelo a se ater aos fatos, evitar especulações e seguir diretrizes éticas ou de confidencialidade, contribuindo para respostas mais seguras e confiáveis.
Configurações de Segurança do Modelo (safetySettings):

A funcionalidade de comparação (handleStartComparison) menciona o uso de modelConfig.safetySettings ao interagir diretamente com o modelo Gemini. Essas configurações, fornecidas pela API do Gemini, permitem ajustar filtros para conteúdo prejudicial (ex: discurso de ódio, assédio). Presume-se que o backend também utilize essas configurações para as demais chamadas.
Considerações Adicionais de Segurança (dependentes do backend e da implementação completa):

Segurança da Transmissão: Uso de HTTPS entre cliente-backend e backend-Gemini API é essencial.
Armazenamento de Dados: Se os documentos ou seus trechos são armazenados temporariamente no backend para o RAG, devem ser protegidos adequadamente.
Prevenção de Prompt Injection: Embora a engenharia de prompts ajude, o sistema (especialmente o backend) deve estar ciente dos riscos de usuários maliciosos tentarem manipular a IA através de entradas cuidadosamente elaboradas.
Privacidade dos Dados: É fundamental ter políticas claras sobre como os dados dos usuários são tratados, especialmente em um contexto jurídico sensível. A conformidade com regulamentações de proteção de dados (como LGPD) é crucial.
Autenticação e Autorização: Para um ambiente de produção, um sistema robusto de autenticação e autorização é indispensável para proteger o acesso aos dados e funcionalidades.
Em resumo, o AuxJuris V2, através de sua arquitetura RAG, limpeza de dados e uso de prompts direcionados, estabelece uma base para interações mais seguras e controladas com a IA. No entanto, a segurança robusta de todo o sistema dependerá fortemente da implementação cuidadosa do backend e das políticas de segurança da plataforma Gemini. A abordagem RAG, ao restringir o contexto da IA, é inerentemente um passo em direção a um uso mais focado e potencialmente mais seguro de LLMs em domínios especializados como o jurídico.
