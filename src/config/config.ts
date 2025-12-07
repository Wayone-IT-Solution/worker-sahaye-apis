import path from "path";
import dotenv from "dotenv";

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const toBool = (value: string | undefined): boolean => value === "true";

export const config = {
  env: process.env.NODE_ENV || "production",
  port: Number(process.env.PORT) || 8080,
  baseUrl: process.env.APP_BASE_URL!,
  frontendUrl: process.env.FRONTEND_URL!,

  cors: {
    enabled: toBool(process.env.CORS_ENABLED),
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [],
  },

  db: {
    url: process.env.DB_URL!,
    name: process.env.DB_NAME!,
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  email: {
    enabled: toBool(process.env.EMAIL_ENABLED),
    service: process.env.EMAIL_SERVICE || "gmail",
    user: process.env.EMAIL_USER!,
    pass: process.env.EMAIL_PASS!,
    from:
      process.env.EMAIL_FROM ||
      `"${process.env.APP_NAME} Support" <noreply@example.com>`,
  },

  sms: {
    enabled: toBool(process.env.SMS_ENABLED),
    provider: process.env.SMS_PROVIDER!,
    twilio: {
      sid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
    },
  },

  notification: {
    enabled: toBool(process.env.NOTIFICATION_ENABLED),
    provider: process.env.NOTIFICATION_PROVIDER!,
    firebase: {
      serverKey: process.env.FIREBASE_SERVER_KEY!,
      projectId: process.env.FIREBASE_PROJECT_ID!,
    },
  },

  payment: {
    enabled: toBool(process.env.PAYMENT_ENABLED),
    gateway: process.env.PAYMENT_GATEWAY!,
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID!,
      keySecret: process.env.RAZORPAY_KEY_SECRET!,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET!,
    },
  },

  s3: {
    region: process.env.S3_REGION!,
    bucket: process.env.S3_BUCKET!,
    baseUrl: process.env.S3_BASE_URL!,
    enabled: toBool(process.env.S3_ENABLED),
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },

  security: {
    ips: process.env.BLOCKED_IPS?.split(",") || [],
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 100),
    rateLimitEnabled: toBool(process.env.RATE_LIMIT_ENABLED),
    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  },

  servetel: {
    baseUrl: process.env.SERVETEL_BASE_URL || "https://api.servetel.in",
    clientId: process.env.SERVETEL_CLIENT_ID || "",
    clientSecret: process.env.SERVETEL_CLIENT_SECRET || "",
    defaultCallerId: process.env.SERVETEL_DEFAULT_CALLER_ID || "",
    authPath: process.env.SERVETEL_AUTH_PATH || "/v1/auth/login",
    clickToCallPath:
      process.env.SERVETEL_CLICK_TO_CALL_PATH || "/v1/click-to-call",
    statsPath: process.env.SERVETEL_STATS_PATH || "/v1/calls/summary",
    recordingsPath:
      process.env.SERVETEL_RECORDINGS_PATH || "/v1/calls/recordings",
    forwardingPath:
      process.env.SERVETEL_FORWARDING_PATH || "/v1/call-forwarding",
  },
};
