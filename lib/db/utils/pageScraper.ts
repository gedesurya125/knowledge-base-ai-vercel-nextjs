import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import sanitizeHtml from "sanitize-html";
import Turndown from "turndown";

const turndown = new Turndown({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

export type ScrapedPageType = {
  url: string;
  title: string;
  html: string;
  content: string;
};

export async function scrapePage(url: string): Promise<ScrapedPageType> {
  const res = await fetch(url, { headers: { "User-Agent": "RAGScraper/1.0" } });
  const htmlRaw = await res.text();

  // 1) Extract main article like Reader mode
  const dom = new JSDOM(htmlRaw, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const contentHtml =
    article?.content ||
    dom.window.document.querySelector("main,article")?.innerHTML ||
    dom.window.document.body.innerHTML ||
    "";

  // 2) Absolutize links & (optional) images
  const abs = new JSDOM(contentHtml, { url });
  abs.window.document
    .querySelectorAll<HTMLAnchorElement>("a[href]")
    .forEach((a) => {
      try {
        a.href = new URL(a.getAttribute("href")!, url).toString();
      } catch {}
    });
  // If you keep images in HTML for UI, also absolutize <img src>:
  abs.window.document
    .querySelectorAll<HTMLImageElement>("img[src]")
    .forEach((img) => {
      try {
        img.src = new URL(img.getAttribute("src")!, url).toString();
      } catch {}
    });

  // 3) Sanitize to a semantic subset
  let cleanHtml = sanitizeHtml(abs.window.document.body.innerHTML, {
    allowedTags: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "p",
      "strong",
      "em",
      "blockquote",
      "code",
      "pre",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "a",
      "hr",
      "br",
    ],
    allowedAttributes: {
      a: ["href"],
      td: ["colspan", "rowspan"],
      th: ["colspan", "rowspan"],
    },
  });

  const title = (article?.title || dom.window.document.title || url).trim();
  cleanHtml = `<h1>${title}</h1>\n${cleanHtml}`;

  // 4) Convert cleaned HTML -> plain text (no markdown), preserving structure
  const embedText = htmlToEmbedText(cleanHtml, url, title);

  return { url, title, html: cleanHtml, content: embedText };
}

/** Convert semantic HTML to clean plain text for embeddings. */
function htmlToEmbedText(html: string, url: string, title: string) {
  const d = new JSDOM(
    `<!doctype html><html><body><main id="root">${html}</main></body></html>`
  ).window.document;

  const main = d.querySelector("main")!;

  const out: string[] = [];
  const push = (s?: string) => {
    if (s && s?.trim()) out.push(s?.trim());
  };

  const tableToLines = (table: HTMLTableElement) => {
    const rows = Array.from(table.querySelectorAll("tr"));
    if (!rows.length) return [];
    const headers = Array.from(rows[0].children).map((c) =>
      (c as HTMLElement).textContent?.trim()
    );
    const lines: string[] = [];
    for (const tr of rows.slice(headers.some((h) => h) ? 1 : 0)) {
      const cells = Array.from(tr.children).map((c) =>
        (c as HTMLElement).textContent?.trim()
      );
      if (headers.length && headers.some(Boolean)) {
        // header: value pairs
        for (let i = 0; i < Math.max(headers.length, cells.length); i++) {
          const h = headers[i] || `Col${i + 1}`;
          const v = cells[i] || "";
          if (v) lines.push(`${h}: ${v}`);
        }
        lines.push(""); // blank line between rows
      } else {
        lines.push(cells.filter(Boolean).join(" · "));
      }
    }
    return lines;
  };

  const walk = (node: Element) => {
    for (const el of Array.from(node.children)) {
      const tag = el.tagName.toLowerCase();
      const txt = (el as HTMLElement).textContent?.trim();

      if (/^h[1-6]$/.test(tag)) {
        push(txt);
        continue;
      }
      if (tag === "p" || tag === "blockquote") {
        push(txt);
        continue;
      }

      if (tag === "pre" || tag === "code") {
        const code = (el as HTMLElement).textContent
          .replace(/\n{3,}/g, "\n\n")
          ?.trim();
        if (code) push(code);
        continue;
      }

      if (tag === "ul" || tag === "ol") {
        let i = 1;
        for (const li of Array.from(el.querySelectorAll(":scope > li"))) {
          const t = (li as HTMLElement).textContent?.trim();
          if (!t) continue;
          push((tag === "ol" ? `${i}. ` : "- ") + t);
          i++;
        }
        push("");
        continue;
      }

      if (tag === "table") {
        tableToLines(el as HTMLTableElement).forEach((l) => push(l));
        continue;
      }

      if (tag === "a") {
        // keep anchor text only (URLs live in metadata)
        if (txt) push(txt);
        continue;
      }

      if (
        [
          "div",
          "section",
          "main",
          "article",
          "tbody",
          "thead",
          "tr",
          "td",
          "th",
        ].includes(tag)
      ) {
        walk(el);
      }
    }
  };

  walk(main);

  const text = [`Title: ${title}`, `URL: ${url}`, "", ...out]
    .join("\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    ?.trim();

  return text;
}
