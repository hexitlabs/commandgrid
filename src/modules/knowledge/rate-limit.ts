const buckets = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult = { allowed: true; remaining: number; resetAt: number } | { allowed: false; retryAfterSeconds: number; resetAt: number };

export function checkDemoRateLimit(key: string, options: { limit?: number; windowMs?: number } = {}): RateLimitResult {
  const limit = options.limit ?? 20;
  const windowMs = options.windowMs ?? 60_000;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000), resetAt: current.resetAt };
  }

  current.count += 1;
  return { allowed: true, remaining: limit - current.count, resetAt: current.resetAt };
}
