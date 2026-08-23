import { redis } from "./redis.js";

export function sdkIndexKey(sdkKey: string): string {
  return `sdk:${sdkKey}`;
}

export async function indexSdkKeys(environment: {
  id: string;
  sdkServerKey: string;
  sdkClientKey: string;
}): Promise<void> {
  await Promise.all([
    redis.set(sdkIndexKey(environment.sdkServerKey), environment.id),
    redis.set(sdkIndexKey(environment.sdkClientKey), environment.id),
  ]);
}
