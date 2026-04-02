import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractFeatures, FEATURE_NAMES, FEATURE_COUNT } from '../src/verifier/behavioral/features.mjs';
import { BehavioralVerifier } from '../src/verifier/behavioral/monitor.mjs';
import { MODEL_PROFILES } from '../src/verifier/behavioral/profiles.mjs';

// ─── Feature Extraction ──────────────────────────────────────────────────────

describe('extractFeatures', () => {
  it('returns 15-element array', () => {
    const f = extractFeatures('Hello world');
    assert.equal(f.length, 15);
  });

  it('all values between 0 and 1', () => {
    const text = '## Title\n\nHere is some code:\n\n```js\nconst x = 1;\n```\n\nPerhaps this might work. However, I think it definitely will.';
    const f = extractFeatures(text);
    for (let i = 0; i < f.length; i++) {
      assert.ok(f[i] >= 0 && f[i] <= 1, `feature[${i}] (${FEATURE_NAMES[i]}) = ${f[i]} out of [0,1]`);
    }
  });

  it('handles empty string', () => {
    const f = extractFeatures('');
    assert.equal(f.length, 15);
    assert.ok(f.every(v => v === 0));
  });

  it('handles null/undefined', () => {
    assert.equal(extractFeatures(null).length, 15);
    assert.equal(extractFeatures(undefined).length, 15);
  });

  it('detects code blocks', () => {
    const withCode = extractFeatures('Here:\n```js\nconst x = 1;\n```');
    const withoutCode = extractFeatures('Here is some text with no code at all.');
    assert.ok(withCode[2] > withoutCode[2], 'code block density should be higher');
  });

  it('detects hedging language', () => {
    const hedgy = extractFeatures('Perhaps this might work. It seems like it could possibly be correct.');
    const direct = extractFeatures('This works. It is correct. Use this function.');
    assert.ok(hedgy[9] > direct[9], 'hedging rate should be higher');
  });

  it('detects longer responses', () => {
    const short = extractFeatures('Yes.');
    const long = extractFeatures('This is a much longer response that contains many words and sentences. '.repeat(10));
    assert.ok(long[0] > short[0], 'responseLength should be higher for longer text');
  });

  it('feature names match feature count', () => {
    assert.equal(FEATURE_NAMES.length, FEATURE_COUNT);
    assert.equal(FEATURE_COUNT, 15);
  });
});

// ─── Model Profiles ──────────────────────────────────────────────────────────

describe('MODEL_PROFILES', () => {
  it('has profiles for all expected models', () => {
    assert.ok(MODEL_PROFILES['claude-opus']);
    assert.ok(MODEL_PROFILES['claude-sonnet']);
    assert.ok(MODEL_PROFILES['claude-haiku']);
    assert.ok(MODEL_PROFILES['gpt-4o']);
    assert.ok(MODEL_PROFILES['domestic']);
  });

  it('each profile has mean and std of correct length', () => {
    for (const [key, profile] of Object.entries(MODEL_PROFILES)) {
      assert.equal(profile.mean.length, 15, `${key} mean length`);
      assert.equal(profile.std.length, 15, `${key} std length`);
      for (let i = 0; i < 15; i++) {
        assert.ok(profile.mean[i] >= 0 && profile.mean[i] <= 1, `${key} mean[${i}]`);
        assert.ok(profile.std[i] >= 0, `${key} std[${i}]`);
      }
    }
  });

  it('Opus and Haiku have meaningfully different profiles', () => {
    const opus = MODEL_PROFILES['claude-opus'].mean;
    const haiku = MODEL_PROFILES['claude-haiku'].mean;
    let diff = 0;
    for (let i = 0; i < 15; i++) diff += Math.abs(opus[i] - haiku[i]);
    assert.ok(diff > 1.0, `profile difference ${diff} should be > 1.0`);
  });
});

// ─── Behavioral Verifier ─────────────────────────────────────────────────────

describe('BehavioralVerifier', () => {
  it('starts in collecting state', () => {
    const v = BehavioralVerifier({ claimedModel: 'claude-opus-4' });
    const s = v.getStatus();
    assert.equal(s.status, 'collecting');
    assert.equal(s.verdict, 'pending');
    assert.equal(v.count, 0);
  });

  it('transitions to active after 5 responses', () => {
    const v = BehavioralVerifier({ claimedModel: 'claude-opus-4' });
    for (let i = 0; i < 5; i++) {
      v.update('Here is a detailed response with some explanation. Perhaps this approach might work well for your use case. However, there are alternative strategies to consider.');
    }
    assert.equal(v.count, 5);
    const s = v.getStatus();
    assert.equal(s.status, 'active');
    assert.ok(s.verdict !== 'pending');
  });

  it('recognizes Opus-like responses as matching Opus claim', () => {
    const v = BehavioralVerifier({ claimedModel: 'claude-opus-4' });
    // Feed Opus-like responses: verbose, hedging, markdown-rich
    for (let i = 0; i < 20; i++) {
      v.update(
        `## Analysis\n\nHere is my detailed analysis of the problem. ` +
        `Perhaps it's worth noting that there are several approaches. ` +
        `However, I'd suggest the following strategy:\n\n` +
        `### Step 1\nFirst, we need to consider...\n\n` +
        `### Step 2\nAdditionally, it's important to...\n\n` +
        `\`\`\`typescript\n// Implementation\nconst result = compute(input);\n\`\`\`\n\n` +
        `This approach might be most effective because it balances performance and readability. ` +
        `I'll explain the reasoning in more detail.\n\n` +
        `Note: There are edge cases to consider. Specifically, when the input is null...`
      );
    }
    const s = v.getStatus();
    assert.ok(s.distanceToClaimed < 5, `distance to opus should be reasonable, got ${s.distanceToClaimed}`);
  });

  it('detects non-Claude responses against Opus claim', () => {
    const v = BehavioralVerifier({ claimedModel: 'claude-opus-4' });
    // Feed very short, non-hedging, non-markdown responses (domestic model style)
    for (let i = 0; i < 30; i++) {
      v.update('OK. Here is code:\nconst x = 1;\nreturn x;');
    }
    const s = v.getStatus();
    // Should NOT match Opus closely
    assert.ok(s.bestMatch !== 'claude-opus' || s.distanceToClaimed > 1,
      `should detect mismatch: bestMatch=${s.bestMatch}, distance=${s.distanceToClaimed}`);
  });

  it('reset clears all state', () => {
    const v = BehavioralVerifier({ claimedModel: 'claude-sonnet-4' });
    v.update('Some text.');
    v.update('More text.');
    assert.equal(v.count, 2);
    v.reset();
    assert.equal(v.count, 0);
    assert.equal(v.hasAlert, false);
  });

  it('getProfile returns feature statistics', () => {
    const v = BehavioralVerifier({ claimedModel: 'claude-opus-4' });
    v.update('Hello world. This is a test response.');
    const p = v.getProfile();
    assert.equal(p.n, 1);
    assert.equal(p.mean.length, 15);
    assert.equal(p.featureNames.length, 15);
  });

  it('handles model name resolution', () => {
    // Should not throw for any of these
    assert.doesNotThrow(() => BehavioralVerifier({ claimedModel: 'claude-opus-4' }));
    assert.doesNotThrow(() => BehavioralVerifier({ claimedModel: 'claude-sonnet-4' }));
    assert.doesNotThrow(() => BehavioralVerifier({ claimedModel: 'claude-haiku-3.5' }));
    assert.doesNotThrow(() => BehavioralVerifier({ claimedModel: 'gpt-4o' }));
  });
});
