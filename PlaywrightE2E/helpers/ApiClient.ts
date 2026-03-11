/**
 * @file ApiClient.ts
 * @purpose Generic HTTP client wrapping Playwright's APIRequestContext.
 *          Returns typed ApiResult<T> discriminated unions — callers never work with raw responses.
 * @pattern Dependency Inversion Principle — depends on abstraction (APIRequestContext interface),
 *          not a concrete HTTP library.
 */

import { type APIRequestContext, type APIResponse } from '@playwright/test';
import { type ApiResult } from '../data/types';

/**
 * SOLID principles satisfied:
 *
 * DIP — Dependency Inversion Principle:
 *   ApiClient depends on Playwright's `APIRequestContext` interface (an abstraction),
 *   not on any concrete HTTP library (e.g. axios, node-fetch). Swapping the underlying
 *   transport does not require changes to this class — only the injected context changes.
 *
 * SRP — Single Responsibility Principle:
 *   ApiClient is responsible for exactly one concern: HTTP communication and response parsing.
 *   It does not contain business logic, authentication flows, or test data construction.
 */
export class ApiClient {
  constructor(
    private readonly request: APIRequestContext,
    private readonly baseURL: string,
  ) {}

  /**
   * Sends an HTTP GET request and returns a typed `ApiResult<T>`.
   *
   * @param path    - Relative path appended to `baseURL` (e.g. `'/booking/1'`).
   * @param headers - Optional request headers to merge in.
   * @returns       Discriminated union: `{ ok: true; data: T }` or `{ ok: false; status; error }`.
   */
  async get<T>(path: string, headers?: Record<string, string>): Promise<ApiResult<T>> {
    const response = await this.request.get(`${this.baseURL}${path}`, {
      ...(headers !== undefined ? { headers } : {}),
    });
    return this.parseResponse<T>(response);
  }

  /**
   * Sends an HTTP POST request with a JSON body and returns a typed `ApiResult<T>`.
   *
   * @param path    - Relative path appended to `baseURL` (e.g. `'/booking'`).
   * @param body    - Request payload — serialised as JSON.
   * @param headers - Optional request headers to merge in.
   * @returns       Discriminated union: `{ ok: true; data: T }` or `{ ok: false; status; error }`.
   */
  async post<T>(
    path: string,
    body: unknown,
    headers?: Record<string, string>,
  ): Promise<ApiResult<T>> {
    const response = await this.request.post(`${this.baseURL}${path}`, {
      data: body,
      ...(headers !== undefined ? { headers } : {}),
    });
    return this.parseResponse<T>(response);
  }

  /**
   * Sends an HTTP PUT request with a JSON body and returns a typed `ApiResult<T>`.
   *
   * @param path    - Relative path appended to `baseURL`.
   * @param body    - Request payload — serialised as JSON.
   * @param headers - Optional request headers to merge in.
   * @returns       Discriminated union: `{ ok: true; data: T }` or `{ ok: false; status; error }`.
   */
  async put<T>(
    path: string,
    body: unknown,
    headers?: Record<string, string>,
  ): Promise<ApiResult<T>> {
    const response = await this.request.put(`${this.baseURL}${path}`, {
      data: body,
      ...(headers !== undefined ? { headers } : {}),
    });
    return this.parseResponse<T>(response);
  }

  /**
   * Sends an HTTP PATCH request with a JSON body and returns a typed `ApiResult<T>`.
   *
   * @param path    - Relative path appended to `baseURL`.
   * @param body    - Request payload — serialised as JSON.
   * @param headers - Optional request headers to merge in.
   * @returns       Discriminated union: `{ ok: true; data: T }` or `{ ok: false; status; error }`.
   */
  async patch<T>(
    path: string,
    body: unknown,
    headers?: Record<string, string>,
  ): Promise<ApiResult<T>> {
    const response = await this.request.patch(`${this.baseURL}${path}`, {
      data: body,
      ...(headers !== undefined ? { headers } : {}),
    });
    return this.parseResponse<T>(response);
  }

  /**
   * Sends an HTTP DELETE request and returns `ApiResult<void>`.
   * DELETE responses typically have no body; this method reflects that with `void`.
   *
   * @param path    - Relative path appended to `baseURL`.
   * @param headers - Optional request headers to merge in.
   * @returns       Discriminated union: `{ ok: true; data: void }` or `{ ok: false; status; error }`.
   */
  async delete(path: string, headers?: Record<string, string>): Promise<ApiResult<void>> {
    const response = await this.request.delete(`${this.baseURL}${path}`, {
      ...(headers !== undefined ? { headers } : {}),
    });

    if (response.ok()) {
      return { ok: true, data: undefined };
    }

    const status = response.status();
    let error = `HTTP ${status}`;

    try {
      const text = await response.text();
      if (text.length > 0) {
        error = text;
      }
    } catch {
      // Body unreadable — use the default status message
    }

    return { ok: false, status, error };
  }

  /**
   * Parses a raw `APIResponse` into a typed `ApiResult<T>`.
   *
   * Strategy:
   * - On 2xx: attempts `response.json()`, asserts as `T` (caller is responsible for
   *   providing the correct generic parameter), and returns `{ ok: true, data }`.
   * - On non-2xx: extracts the response body as text (best-effort) and returns
   *   `{ ok: false, status, error }` — no exception is thrown.
   *
   * @param response - The raw Playwright `APIResponse` to parse.
   */
  private async parseResponse<T>(response: APIResponse): Promise<ApiResult<T>> {
    const status = response.status();

    if (response.ok()) {
      try {
        // json() returns `unknown`; we cast to T after confirming the response is 2xx.
        // The caller owns the contract for T — this is an intentional type assertion boundary.
        const json: unknown = await response.json();
        return { ok: true, data: json as T };
      } catch (parseError: unknown) {
        const message =
          parseError instanceof Error ? parseError.message : 'Failed to parse response JSON';
        return { ok: false, status, error: `JSON parse error: ${message}` };
      }
    }

    // Non-2xx path — extract error text without throwing
    let error = `HTTP ${status}`;
    try {
      const text = await response.text();
      if (text.length > 0) {
        error = text;
      }
    } catch {
      // Body unreadable — retain the default status string
    }

    return { ok: false, status, error };
  }
}
