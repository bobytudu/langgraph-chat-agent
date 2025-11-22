import { z } from "zod";
import { tool } from "@langchain/core/tools";
import slackUserData from "../slack_data/users.json" with { type: "json" };
import { client, formatError, getSlackChannelId } from "../utils.js";

export const calculateDailyLogisticsHours = tool(
  async ({ person_name, start_date, end_date }) => {
    try {
      // 1. Find User
      const targetUser = slackUserData.find((user) => {
        const realName = user.profile.real_name || "";
        const displayName = user.profile.display_name || "";
        return (
          realName.toLowerCase().includes(person_name.toLowerCase()) ||
          displayName.toLowerCase().includes(person_name.toLowerCase())
        );
      });

      if (!targetUser) {
        return formatError({ message: `User ${person_name} not found.` });
      }

      // 2. Find Channel
      const channelId = getSlackChannelId("daily-logistics-oof");
      if (!channelId) {
        return formatError({ message: "Channel daily-logistics-oof not found." });
      }

      // 3. Determine Time Range
      const start = new Date(start_date);
      start.setHours(0, 0, 0, 0);
      
      let end;
      if (end_date) {
        end = new Date(end_date);
      } else {
        end = new Date(start_date);
      }
      end.setHours(23, 59, 59, 999);

      const oldest = (start.getTime() / 1000).toString();
      const latest = (end.getTime() / 1000).toString();

      // 4. Fetch History
      const result = await client.conversations.history({
        channel: channelId,
        oldest: oldest,
        latest: latest,
        limit: 1000, 
      });

      if (!result.messages || result.messages.length === 0) {
        return JSON.stringify({
            message: "No messages found in the given period."
        });
      }

      // 5. Filter and Calculate
      const userMessages = result.messages.filter((m) => m.user === targetUser.id);

      if (userMessages.length === 0) {
          return JSON.stringify({
              message: `No messages found for user ${targetUser.profile.real_name} in the given period.`
          });
      }

      // Group by day
      const messagesByDay = {};
      userMessages.forEach((msg) => {
        const date = new Date(parseFloat(msg.ts) * 1000).toDateString();
        if (!messagesByDay[date]) messagesByDay[date] = [];
        messagesByDay[date].push(parseFloat(msg.ts));
      });

      let totalHours = 0;
      const report = [];
      const details = {}

      for (const [date, timestamps] of Object.entries(messagesByDay)) {
        timestamps.sort((a, b) => a - b); // Ascending
        if (timestamps.length >= 2) {
          const first = timestamps[0];
          const last = timestamps[timestamps.length - 1];
          const hours = (last - first) / 3600;
          totalHours += hours;

          // Format times in EST and IST
          const startEST = new Date( first * 1000 ).toLocaleString( 'en-US', {
            timeZone: 'America/New_York',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          } );
          const endEST = new Date( last * 1000 ).toLocaleString( 'en-US', {
            timeZone: 'America/New_York',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          } );
          const startIST = new Date( first * 1000 ).toLocaleString( 'en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          } );
          const endIST = new Date( last * 1000 ).toLocaleString( 'en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          } );

          details['start_EST'] = startEST;
          details['end_EST'] = endEST;
          details['start_IST'] = startIST;
          details['end_IST'] = endIST;

          report.push({
            date: date,
            start_EST: startEST,
            end_EST: endEST,
            start_IST: startIST,
            end_IST: endIST,
            hours: parseFloat(hours.toFixed(2)),
          });
        } else {
          report.push({
            date: date,
            note: "Only one message found. Cannot calculate duration.",
          });
        }
      }

      return JSON.stringify(
        {
          user: targetUser.profile.real_name,
          total_hours: parseFloat(totalHours.toFixed(2)),
          details: details,
        },
        null,
        2
      );
    } catch (error) {
      return formatError(error);
    }
  },
  {
    name: "calculate_daily_logistics_hours",
    description:
      "Calculate work hours for a person in daily-logistics-oof channel based on their first and last message of the day.",
    schema: z.object({
      person_name: z.string().describe("Name of the person"),
      start_date: z.string().describe("Start date (YYYY-MM-DD)"),
      end_date: z
        .string()
        .optional()
        .describe(
          "End date (YYYY-MM-DD). If not provided, calculates for start_date only."
        ),
    }),
  }
);
