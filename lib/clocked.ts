const BASE = "https://clocked.rezolve.ai/clocked";

export class ClockedError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// One logical request = one idempotency key. A retry after a network failure
// or a 5xx reuses the same key and payload, as the Clocked docs require.
export async function clocked<T>(endpoint: string, payload: unknown): Promise<T> {
  const key = process.env.CLOCKED_API_KEY;
  if (!key) throw new ClockedError("CLOCKED_API_KEY is not set on the server.", 500);

  const idempotencyKey = crypto.randomUUID();
  const body = JSON.stringify(payload);
  let lastError: ClockedError | null = null;

  // 429 is the account's concurrency limit: back off and retry (bounded).
  // 5xx and network failures get one retry. Same key and payload every time.
  let serverRetries = 1;
  for (let attempt = 0; attempt < 8; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, Math.min(500 * 2 ** (attempt - 1), 4000)));
    try {
      const res = await fetch(`${BASE}/${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body,
        signal: AbortSignal.timeout(45_000),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) return data as T;
      lastError = new ClockedError(data.error ?? `Clocked ${endpoint} failed (${res.status})`, res.status);
      if (res.status === 429) continue;
      if (res.status < 500 || serverRetries-- <= 0) break;
    } catch (err) {
      lastError = new ClockedError(`Clocked ${endpoint} did not answer: ${(err as Error).message}`, 504);
      if (serverRetries-- <= 0) break;
    }
  }
  throw lastError ?? new ClockedError(`Clocked ${endpoint} failed`, 500);
}

export type Span = { value: string | null; start?: number; end?: number; confidence?: number };

export type ExtractField = {
  value: string | string[] | null;
  start?: number;
  end?: number;
  confidence?: number;
  items?: Span[];
};

export type ExtractResponse = { fields: Record<string, ExtractField> };

export type GroundingClaim = {
  claim: string;
  kind: string;
  counted: boolean;
  weight: number;
  supported: number;
  contradicted: number;
  not_stated: number;
  verdict: string;
  evidence?: { document: string; quote: string; start: number; end: number; confidence: number };
};

export type GroundingResponse = {
  grounded: number;
  verdict: string;
  claims: GroundingClaim[];
  weakest_claim?: { index: number; supported: number } | null;
};
