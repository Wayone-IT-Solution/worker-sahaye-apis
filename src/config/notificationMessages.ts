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

export const NotificationMessages: Record<
  NotificationType,
  DualNotificationTemplate
> = {
  "job-posted": {
    sender: (ctx) => ({
      title: "Job Posted Successfully",
      message: `Your job "${ctx?.jobTitle || "Untitled"
        }" has been posted successfully.`,
    }),
    receiver: (ctx) => ({
      title: "New Job Alert",
      message: `A new job "${ctx?.jobTitle || "Untitled"
        }" has just been posted and matches your preferences.`,
    }),
  },

  "badge-earned": {
    sender: (ctx) => ({
      title: "Badge Assigned",
      message: `You assigned the badge "${ctx?.badgeName || "Unknown Badge"
        }" to ${ctx?.userName || "a user"}.`,
    }),
    receiver: (ctx) => ({
      title: "You've Earned a Badge!",
      message: `Congratulations! You've been awarded the "${ctx?.badgeName || "a new"
        }" badge.`,
    }),
  },

  "job-applied": {
    sender: (ctx) => ({
      title: "Application Submitted",
      message: `You successfully applied for the job "${ctx?.jobTitle || "Untitled"
        }".`,
    }),
    receiver: (ctx) => ({
      title: "New Job Application",
      message: `${ctx?.applicantName || "A user"} has applied for your job "${ctx?.jobTitle || "Untitled"
        }".`,
    }),
  },

  "job-expiring": {
    sender: (ctx) => ({
      title: "Job Posting Expiring",
      message: `Your job "${ctx?.jobTitle}" will expire on ${ctx?.expiryDate || "soon"
        }.`,
    }),
    receiver: (ctx) => ({
      title: "Job Expiring Soon",
      message: `The job "${ctx?.jobTitle}" is expiring on ${ctx?.expiryDate || "soon"
        }. Apply before it closes!`,
    }),
  },

  "virtual-hr-assigned": {
    sender: (ctx) => ({
      title: "You Assigned a Virtual HR",
      message: `You have successfully assigned ${ctx?.hrName} to the Virtual HR request for ${ctx?.companyName || "a client"}.`,
    }),
    receiver: (ctx) => ({
      title: "You've Been Assigned as a Virtual HR",
      message: `Hi ${ctx?.hrName}, you have been assigned to handle a Virtual HR request from ${ctx?.companyName}.`,
    }),
  },

  "bulk-hiring-assigned": {
    sender: (ctx) => ({
      title: "Bulk Hiring Request Assigned",
      message: `You have successfully assigned the bulk hiring request for ${ctx?.numberOfWorkers || "multiple"} workers at ${ctx?.location || "a specified location"}.`,
    }),
    receiver: (ctx) => ({
      title: "New Hiring Request Assigned",
      message: `You’ve been assigned a bulk hiring request for ${ctx?.numberOfWorkers || "multiple"} workers at ${ctx?.location || "a specified location"}.`,
    }),
  },

  "job-requirement-assigned": {
    sender: (ctx) => ({
      title: "Job Requirement Assigned",
      message: `You have successfully assigned a Virtual HR to the job requirement: "${ctx?.designation}".`,
    }),
    receiver: (ctx) => ({
      title: "New Job Assignment",
      message: `You have been assigned to the job: "${ctx?.designation}" located at ${ctx?.preferredLocation}.`,
    }),
  },

  "unified-service-request-assigned": {
    sender: (ctx) => ({
      title: "Service Request Assigned",
      message: `You have successfully assigned a Virtual HR to the service request: "${ctx?.exclusiveService}".`,
    }),
    receiver: (ctx) => ({
      title: "New Service Assignment",
      message: `You have been assigned to a new service request: "${ctx?.exclusiveService}" from ${ctx?.companyName}.`,
    }),
  },

  "project-assigned": {
    sender: (ctx) => ({
      title: "Project Hiring Assigned",
      message: `You have successfully assigned a Virtual HR to the project "${ctx?.projectTitle}".`,
    }),
    receiver: (ctx) => ({
      title: "New Project Assignment",
      message: `You have been assigned to the project "${ctx?.projectTitle}". Please review the details and take action.`,
    }),
  },

  "course-added": {
    sender: (ctx) => ({
      title: "Course Added",
      message: `You successfully added the course "${ctx?.courseName || "Untitled"
        }".`,
    }),
    receiver: (ctx) => ({
      title: "New Course Available",
      message: `A new course "${ctx?.courseName || "Untitled"
        }" is now available for enrollment.`,
    }),
  },

  "course-enrolled": {
    sender: (ctx) => ({
      title: "User Enrolled in Course",
      message: `${ctx?.userName || "A user"} enrolled in your course "${ctx?.courseName || "Untitled"
        }".`,
    }),
    receiver: (ctx) => ({
      title: "Enrollment Confirmed",
      message: `You're now enrolled in the course "${ctx?.courseName || "Untitled"
        }".`,
    }),
  },

  "subscription-renewal": {
    sender: (ctx) => ({
      title: "Subscription Renewed for User",
      message: `${ctx?.userName || "A user"} renewed their ${ctx?.planName || "plan"
        } subscription.`,
    }),
    receiver: (ctx) => ({
      title: "Subscription Renewed",
      message: `Your ${ctx?.planName || "plan"
        } subscription was successfully renewed.`,
    }),
  },

  "subscription-expiring": {
    sender: (ctx) => ({
      title: "User Subscription Expiring",
      message: `${ctx?.userName || "A user"}'s subscription is expiring on ${ctx?.expiryDate || "soon"
        }.`,
    }),
    receiver: (ctx) => ({
      title: "Subscription Expiring Soon",
      message: `Your subscription will expire on ${ctx?.expiryDate || "soon"
        }. Renew soon to avoid service interruption.`,
    }),
  },

  "new-community-post": {
    sender: (ctx) => ({
      title: "Community Post Created",
      message: `You created a new post: "${ctx?.postTitle || "Untitled"}".`,
    }),
    receiver: (ctx) => ({
      title: "New Community Post",
      message: `${ctx?.userName || "Someone"} posted in the community: "${ctx?.postTitle || "Untitled"
        }".`,
    }),
  },

  "reply-on-post": {
    sender: (ctx) => ({
      title: "Reply Sent",
      message: `You replied to the post: "${ctx?.postTitle || "Untitled"}".`,
    }),
    receiver: (ctx) => ({
      title: "New Reply on Your Post",
      message: `${ctx?.userName || "Someone"} replied to your post: "${ctx?.postTitle || "Untitled"
        }".`,
    }),
  },

  "admin-message": {
    sender: (ctx) => ({
      title: "Admin Message Sent",
      message: `You sent a message to ${ctx?.userName || "a user"}.`,
    }),
    receiver: (ctx) => ({
      title: "Message from Admin",
      message: `${ctx?.adminName || "Admin"} sent you a message: "${ctx?.message || "Please review your account."
        }"`,
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
