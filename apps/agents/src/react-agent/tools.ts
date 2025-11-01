/**
 * This file defines the tools available to the ReAct agent.
 * Tools are functions that the agent can use to interact with external systems or perform specific tasks.
 */
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
// const { tavily } = require('@tavily/core');
import {tavily} from '@tavily/core';
const tvly = tavily({ apiKey: "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" });
/**
 * Tavily search tool configuration
 * This tool allows the agent to perform web searches using the Tavily API.
 */

// TODO: Uncomment this when we have a valid API key
// const searchTavily = new TavilySearchResults({
//   maxResults: 3,
// });

// const searchTavily = async (query: string) => {
//   const results = await tvly.search(query, {
//     maxResults: 3,
//   });
//   return results;
// };

const searchTavily = (query: string) => {
  // const results = await tvly.search(query, {
  //   maxResults: 3,
  // });
  // return results;
  return `This is a dummy search result for the query "${query}".`;
};


/**
 * Export an array of all available tools
 * Add new tools to this array to make them available to the agent
 *
 * Note: You can create custom tools by implementing the Tool interface from @langchain/core/tools
 * and add them to this array.
 * See https://js.langchain.com/docs/how_to/custom_tools/#tool-function for more information.
 */
export const TOOLS = [searchTavily];
