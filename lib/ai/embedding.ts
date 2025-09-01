import { embed, embedMany } from "ai";
import { openai } from "@ai-sdk/openai";
import { db } from "../db";
import { cosineDistance, desc, eq, gt, sql } from "drizzle-orm";
import { embeddings } from "../db/schema/embeddings";
import { resources } from "../db/schema/resources";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { ScrapedPageType } from "../db/utils/pageScraper";

const embeddingModel = openai.embedding("text-embedding-3-small");

//? using library instead of manually create chunks
export const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 100,
  chunkOverlap: 0,
});

export const generateEmbeddingsForPage = async (
  value: ScrapedPageType
): Promise<Array<{ embedding: number[]; content: string }>> => {
  // chunk process
  const chunks = await splitter.splitText(value.content);

  // embedding process
  const { embeddings } = await embedMany({
    // we can check the token usage from the usage key source: https://ai-sdk.dev/docs/ai-sdk-core/embeddings#token-usage
    model: embeddingModel,
    values: chunks,
  });

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
      similarity,
    })
    .from(embeddings)
    .leftJoin(resources, eq(embeddings.resourceId, resources.id))
    .where(gt(similarity, 0.5))
    .orderBy((t) => desc(t.similarity))
    .limit(4);
  return similarGuides;
};
