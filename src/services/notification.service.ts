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

export const NotificationService = {
  async send(
    options: SendNotificationOptions,
    authUser?: { id: string; role: UserType }
  ) {
    const { type, title, message, toRole, toUserId, fromUser } = options;

    const sender = fromUser || authUser;
    if (!sender) throw new Error("Sender information is missing.");

    const toUserObjectId = new Types.ObjectId(toUserId);
    const fromUserObjectId = new Types.ObjectId(sender.id);

    // Save Notification
    const notification: any = await Notification.create({
      type,
      title,
      message,
      to: { user: toUserObjectId, role: toRole },
      from: { user: fromUserObjectId, role: sender.role },
    });

    try {
      const [recipient, senderUser] = await Promise.all([
        User.findById(toUserId).lean(),
        User.findById(sender.id).lean(),
      ]);

      if (!senderUser) throw new Error(`Sender not found: ${sender.id}`);
      if (!recipient) throw new Error(`Recipient not found: ${toUserId}`);

      const preferences = recipient?.preferences?.notifications || {};
      const smsAllowed = preferences.sms !== false;
      const pushAllowed = preferences.push !== false;
      const emailAllowed = preferences.email !== false;

      const { fcmToken, mobile, email } = recipient;

      // Push Notification
      if (pushAllowed && fcmToken && admin) {
        admin
          .messaging()
          .send({
            token: fcmToken,
            notification: { title, body: message },
            data: {
              type,
              notificationId: notification?._id.toString(),
            },
          })
          .then(() => {
            console.log(`✅ Push sent to ${toUserId}`);
          })
          .catch((err) => {
            console.log(`❌ FCM Push Error [${toUserId}]:`, err.message);
          });
      }

      // Email Notification
      if (emailAllowed && email) {
        sendEmail({
          to: email,
          text: message,
          subject: title,
          html: `<p>${message}</p>`,
          from: {
            name: senderUser?.fullName || "Notification System",
            email: senderUser?.email || config.email.from,
          },
        }).catch((err) => {
          console.log(`❌ Email Error [${toUserId}]:`, err.message);
        });
      }

      // SMS Notification
      if (smsAllowed && mobile) {
        sendSMS({
          to: mobile,
          message,
        }).catch((err) => {
          console.log(`❌ SMS Error [${toUserId}]:`, err.message);
        });
      }
    } catch (err: any) {
      console.log(`⚠️ Notification delivery skipped:`, err.message);
    }
    return notification;
  },
};
