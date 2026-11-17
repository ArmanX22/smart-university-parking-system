export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = "Authentication required. Please sign in.") {
    super(401, message);
    this.name = "AuthenticationError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden. You do not have permission to perform this action.") {
    super(403, message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource not found.") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Resource conflict. Action could not be completed.") {
    super(409, message);
    this.name = "ConflictError";
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Input validation failed.", details?: unknown) {
    super(400, message, details);
    this.name = "ValidationError";
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      {
        success: false,
        error: error.message,
        details: error.details ?? null,
      },
      { status: error.statusCode }
    );
  }

  console.error("Unhandled Server Error:", error);
  return Response.json(
    {
      success: false,
      error: "An unexpected internal server error occurred.",
    },
    { status: 500 }
  );
}
