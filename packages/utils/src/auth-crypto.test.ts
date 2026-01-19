import { describe, expect, it } from 'vitest';

import {
  generateToken,
  generateVerificationCode,
  hashToken,
  extractDomain,
} from './auth-crypto';

describe('generateToken', () => {
  it('generates a token', async () => {
    const token = await generateToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('generates unique tokens', async () => {
    const token1 = await generateToken();
    const token2 = await generateToken();
    expect(token1).not.toBe(token2);
  });
});

describe('generateVerificationCode', () => {
  it('generates a 6-digit code', () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('pads codes with leading zeros', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateVerificationCode();
      expect(code.length).toBe(6);
    }
  });
});

describe('hashToken', () => {
  it('hashes a token to a hex string', async () => {
    const hash = await hashToken('test-token');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces consistent hashes', async () => {
    const hash1 = await hashToken('same-token');
    const hash2 = await hashToken('same-token');
    expect(hash1).toBe(hash2);
  });

  it('produces different hashes for different inputs', async () => {
    const hash1 = await hashToken('token-1');
    const hash2 = await hashToken('token-2');
    expect(hash1).not.toBe(hash2);
  });
});

describe('extractDomain', () => {
  it('extracts domain from email', () => {
    expect(extractDomain('user@example.com')).toBe('example.com');
  });

  it('lowercases the domain', () => {
    expect(extractDomain('user@EXAMPLE.COM')).toBe('example.com');
  });

  it('throws for invalid email format', () => {
    expect(() => extractDomain('invalid')).toThrow('Invalid email format');
  });

  it('throws for email with multiple @ symbols', () => {
    expect(() => extractDomain('user@foo@bar.com')).toThrow(
      'Invalid email format',
    );
  });
});
