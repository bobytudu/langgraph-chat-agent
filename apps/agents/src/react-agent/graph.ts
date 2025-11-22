// import { AIMessage } from "@langchain/core/messages";
// import { RunnableConfig } from "@langchain/core/runnables";
// import { ConfigurationSchema, ensureConfiguration } from "./configuration.js";
import {
  MessagesAnnotation, StateGraph,
  START,
  END,
} from "@langchain/langgraph";
import { TOOLS } from "./tools.mjs";

import { ChatOllama } from "@langchain/ollama";
import { createReactAgent, ToolNode } from "@langchain/langgraph/prebuilt";

export const model = new ChatOllama( {
  model: "llama3.1:8b",
  // format: "json",
} );

export const createAgent = ( tools = [] ) =>
  createReactAgent( {
    llm: model,
    tools,
  } );

// Define the function that calls the model
// async function callModel(
//   state: typeof MessagesAnnotation.State,
//   config: RunnableConfig,
// ): Promise<typeof MessagesAnnotation.Update> {
//   /** Call the LLM powering our agent. **/
//   const configuration = ensureConfiguration(config);

//   // Feel free to customize the prompt, model, and other logic!
//   // const model = (await loadChatModel(configuration.model)).bindTools(TOOLS);
//   const model = createAgent();

//   const response = await model.invoke({
//     messages: [
//       {
//         role: "system",
//         content: configuration.systemPromptTemplate.replace(
//           "{system_time}",
//           new Date().toISOString(),
//         ),
//       },
//       ...state.messages,
//     ]
//   });

//   // We return a list, because this will get added to the existing list
//   // return { messages: [response] };
//   return { messages: response.messages };
// }

// Define the function that determines whether to continue or not
// function routeModelOutput(state: typeof MessagesAnnotation.State): string {
//   const messages = state.messages;
//   const lastMessage = messages[messages.length - 1];
//   // If the LLM is invoking tools, route there.
//   if ((lastMessage as AIMessage)?.tool_calls?.length || 0 > 0) {
//     return "tools";
//   }
//   // Otherwise end the graph.
//   else {
//     return "__end__";
//   }
// }

// Define a new graph. We use the prebuilt MessagesAnnotation to define state:
// https://langchain-ai.github.io/langgraphjs/concepts/low_level/#messagesannotation
// const workflow = new StateGraph(MessagesAnnotation, ConfigurationSchema)
//   // Define the two nodes we will cycle between
//   .addNode("callModel", callModel)
//   .addNode("tools", new ToolNode(TOOLS))
//   // Set the entrypoint as `callModel`
//   // This means that this node is the first one called
//   .addEdge("__start__", "callModel")
//   .addConditionalEdges(
//     // First, we define the edges' source node. We use `callModel`.
//     // This means these are the edges taken after the `callModel` node is called.
//     "callModel",
//     // Next, we pass in the function that will determine the sink node(s), which
//     // will be called after the source node is called.
//     routeModelOutput,
//   )
//   // This means that after `tools` is called, `callModel` node is called next.
//   .addEdge("tools", "callModel");

// // Finally, we compile it!
// // This compiles it into a graph you can invoke and deploy.
// export const graph = workflow.compile({
//   interruptBefore: [], // if you want to update the state before calling the tools
//   interruptAfter: [],
// });


const baseModel = new ChatOllama( {
  model: "llama3.1:8b",
} );

// 🔹 2. Tool-enabled agent
const toolAgent = createReactAgent( {
  llm: baseModel,
  tools: TOOLS,
} );

function routeModelOutput( state: any ) {
  const last = state.messages[state.messages.length - 1];
  const hasToolCall =
    last?.tool_calls?.some( ( call: any ) =>
      TOOLS.map( ( t: any ) => t.name ).includes( call.name )
    );
  return hasToolCall ? "tools" : END;
}

export const graph = new StateGraph( MessagesAnnotation )
  .addNode( "agent_with_tools", toolAgent )
  .addNode( "tools", new ToolNode( TOOLS ) )
  .addEdge( START, "agent_with_tools" )
  .addConditionalEdges( 'agent_with_tools', routeModelOutput, ['tools', END] )
  .addEdge( "tools", "agent_with_tools" )
  .compile();
