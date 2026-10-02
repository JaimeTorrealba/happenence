import type { Config, Context } from "@netlify/edge-functions";

// Serves the Markdown twin of a page (prerendered at /raw/<page>.md) to agents that
// ask for it, either via a ".md" URL (/index.md, /about.md) or "Accept: text/markdown".

const getRawMarkdownPathByPathname = (Pathname: string) => {
  if (Pathname.endsWith(".md")) return `/raw${Pathname}`;
  const CleanPath = Pathname.replace(/\/$/, "");
  return `/raw${CleanPath === "" ? "/index" : CleanPath}.md`;
};

const isMarkdownRequested = (Request: Request, Pathname: string) =>
  Pathname.endsWith(".md") || (Request.headers.get("accept") ?? "").includes("text/markdown");

export default async (Request: Request, Context: Context) => {
  const RequestUrl = new URL(Request.url);

  if (!isMarkdownRequested(Request, RequestUrl.pathname)) {
    const HtmlResponse = await Context.next();
    HtmlResponse.headers.append("Vary", "Accept");
    return HtmlResponse;
  }

  const MarkdownUrl = new URL(getRawMarkdownPathByPathname(RequestUrl.pathname), RequestUrl);
  const MarkdownResponse = await fetch(MarkdownUrl);
  if (!MarkdownResponse.ok) return Context.next();

  const CanonicalPath = RequestUrl.pathname.replace(/(index)?\.md$/, "");
  return new Response(MarkdownResponse.body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Vary": "Accept",
      "X-Robots-Tag": "noindex",
      "Link": `<${new URL(CanonicalPath || "/", RequestUrl)}>; rel="canonical"`,
    },
  });
};

export const config: Config = {
  path: "/*",
  excludedPath: [
    "/_nuxt/*",
    "/images/*",
    "/admin/*",
    "/raw/*",
    "/llms.txt",
    "/llms-full.txt",
    "/sitemap.xml",
    "/robots.txt",
    "/favicon.ico",
  ],
};
