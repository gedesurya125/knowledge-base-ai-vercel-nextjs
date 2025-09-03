import { xml2json } from "xml-js";
import { createResource } from "../actions/resources";
import { scrapePage } from "./utils/pageScraper";
import { db } from ".";
import { resources } from "./schema/resources";
import { eq, SimplifyMappedType } from "drizzle-orm";

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

const dummyPages = [
  {
    loc: {
      _text:
        "https://svs-teal.vercel.app/de/wissens-hub/kupferwerkstoffe/kupfer-kobalt-beryllium-cucobe/",
    },
    lastmod: {
      _text: "2025-08-08T08:46:13+0000",
    },
  },
];

type SitemapItemType = { loc: { _text: string }; lastmod: { _text: string } };

export const loadData = async (params?: { forceReplace?: boolean }) => {
  // Get the sitemap
  const sitemapJson = await fetchSitemapToJson();
  const sitemapUrls = sitemapJson?.urlset?.url as SitemapItemType[];
  if (!sitemapUrls || sitemapUrls.length === 0) return null;
  // https://medium.com/@olliedoesdev/create-a-rag-application-using-next-js-supabase-and-openais-text-embedding-3-small-model-7f290c028766

  const dePages: SitemapItemType[] = sitemapUrls?.filter(
    (sitemapItem: SitemapItemType) => {
      return (sitemapItem.loc._text as string).startsWith(
        "https://www.svs-schweisstechnik.de/de"
      );
    }
  );

  console.log("this is the scrape.limit", process?.env?.SCRAPE_LIMIT);

  const willFetchedPages = (sitemapUrls || []).slice(
    0,
    process?.env?.SCRAPE_LIMIT ? Number(process?.env?.SCRAPE_LIMIT) : 1
  );

  const contents = [];

  console.log("Fetching...");

  for await (const sitemapItem of willFetchedPages) {
    if (!sitemapItem.loc._text) continue;

    let urlToScrape = sitemapItem.loc._text;

    if (process.env.SOURCE_DOMAIN) {
      urlToScrape = sitemapItem.loc._text.replace(
        "https://www.svs-schweisstechnik.de",
        "https://svs-teal.vercel.app" // TODO this one is needed because we test the new website
      );
    }

    const lastPageModified = new Date(sitemapItem.lastmod._text);

    if (!params?.forceReplace) {
      const existingResources = await db
        .select({ url: resources.url, lastModified: resources.lastModified })
        .from(resources)
        .where(eq(resources.url, urlToScrape));

      if (
        existingResources &&
        existingResources[0]?.lastModified &&
        existingResources[0].lastModified >= lastPageModified
      ) {
        console.log("this page is up to date", sitemapItem);
        contents.push({ sitemap: sitemapItem, message: "up to date" });

        continue;
      }
    }

    console.log("Scrapping: ", urlToScrape);

    // Scrapping process
    const scrappedPage = await scrapePage(urlToScrape);

    const message = await createResource(scrappedPage, lastPageModified);

    contents.push({ sitemap: sitemapItem, message });

    console.log("createResourcesResponse", message);
  }
  console.log("Done Fetching");

  return contents;
  // return sitemapJson;
};

// TODO when re chunk the source we need to  delete the previous resources
