import { DomainProfile, AuditReport } from "./types";

export const mockInitialReportApple: AuditReport = {
  url: "apple.com",
  title: "Apple (Brasil)",
  description: "Descubra o mundo inovador da Apple e compre iPhone, iPad, Apple Watch, Mac e Apple TV, além de conhecer acessórios, entretenimento e suporte.",
  analyzedAt: "2026-07-01T10:00:00.000Z",
  method: "Real (Scrape Direct)",
  scores: {
    performance: 78,
    accessibility: 85,
    seo: 92,
    security: 94,
  },
  security: {
    score: 94,
    grade: "A",
    checkedAt: "2026-07-01T10:00:00.000Z",
    ssl: {
      isHttps: true,
      httpRedirectsToHttps: true,
      httpRedirectStatus: 301,
      certificateValid: true,
      issuer: "Apple Public EV Server RSA CA",
      daysUntilExpiration: 184,
      protocol: "TLSv1.3",
    },
    headers: [
      {
        name: "Strict-Transport-Security (HSTS)",
        key: "strict-transport-security",
        present: true,
        value: "max-age=31536000; includeSubDomains; preload",
        severity: "ok",
        recommendation: "Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
      },
      {
        name: "Content-Security-Policy (CSP)",
        key: "content-security-policy",
        present: true,
        value: "default-src 'self' https://*.apple.com",
        severity: "ok",
        recommendation: "Defina diretivas CSP restritivas.",
      },
      {
        name: "X-Frame-Options",
        key: "x-frame-options",
        present: true,
        value: "SAMEORIGIN",
        severity: "ok",
        recommendation: "X-Frame-Options: SAMEORIGIN",
      },
      {
        name: "X-Content-Type-Options",
        key: "x-content-type-options",
        present: true,
        value: "nosniff",
        severity: "ok",
        recommendation: "X-Content-Type-Options: nosniff",
      },
      {
        name: "Referrer-Policy",
        key: "referrer-policy",
        present: true,
        value: "strict-origin-when-cross-origin",
        severity: "ok",
        recommendation: "Referrer-Policy: strict-origin-when-cross-origin",
      },
      {
        name: "Permissions-Policy",
        key: "permissions-policy",
        present: false,
        value: "Ausente",
        severity: "low",
        recommendation: "Permissions-Policy: camera=(), microphone=(), geolocation=()",
      },
    ],
    informationDisclosure: {
      serverHeader: "Apple",
      serverExposesVersion: false,
      poweredByHeader: "Não exposto",
      poweredByExposed: false,
      exposedFiles: [
        { path: "/.env", status: 404, exposed: false, note: "Protegido (HTTP 404)" },
        { path: "/.git/HEAD", status: 404, exposed: false, note: "Protegido (HTTP 404)" },
      ],
    },
    mixedContent: {
      count: 0,
      hasActiveMixedContent: false,
      items: [],
    },
    cookies: {
      total: 2,
      insecureCount: 0,
      items: [
        { name: "geo", secure: true, httpOnly: true, sameSite: "Lax", issues: [] },
        { name: "at_check", secure: true, httpOnly: true, sameSite: "Strict", issues: [] },
      ],
    },
  },
  performance: {
    loadTimeSeconds: 2.4,
    pageSizeKb: 1850,
    requestCount: 42,
    metrics: {
      lcp: "2.1s",
      fid: "55ms",
      cls: "0.12"
    },
    issues: [
      {
        title: "Imagens sem compressão moderna",
        severity: "warning",
        details: "Múltiplas imagens em banners promocionais estão no formato JPEG padrão sem otimização ou conversão para formatos de próxima geração como WebP ou AVIF.",
        suggestion: "Converta imagens pesadas de produtos para WebP/AVIF e reduza o peso médio da página em até 40%.",
        codeSnippet: `<picture>
  <source srcset="img/promo-iphone.avif" type="image/avif">
  <source srcset="img/promo-iphone.webp" type="image/webp">
  <img src="img/promo-iphone.jpg" alt="iPhone 15 Pro promocional" loading="lazy">
</picture>`
      },
      {
        title: "Recursos de render-blocking identificados",
        severity: "critical",
        details: "Scripts JavaScript carregados de forma síncrona no cabeçalho (<head>) estão bloqueando o primeiro render da tela, atrasando o Largest Contentful Paint (LCP).",
        suggestion: "Adicione atributos 'defer' ou 'async' nas tags de script que não são críticas para o carregamento inicial da página.",
        codeSnippet: `<script src="/assets/analytics-bundle.js" defer></script>`
      }
    ]
  },
  accessibility: {
    issues: [
      {
        title: "Contraste de texto insuficiente nos banners",
        severity: "warning",
        details: "Texto branco (#FFFFFF) sobreposto em imagens de fundo claras falha no critério WCAG 2.1 AA (mínimo de 4.5:1 de proporção de contraste).",
        suggestion: "Adicione uma camada sutil de gradiente escuro de sobreposição na imagem ou escureça a tipografia afetada.",
        codeSnippet: `.hero-banner-overlay {
  background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6));
}`
      },
      {
        title: "Links interativos sem foco visível",
        severity: "critical",
        details: "Vários links no rodapé e menu de navegação têm outline desabilitado por CSS ('outline: none'), impossibilitando usuários de teclado de saber qual elemento está focado.",
        suggestion: "Remova 'outline: none' ou forneça um estilo de foco personalizado visível e contrastante.",
        codeSnippet: `a:focus-visible {
  outline: 3px solid #3b82f6;
  outline-offset: 2px;
}`
      }
    ]
  },
  seo: {
    issues: [
      {
        title: "Sitemap XML não declarado no robots.txt",
        severity: "info",
        details: "A tag explicativa apontando para o sitemap XML não foi detectada no arquivo robots.txt, o que pode dificultar o rastreamento profundo de novas páginas pelos bots do Google.",
        suggestion: "Adicione a diretiva Sitemap apontando para o link absoluto do seu arquivo de sitemap no final do robots.txt.",
        codeSnippet: `User-agent: *
Disallow: /private/

Sitemap: https://apple.com/br/sitemap.xml`
      }
    ]
  },
  clientReport: {
    overallHealthStatus: "Saudável",
    executiveSummary:
      "O site apple.com apresenta ótima presença no Google e experiência visual sólida, mas pode responder mais rápido em dispositivos móveis ao eliminar bloqueios iniciais de carregamento e otimizar banners pesados.",
    pillars: [
      {
        name: "Velocidade",
        status: "Atenção Necessária",
        businessImpactExplanation:
          "A abertura em 2.4s é competitiva, porém otimizar banners promocionais e scripts iniciais reduzirá desistências em conexões móveis.",
      },
      {
        name: "Presença no Google",
        status: "Saudável",
        businessImpactExplanation:
          "Estrutura de títulos e páginas altamente organizada para os buscadores, garantindo ótima indexação de produtos e lançamentos.",
      },
      {
        name: "Segurança & Proteção de Dados",
        status: "Saudável",
        businessImpactExplanation:
          "Selo SSL válido por 184 dias com redirecionamento automático seguro e 5 de 6 camadas de blindagem ativas contra clonagem e sequestro de navegação.",
      },
      {
        name: "Clareza de Conversão (CTAs)",
        status: "Saudável",
        businessImpactExplanation:
          "Chamadas para ação diretas ('Saiba mais', 'Comprar') com excelente contraste e hierarquia comercial.",
      },
    ],
    topBusinessPriorities: [
      "Reduzir o tempo de abertura dos banners promocionais no celular para acelerar o acesso às páginas de compra.",
      "Remover scripts que atrasam a primeira visualização da vitrine principal.",
      "Declarar o mapa de páginas (Sitemap) no arquivo de diretivas de busca para acelerar a indexação de novos lançamentos.",
    ],
  },
  developerReport: {
    goodItems: [
      {
        title: "Excelente fundação de SEO técnico",
        category: "SEO",
        metricValue: "92/100",
        description: "Meta tags, URLs canônicas e estrutura semântica de páginas de produto bem configuradas.",
      },
      {
        title: "Estabilidade visual controlada (CLS)",
        category: "Performance",
        metricValue: "CLS 0.12",
        description: "Baixo deslocamento de layout durante o carregamento dos blocos principais.",
      },
      {
        title: "Transporte seguro HTTPS e boa acessibilidade base",
        category: "Segurança",
        metricValue: "HTTPS · A11y 85",
        description: "Conexão criptografada ponta a ponta e boa semântica estrutural.",
      },
    ],
    criticalItems: [
      {
        title: "Recursos de render-blocking atrasando o LCP",
        category: "Performance",
        effortLevel: "Baixo",
        businessImpact: "Alto",
        affectedElement: "<head> > script[src*='analytics-bundle.js']",
        rootCause:
          "Scripts JavaScript carregados de forma síncrona no cabeçalho bloqueiam o parser HTML e atrasam o Largest Contentful Paint (LCP).",
        howToFix:
          "1. Identifique scripts não críticos no <head>.\n2. Adicione o atributo `defer` (ou `async` para telemetria).\n3. Faça preload apenas da imagem hero acima da dobra.",
        codeSnippet: `<script src="/assets/analytics-bundle.js" defer></script>`,
        gscValidationStep:
          "No Google Search Console, acompanhe Experiência > Core Web Vitals (Mobile) após o deploy e clique em 'Validar correção'.",
      },
      {
        title: "Links interativos sem indicador de foco visível",
        category: "UX",
        effortLevel: "Baixo",
        businessImpact: "Médio",
        affectedElement: "footer a, nav a (:focus-visible)",
        rootCause:
          "Regra CSS global `outline: none` impede usuários de teclado de identificar o elemento ativo, violando WCAG 2.1 AA.",
        howToFix:
          "Substitua `outline: none` por um anel de foco claro usando `:focus-visible` com contraste mínimo de 3:1.",
        codeSnippet: `a:focus-visible {\n  outline: 2px solid #6366F1;\n  outline-offset: 2px;\n}`,
        gscValidationStep:
          "Valide via Lighthouse Accessibility (meta >= 95) e inspeção de renderização ao vivo no Google Search Console.",
      },
    ],
    improvementItems: [
      {
        title: "Imagens de banners sem formatos modernos (WebP / AVIF)",
        category: "Performance",
        effortLevel: "Médio",
        businessImpact: "Alto",
        affectedElement: ".hero-banner img",
        rootCause:
          "Banners promocionais servidos em JPEG padrão aumentam o payload em até 40% em relação a AVIF/WebP.",
        howToFix:
          "Converta os banners principais para AVIF/WebP e entregue via elemento `<picture>` com `loading=\"lazy\"` abaixo da dobra.",
        codeSnippet: `<picture>\n  <source srcset="img/promo-iphone.avif" type="image/avif" />\n  <source srcset="img/promo-iphone.webp" type="image/webp" />\n  <img src="img/promo-iphone.jpg" alt="iPhone promocional" loading="lazy" />\n</picture>`,
        gscValidationStep:
          "Execute novo teste no PageSpeed Insights v5 confirmando queda de `total-byte-weight` e valide no relatório Core Web Vitals do GSC.",
      },
      {
        title: "Sitemap XML não declarado no /robots.txt",
        category: "SEO",
        effortLevel: "Baixo",
        businessImpact: "Alto",
        affectedElement: "https://apple.com/robots.txt",
        rootCause:
          "A ausência da diretiva `Sitemap:` reduz a velocidade de descoberta automática de novas URLs pelos rastreadores.",
        howToFix:
          "Adicione a linha `Sitemap:` com a URL absoluta no final do arquivo `/robots.txt` na raiz do domínio.",
        codeSnippet: `User-agent: *\nDisallow: /private/\n\nSitemap: https://apple.com/br/sitemap.xml`,
        gscValidationStep:
          "No GSC, acesse Indexação > Sitemaps, envie a URL do sitemap e confirme status 'Processado com êxito'.",
      },
    ],
  },
  generalSuggestions: [
    "Habilite compressão gzip ou Brotli em todos os assets de texto (JS, CSS).",
    "Melhore o alt-text de 12 imagens que contêm apenas textos decorativos sem descrição.",
    "Implemente carregamento assíncrono para fontes personalizadas do sistema."
  ]
};

export const mockInitialReportMySite: AuditReport = {
  url: "meusite.com.br",
  title: "Minha Loja Online | Roupas e Acessórios",
  description: "A melhor loja online de roupas e acessórios com entrega para todo o Brasil. Encontre camisetas, calças, vestidos e mais com ótimos preços.",
  analyzedAt: "2026-07-06T15:30:00.000Z",
  method: "Real (Scrape Direct)",
  scores: {
    performance: 55,
    accessibility: 68,
    seo: 72,
    security: 62,
  },
  security: {
    score: 62,
    grade: "C",
    checkedAt: "2026-07-06T15:30:00.000Z",
    ssl: {
      isHttps: true,
      httpRedirectsToHttps: true,
      httpRedirectStatus: 301,
      certificateValid: true,
      issuer: "Let's Encrypt",
      daysUntilExpiration: 28,
      protocol: "TLSv1.3",
    },
    headers: [
      {
        name: "Strict-Transport-Security (HSTS)",
        key: "strict-transport-security",
        present: false,
        value: "Ausente",
        severity: "high",
        recommendation: "Strict-Transport-Security: max-age=63072000; includeSubDomains; preload",
      },
      {
        name: "Content-Security-Policy (CSP)",
        key: "content-security-policy",
        present: false,
        value: "Ausente",
        severity: "high",
        recommendation: "Defina diretivas CSP restritivas (ex: default-src 'self' https:)",
      },
      {
        name: "X-Frame-Options",
        key: "x-frame-options",
        present: true,
        value: "SAMEORIGIN",
        severity: "ok",
        recommendation: "X-Frame-Options: SAMEORIGIN",
      },
      {
        name: "X-Content-Type-Options",
        key: "x-content-type-options",
        present: true,
        value: "nosniff",
        severity: "ok",
        recommendation: "X-Content-Type-Options: nosniff",
      },
      {
        name: "Referrer-Policy",
        key: "referrer-policy",
        present: false,
        value: "Ausente",
        severity: "low",
        recommendation: "Referrer-Policy: strict-origin-when-cross-origin",
      },
      {
        name: "Permissions-Policy",
        key: "permissions-policy",
        present: false,
        value: "Ausente",
        severity: "low",
        recommendation: "Permissions-Policy: camera=(), microphone=(), geolocation=()",
      },
    ],
    informationDisclosure: {
      serverHeader: "Apache/2.4.58",
      serverExposesVersion: true,
      poweredByHeader: "PHP/8.2.15",
      poweredByExposed: true,
      exposedFiles: [
        { path: "/.env", status: 403, exposed: false, note: "Protegido (HTTP 403)" },
        { path: "/.git/HEAD", status: 404, exposed: false, note: "Protegido (HTTP 404)" },
      ],
    },
    mixedContent: {
      count: 1,
      hasActiveMixedContent: false,
      items: [
        {
          tag: "img",
          url: "http://meusite.com.br/banners/promocao-antiga.jpg",
          severity: "warning",
        },
      ],
    },
    cookies: {
      total: 1,
      insecureCount: 1,
      items: [
        {
          name: "PHPSESSID",
          secure: false,
          httpOnly: true,
          sameSite: null,
          issues: ["Sem flag Secure", "Sem atributo SameSite"],
        },
      ],
    },
  },
  performance: {
    loadTimeSeconds: 4.8,
    pageSizeKb: 3450,
    requestCount: 89,
    metrics: {
      lcp: "4.2s",
      fid: "120ms",
      cls: "0.24"
    },
    issues: [
      {
        title: "Tamanho excessivo de JavaScript não utilizado",
        severity: "critical",
        details: "Mais de 1.8MB de código JS é baixado e executado. Scripts de bibliotecas não utilizadas atrasam o tempo de interatividade (FID) para 120ms.",
        suggestion: "Utilize code-splitting no bundler e faça o lazy loading de componentes pesados ou scripts de terceiros.",
        codeSnippet: `// Exemplo React com Lazy Loading
import React, { lazy, Suspense } from 'react';
const CarrinhoCheckout = lazy(() => import('./Checkout'));`
      },
      {
        title: "Ausência de cache estático nos recursos",
        severity: "warning",
        details: "Cabeçalhos Cache-Control ausentes nos arquivos de imagem, CSS e fontes externas. O navegador baixa todos os arquivos novamente a cada visita.",
        suggestion: "Configure cabeçalhos de expiração prolongada (Cache-Control max-age de 1 ano) no seu servidor Nginx, Apache ou CDN.",
        codeSnippet: `location ~* \\.(jpg|jpeg|png|gif|ico|css|js|webp)$ {
  expires 365d;
  add_header Cache-Control "public, no-transform";
}`
      }
    ]
  },
  accessibility: {
    issues: [
      {
        title: "Imagens cruciais sem atributo alt descritivo",
        severity: "critical",
        details: "14 imagens de produtos da página inicial não possuem atributo alt descritivo. Leitores de tela para deficientes visuais apenas leem o nome do arquivo, ex: 'banner-mobile-v2_final.png'.",
        suggestion: "Adicione atributos alt ricos que expliquem brevemente o produto exibido na imagem.",
        codeSnippet: `<img src="/images/camisa-polo-azul.png" alt="Camisa polo masculina em algodão azul marinho tamanho M">`
      },
      {
        title: "Hierarquia de cabeçalhos sem estrutura lógica",
        severity: "warning",
        details: "A estrutura de headings salta de H1 diretamente para H3 ou H4 sem passar por H2, o que confunde motores de busca e navegadores acessíveis.",
        suggestion: "Organize o HTML de forma que os títulos sigam uma progressão lógica de níveis: H1 -> H2 -> H3.",
        codeSnippet: `<h1>Minha Loja Online</h1>
<h2>Coleção de Inverno</h2>
<h3>Camisaria e Casacos</h3>`
      }
    ]
  },
  seo: {
    issues: [
      {
        title: "Meta descrição curta ou ausente em páginas internas",
        severity: "warning",
        details: "Páginas de categorias de produtos possuem meta descrições vazias ou genéricas repetidas, afetando o CTR (Click-Through Rate) nos resultados de busca do Google.",
        suggestion: "Escreva meta descrições exclusivas para cada categoria com até 155 caracteres contendo uma chamada para ação clara.",
        codeSnippet: `<meta name="description" content="Explore nossa coleção exclusiva de vestidos de inverno. Encontre modelos elegantes em lã, veludo e malha. Aproveite 10% OFF na primeira compra!">`
      }
    ]
  },
  clientReport: {
    overallHealthStatus: "Atenção Necessária",
    executiveSummary:
      "A loja meusite.com.br demora 4.8 segundos para abrir completamente — tempo acima do ideal para e-commerce. Otimizações rápidas de velocidade, imagens e descrições no Google podem recuperar vendas perdidas no celular.",
    pillars: [
      {
        name: "Velocidade",
        status: "Crítico",
        businessImpactExplanation:
          "Com 4.8s de carregamento e página pesada (3.4 MB), parte significativa dos clientes desiste antes de ver os produtos.",
      },
      {
        name: "Presença no Google",
        status: "Atenção Necessária",
        businessImpactExplanation:
          "Descrições ausentes ou repetidas em categorias reduzem a taxa de cliques nos resultados gratuitos do Google.",
      },
      {
        name: "Segurança & Proteção de Dados",
        status: "Atenção Necessária",
        businessImpactExplanation:
          "O selo SSL é válido (renova em 28 dias), mas faltam camadas de blindagem (HSTS e CSP) e há 1 imagem antiga sem HTTPS — corrigir isso protege o cliente contra golpes de redirecionamento no checkout.",
      },
      {
        name: "Clareza de Conversão (CTAs)",
        status: "Atenção Necessária",
        businessImpactExplanation:
          "Organizar melhor a hierarquia de títulos e descrições de produtos aumenta a confiança e agiliza a decisão de compra.",
      },
    ],
    topBusinessPriorities: [
      "Reduzir o peso dos scripts e imagens da vitrine para abrir a loja em menos de 2,5 segundos no celular.",
      "Escrever descrições exclusivas com oferta clara nas categorias principais para atrair mais cliques no Google.",
      "Ativar cache de navegador para que clientes recorrentes naveguem quase instantaneamente entre produtos.",
      "Adicionar descrições completas nas imagens do catálogo para aparecer também nas buscas do Google Imagens.",
    ],
  },
  developerReport: {
    goodItems: [
      {
        title: "Meta título principal bem definido",
        category: "SEO",
        metricValue: "44 chars",
        description: "A tag <title> da página inicial está dentro do limite recomendado pelo Google (< 60 caracteres).",
      },
      {
        title: "Domínio público acessível para rastreamento",
        category: "Arquitetura",
        metricValue: "HTTP 200",
        description: "Página inicial responde corretamente permitindo indexação do catálogo.",
      },
    ],
    criticalItems: [
      {
        title: "14 imagens de produtos sem atributo alt descritivo",
        category: "SEO",
        effortLevel: "Baixo",
        businessImpact: "Alto",
        affectedElement: ".product-grid img:not([alt])",
        rootCause:
          "Imagens de catálogo sem `alt` impedem indexação no Google Imagens e falham em leitores de tela.",
        howToFix:
          "Preencha o atributo `alt` dinamicamente com o nome do produto, cor e categoria no template do card de produto.",
        codeSnippet: `<img src="/images/camisa-polo-azul.webp" alt="Camisa polo masculina algodão azul marinho" loading="lazy" />`,
        gscValidationStep:
          "Inspecione a URL no Google Search Console > Testar URL publicada > Ver página testada (HTML) e confirme os atributos alt.",
      },
      {
        title: "Excesso de JavaScript não utilizado no bundle inicial (1.8 MB)",
        category: "Performance",
        effortLevel: "Médio",
        businessImpact: "Alto",
        affectedElement: "bundle.js (89 requisições HTTP · LCP 4.2s)",
        rootCause:
          "Bibliotecas e módulos de checkout são carregados de forma síncrona na página inicial, elevando o tempo de bloqueio (FID 120ms / LCP 4.2s).",
        howToFix:
          "1. Aplique `React.lazy` + `Suspense` nas rotas secundárias e no carrinho/checkout.\n2. Configure `manualChunks` no Vite para separar vendors pesados.",
        codeSnippet: `import { lazy, Suspense } from "react";\nconst CarrinhoCheckout = lazy(() => import("./Checkout"));`,
        gscValidationStep:
          "No GSC, abra Experiência > Core Web Vitals, aguarde melhoria do LCP (< 2.5s) e inicie 'Validar correção'.",
      },
    ],
    improvementItems: [
      {
        title: "Cabeçalhos HTTP de segurança ausentes (HSTS, CSP, Referrer-Policy, Permissions-Policy)",
        category: "Segurança",
        effortLevel: "Baixo",
        businessImpact: "Alto",
        affectedElement: "HTTP Response Headers (https://meusite.com.br)",
        rootCause:
          "A ausência de HSTS e Content-Security-Policy (CSP) expõe os visitantes a ataques de downgrade HTTPS e injeção de scripts XSS, além do servidor expor `Apache/2.4.58` e `PHP/8.2.15`.",
        howToFix:
          "1. Adicione as diretivas de blindagem no `.htaccess` (Apache/cPanel) ou via middleware `helmet` no Express.\n2. Remova `X-Powered-By` e defina `Secure; HttpOnly; SameSite=Lax` no cookie de sessão.",
        codeSnippet: `# Apache / cPanel (.htaccess)\n<IfModule mod_headers.c>\n  Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"\n  Header always set Content-Security-Policy "default-src 'self' https: data:; upgrade-insecure-requests"\n  Header always set Referrer-Policy "strict-origin-when-cross-origin"\n  Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"\n  Header always unset X-Powered-By\n</IfModule>`,
        gscValidationStep:
          "Confirme os novos cabeçalhos com `curl -I https://meusite.com.br` e verifique ausência de alertas no Google Search Console > Problemas de segurança.",
      },
      {
        title: "Ausência de Cache-Control nos assets estáticos",
        category: "Arquitetura",
        effortLevel: "Baixo",
        businessImpact: "Alto",
        affectedElement: "HTTP Response Headers (/*.js, /*.css, /*.webp)",
        rootCause:
          "Sem `Cache-Control: public, max-age=31536000, immutable`, o navegador refaz download completo de imagens e scripts a cada navegação.",
        howToFix:
          "Adicione diretivas de cache longo no `.htaccess` (Apache/cPanel) ou bloco `location` do Nginx para arquivos estáticos versionados.",
        codeSnippet: `<IfModule mod_expires.c>\n  ExpiresActive On\n  ExpiresByType image/webp "access plus 1 year"\n  ExpiresByType text/css "access plus 1 year"\n  ExpiresByType application/javascript "access plus 1 year"\n</IfModule>`,
        gscValidationStep:
          "Verifique os headers via curl -I ou DevTools Network e confirme a queda de tempo de carregamento no PageSpeed Insights.",
      },
      {
        title: "Meta description ausente ou duplicada em páginas de categoria",
        category: "SEO",
        effortLevel: "Baixo",
        businessImpact: "Alto",
        affectedElement: "head > meta[name='description']",
        rootCause:
          "Categorias sem meta description única fazem o Google recortar trechos aleatórios do menu, derrubando o CTR orgânico.",
        howToFix:
          "Gere meta descriptions únicas entre 120 e 155 caracteres contendo categoria, diferencial e CTA.",
        codeSnippet: `<meta name="description" content="Explore nossa coleção exclusiva de roupas de inverno com frete rápido e 10% OFF na primeira compra." />`,
        gscValidationStep:
          "No GSC, acesse Desempenho > Resultados de pesquisa e acompanhe o aumento de CTR das URLs de categoria após reindexação.",
      },
      {
        title: "Hierarquia de cabeçalhos saltando de H1 para H3/H4",
        category: "UX",
        effortLevel: "Baixo",
        businessImpact: "Médio",
        affectedElement: "main h1, main h3, main h4",
        rootCause:
          "Saltos na estrutura de headings prejudicam a leitura semântica pelo Googlebot e por tecnologias assistivas.",
        howToFix:
          "Ajuste os títulos das seções de vitrine para seguirem ordem sequencial: H1 -> H2 -> H3.",
        codeSnippet: `<h1>Minha Loja Online</h1>\n<h2>Coleção de Inverno</h2>\n<h3>Camisaria e Casacos</h3>`,
        gscValidationStep:
          "Use Inspeção de URL no GSC e valide o HTML renderizado para confirmar H1 único e sequência lógica.",
      },
    ],
  },
  generalSuggestions: [
    "Instale uma tag de viewport correta para garantir a perfeita legibilidade no celular.",
    "Adicione tags alt descritivas em todos os produtos do catálogo."
  ]
};

export const mockDomains: DomainProfile[] = [
  {
    id: "domain-1",
    url: "meusite.com.br",
    addedAt: "2026-05-15T12:00:00.000Z",
    latestReport: mockInitialReportMySite,
    googleConnected: true,
    googleEmail: "quintellarj@gmail.com",
    monthlyReportEnabled: true,
    monthlyReportEmail: "quintellarj@gmail.com",
    reportsHistory: [
      { date: "15/Mai", performance: 45, accessibility: 58, seo: 60 },
      { date: "01/Jun", performance: 48, accessibility: 60, seo: 65 },
      { date: "15/Jun", performance: 52, accessibility: 64, seo: 68 },
      { date: "01/Jul", performance: 55, accessibility: 68, seo: 72 }
    ]
  },
  {
    id: "domain-2",
    url: "apple.com",
    addedAt: "2026-06-20T14:30:00.000Z",
    latestReport: mockInitialReportApple,
    googleConnected: false,
    monthlyReportEnabled: false,
    reportsHistory: [
      { date: "20/Jun", performance: 75, accessibility: 82, seo: 90 },
      { date: "01/Jul", performance: 78, accessibility: 85, seo: 92 }
    ]
  }
];
