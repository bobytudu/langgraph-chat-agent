import { initChatModel } from "langchain/chat_models/universal";
import slackChannels from "../slack_data/channels.json" with { type: "json" };
import slackUserData from "../slack_data/users.json" with { type: "json" };
import { WebClient, LogLevel } from "@slack/web-api";
/**
 * Load a chat model from a fully specified name.
 * @param fullySpecifiedName - String in the format 'provider/model' or 'provider/account/provider/model'.
 * @returns A Promise that resolves to a BaseChatModel instance.
 */

export interface ThreadReplies extends Omit<ConversationHistory, 'reply_count'> {
  
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
      text: replaceUserIdWithName(message.text || ""),
      user: message.user,
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

export function replaceUserIdWithName(text: string) {
  const userIdPattern = /<@U[A-Z0-9]+>/g;
  return text.replace(userIdPattern, (match) => {
    const user_id = match.replace("<@", "").replace(">", "");
    const user_name = slackUserData.find((user: any) => user.id === user_id);
    return `@${user_name?.name || user_id}`;
  });
}