export class FlareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlareError";
  }
}

export class FlareAuthError extends FlareError {
  constructor(message = "Invalid SDK key") {
    super(message);
    this.name = "FlareAuthError";
  }
}

export class FlareTimeoutError extends FlareError {
  constructor(timeoutMs: number) {
    super(`Timed out waiting for flag snapshot after ${timeoutMs}ms`);
    this.name = "FlareTimeoutError";
  }
}
