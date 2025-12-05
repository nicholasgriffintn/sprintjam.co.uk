import { describe, test, expect } from 'vitest';
import { signState, verifyState, escapeHtml } from './room-cypto';

describe('Security Utils', () => {
  const secret = 'test-secret';

  test('signState and verifyState should work correctly', async () => {
    const data = { foo: 'bar' };
    const signed = await signState(data, secret);
    const verified = await verifyState(signed, secret);
    expect(verified).toEqual(data);
  });

  test('verifyState should fail with wrong secret', async () => {
    const data = { foo: 'bar' };
    const signed = await signState(data, secret);
    await expect(verifyState(signed, 'wrong-secret')).rejects.toThrow(
      'Invalid state'
    );
  });

  test('verifyState should fail with tampered data', async () => {
    const data = { foo: 'bar' };
    const signed = await signState(data, secret);
    const decoded = JSON.parse(atob(signed));
    decoded.data.foo = 'baz';
    const tampered = btoa(JSON.stringify(decoded));
    await expect(verifyState(tampered, secret)).rejects.toThrow(
      'Invalid state'
    );
  });

  test('escapeHtml should escape special characters', () => {
    const input = '<script>alert("xss")</script>';
    const expected = '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
    expect(escapeHtml(input)).toBe(expected);
  });
});
