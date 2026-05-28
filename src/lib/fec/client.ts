import "server-only";

import { z } from "zod";

const FEC_BASE_URL = "https://api.open.fec.gov/v1";
const CACHE_TTL_MS = 60 * 60 * 1000;

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

const localCache = new Map<string, CacheEntry>();

export class FecApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "FecApiError";
  }
}

function getApiKey(): string {
  const apiKey = process.env.FEC_API_KEY;

  if (!apiKey) {
    throw new FecApiError(
      "FEC_API_KEY is not configured. Add it to .env.local before retrieving FEC data.",
    );
  }

  return apiKey;
}

export async function fecGet<T>(
  path: string,
  params: Record<
    string,
    string | number | boolean | readonly string[] | readonly number[] | undefined
  >,
  schema: z.ZodType<T>,
): Promise<T> {
  const publicParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== "") {
          publicParams.append(key, String(item));
        }
      }
    } else if (value !== undefined && value !== "") {
      publicParams.set(key, String(value));
    }
  }

  const cacheKey = `${path}?${publicParams.toString()}`;
  const cached = localCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const response = await fetch(`${FEC_BASE_URL}${path}?${publicParams}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "X-Api-Key": getApiKey(),
    },
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new FecApiError(
        "The FEC API rate limit was reached. Wait before refreshing this analysis.",
        response.status,
      );
    }

    throw new FecApiError(
      `The FEC API request failed with status ${response.status}.`,
      response.status,
    );
  }

  const parsed = schema.safeParse(await response.json());

  if (!parsed.success) {
    throw new FecApiError("The FEC API returned an unexpected response shape.");
  }

  localCache.set(cacheKey, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: parsed.data,
  });

  return parsed.data;
}
