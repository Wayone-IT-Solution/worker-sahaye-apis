import { NotificationMessages } from './../config/notificationMessages';
import {
  UserType,
  Notification,
  NotificationType,
} from "../modals/notification.model";
import { Types } from "mongoose";
import admin from "../utils/firebase";
import { config } from "../config/config";
import { User } from "../modals/user.model";
import { sendSMS } from "../utils/smsService";
import { sendEmail } from "../utils/emailService";

interface SendNotificationOptions {
  title: string;
  message: string;
  toUserId: string;
  toRole: UserType;
  type: NotificationType;
  fromUser?: { id: string; role: UserType };
}

interface DualNotifyOptions {
  senderId: string;
  receiverId: string;
  senderRole: UserType;
  type: NotificationType;
  receiverRole: UserType;
  context: Record<string, string | number>;
}

interface SingleNotifyOptions {
  toUserId: string;
  toRole: UserType;
  type: NotificationType;
  direction?: "sender" | "receiver";
  context: Record<string, string | number>;
  fromUser?: { id: string; role: UserType };
}

export const NotificationService = {
  async send(
    options: SendNotificationOptions,
    authUser?: { id: string; role: UserType }
  ) {
    const { type, title, message, toRole, toUserId, fromUser } = options;
    const sender = fromUser || authUser;

    if (!sender) throw new Error("Sender information is missing.");

    let notification: any;

    try {
      // Create notification
      notification = await Notification.create({
        type,
        title,
        message,
        to: { user: new Types.ObjectId(toUserId), role: toRole },
        from: { user: new Types.ObjectId(sender.id), role: sender.role },
      });

      // Fetch sender and recipient
      const [recipient, senderUser] = await Promise.all([
        User.findById(toUserId).lean(),
        User.findById(sender.id).lean(),
      ]);

      if (!recipient) throw new Error(`Recipient not found: ${toUserId}`);
      if (!senderUser) throw new Error(`Sender not found: ${sender.id}`);

      const preferences = recipient?.preferences?.notifications || {};
      const smsAllowed = preferences.sms !== false;
      const pushAllowed = preferences.push !== false;
      const emailAllowed = preferences.email !== false;

      const { fcmToken, mobile, email } = recipient;

      const tasks: Promise<any>[] = [];

      // --- Push Notification ---
      if (pushAllowed && fcmToken && admin) {
        tasks.push(
          admin
            .messaging()
            .send({
              token: fcmToken,
              notification: { title, body: message },
              data: {
                type,
                notificationId: notification._id.toString(),
              },
            })
            .then(() => {
              if (config.env === "development") {
                console.log(`[Notification] Push sent to userId=${toUserId}`);
              }
            })
            .catch((err) => {
              console.log(
                `[Notification Error] Push failed for userId=${toUserId}: ${err.message}`
              );
            })
        );
      }

      // --- Email Notification ---
      if (emailAllowed && email && config.email.enabled) {
        tasks.push(
          sendEmail({
            to: email,
            subject: title,
            text: message,
            html: `<p>${message}</p>`,
            from: {
              name: senderUser.fullName || "Notification Service",
              email: senderUser.email || config.email.from,
            },
          })
            .then(() => {
              if (config.env === "development") {
                console.log(`[Notification] Email sent to ${email}`);
              }
            })
            .catch((err) => {
              console.log(
                `[Notification Error] Email failed for ${email}: ${err.message}`
              );
            })
        );
      }

      // --- SMS Notification ---
      if (smsAllowed && mobile && config.sms.enabled) {
        tasks.push(
          sendSMS({ to: mobile, message })
            .then(() => {
              if (config.env === "development") {
                console.log(`[Notification] SMS sent to ${mobile}`);
              }
            })
            .catch((err) => {
              console.log(
                `[Notification Error] SMS failed for ${mobile}: ${err.message}`
              );
            })
        );
      }
      await Promise.all(tasks);
    } catch (err: any) {
      console.log(`[Notification Critical] ${err.message}`);
      if (!notification) throw err;
    }
    return notification;
  },
};

export async function sendDualNotification({
  type,
  context,
  senderId,
  senderRole,
  receiverId,
  receiverRole,
}: DualNotifyOptions) {
  const template = NotificationMessages[type];

  const [receiverMsg, senderMsg] = [
    template.receiver(context),
    template.sender(context),
  ];

  await Promise.all([
    NotificationService.send({
      type,
      toUserId: receiverId,
      toRole: receiverRole,
      title: receiverMsg.title.toString(),
      message: receiverMsg.message.toString(),
      fromUser: { id: senderId, role: senderRole },
    }),
    NotificationService.send({
      type,
      toUserId: senderId,
      toRole: senderRole,
      title: senderMsg.title.toString(),
      message: senderMsg.message.toString(),
      fromUser: { id: receiverId, role: receiverRole },
    }),
  ]);
}

export async function sendSingleNotification({
  type,
  context,
  toUserId,
  toRole,
  fromUser,
  direction = "receiver",
}: SingleNotifyOptions) {
  const template = NotificationMessages[type]?.[direction];
  if (!template) throw new Error(`Missing notification template for ${type}`);

  const { title, message } = template(context);

  await NotificationService.send({
    type,
    toRole,
    toUserId,
    fromUser,
    title: title.toString(),
    message: message.toString(),
  });
}

// await sendDualNotification({
//   type: "job-applied",
//   context: {
//     jobTitle: "Plumber Needed",
//     applicantName: "Rishabh",
//   },
//   senderId: "664bba4d7b7ffdb7a1b8711f",     // worker
//   senderRole: "worker",
//   receiverId: "664bb9c07b7ffdb7a1b8711e",   // employer
//   receiverRole: "employer",
// });

// await sendSingleNotification({
//   type: "job-expiring",
//   context: {
//     jobTitle: "Electrician Opening",
//     expiryDate: "2025-07-08",
//   },
//   toUserId: "664baaa7d9ff1bca3a7f112a",
//   toRole: "worker",
//   fromUser: {
//     id: "664bbcc97b7aa1bcddaa1100",
//     role: "employer",
//   },
//   direction: "receiver",
// });