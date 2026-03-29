/**
 * Transcodes backend HTTP client.
 * Sends the organization API key as `X-API-Key` (not Bearer).
 * Returns all responses (including 4xx/5xx) as a JSON string so the AI can inspect them.
 */
import axios, { type Method } from 'axios';
import type { ProxyConfig } from './config.ts';

/** Abort requests that take longer than this (milliseconds) */
const REQUEST_TIMEOUT_MS = 30_000;

export type RequestInput = {
  method: Method;
  /** Path after `/v1`, e.g. `/auth/roles` */
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
};

export async function request(
  config: ProxyConfig,
  input: RequestInput,
): Promise<string> {
  const path = input.path.startsWith('/') ? input.path : `/${input.path}`;
  const url = `${config.apiBaseV1}${path}`;

  const params: Record<string, unknown> = {};
  if (input.query) {
    for (const [k, v] of Object.entries(input.query)) {
      if (v !== undefined && v !== null && v !== '') {
        params[k] = v;
      }
    }
  }

  try {
    const response = await axios({
      method: input.method,
      url,
      params,
      data: input.method !== 'GET' ? input.body : undefined,
      headers: {
        'X-API-Key': config.apiKey,
        Accept: 'application/json',
      },
      validateStatus: () => true,
      timeout: REQUEST_TIMEOUT_MS,
    });

    return JSON.stringify(
      {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        data: response.data,
      },
      null,
      2,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify(
      {
        ok: false,
        status: 0,
        data: { error: 'Network Request Failed', message: errorMessage },
      },
      null,
      2,
    );
  }
}
