import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { client, formatError } from "../utils.js";

export const getAllSlackChannels = tool(
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
    } catch (error) {
      return formatError(error);
    }
  },
  {
    name: "get_all_slack_channels",
    description: "Get all slack channels",
  }
);
