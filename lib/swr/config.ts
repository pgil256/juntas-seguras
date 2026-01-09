/**
 * SWR Configuration and Utilities
 *
 * Provides standardized data fetching with:
 * - Request deduplication
 * - Automatic caching
 * - Background revalidation
 * - Optimistic updates support
 */

import { SWRConfiguration } from 'swr';

/**
 * Standard fetcher for SWR
 * Handles JSON responses and error formatting
 */
export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred while fetching data';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Response wasn't JSON, use default message
    }

    const error = new Error(errorMessage) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Fetcher with POST method for mutations
 */
export async function postFetcher<T, D = unknown>(
  url: string,
  data: D
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch {
      // Response wasn't JSON
    }

    const error = new Error(errorMessage) as Error & { status: number };
    error.status = response.status;
    throw error;
  }

  return response.json();
}

/**
 * Default SWR configuration
 *
 * These settings provide a good balance between freshness and performance:
 * - Revalidate when window regains focus (user comes back to tab)
 * - Revalidate when network reconnects
 * - Don't retry on error (let component handle)
 * - Dedupe requests within 2 seconds
 */
export const defaultSWRConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  shouldRetryOnError: false,
  dedupingInterval: 2000,
  errorRetryCount: 0,
};

/**
 * SWR configuration for data that changes infrequently
 * Good for user profiles, settings, etc.
 */
export const stableDataConfig: SWRConfiguration = {
  ...defaultSWRConfig,
  revalidateOnFocus: false,
  revalidateIfStale: false,
  dedupingInterval: 60000, // 1 minute
};

/**
 * SWR configuration for frequently changing data
 * Good for real-time features like messages, notifications
 */
export const realtimeDataConfig: SWRConfiguration = {
  ...defaultSWRConfig,
  refreshInterval: 30000, // Refresh every 30 seconds
  dedupingInterval: 1000,
};

/**
 * Helper to create a conditional SWR key
 * Returns null if condition is false (prevents fetch)
 */
export function conditionalKey(
  condition: boolean,
  key: string | null
): string | null {
  return condition ? key : null;
}
