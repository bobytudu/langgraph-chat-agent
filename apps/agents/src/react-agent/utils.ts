import { initChatModel } from "langchain/chat_models/universal";
import slackChannels from "../slack_data/channels.json" with { type: "json" };
import slackUserData from "../slack_data/users_map.json" with { type: "json" };
import { WebClient, LogLevel } from "@slack/web-api";
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

export const client = new WebClient(
  "token_here",
  {
    logLevel: LogLevel.DEBUG,
  }
);


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