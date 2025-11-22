import { z } from "zod";
import { tool } from "@langchain/core/tools";
import slackUserData from "../slack_data/users.json" with { type: "json" };
import { formatError } from "../utils.js";

export const listAllSlackUsers = tool(
  () => {
    try {
      const result = slackUserData.map((user) => ({
        id: user.id,
        name: user.profile.real_name,
        real_name: user.profile.real_name,
        display_name: user.profile.display_name,
      }))
      return JSON.stringify(result.slice(0,10), null, 2);
    } catch (error) {
      return formatError(error);
    }
  },
  {
    name: "list_all_slack_users",
    description: "List all slack users",
  }
);
