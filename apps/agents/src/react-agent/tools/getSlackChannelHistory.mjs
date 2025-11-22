import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { client, listAllReplies, formatError, getSlackChannelId, replaceUserIdWithNameInAText, replaceUserIdWithName } from "../utils.js";

export const getSlackChannelHistory = tool(
  async ({ channel_name }) => {
    try {
      const channel_id = getSlackChannelId(channel_name);
      if (!channel_id) {
        return formatError({ message: `Channel ${channel_name} not found` });
      }
      const result = await client.conversations.history({
        channel: channel_id, // "C04PG83EVDZ"
        latest: "1763058600000", // date in milliseconds
        limit: 10,
      });
      const modifiedResultPromises = result.messages?.map(async (message) => {
        let replies = [];
        if (message?.reply_count && message.reply_count > 0) {
          replies = await listAllReplies(channel_id, message.ts);
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
    } catch (error) {
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
