import { describe, expect, it } from "vitest";

import {
  createJsonResponse,
  jsonError,
  isAllowedOrigin,
  validateRequestBodySize,
} from './http';

describe('http utils', () => {
  it('creates a JSON response with the provided body and status', async () => {
    const response = createJsonResponse({ ok: true }, 201);
    expect(response.status).toBe(201);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('creates a JSON error response with default status', async () => {
    const response = jsonError('nope');
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    await expect(response.json()).resolves.toEqual({ error: 'nope' });
  });

  it('supports custom error statuses', async () => {
    const response = jsonError('forbidden', 403);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'forbidden' });
  });

  it('includes security headers in responses', () => {
    const response = createJsonResponse({ ok: true });
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('includes security headers in error responses', () => {
    const response = jsonError('error');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });
});

describe('isAllowedOrigin', () => {
  it('returns false for null origin', () => {
    expect(isAllowedOrigin(null)).toBe(false);
  });

  it('returns true for production origin', () => {
    expect(isAllowedOrigin('https://sprintjam.co.uk')).toBe(true);
  });

  it('returns true for staging origin', () => {
    expect(isAllowedOrigin('https://staging.sprintjam.co.uk')).toBe(true);
  });

  it('returns false for unknown origin in production mode', () => {
    expect(isAllowedOrigin('https://evil.com')).toBe(false);
  });

  it('returns false for localhost in production mode', () => {
    expect(isAllowedOrigin('http://localhost:3000')).toBe(false);
  });

  it('returns true for localhost in development mode', () => {
    expect(isAllowedOrigin('http://localhost:3000', true)).toBe(true);
  });

  it('returns true for localhost without port in development mode', () => {
    expect(isAllowedOrigin('http://localhost', true)).toBe(true);
  });

  it('returns true for 127.0.0.1 in development mode', () => {
    expect(isAllowedOrigin('http://127.0.0.1:5173', true)).toBe(true);
  });

  it('returns false for unknown origin even in development mode', () => {
    expect(isAllowedOrigin('https://evil.com', true)).toBe(false);
  });
});

describe('validateRequestBodySize', () => {
  const createMockRequest = (contentLength: string | null) =>
    ({
      headers: {
        get: (name: string) =>
          name === 'Content-Length' ? contentLength : null,
      },
    }) as Request;

  it('returns ok for requests within size limit', () => {
    const request = createMockRequest('1000');
    const result = validateRequestBodySize(request);
    expect(result.ok).toBe(true);
  });

  it('returns ok for requests with no Content-Length header', () => {
    const request = createMockRequest(null);
    const result = validateRequestBodySize(request);
    expect(result.ok).toBe(true);
  });

  it('returns error for requests exceeding default size limit', () => {
    const request = createMockRequest('200000');
    const result = validateRequestBodySize(request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(413);
    }
  });

  it('returns error for requests exceeding custom size limit', () => {
    const request = createMockRequest('2000');
    const result = validateRequestBodySize(request, 1000);
    expect(result.ok).toBe(false);
  });

  it('returns ok for requests at exactly the size limit', () => {
    const request = createMockRequest('1000');
    const result = validateRequestBodySize(request, 1000);
    expect(result.ok).toBe(true);
  });
});
