# Vercel AI SDK RAG Guide Starter Project

This is the starter project for the Vercel AI SDK [Retrieval-Augmented Generation (RAG) guide](https://sdk.vercel.ai/docs/guides/rag-chatbot).

In this project, you will build a chatbot that will only respond with information that it has within its knowledge base. The chatbot will be able to both store and retrieve information. This project has many interesting use cases from customer support through to building your own second brain!

This project will use the following stack:

- [Next.js](https://nextjs.org) 14 (App Router)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [OpenAI](https://openai.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [Postgres](https://www.postgresql.org/) with [ pgvector ](https://github.com/pgvector/pgvector)
- [shadcn-ui](https://ui.shadcn.com) and [TailwindCSS](https://tailwindcss.com) for styling

## Self note

- Installing PNPM https://pnpm.io/installation
- example of RAG https://medium.com/@olliedoesdev/create-a-rag-application-using-next-js-supabase-and-openais-text-embedding-3-small-model-7f290c028766

## Example question:

- hi : it will response with addition of the SVS Welding company, indicated it's focused in SVS welding company
- hi i want a copper material that can maintain it's strength up to 500 degree of celcius, do you have that ?
- what material product do you have that is good for heatsink ?
- Hi do you have dressing products ?
- How many materials do you have ?
- Which products has the best heat resistance ?
- which material has the best electrical conductivity at hot condition ?
- Which material has higest melting points ?
- Do you have flat bar of copper ?
- Do you have rod copper
- Do you have round bars copper ?
- What material do you have in plate form ?
