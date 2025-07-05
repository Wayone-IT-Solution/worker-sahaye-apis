import nodemailer from "nodemailer";
import { config } from "../config/config";

interface EmailPayload {
    to: string;
    from: any;
    text: string;
    html?: string;
    subject: string;
}

export async function sendEmail({ to, from, subject, text, html }: EmailPayload) {
    try {
        if (!to || !subject || !text) {
            throw new Error("Missing required fields: to, subject, or text");
        }

        const transporter = nodemailer.createTransport({
            service: config.email.service,
            auth: {
                user: config.email.user,
                pass: config.email.pass,
            },
        });

        const info = await transporter.sendMail({
            from: `"${from.name}" <${from.email}>`,
            to,
            subject,
            text,
            html,
        });

        if (!info.messageId) {
            throw new Error("Failed to get message ID from email service.");
        }

        console.log("📧 Email sent successfully:", {
            to,
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
        });

        return info;
    } catch (err: any) {
        console.log("❌ Email Send Error:", {
            to,
            subject,
            error: err?.message || err,
        });

        throw new Error("Failed to send email. Please try again later.");
    }
}
