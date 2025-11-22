import { initChatModel } from "langchain/chat_models/universal";
import slackChannels from "../slack_data/channels.json" with { type: "json" };
import slackUserData from "../slack_data/users_map.json" with { type: "json" };
import { WebClient, LogLevel } from "@slack/web-api";
import { writeFileSync } from "fs";
import * as fs from "node:fs/promises";
/**
 * Load a chat model from a fully specified name.
 * @param fullySpecifiedName - String in the format 'provider/model' or 'provider/account/provider/model'.
 * @returns A Promise that resolves to a BaseChatModel instance.
 */

export interface ThreadReplies extends Omit<ConversationHistory, 'reply_count'> {
  
}

export async function generateGraphPng(graph: any) {
  try {
    const drawableGraph = await graph.getGraphAsync();
    const image = await drawableGraph.drawMermaidPng();
    const imageBuffer = new Uint8Array(await image.arrayBuffer());

    await fs.writeFile("graph.png", imageBuffer);
    console.log("Graph PNG generated successfully");
  } catch (error) {
    console.error(error);
  }
}
export function formatError(error: any) {
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

interface ConversationHistory {
  text: string;
  user: string;
  thread_ts: string;
  reply_count: number;
}

export async function loadChatModel(
  fullySpecifiedName: string,
): Promise<ReturnType<typeof initChatModel>> {
  const index = fullySpecifiedName.indexOf("/");
  if (index === -1) {
    // If there's no "/", assume it's just the model
    return await initChatModel(fullySpecifiedName);
  } else {
    const provider = fullySpecifiedName.slice(0, index);
    const model = fullySpecifiedName.slice(index + 1);
    return await initChatModel(model, { modelProvider: provider });
  }
}

export async function listAllReplies(channel_id: string, thread_ts: string): Promise<ThreadReplies[]> {
  try {
    const result = await client.conversations.replies({
      // "channel": "C04PG83EVDZ",
      // "ts": "1761932188.106999"
      "channel": channel_id,
      "ts": thread_ts,
    })
    const modifiedResult = result.messages?.map((message) => ({
      text: replaceUserIdWithNameInAText(message.text || ""),
      user: replaceUserIdWithName(message.user || ""),
      thread_ts: message.ts,
    }))
    return modifiedResult as ThreadReplies[] || [];
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export function getSlackChannelId(channel_name: string) {
  const channel = slackChannels.find((channel: any) => channel.name === channel_name);
  return channel?.id;
}

export function replaceUserIdWithName(user_id: string) {
  const user = slackUserData.find((user: any) => user.id === user_id);
  return user?.display_name || user_id;
}

export function replaceUserIdWithNameInAText(text: string) {
  const userIdPattern = /<@U[A-Z0-9]+>/g;
  return text.replace(userIdPattern, (match) => {
    const user_id = match.replace("<@", "").replace(">", "");
    const user = slackUserData.find((user: any) => user.id === user_id);
    return `@${user?.display_name || user_id}`;
  });
}

export function saveJsonToFile( data: any, filename: string ) {
  const outputFile = `./${filename}`;
  writeFileSync( outputFile, JSON.stringify( data, null, 2 ) );
  console.log( `\n✅ Result saved to ${outputFile}` );
}

export const client = new WebClient(
  "token_here",
  {
    logLevel: LogLevel.ERROR,
  }
);


export const systemPrompt = `You are a helpful assistant with access to Slack channel data from output.json.
You can search and explain what's happening in the Slack channel using the available tools.

When users ask about:
- What's happening in the channel
- Specific topics or discussions
- Information about conversations
- Explanations of channel activity

Use the search_slack_channel_messages or explain_slack_channel_activity tools to retrieve relevant information.
Only use tools when the user's question clearly requires them.
For casual greetings or general queries, respond directly.

🚫 CRITICAL: NEVER use these phrases:
- "Based on the output"
- "Based on the tool call response"
- "According to the data"
- "The output suggests"
- "I have found the following"
- "The search results show"
- "After searching"
- "The tool returned"
- "Looking at the data"
- "It appears that"

✅ Instead, respond as if you naturally know the information:

BAD: "Based on the tool call response, I have found the following messages from Parker Catalano:"
GOOD: "Parker Catalano discussed the following topics:"

BAD: "It appears that Ajay mentioned several issues in his discussion with the team yesterday."
GOOD: "Ajay discussed several issues with the team yesterday:"

BAD: "According to the search results, the following users are in the channel:"
GOOD: "The channel includes these users:"

Format your responses clearly:
- Use bullet points or numbered lists for multiple items
- Be direct and conversational
- Don't mention tools, functions, or data sources
- Answer as if you're a team member who already knows this information`