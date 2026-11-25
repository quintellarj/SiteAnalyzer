# Diretrizes de Segurança e Arquitetura (SiteAnalyzer)

## 1. Segurança de API e Backend
- **Fail-Closed:** Sempre valide chaves de API e variáveis de ambiente no boot. Se `GEMINI_API_KEY` for inválida, o servidor deve encerrar.
- **Sanitização:** Todo input de usuário (`domain`, `url`) deve passar por `sanitizeAndValidateInputs` antes de qualquer processamento.
- **Rate Limiting:** Rotas que consomem IA ou recursos externos devem usar o `rateLimiter` para evitar exaustão de cota e DoS.
- **Headers:** Mantenha o middleware de segurança (`X-Frame-Options`, `CSP`, `nosniff`) ativo em todas as respostas.

## 2. Desenvolvimento React
- **Evite `dangerouslySetInnerHTML`:** Use `react-markdown` com `remark-gfm` para renderizar conteúdo dinâmico com segurança.
- **Performance:** Utilize `React.lazy` e `Suspense` para componentes pesados (ex: `CompareDomainsTab`).
- **Estado:** Evite race conditions em chamadas de API usando `AbortController` ou `useEffect` com cleanup.

## 3. Manutenção e Dívida Técnica
- **Logs:** Nunca logue dados sensíveis (tokens, senhas, cookies). Use `maskSensitiveData` em todos os logs.
- **Build:** O deploy no cPanel depende da estrutura `dist/`. Sempre execute `npm run build` antes de enviar arquivos.