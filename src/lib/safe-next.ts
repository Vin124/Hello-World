// Only allow same-site relative paths, to avoid an open redirect via ?next=.
export function safeNext(next: string | null | undefined, fallback = "/feed") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
