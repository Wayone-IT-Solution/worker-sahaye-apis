import { NotificationType } from "../modals/notification.model";

type TemplateContext = Record<string, string | number>;

interface NotificationTemplate {
    title: string | number;
    message: string | number;
}

interface DualNotificationTemplate {
    sender: (ctx?: TemplateContext) => NotificationTemplate;
    receiver: (ctx?: TemplateContext) => NotificationTemplate;
}

export const NotificationMessages: Record<NotificationType, DualNotificationTemplate> = {
    "job-posted": {
        sender: (ctx) => ({
            title: "Job Posted Successfully",
            message: `Your job "${ctx?.jobTitle || "Untitled"}" has been posted successfully.`,
        }),
        receiver: (ctx) => ({
            title: "New Job Alert",
            message: `A new job "${ctx?.jobTitle || "Untitled"}" has just been posted and matches your preferences.`,
        }),
    },

    "job-applied": {
        sender: (ctx) => ({
            title: "Application Submitted",
            message: `You successfully applied for the job "${ctx?.jobTitle || "Untitled"}".`,
        }),
        receiver: (ctx) => ({
            title: "New Job Application",
            message: `${ctx?.applicantName || "A user"} has applied for your job "${ctx?.jobTitle || "Untitled"}".`,
        }),
    },

    "job-expiring": {
        sender: (ctx) => ({
            title: "Job Posting Expiring",
            message: `Your job "${ctx?.jobTitle}" will expire on ${ctx?.expiryDate || "soon"}.`,
        }),
        receiver: (ctx) => ({
            title: "Job Expiring Soon",
            message: `The job "${ctx?.jobTitle}" is expiring on ${ctx?.expiryDate || "soon"}. Apply before it closes!`,
        }),
    },

    "course-added": {
        sender: (ctx) => ({
            title: "Course Added",
            message: `You successfully added the course "${ctx?.courseName || "Untitled"}".`,
        }),
        receiver: (ctx) => ({
            title: "New Course Available",
            message: `A new course "${ctx?.courseName || "Untitled"}" is now available for enrollment.`,
        }),
    },

    "course-enrolled": {
        sender: (ctx) => ({
            title: "User Enrolled in Course",
            message: `${ctx?.userName || "A user"} enrolled in your course "${ctx?.courseName || "Untitled"}".`,
        }),
        receiver: (ctx) => ({
            title: "Enrollment Confirmed",
            message: `You're now enrolled in the course "${ctx?.courseName || "Untitled"}".`,
        }),
    },

    "subscription-renewal": {
        sender: (ctx) => ({
            title: "Subscription Renewed for User",
            message: `${ctx?.userName || "A user"} renewed their ${ctx?.planName || "plan"} subscription.`,
        }),
        receiver: (ctx) => ({
            title: "Subscription Renewed",
            message: `Your ${ctx?.planName || "plan"} subscription was successfully renewed.`,
        }),
    },

    "subscription-expiring": {
        sender: (ctx) => ({
            title: "User Subscription Expiring",
            message: `${ctx?.userName || "A user"}'s subscription is expiring on ${ctx?.expiryDate || "soon"}.`,
        }),
        receiver: (ctx) => ({
            title: "Subscription Expiring Soon",
            message: `Your subscription will expire on ${ctx?.expiryDate || "soon"}. Renew soon to avoid service interruption.`,
        }),
    },

    "new-community-post": {
        sender: (ctx) => ({
            title: "Community Post Created",
            message: `You created a new post: "${ctx?.postTitle || "Untitled"}".`,
        }),
        receiver: (ctx) => ({
            title: "New Community Post",
            message: `${ctx?.userName || "Someone"} posted in the community: "${ctx?.postTitle || "Untitled"}".`,
        }),
    },

    "reply-on-post": {
        sender: (ctx) => ({
            title: "Reply Sent",
            message: `You replied to the post: "${ctx?.postTitle || "Untitled"}".`,
        }),
        receiver: (ctx) => ({
            title: "New Reply on Your Post",
            message: `${ctx?.userName || "Someone"} replied to your post: "${ctx?.postTitle || "Untitled"}".`,
        }),
    },

    "admin-message": {
        sender: (ctx) => ({
            title: "Admin Message Sent",
            message: `You sent a message to ${ctx?.userName || "a user"}.`,
        }),
        receiver: (ctx) => ({
            title: "Message from Admin",
            message: `${ctx?.adminName || "Admin"} sent you a message: "${ctx?.message || "Please review your account."}"`,
        }),
    },

    "general-alert": {
        sender: (ctx) => ({
            title: ctx?.title || "System Alert",
            message: ctx?.message || "System-wide message sent.",
        }),
        receiver: (ctx) => ({
            title: ctx?.title || "Alert",
            message: ctx?.message || "You have a new alert.",
        }),
    },
};
