import { randomBytes } from "node:crypto";

export type SdkKeyKind = "s" | "c";

export function createSdkKey(kind: SdkKeyKind): string {
  return `flr_${kind}_${randomBytes(24).toString("base64url")}`;
}

export function createSdkKeyPair() {
  return {
    sdkServerKey: createSdkKey("s"),
    sdkClientKey: createSdkKey("c"),
  };
}
