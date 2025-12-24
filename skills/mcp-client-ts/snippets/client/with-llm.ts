/**
 * MCP Client with LLM Integration (Agentic Pattern)
 *
 * Source: https://github.com/modelcontextprotocol/quickstart-resources/tree/main/mcp-client-typescript
 *
 * This snippet demonstrates the full agentic pattern where Claude
 * decides when to call MCP tools based on user queries.
 *
 * Supports multiple Claude providers:
 *   - Direct API (api.anthropic.com)
 *   - AWS Bedrock
 *   - Google Vertex AI
 *   - Azure (Foundry)
 *
 * Required dependencies (install based on your provider):
 *   npm install @modelcontextprotocol/sdk dotenv
 *
 *   # Choose ONE provider:
 *   npm install @anthropic-ai/sdk            # Direct API
 *   npm install @anthropic-ai/bedrock-sdk   # AWS Bedrock
 *   npm install @anthropic-ai/vertex-sdk    # Google Vertex AI
 *   npm install @anthropic-ai/foundry-sdk   # Azure (Foundry)
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import readline from "readline/promises";
import dotenv from "dotenv";

dotenv.config();

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================
// Uncomment ONE of the following provider configurations:

// -----------------------------------------------------------------------------
// Option 1: Direct Anthropic API
// Requires: npm install @anthropic-ai/sdk
// Env vars: ANTHROPIC_API_KEY
// -----------------------------------------------------------------------------
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages.js";
const anthropic = new Anthropic();
const MODEL = "claude-sonnet-4-5";

// -----------------------------------------------------------------------------
// Option 2: AWS Bedrock
// Requires: npm install @anthropic-ai/bedrock-sdk
// Env vars: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
// -----------------------------------------------------------------------------
// import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";
// import type { MessageParam, Tool } from "@anthropic-ai/bedrock-sdk/resources/messages.js";
// const anthropic = new AnthropicBedrock();
// const MODEL = "anthropic.claude-3-5-sonnet-20241022-v2:0";

// -----------------------------------------------------------------------------
// Option 3: Google Vertex AI
// Requires: npm install @anthropic-ai/vertex-sdk
// Env vars: GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_REGION (or CLOUD_ML_REGION)
// Auth: gcloud auth application-default login
// -----------------------------------------------------------------------------
// import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";
// import type { MessageParam, Tool } from "@anthropic-ai/vertex-sdk/resources/messages.js";
// const anthropic = new AnthropicVertex();
// const MODEL = "claude-sonnet-4-5@20250514";

// -----------------------------------------------------------------------------
// Option 4: Azure (Foundry)
// Requires: npm install @anthropic-ai/foundry-sdk
// Env vars: ANTHROPIC_FOUNDRY_API_KEY, ANTHROPIC_FOUNDRY_RESOURCE
// -----------------------------------------------------------------------------
// import { AnthropicFoundry } from "@anthropic-ai/foundry-sdk";
// import type { MessageParam, Tool } from "@anthropic-ai/foundry-sdk/resources/messages.js";
// const anthropic = new AnthropicFoundry({
//   resource: process.env.ANTHROPIC_FOUNDRY_RESOURCE,
// });
// const MODEL = "claude-3-5-sonnet-20241022";

// =============================================================================
// MCP CLIENT
// =============================================================================

class MCPClient {
  private mcp: Client;
  private transport: StdioClientTransport | null = null;
  private tools: Tool[] = [];

  constructor() {
    this.mcp = new Client({ name: "mcp-client-cli", version: "1.0.0" });
  }

  /**
   * Connect to an MCP server and load available tools
   */
  async connectToServer(serverScriptPath: string) {
    const isJs = serverScriptPath.endsWith(".js");
    const isPy = serverScriptPath.endsWith(".py");
    if (!isJs && !isPy) {
      throw new Error("Server script must be a .js or .py file");
    }

    const command = isPy
      ? process.platform === "win32"
        ? "python"
        : "python3"
      : process.execPath;

    this.transport = new StdioClientTransport({
      command,
      args: [serverScriptPath],
    });
    await this.mcp.connect(this.transport);

    // Convert MCP tools to Anthropic tool format
    const toolsResult = await this.mcp.listTools();
    this.tools = toolsResult.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Tool["input_schema"],
    }));

    console.log(
      "Connected to server with tools:",
      this.tools.map(({ name }) => name)
    );
  }

  /**
   * Process a query using Claude and available MCP tools
   *
   * Implements proper agentic loop:
   * 1. Send query to Claude with available tools
   * 2. If Claude requests tools, execute ALL of them
   * 3. Send tool results back using proper tool_result format
   * 4. Repeat until Claude stops requesting tools
   */
  async processQuery(query: string): Promise<string> {
    const messages: MessageParam[] = [
      {
        role: "user",
        content: query,
      },
    ];

    let response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages,
      tools: this.tools,
    });

    const finalText: string[] = [];

    // Agentic loop - continue until no more tool calls
    while (response.stop_reason === "tool_use") {
      // Collect all tool results from this response
      const toolResultContent: Array<{
        type: "tool_result";
        tool_use_id: string;
        content: string;
      }> = [];

      for (const block of response.content) {
        if (block.type === "text") {
          finalText.push(block.text);
        } else if (block.type === "tool_use") {
          finalText.push(
            `[Calling tool ${block.name} with args ${JSON.stringify(block.input)}]`
          );

          const result = await this.mcp.callTool({
            name: block.name,
            arguments: block.input as Record<string, unknown>,
          });

          toolResultContent.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result.content),
          });
        }
      }

      // Add assistant response to history (includes tool_use blocks)
      messages.push({
        role: "assistant",
        content: response.content,
      });

      // Add all tool results as a single user message
      messages.push({
        role: "user",
        content: toolResultContent,
      });

      // Get next response from Claude
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1000,
        messages,
        tools: this.tools,
      });
    }

    // Extract final text from the last response
    for (const block of response.content) {
      if (block.type === "text") {
        finalText.push(block.text);
      }
    }

    return finalText.join("\n");
  }

  /**
   * Run an interactive chat loop
   */
  async chatLoop() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("\nMCP Client Started!");
      console.log("Type your queries or 'quit' to exit.");

      while (true) {
        const message = await rl.question("\nQuery: ");
        if (message.toLowerCase() === "quit") {
          break;
        }
        const response = await this.processQuery(message);
        console.log("\n" + response);
      }
    } finally {
      rl.close();
    }
  }

  async cleanup() {
    await this.mcp.close();
  }
}

// Main entry point
async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: node build/index.js <path_to_server_script>");
    return;
  }

  const mcpClient = new MCPClient();
  try {
    await mcpClient.connectToServer(process.argv[2]);
    await mcpClient.chatLoop();
  } catch (e) {
    console.error("Error:", e);
    await mcpClient.cleanup();
    process.exit(1);
  } finally {
    await mcpClient.cleanup();
    process.exit(0);
  }
}

main();
