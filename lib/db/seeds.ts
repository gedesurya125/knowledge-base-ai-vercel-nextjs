import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { xml2json } from "xml-js";
// import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { embed } from "ai";
import { createResource } from "../actions/resources";

export const scrapePage = async (url: string): Promise<string> => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: true,
    },
    gotoOptions: {
      waitUntil: "domcontentloaded",
    },
    evaluate: async (page, browser) => {
      const result = await page.evaluate(() => document.body.innerHTML);
      await browser.close();
      return result;
    },
  });
  return (await loader.scrape()).replace(/<[^>]*>?/gm, "");
};

const fetchSitemapToJson = async () => {
  const sitemapUrl = process.env.SITEMAP_URL;

  if (!sitemapUrl) return null;
  try {
    const response = await fetch(sitemapUrl);
    const xmlString = await response.text();
    const jsonString = xml2json(xmlString, { compact: true, spaces: 2 });
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Error parsing XML to JSON:", e);
    return null;
  }
};

export const loadData = async () => {
  const sitemapJson = await fetchSitemapToJson();
  const sitemapUrls = sitemapJson?.urlset?.url;
  if (!sitemapUrls || sitemapUrls.length === 0) return null;
  // https://medium.com/@olliedoesdev/create-a-rag-application-using-next-js-supabase-and-openais-text-embedding-3-small-model-7f290c028766

  for await (const sitemapItem of sitemapUrls) {
    if (!sitemapItem.loc._text) continue;
    const content = await scrapePage(sitemapItem.loc._text);
    await createResource({ content });
  }

  return sitemapJson;
};
