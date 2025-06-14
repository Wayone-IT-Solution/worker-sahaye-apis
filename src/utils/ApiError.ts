class ApiError extends Error {
  public statusCode: number;
  public success: false;
  public data: null;
  public error: unknown[];

  constructor(
    statusCode: number,
    message = "Something went wrong",
    error?: any,
    stack?: string
  ) {
    super(message);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.success = false;
    this.data = null;
    this.error = error;

    if (stack) this.stack = stack;
    else Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      success: this.success,
      message: this.message,
      error: this.error,
    };
  }
}

export default ApiError;
