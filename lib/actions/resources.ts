"use server";

import { insertResourceSchema, resources } from "@/lib/db/schema/resources";
import { db } from "../db";
import { generateEmbeddingsForPage } from "../ai/embedding";
import { embeddings as embeddingsTable } from "../db/schema/embeddings";
import { ScrapedPageType } from "../db/utils/pageScraper";
import { eq } from "drizzle-orm";

export const createResource = async (input: ScrapedPageType) => {
  try {
    const { content, url, title } = insertResourceSchema.parse(input);

    console.log("this is the new url", url);

    const existingResources = await db
      .select({ url: resources.url })
      .from(resources)
      .where(eq(resources.url, url));

    console.log("this is the existing resources", existingResources);

    if (existingResources && existingResources[0]?.url) {
      await db.delete(resources).where(eq(resources.url, url));
    }

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
