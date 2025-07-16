import { config } from "../config/config";
import nodemailer, { Transporter } from "nodemailer";

interface EmailPayload {
    to: string;
    from: {
        name?: string;
        email?: string;
    };
    subject: string;
    text: string;
    html?: string;
}

export async function sendEmail({ to, from, subject, text, html }: EmailPayload) {
    const { name = "Notification Service", email = config.email.from } = from || {};

    if (!to || !subject || !text)
        console.log("❌ Email Validation Error: Missing required fields.");

    let transporter: Transporter;

    try {
        transporter = nodemailer.createTransport({
            service: config.email.service,
            auth: {
                user: config.email.user,
                pass: config.email.pass,
            },
        });
        const mailOptions = {
            from: `"${name}" <${email}>`,
            to,
            subject,
            text,
            html: html || `<p>${text}</p>`, // fallback to simple HTML if not provided
        };

        const info = await transporter.sendMail(mailOptions);

        if (!info?.messageId) console.log("❌ Email Send Failed: No message ID returned.");
        console.log("📧 Email sent successfully:", {
            to,
            messageId: info.messageId,
            accepted: info.accepted,
            rejected: info.rejected,
        });

        return info;
    } catch (error: any) {
        console.log("❌ Email Send Error", {
            to,
            subject,
            error: error?.message || error,
        });
    }
}
