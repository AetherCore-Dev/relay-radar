import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectFormat,
  buildApiUrl,
  buildHeaders,
  parseResponse,
  validateUrl,
  sanitize,
} from '../src/shared/http-client.mjs';

// ─── detectFormat ────────────────────────────────────────────────────────────

describe('detectFormat', () => {
  it('returns anthropic for explicit format', () => {
    assert.equal(detectFormat({ baseUrl: 'https://x.com', format: 'anthropic' }), 'anthropic');
  });

  it('returns openai for explicit format', () => {
    assert.equal(detectFormat({ baseUrl: 'https://x.com', format: 'openai' }), 'openai');
  });

  it('detects anthropic from /v1/messages URL', () => {
    assert.equal(detectFormat({ baseUrl: 'https://api.anthropic.com/v1/messages' }), 'anthropic');
  });

  it('detects openai from /v1/chat/completions URL', () => {
    assert.equal(detectFormat({ baseUrl: 'https://relay.com/v1/chat/completions' }), 'openai');
  });

  it('detects openai from bare /v1 URL', () => {
    assert.equal(detectFormat({ baseUrl: 'https://relay.com/v1' }), 'openai');
  });

  it('defaults to anthropic for unknown URLs', () => {
    assert.equal(detectFormat({ baseUrl: 'https://relay.com/api' }), 'anthropic');
  });

  it('handles /v1/messages correctly — NOT confused as OpenAI', () => {
    // This was the CRITICAL bug: /v1/messages contains /v1/ but is Anthropic
    assert.equal(detectFormat({ baseUrl: 'https://api.anthropic.com/v1/messages' }), 'anthropic');
    assert.equal(detectFormat({ baseUrl: 'https://relay.com/v1/messages' }), 'anthropic');
  });
});

// ─── buildApiUrl ─────────────────────────────────────────────────────────────

describe('buildApiUrl', () => {
  it('appends /v1/messages for anthropic format', () => {
    const url = buildApiUrl('https://relay.com', 'anthropic');
    assert.equal(url, 'https://relay.com/v1/messages');
  });

  it('preserves existing /v1/messages path', () => {
    const url = buildApiUrl('https://relay.com/v1/messages', 'anthropic');
    assert.equal(url, 'https://relay.com/v1/messages');
  });

  it('appends /v1/chat/completions for openai format with /v1', () => {
    const url = buildApiUrl('https://relay.com/v1', 'openai');
    assert.equal(url, 'https://relay.com/v1/chat/completions');
  });

  it('preserves existing /v1/chat/completions path', () => {
    const url = buildApiUrl('https://relay.com/v1/chat/completions', 'openai');
    assert.equal(url, 'https://relay.com/v1/chat/completions');
  });

  it('handles URLs with ports correctly', () => {
    const url = buildApiUrl('https://relay.com:8080/v1', 'openai');
    assert.ok(url.includes(':8080'));
    assert.ok(url.includes('/v1/chat/completions'));
  });

  it('does NOT break https:// protocol', () => {
    // This was a CRITICAL bug: regex replacing // would break https://
    const url = buildApiUrl('https://relay.com', 'anthropic');
    assert.ok(url.startsWith('https://'), `URL should start with https://, got: ${url}`);
  });
});

// ─── buildHeaders ────────────────────────────────────────────────────────────

describe('buildHeaders', () => {
  it('builds anthropic headers with x-api-key', () => {
    const h = buildHeaders({ apiKey: 'sk-test' }, 'anthropic');
    assert.equal(h['x-api-key'], 'sk-test');
    assert.equal(h['anthropic-version'], '2023-06-01');
    assert.equal(h['Authorization'], undefined);
  });

  it('builds openai headers with Authorization Bearer', () => {
    const h = buildHeaders({ apiKey: 'sk-test' }, 'openai');
    assert.equal(h['Authorization'], 'Bearer sk-test');
    assert.equal(h['x-api-key'], undefined);
  });

  it('filters forbidden custom headers', () => {
    const h = buildHeaders({
      apiKey: 'sk-test',
      headers: {
        'x-custom': 'ok',
        'Host': 'evil.com',          // forbidden
        'Authorization': 'hacked',   // forbidden
        'x-api-key': 'override',     // forbidden
      },
    }, 'anthropic');

    assert.equal(h['x-custom'], 'ok');
    assert.equal(h['Host'], undefined);
    assert.equal(h['x-api-key'], 'sk-test');  // original, not overridden
  });

  it('strips headers with CRLF injection', () => {
    const h = buildHeaders({
      apiKey: 'sk-test',
      headers: { 'x-bad': 'value\r\nInjected: true' },
    }, 'anthropic');
    assert.equal(h['x-bad'], undefined);
  });
});

// ─── parseResponse ───────────────────────────────────────────────────────────

describe('parseResponse', () => {
  it('parses anthropic format', () => {
    const data = {
      content: [{ text: 'Hello' }],
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_read_input_tokens: 3,
        cache_creation_input_tokens: 2,
      },
    };
    const parsed = parseResponse(data, 'anthropic');
    assert.equal(parsed.text, 'Hello');
    assert.equal(parsed.usage.inputTokens, 10);
    assert.equal(parsed.usage.outputTokens, 5);
    assert.equal(parsed.usage.cacheRead, 3);
    assert.equal(parsed.usage.cacheWrite, 2);
  });

  it('parses openai format', () => {
    const data = {
      choices: [{ message: { content: 'Hi' } }],
      usage: { prompt_tokens: 8, completion_tokens: 3 },
    };
    const parsed = parseResponse(data, 'openai');
    assert.equal(parsed.text, 'Hi');
    assert.equal(parsed.usage.inputTokens, 8);
    assert.equal(parsed.usage.outputTokens, 3);
  });

  it('handles missing fields gracefully', () => {
    const parsed = parseResponse({}, 'anthropic');
    assert.equal(parsed.text, '');
    assert.equal(parsed.usage.inputTokens, 0);
  });
});

// ─── validateUrl ─────────────────────────────────────────────────────────────

describe('validateUrl', () => {
  it('accepts valid HTTPS URLs', () => {
    assert.doesNotThrow(() => validateUrl('https://api.relay.com'));
    assert.doesNotThrow(() => validateUrl('https://relay.com:8080/v1'));
  });

  it('rejects HTTP URLs', () => {
    assert.throws(
      () => validateUrl('http://api.relay.com'),
      /must use HTTPS/
    );
  });

  it('rejects private IPs — SSRF protection', () => {
    assert.throws(() => validateUrl('https://127.0.0.1'), /private/);
    assert.throws(() => validateUrl('https://10.0.0.1'), /private/);
    assert.throws(() => validateUrl('https://192.168.1.1'), /private/);
    assert.throws(() => validateUrl('https://169.254.169.254'), /private/); // AWS metadata
    assert.throws(() => validateUrl('https://localhost'), /private/);
  });

  it('rejects invalid URLs', () => {
    assert.throws(() => validateUrl('not-a-url'), /Invalid/);
  });

  it('accepts valid public IPs', () => {
    assert.doesNotThrow(() => validateUrl('https://8.8.8.8'));
    assert.doesNotThrow(() => validateUrl('https://api.anthropic.com'));
  });
});

// ─── sanitize ────────────────────────────────────────────────────────────────

describe('sanitize', () => {
  it('strips ANSI escape sequences', () => {
    const input = '\x1b[31mRed text\x1b[0m';
    const output = sanitize(input);
    assert.equal(output, 'Red text');
  });

  it('strips control characters', () => {
    const input = 'hello\x00\x01\x02world';
    assert.equal(sanitize(input), 'helloworld');
  });

  it('truncates long strings', () => {
    const input = 'a'.repeat(1000);
    assert.equal(sanitize(input).length, 500);
  });

  it('handles non-string input', () => {
    assert.equal(sanitize(null), '');
    assert.equal(sanitize(undefined), '');
    assert.equal(sanitize(42), '');
  });
});
