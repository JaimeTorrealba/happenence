import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// NUXT_SITE_URL wins; otherwise Netlify's build-time URL (the custom domain once it is set).
const SiteUrl = process.env.NUXT_SITE_URL || process.env.URL || 'http://localhost:3000'
const SiteName = 'Happenence'
// TODO: extend to ~150–160 characters (what Happenence writes about) for search snippets.
const SiteDescription = 'Happenence is a simple company grown with love.'
const SubstackUrl = 'https://happenence.substack.com'
const ContentDir = fileURLToPath(new URL('./content', import.meta.url))

// AI crawlers we explicitly welcome (answer engines and assistants).
const AiCrawlers = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended']

// content/index.md -> /raw/index.md, content/about.md -> /raw/about.md
const getRawMarkdownRoutesFromContent = () =>
  readdirSync(ContentDir, { recursive: true, encoding: 'utf8' })
    .filter((FilePath) => FilePath.endsWith('.md'))
    .map((FilePath) => `/raw/${FilePath.replaceAll('\\', '/')}`)

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  // Sitemap must be registered before Nuxt Content so it can read the content collections.
  modules: [
    '@nuxtjs/fontaine',
    '@nuxtjs/robots',
    '@nuxtjs/sitemap',
    'nuxt-schema-org',
    'nuxt-seo-utils',
    '@nuxt/content',
    'nuxt-llms',
  ],

  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'en' },
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'alternate', type: 'text/plain', href: '/llms.txt', title: 'LLM-friendly site index' },
      ],
      // Without JS the entrance animations never run, so show the elements they would reveal.
      noscript: [{ innerHTML: '<style>.reveal-title{transform:none!important}.reveal-fade{opacity:1!important}</style>' }],
    },
  },

  site: {
    url: SiteUrl,
    name: SiteName,
    description: SiteDescription,
    defaultLocale: 'en',
  },

  content: {
    experimental: { sqliteConnector: 'native' },
  },

  robots: {
    disallow: ['/admin/'],
    groups: [{ userAgent: AiCrawlers, allow: ['/'], disallow: ['/admin/'] }],
  },

  sitemap: {
    exclude: ['/admin/**', '/raw/**'],
  },

  schemaOrg: {
    identity: {
      '@type': 'Organization',
      name: SiteName,
      url: SiteUrl,
      // Google wants a raster logo of at least 112px; the 180px touch icon works until a dedicated PNG exists.
      logo: '/apple-touch-icon.png',
      sameAs: [SubstackUrl],
    },
  },

  llms: {
    domain: SiteUrl,
    title: SiteName,
    description: SiteDescription,
    full: {
      title: `${SiteName} — full content`,
      description: 'Every page of the site as a single Markdown document.',
    },
    notes: [
      `Long-form writing lives on Substack: ${SubstackUrl}`,
      'Every page is available as Markdown by appending .md to its URL (e.g. /index.md) or by requesting it with "Accept: text/markdown".',
    ],
  },

  nitro: {
    prerender: {
      crawlLinks: true,
      routes: ['/', '/llms.txt', '/llms-full.txt'],
    },
  },

  hooks: {
    'prerender:routes': (Context) => {
      for (const Route of getRawMarkdownRoutesFromContent()) Context.routes.add(Route)
    },
  },
})
