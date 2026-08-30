import { Flare } from "@flare/node";

async function main() {
  const sdkKey = process.env.FLARE_SDK_KEY ?? "flr_s_dev_seed_local_only";
  const url = process.env.FLARE_URL ?? "http://localhost:3000";
  const userId = process.env.USER_ID ?? "alice";

  const flare = await Flare.init({ sdkKey, url });

  function line() {
    const click = flare.isEnabled("buy-one-click", { userId });
    const feed = flare.details("new-feed", { userId });
    console.log(
      new Date().toISOString(),
      `v${flare.version}`,
      `buy-one-click=${click}`,
      `new-feed=${String(feed.value)}(${feed.reason})`,
    );
  }

  flare.on("update", () => {
    console.log("update");
    line();
  });

  line();
  const timer = setInterval(line, 1000);

  async function shutdown() {
    clearInterval(timer);
    await flare.close();
    process.exit(0);
  }

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
