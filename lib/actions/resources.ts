"use server";

import { insertResourceSchema, resources } from "@/lib/db/schema/resources";
import { db } from "../db";
import { generateEmbeddingsForPage } from "../ai/embedding";
import { embeddings as embeddingsTable } from "../db/schema/embeddings";
import { ScrapedPageType } from "../db/utils/pageScraper";

export const createResource = async (input: ScrapedPageType) => {
  try {
    const { content, url, title } = insertResourceSchema.parse(input);

    const [resource] = await db
      .insert(resources)
      .values({ content, url, title })
      .returning();

    const embeddings = await generateEmbeddingsForPage(input);

    // Connecting the embedding table with the resource table
    await db.insert(embeddingsTable).values(
      embeddings.map((embedding) => ({
        resourceId: resource.id,
        ...embedding,
      }))
    );

    return "Resource successfully created and embedded.";
  } catch (e) {
    if (e instanceof Error)
      return e.message.length > 0 ? e.message : "Error, please try again.";
  }
};
