import { xml2json } from "xml-js";
import { createResource } from "../actions/resources";
import { scrapePage } from "./utils/pageScraper";
import { splitter } from "../ai/embedding";

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
        "https://svs-teal.vercel.app/en/materials/copper-materials/cucr1zr/",
    },
  },
  {
    loc: {
      _text:
        "https://svs-teal.vercel.app/en/materials/copper-materials/cuco2be/",
    },
  },
];

export const loadData = async () => {
  const sitemapJson = await fetchSitemapToJson();
  const sitemapUrls = sitemapJson?.urlset?.url;
  if (!sitemapUrls || sitemapUrls.length === 0) return null;
  // https://medium.com/@olliedoesdev/create-a-rag-application-using-next-js-supabase-and-openais-text-embedding-3-small-model-7f290c028766

  const dePages = sitemapUrls?.filter(
    (sitemapItem: { loc: { _text: string } }) => {
      return (sitemapItem.loc._text as string).startsWith(
        "https://www.svs-schweisstechnik.de/de"
      );
    }
  );

  const willFetchedPages = dePages.slice(0, process?.env?.SCRAPE_LIMIT || 1);

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

    console.log("Scrapping: ", urlToScrape);
    const scrappedPage = await scrapePage(urlToScrape);

    const chunked = await splitter.splitText(scrappedPage.content);

    contents.push({ scrappedPage, chunked });

    const message = await createResource(scrappedPage);

    console.log("createResourcesResponse", message);
  }
  console.log("Done Fetching");

  return contents;
  // return sitemapJson;
};

// TODO when re chunk the source we need to  delete the previous resources
