import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { WebClient, LogLevel } from "@slack/web-api";
import slackUserData from "../slack_data/users.json" with { type: "json" };

const client = new WebClient(
  "token_here",
  {
    logLevel: LogLevel.DEBUG,
  }
);

function formatError(error: any) {
  console.log({
    type: "error",
    message: error.message,
  });
  return JSON.stringify(
    {
      type: "error",
      message: error.message,
    },
    null,
    2
  );
}

const listAllSlackUsers = tool(
  () => {
    try {
      const result = slackUserData.map((user) => ({
        id: user.id,
        name: user.profile.real_name,
        real_name: user.profile.real_name,
        display_name: user.profile.display_name,
      }))
      return JSON.stringify(result.slice(0,10), null, 2);
    } catch (error: any) {
      return formatError(error);
    }
  },
  {
    name: "list_all_slack_users",
    description: "List all slack users",
  }
);

const getAllSlackChannels = tool(
  async () => {
    try {
      const result = await client.conversations.list({ limit: 10 });
      const resultMap = result.channels?.map((channel) => {
        return {
          name: channel.name,
          name_normalized: channel.name_normalized,
          id: channel.id,
        };
      });
      return JSON.stringify(resultMap, null, 2);
    } catch (error: any) {
      return formatError(error);
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
        channel: channel_id, // "C04PG83EVDZ"
        latest: "1761902539828", // date in milliseconds
        limit: 10,
      });
      return JSON.stringify(result, null, 2);
    } catch (error: any) {
      return formatError(error);
    }
  },
  {
    name: "get_slack_channel_history",
    description: "Get the history of a slack channel",
    schema: z.object({
      channel_id: z
        .string()
        .describe("The ID of the slack channel to get the history of."),
    }),
  }
);

export const TOOLS = [
  getAllSlackChannels,
  getSlackChannelHistory,
  listAllSlackUsers,
];
