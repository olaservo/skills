---
name: mcp-client-ts
description: Build TypeScript MCP clients with composable code snippets. Includes agentic pattern with LLM integration. Use when creating applications that connect to MCP servers.
---

# TypeScript MCP Client Builder

Build MCP (Model Context Protocol) clients in TypeScript using code snippets and patterns from the official SDK.

## How It Works

1. **Browse** the snippet catalog below or in `snippets/`
2. **Copy** the snippets you need into your project
3. **Customize** the copied code for your use case
4. **Connect** to your MCP server and use tools/resources/prompts

---

## Quick Start Decision Tree

### Which Snippet Should I Start With?

```
Building an agentic app where an LLM decides when to use tools?
  └─> Use client-with-llm snippet
      Includes Claude integration, tool calling loop, interactive chat

Just need direct MCP server access (no LLM)?
  └─> Use client-setup snippet
      Basic connection, manual tool/resource/prompt calls
```

### Which Transport Should I Use?

```
Connecting to a local process (CLI tool, desktop app)?
  └─> Use StdioClientTransport
      Examples: Claude Desktop, CLI applications, local dev servers

Connecting to a remote HTTP server?
  └─> Use StreamableHTTPClientTransport
      Examples: Cloud-hosted MCP servers, web services

Need to support legacy SSE-only servers?
  └─> Use StreamableHTTP with SSE fallback pattern
      See transport-http snippet for fallback example
```

---

## Phase 1: Research

### 1.1 Identify Your Server

Before writing code, understand:
- What MCP server are you connecting to?
- How is the server started? (local process vs remote URL)
- Does the server require authentication?
- What tools/resources/prompts does it expose?

### 1.2 Browse Available Snippets

| Snippet | Description | Best For |
|---------|-------------|----------|
| `client-setup` | Basic Client with connection pattern | Direct MCP access without LLM |
| `client-with-llm` | Agentic client with Claude (API/Bedrock/Vertex/Azure) | LLM-powered tool calling apps |
| `transport-stdio` | StdioClientTransport examples | Local/subprocess servers |
| `transport-http` | StreamableHTTPClientTransport examples | Remote HTTP servers |

---

## Phase 2: Implement

### 2.1 Initialize Project

```bash
mkdir my-mcp-client && cd my-mcp-client
npm init -y
npm install @modelcontextprotocol/sdk
npm install -D typescript @types/node
npx tsc --init
```

Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true
  }
}
```

Update `package.json`:
```json
{
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

Create `.env` for API keys (choose based on your provider):
```bash
# Direct API
ANTHROPIC_API_KEY=your-api-key

# AWS Bedrock
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1

# Google Vertex AI
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_REGION=us-central1

# Azure (Foundry)
ANTHROPIC_FOUNDRY_API_KEY=your-api-key
ANTHROPIC_FOUNDRY_RESOURCE=your-resource.azure.anthropic.com
```

Create `.gitignore`:
```
node_modules/
dist/
build/
.env
*.log
```

### 2.2 Add Snippets

Copy snippets from this skill's `snippets/` directory into your project:

```
snippets/
├── client/
│   ├── index.ts           # Basic client setup
│   └── with-llm.ts        # Agentic client with Claude
└── transports/
    ├── stdio.ts           # Local process transport
    └── http.ts            # Remote HTTP transport
```

**Note:** The `client-with-llm` snippet requires a Claude provider SDK:
```bash
npm install dotenv

# Choose ONE provider:
npm install @anthropic-ai/sdk            # Direct API
npm install @anthropic-ai/bedrock-sdk   # AWS Bedrock
npm install @anthropic-ai/vertex-sdk    # Google Vertex AI
npm install @anthropic-ai/foundry-sdk   # Azure (Foundry)
```

**Copy snippets to your project:**
```bash
cp snippets/client/index.ts /path/to/my-mcp-client/src/
cp snippets/transports/stdio.ts /path/to/my-mcp-client/src/
```

### 2.3 Customize and Connect

Each snippet includes:
- Source URL linking to official documentation
- Working code ready to customize

Modify the copied code:
1. Update client name and version
2. Configure the appropriate transport
3. Add your application logic
4. Handle tool results and resources

---

## Phase 3: Test

### 3.1 Build

```bash
npm run build
```

### 3.2 Test Connection

```bash
# Run your client
node dist/index.js

# Or with a server path argument
node dist/index.js path/to/server.js
```

### 3.3 Quality Checklist

- [ ] Client connects successfully to server
- [ ] Tools are listed correctly
- [ ] Tool calls return expected results
- [ ] Resources are readable
- [ ] Error handling is robust
- [ ] Connection cleanup on exit

---

## Available Snippets Catalog

### Client

| Name | Description |
|------|-------------|
| `client-setup` | Basic MCP Client class with connection, tools, prompts, and resources methods |
| `client-with-llm` | Agentic client with Claude (supports API, Bedrock, Vertex, Azure) |

### Transports

| Name | Description |
|------|-------------|
| `transport-stdio` | StdioClientTransport for Node.js, Python, and npx-based servers |
| `transport-http` | StreamableHTTPClientTransport for remote servers with OAuth and fallback patterns |

---

## Quick Reference

### Core Imports

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
```

### Basic Client Pattern

```typescript
const client = new Client(
  { name: "my-client", version: "1.0.0" },
  { capabilities: {} }
);

const transport = new StdioClientTransport({
  command: "node",
  args: ["path/to/server.js"],
});

await client.connect(transport);

// Use the client
const tools = await client.listTools();
const result = await client.callTool({ name: "tool-name", arguments: {} });

// Cleanup
await client.close();
```

---

## Reference Files

For deeper guidance, load these reference documents:

- [TypeScript Client Patterns](./reference/typescript_client_patterns.md) - SDK imports, transport options, API methods

---

## MCP Documentation Server

For up-to-date protocol details, use the MCP docs server:

```json
{
  "mcpServers": {
    "mcp-docs": {
      "type": "http",
      "url": "https://modelcontextprotocol.io/mcp"
    }
  }
}
```

Query the docs server for:
- "Example clients" - includes examples of both open source and closed source MCP clients
- Client feature support
- Protocol specification updates

---

## External Resources

- [MCP Specification](https://modelcontextprotocol.io/specification) - Official protocol documentation
- [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) - Official SDK repository
- [Build a Client Tutorial](https://modelcontextprotocol.io/docs/develop/build-client) - Step-by-step guide
- [Client Examples](https://github.com/modelcontextprotocol/typescript-sdk/tree/main/examples/client) - Runnable examples
