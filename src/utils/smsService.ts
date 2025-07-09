import twilio from "twilio";
import { config } from "../config/config";

const sid = config.sms.twilio.sid;
const authToken = config.sms.twilio.authToken;

const client = twilio(sid, authToken);

/**
 * Sends an SMS using Twilio with robust error handling.
 */
export async function sendSMS({
    to,
    message,
}: {
    to: string;
    message: string;
}) {
    try {
        if (!to || !message) {
            throw new Error("Phone number or message is missing.");
        }
        const response = await client.messages.create({
            body: message,
            from: config.sms.twilio.phoneNumber,
            to,
        });

        if (response.status === "failed" || response.errorCode) {
            throw new Error(
                `Twilio failed to send SMS: ${response.errorMessage || "Unknown error"}`
            );
        }

        return response;
    } catch (err: any) {
        if (err?.code && err?.message) {
            console.log("📨 Twilio Error:", {
                code: err.code,
                message: err.message,
                moreInfo: err.moreInfo,
            });
            throw new Error(
                `SMS sending failed [${err.code}]: ${err.message || "Unknown error"}`
            );
        }
        console.log("📨 SMS Send Error:", err?.message || err);
        throw new Error("Something went wrong while sending SMS.");
    }
}
