import https from "https";
import dotenv from "dotenv";
dotenv.config();

interface MSG91Response {
  message: string;
  type?: string;
  request_id?: string;
  [key: string]: any;
}

const TEMPLATE_ID = process.env.TEMPLATE_ID!;
const AUTH_KEY = process.env.AUTH_KEY!;
const MSG91_URL = process.env.MSG91_URL!;

export function sendMsg91Otp(
  mobile: string | number,
  otpCode: string
): Promise<MSG91Response> {
  return new Promise((resolve, reject) => {
    try {
      if (!TEMPLATE_ID || !AUTH_KEY || !MSG91_URL) {
        return reject(new Error("MSG91 env variables missing"));
      }

      // normalize mobile (ensure 91 prefix)
      const mobileStr = String(mobile).trim();
      const cleanMobile = mobileStr.startsWith("91")
        ? mobileStr
        : `91${mobileStr}`;

      const payload = JSON.stringify({
        template_id: TEMPLATE_ID,
        realTimeResponse: "1",
        recipients: [
          {
            mobiles: cleanMobile,
            var1: otpCode,
          },
        ],
      });

      const url = new URL(MSG91_URL);

      const options: https.RequestOptions = {
        method: "POST",
        hostname: url.hostname,
        path: url.pathname,
        headers: {
          accept: "application/json",
          authkey: AUTH_KEY,
          "content-type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      };

    //   console.log("[MSG91] Request URL:", MSG91_URL);
    //   console.log("[MSG91] Payload:", payload);

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => (data += chunk));

        res.on("end", () => {
          console.log("[MSG91] Response:", data);

          try {
            const parsed: MSG91Response = JSON.parse(data);

            if (res.statusCode && res.statusCode >= 400) {
              return reject(parsed);
            }

            resolve(parsed);
          } catch {
            reject(new Error("Invalid JSON response: " + data));
          }
        });
      });

      req.on("error", (err) => {
        console.error("[MSG91] Request error:", err);
        reject(err);
      });

      req.write(payload);
      req.end();

    } catch (err) {
      reject(err);
    }
  });
}
