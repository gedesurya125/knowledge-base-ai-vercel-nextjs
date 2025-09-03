import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "../db";
import { cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { embeddings } from "../db/schema/embeddings";
import { resources } from "../db/schema/resources";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ScrapedPageType } from "../db/utils/pageScraper";
import { init, encoding_for_model } from "tiktoken/init";

import { getBaseUrl } from "@/utils/getBaseUrl";

let ready: Promise<void> | null = null;
async function ensureInit() {
  if (!ready) {
    ready = init(async (imports) => {
      const baseUrl = getBaseUrl();

      const wasm = await fetch(`${baseUrl}/vendor/tiktoken_bg.wasm`);
      return WebAssembly.instantiateStreaming(wasm, imports);
    });
  }
  return ready;
}

const embeddingModel = openai.embedding("text-embedding-3-small");

export const generateEmbeddingsForPage = async (
  value: ScrapedPageType
): Promise<Array<{ embedding: number[]; content: string }>> => {
  await ensureInit();

  //?source https://dev.to/simplr_sh/the-best-way-to-chunk-text-data-for-generating-embeddings-with-openai-models-56c9
  const encoder = encoding_for_model("text-embedding-3-small");

  //?https://medium.com/@adnanmasood/optimizing-chunking-embedding-and-vectorization-for-retrieval-augmented-generation-ea3b083b68f7
  //? using library instead of manually create chunks
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 600, // maximum token per chunk
    chunkOverlap: 100, // Overlap between chunks 10% - 20%of the chunk size source: https://dev.to/simplr_sh/the-best-way-to-chunk-text-data-for-generating-embeddings-with-openai-models-56c9#:~:text=Use%20Token%2DBased%20Chunking:%20OpenAI,cutting%20off%20ideas%20mid%2Dway.
    separators: ["\n\n", "\n", "? ", "! ", ". ", " ", ""],
    lengthFunction: (text) => {
      // Get accurate token count using tiktoken
      const tokens = encoder.encode(text);
      return tokens.length;
    },
  });

  // chunk process
  const chunks = await splitter.splitText(value.content);

  // embedding process
  const { embeddings } = await embedMany({
    // we can check the token usage from the usage key source: https://ai-sdk.dev/docs/ai-sdk-core/embeddings#token-usage
    model: embeddingModel,
    values: chunks,
  });

  encoder.free();
  return embeddings.map((e, i) => ({
    content: chunks[i],
    embedding: e,
  }));
};

export const generateEmbedding = async (value: string): Promise<number[]> => {
  const input = value.replaceAll("\\n", " ");
  const { embedding, usage } = await embed({
    model: embeddingModel,
    value: input,
  });

  console.log("this is the token used when asking", usage);

  return embedding;
};

export const findRelevantContent = async (userQuery: string) => {
  const userQueryEmbedded = await generateEmbedding(userQuery);
  const similarity = sql<number>`1 - (${cosineDistance(
    embeddings.embedding,
    userQueryEmbedded
  )})`; //? this function is the same with cosineSimilarity as cosineDistance = 1 - cosineSimilarity source https://medium.com/@milana.shxanukova15/cosine-distance-and-cosine-similarity-a5da0e4d9ded
  const similarGuides = await db
    .select({
      content: embeddings.content,
      url: resources.url,
      title: resources.title,
      lastUpdated: resources.lastModified,
      similarity,
    })
    .from(embeddings)
    .leftJoin(resources, eq(embeddings.resourceId, resources.id))
    .where(gt(similarity, 0.5))
    .orderBy((t) => desc(t.similarity))
    .limit(4);
  return similarGuides;
};
