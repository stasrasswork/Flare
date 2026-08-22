export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(statusCode: number, message: string, code = "APP_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function unauthorized(): AppError {
  return new AppError(401, "Unauthorized", "UNAUTHORIZED");
}

export function invalidCredentials(): AppError {
  return new AppError(401, "Invalid credentials", "INVALID_CREDENTIALS");
}

export function emailTaken(): AppError {
  return new AppError(409, "Email already registered", "EMAIL_TAKEN");
}

export function noWorkspace(): AppError {
  return new AppError(403, "No workspace access", "NO_WORKSPACE");
}

export function notFound(message = "Not found"): AppError {
  return new AppError(404, message, "NOT_FOUND");
}

export function validationError(): AppError {
  return new AppError(400, "Invalid request body", "VALIDATION_ERROR");
}

export function flagKeyTaken(): AppError {
  return new AppError(409, "Flag key already exists", "FLAG_KEY_TAKEN");
}
