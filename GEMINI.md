# VibeAudit Shield: Vite-SPA + Vercel

## 🛡️ Security Protocol
- **Headers:** Always include `vercel.json` with CSP, HSTS, and X-Frame-Options.
- **Secrets:** Never use `VITE_` for sensitive keys (API Secrets, DB Passwords). Use Vercel Environment Variables and access them via Serverless Functions only.
- **Forms:** Implement Turnstile/reCAPTCHA for all lead capture forms to prevent spam.

## 🏗️ Architecture & SEO
- **Semantic HTML:** Enforce H1-H6 hierarchy and `alt` tags on all images.
- **Performance:** Use `loading="lazy"` for off-screen images and `defer` for non-critical scripts.
- **Metadata:** Every page must have unique `<title>` and `<meta name="description">`.

## 🛠️ Development Workflow
- **Dependencies:** Run `npm audit` weekly. Pin critical versions of `vite` and `xlsx`.
- **Build:** Ensure `dist/server.cjs` is correctly bundled by `esbuild` before deployment.