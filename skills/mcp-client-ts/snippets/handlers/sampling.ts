/**
 * Sampling Capability - Handle server-initiated LLM requests
 *
 * Copy this file to add sampling support to any MCP client.
 *
 * Usage:
 *   import { Client } from '@modelcontextprotocol/sdk/client/index.js';
 *   import { setupSampling } from './sampling.js';
 *
 *   const client = new Client(
 *     { name: 'my-client', version: '1.0.0' },
 *     { capabilities: { sampling: {} } }
 *   );
 *
 *   setupSampling(client, { apiKey: 'your-key' });
 *   await client.connect(transport);
 *
 * Note: After connecting, check client.getInstructions() for server-provided
 * guidance on how to use tools effectively.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { CreateMessageRequestSchema, type CreateMessageResult, type SamplingMessage } from '@modelcontextprotocol/sdk/types.js';

export interface SamplingConfig {
  /** Anthropic API key (defaults to ANTHROPIC_API_KEY env var) */
  apiKey?: string;
  /** Model to use (default: claude-sonnet-4-20250514) */
  model?: string;
  /** Max tokens if not specified in request (default: 1024) */
  defaultMaxTokens?: number;
}

/**
 * Set up sampling capability on a client.
 */
export function setupSampling(client: Client, config: SamplingConfig = {}): void {
  const apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.warn('[Sampling] No API key - using mock handler');
    client.setRequestHandler(CreateMessageRequestSchema, mockHandler);
    return;
  }

  const anthropic = new Anthropic({ apiKey });
  const model = config.model ?? 'claude-sonnet-4-20250514';
  const defaultMaxTokens = config.defaultMaxTokens ?? 1024;

  client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
    const { params } = request;

    const messages = params.messages.map((msg: SamplingMessage) => ({
      role: msg.role as 'user' | 'assistant',
      content: formatContent(msg.content),
    }));

    const response = await anthropic.messages.create({
      model,
      max_tokens: params.maxTokens ?? defaultMaxTokens,
      messages,
      system: params.systemPrompt,
      temperature: params.temperature,
      stop_sequences: params.stopSequences,
    });

    const textContent = response.content.find(c => c.type === 'text');

    return {
      role: 'assistant',
      content: { type: 'text', text: textContent?.type === 'text' ? textContent.text : '' },
      model: response.model,
      stopReason: response.stop_reason ?? undefined,
    } satisfies CreateMessageResult;
  });
}

function formatContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (typeof content === 'object' && content !== null) {
    if ('type' in content && content.type === 'text' && 'text' in content) {
      return content.text as string;
    }
    if (Array.isArray(content)) {
      return content.filter(c => c.type === 'text').map(c => c.text).join('\n');
    }
  }
  return String(content);
}

async function mockHandler(): Promise<CreateMessageResult> {
  return {
    role: 'assistant',
    content: { type: 'text', text: '[Mock response - set ANTHROPIC_API_KEY]' },
    model: 'mock',
    stopReason: 'end_turn',
  };
}
