import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  tool,
  UIMessage,
  stepCountIs,
} from "ai";
import z from "zod";
import { findRelevantContent } from "@/lib/ai/embedding";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `You are a helpful assistant in the official website of SVS Welding Company.
    You are part of SVS Welding company, so never say they or their for SVS Company.
    Use The Information from tool calls to respond any question related to: SVS Company, it's services, it's products and available materials.
    If there is no products, materials, or services that meet Users's criteria, find information that has close relationship in the Information from the tool calls.
    Respond also any terms related to the SVS products, services, materials based the Information from the tool calls, if you can't found it you can check from external source but you need to show where you got that information.
    Return the answer including the date when the information was last updated and the url of the information source.
    Todays Date is ${new Date().toDateString()}
    `,
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    onStepFinish: (result) => {
      console.log("Current Step", result);
    },
    tools: {
      // addResource: tool({
      //   description: `add a resource to your knowledge base.
      //    If you have provided incorrect information and If the user provide correct information based on your knowledge base`,
      //   inputSchema: z.object({
      //     url: z
      //       .string()
      //       .describe(
      //         "the url of related product on discussion to add to the knowledge base"
      //       ),
      //     title: z
      //       .string()
      //       .describe(
      //         "the title of related product on discussion to add to the knowledge base"
      //       ),
      //     content: z
      //       .string()
      //       .describe("the content or resource to add to the knowledge base"),
      //   }),
      //   execute: async ({ content, url, title }) =>
      //     createUserResource({
      //       content,
      //       url,
      //       title,
      //       lastModified: new Date(),
      //     }),
      // }),
      getInformation: tool({
        description: `get information from your knowledge base to answer questions.`,
        inputSchema: z.object({
          question: z.string().describe("the users question"),
        }),
        execute: async ({ question }) => findRelevantContent(question),
      }),
      // https://community.openai.com/t/why-chatgpt-by-api-doesnt-know-todays-date/449761
      getDate: tool({
        description: `get information of current date-time to answer question`,
        inputSchema: z.object({
          question: z.string().describe("the users question"),
        }),
        execute: async () => new Date().toDateString(),
      }),
    },
  });

  return result.toUIMessageStreamResponse();
}
