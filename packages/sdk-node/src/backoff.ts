export const INITIAL_DELAY_MS = 1_000;
export const MAX_DELAY_MS = 30_000;

export function nextDelayMs(attempt: number): number {
  const delay = INITIAL_DELAY_MS * 2 ** Math.max(0, attempt);
  return Math.min(delay, MAX_DELAY_MS);
}
