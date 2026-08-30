import { FlareError } from "./errors.js";
import { STREAM_PATH } from "./protocol.js";

export function streamUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new FlareError(`Invalid Flare URL: ${url}`);
  }

  if (parsed.protocol === "http:") {
    parsed.protocol = "ws:";
  } else if (parsed.protocol === "https:") {
    parsed.protocol = "wss:";
  } else if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw new FlareError(`Invalid Flare URL protocol: ${parsed.protocol}`);
  }

  const basePath = parsed.pathname.replace(/\/$/, "");
  parsed.pathname = `${basePath}${STREAM_PATH}`;
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}
