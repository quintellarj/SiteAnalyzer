# 🌐 Monitor de Performance, SEO & Google Search Console

Uma plataforma completa de auditoria técnica, monitoramento preventivo e análise comparativa de performance web e SEO. O sistema capacita desenvolvedores, analistas de marketing e donos de sites a rastrearem a saúde de suas aplicações com relatórios ricos, alertas automatizados de limites e análises de impacto integradas com Inteligência Artificial.

---

## 📌 1. Para Que Serve o Aplicativo?

O aplicativo foi projetado para ser um **Centro de Comando de Saúde Web (Web Vitals Command Center)**. Ele elimina a complexidade de rodar múltiplas ferramentas de teste separadas, unificando dados críticos de tamanho de rede, desempenho móvel/desktop, acessibilidade e conformidade de busca (SEO) em um único painel ágil e interativo.

### Principais Casos de Uso:
- **Auditoria de Core Web Vitals**: Medição exata de métricas como LCP (Largest Contentful Paint), FID (First Input Delay) e tempos de renderização.
- **Prevenção de Regressões de Código**: Monitoramento preventivo que alerta a equipe se alterações recentes no site reduzirem as pontuações de desempenho abaixo de limites pré-estabelecidos.
- **Análise Competitiva de Domínios**: Comparação direta lado a lado de múltiplos endereços concorrentes, gerando relatórios consolidados e planos de otimização automatizados.
- **Tradução de Linguagem Técnica para Negócios via IA**: Explicações inteligentes em tempo real sobre como os robôs do Google (Googlebot) interpretam erros específicos e como validar correções diretamente no painel do **Google Search Console**.

---

## 🎨 2. Design & Identidade Visual (Neo-Brutalismo Industrial Puro)

O aplicativo foi redesenhado sob uma filosofia de **Neo-Brutalismo Industrial Puro (Pure Industrial Neo-Brutalism)**, um estilo visual focado em geometria marcada, cores sólidas de alto impacto e a completa abolição de transições suaves ou gradientes decorativos.

### Elementos de Identidade Visual & Responsividade Avançada:
*   **Paleta de Cores Cruas & Industriais**:
    *   **Fundo Principal**: Cinza Concreto Claro (`#EFEFEF`), trazendo um aspecto sóbrio, estéril e tátil à interface.
    *   **Destaque Primário**: Vermelho Vivo Industrial (`#D11A2A`), utilizado para chamar atenção absoluta a chamadas de ação cruciais e alertas críticos.
    *   **Destaque Secundário**: Azul Bic / Royal (`#184A90`), aplicado para links de navegação secundários e destaques estruturais.
    *   **Textos, Bordas e Contornos**: Preto Puro (`#000000`), garantindo máxima legibilidade e separação brutal entre os blocos.
    *   **Destaques Especiais**: Cinza Concreto Claro (`#EFEFEF`) como cor tipográfica em badges (como o `v1.2`), e-mails de acesso e controles de autenticação da barra lateral para legibilidade impecável sobre fundos escuros.
*   **Arquitetura Responsiva Híbrida (Mobile & Tablet High-Fidelity)**:
    *   **Menu de Navegação Lateral Retrátil (Mobile Drawer)**: Implementação de um menu de navegação retrátil reativo no celular e tablet, decorado com contornos neo-brutalistas pretos espessos, facilitando o acesso rápido a todas as abas da aplicação sem sacrificar o espaço útil da tela.
    *   **Barra de Auditoria Fluida & Reconfigurável**: Redesenho completo do componente de busca rápida e auditoria no topo. Em dispositivos móveis, ele se reestrutura de forma inteligente de uma barra horizontal de tamanho fixo para colunas dinâmicas fluidas com botões de tamanho de toque ergonômico.
    *   **Vínculos e Tabelas sem Transbordamento (Overflow Prevention)**: Otimização minuciosa de listas de vínculos do Google Search Console e tabelas para que quebrem linhas, usem truncamento inteligente de nomes extensos e flutuem controles de forma responsiva para evitar quebras de layout.
    *   **Footer Otimizado**: O rodapé da plataforma reage a resoluções menores reorganizando-se verticalmente e removendo separadores rígidos para garantir legibilidade limpa e simétrica.
*   **Bordas Cruas & Divisórias Robustas**:
    *   O contraste visual da aplicação é demarcado por linhas pretas espessas.
    *   O seletor de domínios (`#domain_picker`) possui uma borda sólida extra de 3px para maximizar a delimitação física do controle ativo.
*   **Sombras Duras (Hard Shadows)**:
    *   Substituição completa de sombras difusas por sombras geométricas sólidas e deslocadas que herdam a cor da borda (`box-shadow: 5px 5px 0px #000000;`).
    *   **Feedback Mecânico**: Micro-interações táteis de clique que deslocam fisicamente os cartões e botões, simulando botões mecânicos e disjuntores de fábrica.
*   **Hierarquia de Tipografia Intencional**:
    *   **Títulos e Destaques (Display)**: Utiliza a consagrada fonte geométrica **Space Grotesk** em negrito puro, fornecendo um visual técnico estruturado e impactante.
    *   **Textos de UI e Leitura**: Utiliza **Inter** para leitura fluida, ergonômica e sem fadiga visual.
    *   **Dados Numéricos e Telemetria**: Utiliza **JetBrains Mono** para destacar dados brutos de rede, milissegundos e status.

---

## ⚙️ 3. Arquitetura & Como o Projeto foi Feito

A aplicação adota uma arquitetura robusta e moderna de **Full-Stack Desacoplado**, garantindo escalabilidade, segurança de chaves de API e tempo de resposta ultrarrápido.

```
                    ┌────────────────────────────────────────┐
                    │            Navegador (Client)          │
                    │   React 18 + Vite + Tailwind CSS + UI  │
                    └───────────────────┬────────────────────┘
                                        │ (Requisições HTTP / JSON)
                                        ▼
                    ┌────────────────────────────────────────┐
                    │         Servidor Express (Backend)      │
                    │   Rotas de API + Proxy Seguro + Fallback│
                    └───────────────────┬────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
             ┌───────────────────────┐     ┌───────────────────────┐
             │    Google Gemini SDK  │     │   Simulação Local /   │
             │   (@google/genai API) │     │    Análise Estática   │
             └───────────────────────┘     └───────────────────────┘
```

### Componentes de Tecnologia:
1.  **Frontend (SPA - Single Page Application)**:
    *   **React 18 & Vite**: Para uma inicialização extremamente rápida da interface e manipulação ágil de estados locais.
    *   **Tailwind CSS**: Para estilização rápida e responsiva, mantendo um arquivo CSS final enxuto.
    *   **Lucide React**: Biblioteca de ícones elegantes e consistentes.
2.  **Backend (Node.js + Express + CJS compilation)**:
    *   **Proxy Seguro de APIs**: O servidor atua como um barramento seguro para chamadas à API do Gemini, mantendo as credenciais ocultas e protegidas contra extração no navegador.
    *   **Motor de Fallback de Alta Disponibilidade**: Se o servidor detectar que o limite de cota da API do Gemini foi atingido, o backend aciona instantaneamente uma engine local inteligente de análise e auditoria. Isso garante que o usuário **nunca encontre telas de erro ou indisponibilidade**, recebendo tabelas comparativas detalhadas baseadas nos limiares reais recomendados pelo W3C.
3.  **Geração e Estruturação de Relatórios**:
    *   **jsPDF**: Integração para compilar e desenhar dinamicamente relatórios PDF sob medida, convertendo estruturas complexas de gráficos, tabelas e parágrafos de IA em documentos prontos para impressão e compartilhamento corporativo.

---

## 🚀 4. Como Utilizar o Aplicativo (Passo a Passo)

### Passo 1: Cadastro de Domínios
1. Na tela principal, localize a aba **Frota de Domínios** ou o formulário de cadastro rápido.
2. Digite a URL que deseja analisar (ex: `meusite.com.br`).
3. Escolha o dispositivo padrão para simulação de testes (**Mobile** ou **Desktop**).
4. Clique em **Adicionar Domínio**. O sistema registrará o endereço instantaneamente na frota e rodará uma análise de calibração preliminar.

### Passo 2: Executar e Interpretar Auditorias Individuais
1. Com um domínio selecionado na lista, clique em **Iniciar Auditoria**.
2. A tela exibirá três grandes cards de pontuação de saúde (0 a 100):
    *   **Desempenho**: Mede o quão veloz é o carregamento da sua página.
    *   **Acessibilidade**: Valida se o contraste visual, tags de imagem e navegabilidade atendem a todos os usuários.
    *   **SEO**: Garante que os motores de busca (como o Google) consigam rastrear e indexar a página perfeitamente.
3. Logo abaixo, a seção **Métricas de Tamanho & Rede** exibirá o tamanho total da página, número de requisições disparadas e tempo estimado de resposta, indicando visualmente se os valores estão dentro da zona **Ideal**, **Aceitável** ou **Crítica** segundo padrões W3C.
4. Para exportar essa auditoria específica, basta clicar no botão **Exportar PDF** no topo do relatório.

### Passo 3: Monitoramento Preventivo & Alertas
1. No painel, localize o bloco **Monitoramento Preventivo de Métricas**.
2. Clique no botão de engrenagem ou configurações para abrir o menu de personalização de limiares.
3. Defina os limites mínimos aceitáveis para cada uma das pontuações (ex: Performance mínima de `80` pontos).
4. Mantenha o interruptor de monitoramento **Ativo**. Caso novas auditorias programadas detectem que o site violou os limites mínimos definidos por dispositivo, uma notificação de alerta flutuante de alta prioridade será imediatamente disparada na tela do usuário.

### Passo 4: Vínculo Automatizado com o Google Search Console (GSC)
1. No painel de Monitoramento Preventivo, navegue até a seção de **Vínculo Automatizado Google Search Console**.
2. O sistema exibirá os domínios da sua frota listados individualmente.
3. Caso queira conectar as auditorias automáticas periódicas de determinado site à conta ativa de teste do Google Search Console, clique no botão **Vincular** ao lado do respectivo domínio.
4. O domínio passará para o status **Ativo GSC** (com indicação da conta integrada ativa). Você pode ajustar as configurações de auditoria automática em lote de forma individualizada.
5. **Gerenciamento de Vínculos**: Você pode clicar em **Desvincular** para suspender o sincronismo automatizado temporariamente, mantendo as configurações locais, ou clicar no ícone de lixeira (**Excluir**) ao lado do botão para remover completamente o vínculo do domínio e sua configuração do monitoramento.

### Passo 5: Comparar Domínios Lado a Lado
1. Acesse a aba **Comparar Domínios** no menu lateral ou principal.
2. Escolha o **Domínio de Referência** (seu site principal) e o **Domínio Comparador** (o site concorrente ou de benchmark).
3. O painel exibirá as pontuações e métricas vitais lado a lado de forma clara e visual.
4. Clique no botão **Consultar IA** ou verifique o diagnóstico inteligente gerado automaticamente pela Inteligência Artificial na parte inferior.
5. Para levar essa comparação técnica completa a reuniões ou enviar para clientes, clique no botão **Exportar Análise Comparativa (PDF)**. O sistema compilará as tabelas de pontuações de saúde, métricas Core Web Vitals comparadas lado a lado e todo o relatório textual gerado pela IA em um documento PDF elegantemente formatado.

### Passo 6: Diagnóstico Crítico com IA / GSC (Popover Search Console)
1. Na lista detalhada de problemas recomendados no final do relatório de auditoria, preste atenção nas falhas de gravidade **Crítica**.
2. Ao lado de cada título de issue crítica, você encontrará um ícone estilizado de **IA / GSC**.
3. Clique neste botão. Um modal flutuante interativo será aberto.
4. A Inteligência Artificial fará uma análise em tempo real baseada em regras técnicas de indexação do Google, detalhando:
    *   **Impacto no Painel GSC**: Qual relatório do console (Experiência na Página, Core Web Vitals, etc.) é diretamente prejudicado pela persistência deste erro.
    *   **Visão do Googlebot**: Como o robô de indexação do Google processa e reage a essa barreira técnica.
    *   **Roteiro de Resolução & Validação**: O passo a passo exato para você corrigir o problema, testar a URL ao vivo no console e acionar o botão de "Validar Correção" para encerrar as penalidades técnicas de posicionamento.

### Passo 7: Checklist SEO (Otimizações Manuais)
1. Acesse a aba **Checklist SEO** no painel principal ou menu lateral.
2. Gerencie tarefas manuais para a sua equipe divididas em categorias estratégicas: **SEO On-Page**, **SEO Técnico**, **Conteúdo**, **Link Building** e **SEO Local**.
3. Adicione novas tarefas personalizadas definindo título, nível de prioridade (Alta, Média, Baixa) e notas detalhadas de instrução.
4. Visualize o progresso geral através de métricas de tarefas concluídas e barra de progresso dinâmico para tomada de decisões.

---

## 🔒 5. Segurança & Observabilidade de Nível Enterprise (OWASP 2025)

Para atender a padrões rígidos de auditoria defensiva e garantir a privacidade de dados sensíveis, a aplicação conta com uma **arquitetura de observabilidade profissional descentralizada e imutável**:

1. **Winston Logger Estruturado (JSON)**: Implementação de um logger profissional que grava logs unificados por linha em formato JSON no arquivo físico `app-security-audit.log`, bem como saídas customizadas colorizadas no console do servidor.
2. **Propagação de Contexto (Context Tracking)**: Utilização de `AsyncLocalStorage` do Node.js para rastrear automaticamente `requestId` (ID único de requisição), `userId` (ID ou e-mail do usuário autenticado) e `action` (método e rota HTTP) em qualquer ponto de execução ou chamada assíncrona.
3. **Data Masking (Sanitização Avançada)**: Mecanismo automatizado recursivo de higienização de objetos que detecta e substitui segredos como tokens, chaves de API, senhas, headers de autorização e credenciais pelo marcador `[MASKED_CONFIDENTIAL_DATA]`, impedindo que PII (dados pessoais) ou segredos de ambiente vazem nos logs físicos.
4. **Inicialização Segura (Fail-Closed)**: Verificação estrita de integridade e comprimento da variável `GEMINI_API_KEY` na subida do backend, abortando o processo em caso de configuração incorreta para evitar falhas silenciosas e vulnerabilidades em execução.
5. **Telemetria de Erros do Frontend**: Uma API segura no Express (`/api/logs/frontend`) que unifica a telemetria do navegador, permitindo que erros de renderização e rejeições não tratadas do cliente sejam registrados de forma estruturada no servidor.
6. **Controle de Taxa & Varredura de Parâmetros**: Middlewares de rate limiting para controle de DoS e sanitização rígida de entradas e caminhos contra tentativas de injeção ou má-formação de dados.
7. **Endpoint Administrativo de Auditoria**: Rota de leitura restrita `/api/admin/audit-logs` protegida por tokens de segurança, permitindo o streaming seguro e monitoramento imediato das últimas 100 entradas de auditoria.

---

## 🛠️ 6. Desenvolvimento & Scripts Disponíveis

Se você deseja executar, auditar e testar o sistema localmente no seu ambiente:

*   `npm run dev`: Boota o servidor de desenvolvimento full-stack utilizando `tsx` (TypeScript Executor) de forma dinâmica.
*   `npm run build`: Compila o cliente estático do React via Vite na pasta `/dist`, e paralelamente empacota o backend TypeScript `server.ts` em um único arquivo CommonJS autônomo otimizado (`dist/server.cjs`) utilizando `esbuild`.
*   `npm run start`: Inicia o servidor consolidado de produção pronto para containers através do Node clássico.
*   `npm run lint`: Valida se o código segue todos os padrões de tipagem estrita do compilador TypeScript.
