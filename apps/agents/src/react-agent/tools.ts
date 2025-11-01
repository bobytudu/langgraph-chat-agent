import { z } from "zod";
import { tool } from "@langchain/core/tools";

const search = tool(
  async ({ query }: { query: string }) => {
    if (
      query.toLowerCase().includes("sf") ||
      query.toLowerCase().includes("san francisco")
    ) {
      return "It's 60 degrees and foggy.";
    }
    return "It's 90 degrees and sunny.";
  },
  {
    name: "get_weather",
    description: "Get current weather for a given city",
    schema: z.object({
      query: z.string().describe("The query to use in your search."),
    }),
  }
);


export const TOOLS = [search];