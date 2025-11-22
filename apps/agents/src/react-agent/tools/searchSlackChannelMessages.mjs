import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { client, listAllReplies, formatError, getSlackChannelId, replaceUserIdWithNameInAText, replaceUserIdWithName } from "../utils.js";

export const searchSlackChannelMessages = tool(
  async ({ query, channel_name, limit = 100 }) => {
    try {
      // Build search query
      let searchQuery = query;
      
      // If channel_name is provided, add it to the search
      if (channel_name) {
        const channelId = getSlackChannelId(channel_name);
        if (!channelId) {
          return formatError({ message: `Channel ${channel_name} not found` });
        }
        searchQuery = `${query} in:<#${channelId}>`;
      }

      // Use Slack search API to find messages
      const result = await client.search.messages({
        query: searchQuery,
        count: limit,
        sort: 'timestamp',
        sort_dir: 'desc'
      });

      if (!result.messages || !result.messages.matches || result.messages.matches.length === 0) {
        return JSON.stringify({
          message: "No messages found matching your query",
          query: query,
        }, null, 2);
      }

      // Process the results - limit to top 5
      const processedMessages = await Promise.all(
        result.messages.matches.slice(0, 5).map(async (match) => {
          let replies = [];
          
          // Fetch replies if this is a thread parent
          if (match.reply_count && match.reply_count > 0) {
            try {
              replies = await listAllReplies(match.channel.id, match.ts);
            } catch (error) {
              // If we can't fetch replies, continue without them
              console.error(`Could not fetch replies: ${error.message}`);
            }
          }

          return {
            text: replaceUserIdWithNameInAText(match.text || ""),
            user: replaceUserIdWithName(match.user || ""),
            channel: match.channel.name || "unknown",
            thread_ts: match.ts,
            reply_count: match.reply_count || 0,
            replies: replies.length > 1 ? replies.slice(1) : [], // Skip the parent message
          };
        })
      );

      return JSON.stringify({
        query: query,
        results_count: processedMessages.length,
        total_matches: result.messages.total,
        messages: processedMessages,
      }, null, 2);
    } catch (error) {
      return formatError(error);
    }
  },
  {
    name: "search_slack_channel_messages",
    description: "Search through Slack messages using the live Slack API to find relevant conversations, topics, or information. Searches across all accessible channels by default, or within a specific channel if provided. Use this to find what people are saying, locate discussions about topics, or search for messages from specific users.",
    schema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant messages. Can be a topic, keyword, person's name (e.g., 'Ajay'), or any text to search for. Examples: 'Fixed Assets', 'Ajay', 'staging app', 'depreciation'."),
      channel_name: z
        .string()
        .optional()
        .describe("Optional: The name of the slack channel to search within (e.g., 'general', 'engineering'). If not provided, searches across all accessible channels."),
      limit: z
        .number()
        .optional()
        .describe("Optional: Maximum number of messages to search through (default: 100)."),
    }),
  }
);
