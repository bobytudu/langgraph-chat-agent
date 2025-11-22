import {
  listAllSlackUsers,
  getAllSlackChannels,
  getSlackChannelHistory,
  searchSlackChannelMessages,
  explainSlackChannelActivity,
  calculateDailyLogisticsHours,
} from "./tools/index.mjs";

export const TOOLS = [
  getAllSlackChannels,
  getSlackChannelHistory,
  listAllSlackUsers,
  searchSlackChannelMessages,
  explainSlackChannelActivity,
  calculateDailyLogisticsHours,
];
