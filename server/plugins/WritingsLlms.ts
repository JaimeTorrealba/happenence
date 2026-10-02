import { queryCollection } from '@nuxt/content/server'

// Adds the home page's Substack writings (frontmatter `links`) to /llms.txt and /llms-full.txt.
// The /raw/index.md twin already lists them through Nuxt Content's built-in `links` support.

interface WritingLink {
  label: string
  to: string
}

const getWritingLinksFromDocument = (Document: unknown): WritingLink[] =>
  ((Document as { links?: WritingLink[] })?.links ?? []).filter((Link) => Link.label && Link.to)

export default defineNitroPlugin((NitroApp) => {
  NitroApp.hooks.hook('llms:generate', async (Event, Options) => {
    const HomePage = await queryCollection(Event, 'pages').path('/').first()
    const Writings = getWritingLinksFromDocument(HomePage)
    if (!Writings.length) return

    Options.sections.push({
      title: 'Writings',
      description: 'Essays published on Substack.',
      links: Writings.map((Writing) => ({ title: Writing.label, href: Writing.to })),
    })
  })

  NitroApp.hooks.hook('content:llms:generate:document', (_Event, Document) => {
    const Writings = getWritingLinksFromDocument(Document)
    if (!Writings.length) return

    Document.body.value.push(
      ['h2', {}, 'Writings'],
      ['ul', {}, ...Writings.map((Writing) => ['li', {}, ['a', { href: Writing.to }, Writing.label]])],
    )
  })
})
