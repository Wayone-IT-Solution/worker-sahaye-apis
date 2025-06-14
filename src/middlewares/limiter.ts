import rateLimit from "express-rate-limit";

// Custom handler for rate limit exceeded
const onLimitReached = (req: any, res: any, options: any) => {
  console.warn(
    `Rate limit exceeded for IP: ${req.ip}, Route: ${
      req.originalUrl
    }, Time: ${new Date().toISOString()}`
  );
  res.status(options.statusCode).json({
    success: false,
    message: options.message,
    retryAfterSeconds: Math.ceil(options.windowMs / 1000),
    timestamp: new Date().toISOString(),
  });
};

export const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests, please try again later.",
  statusCode: 429,
  skipFailedRequests: true, // Don't count failed requests (status >= 400)
  handler: onLimitReached, // Custom handler when limit is reached
});
