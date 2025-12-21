# MCP Client Compatibility

Guide to MCP host/client capabilities and limitations for planning your server implementation.

---

## Client Comparison Matrix

| Feature | Claude Desktop | Claude Code | MCP Inspector |
|---------|---------------|-------------|---------------|
| **Transports** | | | |
| stdio | Yes | Yes | Yes |
| Streamable HTTP | No | Yes | Yes |
| SSE (deprecated) | No | Limited | Yes |
| **Primitives** | | | |
| Tools | Yes | Yes | Yes |
| Resources | Limited | Yes | Yes |
| Resource Templates | Limited | Yes | Yes |
| Prompts | Yes | Yes | Yes |
| **Advanced Features** | | | |
| Progress notifications | Yes | Yes | Yes |
| Tool annotations | Yes | Yes | Yes |
| Structured content | Partial | Yes | Yes |
| Sampling (LLM calls) | Capability-dependent | Capability-dependent | Yes |
| Elicitation | No | Capability-dependent | Yes |
| Roots | No | Yes | Yes |
| Logging | Yes | Yes | Yes |

---

## Claude Desktop

**Best for:** Local integrations, personal productivity tools

### Supported
- stdio transport (subprocess model)
- Tools with input validation
- Basic resources
- Prompts (slash commands)
- Progress notifications
- Logging

### Limitations
- **No HTTP transport** - Must use stdio
- **Limited resource support** - Basic resources work, complex templates may not
- **No elicitation** - Cannot request user input from server
- **No roots** - Cannot access client's workspace context

### Configuration
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/dist/index.js"],
      "env": {
        "API_KEY": "..."
      }
    }
  }
}
```

---

## Claude Code

**Best for:** Developer tools, IDE integrations, full-featured servers

### Supported
- All transports (stdio, Streamable HTTP)
- Full tools support with all annotation types
- Complete resources and resource templates
- Prompts with arguments and completion
- All advanced features (sampling, roots)
- Structured content output

### Notes
- Sampling/elicitation depend on runtime capabilities
- Check `getClientCapabilities()` before using advanced features

### Configuration
In Claude Code settings or via MCP configuration file.

---

## MCP Inspector

**Best for:** Development, testing, debugging

### Supported
- All transports
- All primitives
- All advanced features
- Real-time message inspection
- Tool testing interface

### Usage
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

### Features
- List and call tools interactively
- Browse and read resources
- Test prompts with arguments
- View server logs
- Inspect protocol messages

---

## Capability-Dependent Features

Some features require checking client capabilities at runtime:

### Sampling (Server-initiated LLM calls)

```typescript
server.server.oninitialized = async () => {
  const caps = server.server.getClientCapabilities();

  if (caps?.sampling) {
    // Safe to use sampling
    registerSamplingDependentTools(server);
  }
};
```

### Elicitation (Request user input)

```typescript
if (caps?.elicitation) {
  // Can request user input from server
}
```

### Roots (Access workspace context)

```typescript
if (caps?.roots?.listChanged) {
  // Can access client's workspace roots
  await syncRoots(server);
}
```

---

## Transport Selection Guide

### Use stdio when:
- Building for Claude Desktop
- Creating CLI tools
- Local-only integrations
- Subprocess model makes sense

### Use Streamable HTTP when:
- Building remote services
- Need multi-client support
- Web deployment required
- Building for Claude Code primarily

### Example: Dual Transport Support

```typescript
const transport = process.env.TRANSPORT || 'stdio';

if (transport === 'http') {
  // Streamable HTTP for remote
  const app = express();
  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({...});
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  app.listen(3000);
} else {
  // stdio for local
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

---

## Feature Degradation Strategies

When targeting multiple clients with different capabilities:

### 1. Graceful Degradation

```typescript
async function handleOperation(server: McpServer) {
  const caps = server.server.getClientCapabilities();

  if (caps?.sampling) {
    // Full functionality with LLM assistance
    return await fullOperation();
  } else {
    // Fallback without sampling
    return await basicOperation();
  }
}
```

### 2. Conditional Tool Registration

```typescript
server.server.oninitialized = async () => {
  const caps = server.server.getClientCapabilities();

  // Always register basic tools
  registerBasicTools(server);

  // Conditionally register advanced tools
  if (caps?.sampling) {
    registerSamplingTools(server);
  }

  if (caps?.roots) {
    registerRootsTools(server);
  }
};
```

### 3. Clear Documentation

Document in your tool descriptions which features may not work on all clients:

```typescript
description: `Analyze code with AI assistance.

Note: Full analysis requires a client that supports sampling.
On clients without sampling, returns basic static analysis only.`
```

---

## Common Compatibility Issues

### Issue: Resources not showing in Claude Desktop
**Solution:** Keep resources simple. Use basic URIs without complex templates.

### Issue: HTTP transport not connecting
**Solution:** Check if client supports HTTP. Claude Desktop only supports stdio.

### Issue: Sampling calls failing
**Solution:** Check `getClientCapabilities().sampling` before using. Provide fallback.

### Issue: Progress notifications not appearing
**Solution:** Most clients support this, but verify with Inspector first.

---

## Testing Checklist

Before deploying, test your server with:

- [ ] MCP Inspector (comprehensive feature testing)
- [ ] Claude Desktop (if targeting local use)
- [ ] Claude Code (if targeting developers)

For each client, verify:
- [ ] Tools list correctly
- [ ] Tool calls succeed
- [ ] Resources accessible (if used)
- [ ] Prompts work (if used)
- [ ] Error handling is graceful
- [ ] Fallbacks work when features unavailable
