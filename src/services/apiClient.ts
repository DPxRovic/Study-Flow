/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const TOKEN_KEY = 'studyflow_token';

// In-memory token fallback for non-browser/test runtimes
let memoryToken: string | null = null;

// Configurable base URL with robust runtime detection
let activeBaseUrl = (() => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
      return (import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, '');
    }
  } catch {
    // Ignore
  }
  if (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) {
    return process.env.VITE_API_BASE_URL.replace(/\/+$/, '');
  }
  return '/api';
})();

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type UnauthorizedHandler = () => void;
const unauthorizedHandlers: Set<UnauthorizedHandler> = new Set();

export const apiClient = {
  getBaseUrl(): string {
    return activeBaseUrl;
  },

  setBaseUrl(url: string): void {
    activeBaseUrl = url.replace(/\/+$/, '');
  },

  getToken(): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(TOKEN_KEY);
      }
    } catch {
      // Fallback to memory
    }
    return memoryToken;
  },

  setToken(token: string): void {
    memoryToken = token;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  },

  clearToken(): void {
    memoryToken = null;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Ignore
    }
  },

  onUnauthorized(handler: UnauthorizedHandler): () => void {
    unauthorizedHandlers.add(handler);
    return () => {
      unauthorizedHandlers.delete(handler);
    };
  },

  notifyUnauthorized(): void {
    this.clearToken();
    unauthorizedHandlers.forEach((handler) => {
      try {
        handler();
      } catch (err) {
        console.error('Error in unauthorized handler:', err);
      }
    });
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${activeBaseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    const token = this.getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkError: any) {
      throw new ApiClientError(
        networkError?.message || 'Network connection failed. Please verify your connection to the server.',
        0
      );
    }

    let responseData: any = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else {
      const text = await response.text().catch(() => '');
      const isHtml =
        contentType.includes('text/html') ||
        text.trim().startsWith('<') ||
        /<[a-z][\s\S]*>/i.test(text);

      if (isHtml) {
        // If the server, proxy, or warmup gateway returned an HTML document instead of JSON
        responseData = {
          message:
            'The application server is warming up or temporarily unreachable. Please retry in a few moments.',
          isHtmlDocument: true,
        };
      } else {
        responseData = text ? { message: text } : null;
      }
    }

    // If an API endpoint returns an HTML document (e.g. AI Studio warmup page or Vite SPA index.html),
    // treat it as an unready server state so callers do not misinterpret HTML as a successful API response
    if (responseData?.isHtmlDocument) {
      throw new ApiClientError(
        'The application server is warming up or temporarily unreachable. Please retry in a few moments.',
        response.status >= 400 ? response.status : 503,
        responseData
      );
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Clear token on 401 to prevent stale authentication loops
        this.notifyUnauthorized();
      }

      let rawErrorMessage =
        responseData?.message ||
        responseData?.error?.message ||
        (typeof responseData?.error === 'string' ? responseData.error : null) ||
        `Request failed with status ${response.status} (${response.statusText})`;

      // Strictly sanitize error message so raw HTML strings or doc tags never leak into UI
      let cleanErrorMessage = typeof rawErrorMessage === 'string' ? rawErrorMessage : String(rawErrorMessage);
      if (cleanErrorMessage.trim().startsWith('<') || /<[a-z][\s\S]*>/i.test(cleanErrorMessage)) {
        cleanErrorMessage =
          'The application server is warming up or temporarily unreachable. Please retry in a few moments.';
      }

      throw new ApiClientError(cleanErrorMessage, response.status, responseData);
    }

    return responseData as T;
  },

  get<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  },

  post<T>(endpoint: string, body?: any, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    });
  },

  patch<T>(endpoint: string, body?: any, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    });
  },

  delete<T>(endpoint: string, headers?: HeadersInit): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  },
};
