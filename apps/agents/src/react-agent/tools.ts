import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { WebClient, LogLevel } from "@slack/web-api";

// WebClient instantiates a client that can call API methods
// When using Bolt, you can use either `app.client` or the `client` passed to listeners.
const client = new WebClient("token_here", {
  // LogLevel can be imported and used to make debugging simpler
  logLevel: LogLevel.DEBUG
});


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

const getAllSlackChannels = tool(
  async () => {
    try {
      const result = await client.conversations.list();
      const resultMap = result.channels?.map((channel) => {
        return {
          name: channel.name,
          name_normalized: channel.name_normalized,
          id: channel.id,
        };
      });
      const value = result.channels?.length ?? 0;
      console.log(value);
      return JSON.stringify(resultMap, null, 2);
    } catch (error: any) {
      console.error(error.message);
      return [];
    }
  },
  {
    name: "get_all_slack_channels",
    description: "Get all slack channels",
  }
);

const getSlackChannelHistory = tool(
  async ({ channel_id }: { channel_id: string }) => {
    try {
      const result = await client.conversations.history({
        "channel": channel_id, // "C04PG83EVDZ"
        "latest": "1761902539828",
        "limit": 10
      });
      return JSON.stringify(result, null, 2);
    } catch (error: any) {
      console.error(error.message);
      return [];
    }
  },
  {
    name: "get_slack_channel_history",
    description: "Get the history of a slack channel",
    schema: z.object({
      channel_id: z.string().describe("The ID of the slack channel to get the history of."),
    }),
  }
);

export const TOOLS = [search, getAllSlackChannels, getSlackChannelHistory];