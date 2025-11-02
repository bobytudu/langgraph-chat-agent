import { z } from "zod";
import { tool } from "@langchain/core/tools";
import slackUserData from "../slack_data/users.json" with { type: "json" };
import { client, listAllReplies, type ThreadReplies, formatError, getSlackChannelId, replaceUserIdWithNameInAText, replaceUserIdWithName } from "./utils.js";


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
  async ({ channel_name }: { channel_name: string }) => {
    try {
      const channel_id = getSlackChannelId(channel_name);
      if (!channel_id) {
        return formatError({ message: `Channel ${channel_name} not found` });
      }
      const result = await client.conversations.history({
        channel: channel_id, // "C04PG83EVDZ"
        latest: "1761902539828", // date in milliseconds
        limit: 10,
      });
      const modifiedResultPromises = result.messages?.map(async (message) => {
        let replies: ThreadReplies[] = [];
        if (message?.reply_count && message.reply_count > 0) {
          replies = await listAllReplies(channel_id, message.ts as string);
        }

        return {
          text: replaceUserIdWithNameInAText(message.text || ""),
          user: replaceUserIdWithName(message.user || ""),
          thread_ts: message.ts,
          reply_count: message.reply_count,
          replies: replies.slice(1),
        }
      })
      const modifiedResult = await Promise.all(modifiedResultPromises || []);
      return JSON.stringify(modifiedResult, null, 2);
    } catch (error: any) {
      return formatError(error);
    }
  },
  {
    name: "get_slack_channel_history",
    description: "Get the history of a slack channel",
    schema: z.object({
      channel_name: z
        .string()
        .describe("The name of the slack channel to get the history of."),
    }),
  }
);

export const TOOLS = [
  getAllSlackChannels,
  getSlackChannelHistory,
  listAllSlackUsers,
];
