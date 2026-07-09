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
    seo: 92
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
    seo: 72
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
  generalSuggestions: [
    "Otimize e comprima as imagens de banners usando TinyPNG ou Squoosh antes de fazer upload.",
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
