import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { client, listAllReplies, formatError, getSlackChannelId, replaceUserIdWithNameInAText, replaceUserIdWithName } from "../utils.js";

export const explainSlackChannelActivity = tool(
  async ({ topic, channel_name, days_back = 30 }) => {
    try {
      // Calculate time range
      const now = Math.floor(Date.now() / 1000);
      const oldest = now - (days_back * 24 * 60 * 60);
      const dateFilter = `after:${new Date(oldest * 1000).toISOString().split('T')[0]}`;

      // Build search query
      let searchQuery = `${topic} ${dateFilter}`;
      
      // If channel_name is provided, add it to the search
      if (channel_name) {
        const channelId = getSlackChannelId(channel_name);
        if (!channelId) {
          return formatError({ message: `Channel ${channel_name} not found` });
        }
        searchQuery = `${topic} in:<#${channelId}> ${dateFilter}`;
      }

      // Use Slack search API to find messages related to the topic
      const result = await client.search.messages({
        query: searchQuery,
        count: 50,
        sort: 'timestamp',
        sort_dir: 'desc'
      });

      if (!result.messages || !result.messages.matches || result.messages.matches.length === 0) {
        return JSON.stringify({
          topic: topic,
          message: "No messages found related to this topic",
          total_relevant_messages: 0,
        }, null, 2);
      }

      const relevantMessages = result.messages.matches;
      const usersMentioned = new Set();
      const channels = new Set();

      // Collect users and channels involved
      for (const message of relevantMessages) {
        const userName = replaceUserIdWithName(message.user || "");
        usersMentioned.add(userName);
        if (message.channel && message.channel.name) {
          channels.add(message.channel.name);
        }
      }

      // Get sample messages with replies
      const sampleMessages = await Promise.all(
        relevantMessages.slice(0, 3).map(async (msg) => {
          let replies = [];
          if (msg.reply_count && msg.reply_count > 0) {
            try {
              replies = await listAllReplies(msg.channel.id, msg.ts);
            } catch (error) {
              // If we can't fetch replies, continue without them
              console.error(`Could not fetch replies: ${error.message}`);
            }
          }

          return {
            user: replaceUserIdWithName(msg.user || ""),
            text: replaceUserIdWithNameInAText(msg.text || "").substring(0, 200) + 
                  (msg.text && msg.text.length > 200 ? "..." : ""),
            channel: msg.channel.name || "unknown",
            has_replies: (replies.length || 0) > 1,
            reply_count: msg.reply_count || 0,
            timestamp: new Date(parseFloat(msg.ts) * 1000).toLocaleString(),
          };
        })
      );

      const summary = {
        topic: topic,
        total_relevant_messages: result.messages.total,
        channels_involved: Array.from(channels),
        users_involved: Array.from(usersMentioned),
        time_range: `Last ${days_back} days`,
        sample_messages: sampleMessages,
      };

      return JSON.stringify(summary, null, 2);
    } catch (error) {
      return formatError(error);
    }
  },
  {
    name: "explain_slack_channel_activity",
    description: "Get a summary and explanation of what's happening in Slack related to a specific topic using live Slack API. Searches across all accessible channels by default, or within a specific channel if provided. This provides context about discussions, who's involved, key messages, and activity patterns.",
    schema: z.object({
      topic: z
        .string()
        .describe("The topic or subject to get an explanation about. Can be a keyword, project name, or person's name. Examples: 'Fixed Assets', 'Dura org', 'staging app', 'depreciation', 'Ajay', 'Parker Catalano'."),
      channel_name: z
        .string()
        .optional()
        .describe("Optional: The name of the slack channel to search within (e.g., 'general', 'engineering'). If not provided, searches across all accessible channels."),
      days_back: z
        .number()
        .optional()
        .describe("Optional: Number of days to look back (default: 30 days)."),
    }),
  }
);
