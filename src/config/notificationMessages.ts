type TemplateContext = Record<string, string | number>;

interface NotificationTemplate {
  title: string | number;
  message: string | number;
}

interface DualNotificationTemplate {
  sender: (ctx?: TemplateContext) => NotificationTemplate;
  receiver: (ctx?: TemplateContext) => NotificationTemplate;
}

function text(value: unknown, fallback: string): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function roleLabel(role?: unknown): string {
  switch (String(role || "").toLowerCase()) {
    case "worker":
      return "Worker";
    case "employer":
      return "Employer";
    case "contractor":
    case "agency":
      return "Agency";
    case "admin":
      return "Admin";
    case "agent":
      return "Agent";
    case "virtual_hr":
      return "Virtual HR";
    default:
      return "Team member";
  }
}

function formatStatus(status?: any): string {
  switch (status) {
    case "hired":
      return "Hired";
    case "applied":
      return "Applied";
    case "offered":
      return "Offered";
    case "rejected":
      return "Rejected";
    case "withdrawn":
      return "Withdrawn";
    case "shortlisted":
      return "Shortlisted";
    case "under_review":
      return "Under Review";
    case "interview":
      return "Interview Scheduled";
    case "offer_declined":
      return "Offer Declined";
    case "offer_accepted":
      return "Offer Accepted";
    default:
      return text(status, "Updated");
  }
}

function formatConnectionStatus(status?: any): {
  action: string;
  description: string;
  receiverMessage: string;
} {
  switch (status) {
    case "pending":
      return {
        action: "Request Sent",
        description: "sent a connection request to",
        receiverMessage: "sent you a connection request",
      };
    case "accepted":
      return {
        action: "Accepted",
        description: "accepted the connection request from",
        receiverMessage: "accepted your connection request",
      };
    case "cancelled":
      return {
        action: "Cancelled",
        description: "cancelled the connection request to",
        receiverMessage: "cancelled the connection request",
      };
    case "removed":
      return {
        action: "Removed",
        description: "removed the connection with",
        receiverMessage: "removed the connection with you",
      };
    default:
      return {
        action: "Updated",
        description: "updated the connection status for",
        receiverMessage: "updated the connection status",
      };
  }
}

export const NotificationMessages: Record<string, DualNotificationTemplate> = {
  "application-status-update": {
    sender: (ctx) => ({
      title: `Application updated to ${formatStatus(ctx?.status)}`,
      message: `You updated ${text(ctx?.userName, "the candidate")}'s application for "${text(ctx?.jobTitle, "the job")}" to ${formatStatus(ctx?.status)}.`,
    }),
    receiver: (ctx) => ({
      title: `Application update: ${text(ctx?.jobTitle, "your job application")}`,
      message: `Your application is now marked as ${formatStatus(ctx?.status)}. We will keep you posted on the next step.`,
    }),
  },

  "badge-earned": {
    sender: (ctx) => ({
      title: `Badge assigned: ${text(ctx?.badgeName, "New badge")}`,
      message: `You assigned the "${text(ctx?.badgeName, "badge")}" badge to ${text(ctx?.userName, "the user")}.`,
    }),
    receiver: (ctx) => ({
      title: "New badge added to your profile",
      message: `You have been awarded the "${text(ctx?.badgeName, "new")}" badge. It is now visible on your profile.`,
    }),
  },

  "invite-prospective": {
    sender: (ctx) => ({
      title: `Invitation sent to ${text(ctx?.prospectName, "the prospect")}`,
      message: `Your invitation has been sent to ${text(ctx?.prospectName, "the prospect")}.`,
    }),
    receiver: (ctx) => ({
      title: "You have received an invitation",
      message: `Hello ${text(ctx?.prospectName, "there")}, ${text(ctx?.userName, "a team member")} has invited you to connect.`,
    }),
  },

  "loan-feedback-added": {
    sender: (ctx) => ({
      title: "Loan request comment added",
      message: `You added a comment on ${text(ctx?.userName, "the user's")} loan request.`,
    }),
    receiver: (ctx) => ({
      title: "New update on your loan request",
      message: `Admin added a comment on your loan request: "${text(ctx?.comment, "Please check the latest update.")}"`,
    }),
  },

  "job-comment-added": {
    sender: (ctx) => ({
      title: `Comment added to ${text(ctx?.jobTitle, "the job")}`,
      message: `You added a comment to "${text(ctx?.jobTitle, "the job")}" for ${text(ctx?.userName, "the job poster")}.`,
    }),
    receiver: (ctx) => ({
      title: "New admin comment on your job",
      message: `Admin added a comment to "${text(ctx?.jobTitle, "your job")}": "${text(ctx?.comment, "Please review the latest update.")}"`,
    }),
  },

  "task-status-update": {
    sender: (ctx) => ({
      title: `Task updated: ${text(ctx?.taskTitle, "Task")}`,
      message: `You updated "${text(ctx?.taskTitle, "the task")}" for ${text(ctx?.assigneeName, "the assignee")} to ${text(ctx?.status, "updated")}.`,
    }),
    receiver: (ctx) => ({
      title: `Task status changed: ${text(ctx?.taskTitle, "Task")}`,
      message: `The task "${text(ctx?.taskTitle, "assigned to you")}" is now marked as ${text(ctx?.status, "updated")}.`,
    }),
  },

  "task-assigned-to-sales": {
    sender: (ctx) => ({
      title: `Task assigned to ${text(ctx?.assigneeName, "the assignee")}`,
      message: `You assigned "${text(ctx?.taskTitle, "the task")}" to ${text(ctx?.assigneeName, "the assignee")}.`,
    }),
    receiver: (ctx) => ({
      title: `New task assigned: ${text(ctx?.taskTitle, "Task")}`,
      message: `You have been assigned "${text(ctx?.taskTitle, "a new task")}". Please review it when available.`,
    }),
  },

  "service-request-created": {
    sender: (ctx) => ({
      title: `New ${text(ctx?.serviceName, "service")} request`,
      message: `${text(ctx?.requesterName, "A user")} submitted a ${text(ctx?.serviceName, "service")} request for ${text(ctx?.companyName, "the company")}.`,
    }),
    receiver: (ctx) => ({
      title: `${text(ctx?.serviceName, "Service")} request submitted`,
      message: `Your ${text(ctx?.serviceName, "service")} request for ${text(ctx?.companyName, "the company")} has been received. Our team will review it shortly.`,
    }),
  },

  "job-status-update": {
    sender: (ctx) => ({
      title: `Job status updated to ${text(ctx?.status, "updated")}`,
      message: ctx?.remark
        ? `You updated "${text(ctx?.jobTitle, "the job")}" to ${text(ctx?.status, "updated")} with remark: "${ctx?.remark}".`
        : `You updated "${text(ctx?.jobTitle, "the job")}" to ${text(ctx?.status, "updated")}.`,
    }),
    receiver: (ctx) => ({
      title: `Job update: ${text(ctx?.jobTitle, "your job")}`,
      message:
        ctx?.status === "open"
          ? `"${text(ctx?.jobTitle, "Your job")}" is now open for applications.`
          : ctx?.status === "draft"
            ? `"${text(ctx?.jobTitle, "Your job")}" has been saved as a draft.`
            : ctx?.status === "paused"
              ? `"${text(ctx?.jobTitle, "Your job")}" is currently paused and not accepting new applications.`
              : ctx?.status === "filled"
                ? `"${text(ctx?.jobTitle, "Your job")}" has been filled.`
                : ctx?.status === "closed"
                  ? `"${text(ctx?.jobTitle, "Your job")}" has been closed.`
                  : ctx?.status === "expired"
                    ? `"${text(ctx?.jobTitle, "Your job")}" has expired and is no longer available.`
                    : ctx?.status === "rejected"
                      ? `"${text(ctx?.jobTitle, "Your job")}" was rejected during review.`
                      : ctx?.status === "under_review"
                        ? `"${text(ctx?.jobTitle, "Your job")}" is under review and awaiting admin approval.`
                        : ctx?.status === "pending-approval"
                          ? `"${text(ctx?.jobTitle, "Your job")}" is pending approval and will be reviewed shortly.`
                          : `"${text(ctx?.jobTitle, "Your job")}" status has been updated.`,
    }),
  },

  "connection-request-update": {
    sender: (ctx) => {
      const formatted = formatConnectionStatus(ctx?.status);
      return {
        title: `Connection ${formatted.action}`,
        message: `You have ${formatted.description} ${text(ctx?.receiverName, "a user")}.`,
      };
    },
    receiver: (ctx) => {
      const formatted = formatConnectionStatus(ctx?.status);
      return {
        title: `Connection ${formatted.action}`,
        message: `${text(ctx?.senderName, "Someone")} has ${formatted.receiverMessage} you.`,
      };
    },
  },

  "admin-message": {
    sender: (ctx) => ({
      title: `Message sent to ${text(ctx?.userName, "the user")}`,
      message: `You sent a message to ${text(ctx?.userName, "the user")} regarding "${text(ctx?.topic, "account updates")}".`,
    }),
    receiver: (ctx) => ({
      title: "New message from Admin",
      message: `${text(ctx?.adminName, "Admin")} sent you a message: "${text(ctx?.message, "Please check your account.")}"`,
    }),
  },

  "general-alert": {
    sender: (ctx) => ({
      title: text(ctx?.title, "System alert"),
      message: text(
        ctx?.message,
        "A message has been sent to the selected users.",
      ),
    }),
    receiver: (ctx) => ({
      title: text(ctx?.title, "Important alert"),
      message: text(ctx?.message, "You have a new important update."),
    }),
  },

  "feedback-request": {
    sender: (ctx) => ({
      title: `Feedback request sent to ${text(ctx?.workerName, "the worker")}`,
      message: `Your feedback request has been sent to ${text(ctx?.workerName, "the worker")}.`,
    }),
    receiver: (ctx) => ({
      title: `Feedback request from ${text(ctx?.senderName, roleLabel(ctx?.senderRole))}`,
      message: `${text(ctx?.senderName, roleLabel(ctx?.senderRole))} has requested your feedback. Please review the request and respond when convenient.`,
    }),
  },

  "engagement-invite": {
    sender: (ctx) => ({
      title: `Invitation sent to ${text(ctx?.prospectName, "the prospect")}`,
      message: `Your invitation has been sent to ${text(ctx?.prospectName, "the prospect")}.`,
    }),
    receiver: (ctx) => ({
      title: "You have received an invitation",
      message: `Hello ${text(ctx?.prospectName, "there")}, ${text(ctx?.userName, "a team member")} has invited you to connect.`,
    }),
  },

  "engagement-viewProfile": {
    sender: (ctx) => ({
      title: `Profile viewed: ${text(ctx?.prospectName, "Prospect")}`,
      message: `You viewed ${text(ctx?.prospectName, "the prospect")}'s profile.`,
    }),
    receiver: (ctx) => ({
      title: "Your profile was viewed",
      message: `${text(ctx?.userName, "A user")} viewed your profile.`,
    }),
  },

  "engagement-contactUnlock": {
    sender: (ctx) => ({
      title: `Contact unlocked: ${text(ctx?.prospectName, "Prospect")}`,
      message: `You unlocked ${text(ctx?.prospectName, "the prospect")}'s contact details.`,
    }),
    receiver: (ctx) => ({
      title: "Your contact details were unlocked",
      message: `${text(ctx?.userName, "A user")} unlocked your contact details.`,
    }),
  },

  "engagement-saveProfile": {
    sender: (ctx) => ({
      title: `Profile saved: ${text(ctx?.prospectName, "Prospect")}`,
      message: `You saved ${text(ctx?.prospectName, "the prospect")}'s profile.`,
    }),
    receiver: (ctx) => ({
      title: "Your profile was saved",
      message: `${text(ctx?.userName, "A user")} saved your profile for future reference.`,
    }),
  },

  "friend-request-sent": {
    sender: (ctx) => ({
      title: `Connection request sent to ${text(ctx?.receiverName, "the user")}`,
      message: `Your connection request has been sent to ${text(ctx?.receiverName, "the user")}.`,
    }),
    receiver: (ctx) => ({
      title: `Connection request from ${text(ctx?.senderName, "a user")}`,
      message: `${text(ctx?.senderName, "A user")} sent you a connection request. You can accept or decline it from your connections.`,
    }),
  },

  "friend-request-received": {
    sender: (ctx) => ({
      title: `Connection request sent to ${text(ctx?.receiverName, "the user")}`,
      message: `Your request is waiting for ${text(ctx?.receiverName, "the user")}'s response.`,
    }),
    receiver: (ctx) => ({
      title: "You received a connection request",
      message: `${text(ctx?.senderName, "A user")} wants to connect with you on Worker Sahaye.`,
    }),
  },

  "friend-request-accepted": {
    sender: (ctx) => ({
      title: "Connection request accepted",
      message: `You accepted ${text(ctx?.receiverName, "the user's")} connection request.`,
    }),
    receiver: (ctx) => ({
      title: "Your connection request was accepted",
      message: `${text(ctx?.senderName, "A user")} accepted your connection request. You are now connected.`,
    }),
  },

  "friend-request-declined": {
    sender: (ctx) => ({
      title: "Connection request declined",
      message: `You declined the connection request from ${text(ctx?.receiverName, "the user")}.`,
    }),
    receiver: (ctx) => ({
      title: "Connection request update",
      message: `${text(ctx?.senderName, "The user")} declined your connection request.`,
    }),
  },

  "friend-request-cancelled": {
    sender: (ctx) => ({
      title: "Connection request cancelled",
      message: `You cancelled your connection request to ${text(ctx?.receiverName, "the user")}.`,
    }),
    receiver: (ctx) => ({
      title: "Connection request cancelled",
      message: `${text(ctx?.senderName, "A user")} cancelled the connection request sent to you.`,
    }),
  },

  "friend-removed": {
    sender: (ctx) => ({
      title: "Connection removed",
      message: `You removed the connection with ${text(ctx?.receiverName, "the user")}.`,
    }),
    receiver: (ctx) => ({
      title: "Connection update",
      message: `${text(ctx?.senderName, "A user")} removed the connection with you.`,
    }),
  },

  "community-post-created": {
    sender: (ctx) => ({
      title: `Post published in ${text(ctx?.communityName, "the community")}`,
      message: `Your post "${text(ctx?.postTitle, "Untitled post")}" has been published successfully.`,
    }),
    receiver: (ctx) => ({
      title: `New post in ${text(ctx?.communityName, "your community")}`,
      message: `${text(ctx?.senderName, "A member")} shared a new post: "${text(ctx?.postTitle, "Untitled post")}".`,
    }),
  },

  "community-post-liked": {
    sender: (ctx) => ({
      title: "Post liked",
      message: `You liked ${text(ctx?.receiverName, "a member")}'s post in ${text(ctx?.communityName, "the community")}.`,
    }),
    receiver: (ctx) => ({
      title: "Someone liked your post",
      message: `${text(ctx?.senderName, "A member")} liked your post "${text(ctx?.postTitle, "Untitled post")}".`,
    }),
  },

  "community-comment-added": {
    sender: (ctx) => ({
      title: "Comment added",
      message: `You commented on "${text(ctx?.postTitle, "a community post")}".`,
    }),
    receiver: (ctx) => ({
      title: "New comment on your post",
      message: `${text(ctx?.senderName, "A member")} commented on "${text(ctx?.postTitle, "your post")}".`,
    }),
  },

  "community-join-request": {
    sender: (ctx) => ({
      title: `Join request sent to ${text(ctx?.communityName, "the community")}`,
      message: `Your request to join ${text(ctx?.communityName, "the community")} has been submitted.`,
    }),
    receiver: (ctx) => ({
      title: "New community join request",
      message: `${text(ctx?.senderName, "A user")} requested to join ${text(ctx?.communityName, "your community")}.`,
    }),
  },

  "community-join-approved": {
    sender: (ctx) => ({
      title: "Community request approved",
      message: `You approved ${text(ctx?.receiverName, "the user's")} request to join ${text(ctx?.communityName, "the community")}.`,
    }),
    receiver: (ctx) => ({
      title: `Welcome to ${text(ctx?.communityName, "the community")}`,
      message: `Your request to join ${text(ctx?.communityName, "the community")} has been approved.`,
    }),
  },

  "community-join-rejected": {
    sender: (ctx) => ({
      title: "Community request declined",
      message: `You declined ${text(ctx?.receiverName, "the user's")} request to join ${text(ctx?.communityName, "the community")}.`,
    }),
    receiver: (ctx) => ({
      title: "Community request update",
      message: `Your request to join ${text(ctx?.communityName, "the community")} was not approved at this time.`,
    }),
  },

  "community-member-added": {
    sender: (ctx) => ({
      title: "Community member added",
      message: `You added ${text(ctx?.receiverName, "a user")} to ${text(ctx?.communityName, "the community")}.`,
    }),
    receiver: (ctx) => ({
      title: `You were added to ${text(ctx?.communityName, "a community")}`,
      message: `${text(ctx?.senderName, "An admin")} added you to ${text(ctx?.communityName, "a community")}.`,
    }),
  },

  "community-event-created": {
    sender: (ctx) => ({
      title: `Community event created: ${text(ctx?.eventTitle, "Event")}`,
      message: `You created an event in ${text(ctx?.communityName, "the community")}.`,
    }),
    receiver: (ctx) => ({
      title: `New community event: ${text(ctx?.eventTitle, "Event")}`,
      message: `${text(ctx?.communityName, "Your community")} has a new event. Please check the details.`,
    }),
  },

  "job-posted": {
    sender: (ctx) => ({
      title: "Job posted successfully",
      message: `Your job "${text(ctx?.jobTitle, "Untitled job")}" has been posted successfully.`,
    }),
    receiver: (ctx) => ({
      title: `New job posted: ${text(ctx?.jobTitle, "Job opportunity")}`,
      message: `${text(ctx?.companyName, "A company")} posted a new job that may match your profile.`,
    }),
  },

  "job-approved": {
    sender: (ctx) => ({
      title: "Job approved",
      message: `You approved the job "${text(ctx?.jobTitle, "Untitled job")}".`,
    }),
    receiver: (ctx) => ({
      title: "Your job is approved",
      message: `Your job "${text(ctx?.jobTitle, "Untitled job")}" has been approved and is now visible to candidates.`,
    }),
  },

  "job-rejected": {
    sender: (ctx) => ({
      title: "Job rejected",
      message: `You rejected the job "${text(ctx?.jobTitle, "Untitled job")}".`,
    }),
    receiver: (ctx) => ({
      title: "Your job needs attention",
      message: `Your job "${text(ctx?.jobTitle, "Untitled job")}" was not approved. ${text(ctx?.remark, "Please review and update the details.")}`,
    }),
  },

  "job-application-submitted": {
    sender: (ctx) => ({
      title: "Application submitted",
      message: `You applied for "${text(ctx?.jobTitle, "the job")}".`,
    }),
    receiver: (ctx) => ({
      title: "New job application received",
      message: `${text(ctx?.candidateName, "A candidate")} applied for "${text(ctx?.jobTitle, "your job")}".`,
    }),
  },

  "job-application-received": {
    sender: (ctx) => ({
      title: "Application received",
      message: `You received an application from ${text(ctx?.candidateName, "a candidate")} for "${text(ctx?.jobTitle, "your job")}".`,
    }),
    receiver: (ctx) => ({
      title: "Your application was received",
      message: `Your application for "${text(ctx?.jobTitle, "the job")}" has been received by ${text(ctx?.companyName, "the employer")}.`,
    }),
  },

  "candidate-shortlisted": {
    sender: (ctx) => ({
      title: "Candidate shortlisted",
      message: `You shortlisted ${text(ctx?.candidateName, "the candidate")} for "${text(ctx?.jobTitle, "the job")}".`,
    }),
    receiver: (ctx) => ({
      title: "You have been shortlisted",
      message: `You have been shortlisted for "${text(ctx?.jobTitle, "the job")}". The hiring team may contact you for next steps.`,
    }),
  },

  "interview-scheduled": {
    sender: (ctx) => ({
      title: "Interview scheduled",
      message: `You scheduled an interview with ${text(ctx?.candidateName, "the candidate")} for "${text(ctx?.jobTitle, "the job")}".`,
    }),
    receiver: (ctx) => ({
      title: "Interview scheduled",
      message: `Your interview for "${text(ctx?.jobTitle, "the job")}" is scheduled on ${text(ctx?.interviewDate, "the scheduled date")}.`,
    }),
  },

  "offer-sent": {
    sender: (ctx) => ({
      title: "Offer sent",
      message: `You sent an offer to ${text(ctx?.candidateName, "the candidate")} for "${text(ctx?.jobTitle, "the job")}".`,
    }),
    receiver: (ctx) => ({
      title: "You received a job offer",
      message: `${text(ctx?.companyName, "The employer")} sent you an offer for "${text(ctx?.jobTitle, "the job")}". Please review it.`,
    }),
  },

  "offer-accepted": {
    sender: (ctx) => ({
      title: "Offer accepted",
      message: `You accepted the offer for "${text(ctx?.jobTitle, "the job")}".`,
    }),
    receiver: (ctx) => ({
      title: "Candidate accepted the offer",
      message: `${text(ctx?.candidateName, "The candidate")} accepted your offer for "${text(ctx?.jobTitle, "the job")}".`,
    }),
  },

  "offer-declined": {
    sender: (ctx) => ({
      title: "Offer declined",
      message: `You declined the offer for "${text(ctx?.jobTitle, "the job")}".`,
    }),
    receiver: (ctx) => ({
      title: "Candidate declined the offer",
      message: `${text(ctx?.candidateName, "The candidate")} declined your offer for "${text(ctx?.jobTitle, "the job")}".`,
    }),
  },

  "service-request-assigned": {
    sender: (ctx) => ({
      title: "Service request assigned",
      message: `You assigned ${text(ctx?.serviceName, "the service request")} to ${text(ctx?.assigneeName, "the assignee")}.`,
    }),
    receiver: (ctx) => ({
      title: `New service request assigned: ${text(ctx?.serviceName, "Service request")}`,
      message: `${text(ctx?.senderName, "Admin")} assigned a service request to you. Please review the details.`,
    }),
  },

  "service-request-status-update": {
    sender: (ctx) => ({
      title: "Service request updated",
      message: `You updated ${text(ctx?.serviceName, "the service request")} to ${text(ctx?.status, "updated")}.`,
    }),
    receiver: (ctx) => ({
      title: `Service request update: ${text(ctx?.serviceName, "Request")}`,
      message: `Your ${text(ctx?.serviceName, "service request")} is now marked as ${text(ctx?.status, "updated")}.`,
    }),
  },

  "quotation-created": {
    sender: (ctx) => ({
      title: "Quotation created",
      message: `You created a quotation for ${text(ctx?.customerName, "the customer")}.`,
    }),
    receiver: (ctx) => ({
      title: "New quotation received",
      message: `A quotation for ${text(ctx?.serviceName, "your service request")} is ready. Please review the details.`,
    }),
  },

  "quotation-updated": {
    sender: (ctx) => ({
      title: "Quotation updated",
      message: `You updated quotation ${text(ctx?.quotationNumber, "details")}.`,
    }),
    receiver: (ctx) => ({
      title: "Quotation updated",
      message: `Your quotation ${text(ctx?.quotationNumber, "")} has been updated. Please review the latest details.`,
    }),
  },

  "quotation-accepted": {
    sender: (ctx) => ({
      title: "Quotation accepted",
      message: `You accepted quotation ${text(ctx?.quotationNumber, "for the service")}.`,
    }),
    receiver: (ctx) => ({
      title: "Customer accepted the quotation",
      message: `${text(ctx?.customerName, "The customer")} accepted quotation ${text(ctx?.quotationNumber, "for the service")}.`,
    }),
  },

  "quotation-rejected": {
    sender: (ctx) => ({
      title: "Quotation declined",
      message: `You declined quotation ${text(ctx?.quotationNumber, "for the service")}.`,
    }),
    receiver: (ctx) => ({
      title: "Quotation declined",
      message: `${text(ctx?.customerName, "The customer")} declined quotation ${text(ctx?.quotationNumber, "for the service")}.`,
    }),
  },

  "quotation-installment-reminder": {
    sender: (ctx) => ({
      title: "Installment reminder sent",
      message: `You sent an installment reminder for ${text(ctx?.installmentTitle, "the installment")}.`,
    }),
    receiver: (ctx) => ({
      title: `Installment reminder: ${text(ctx?.installmentTitle, "Payment due")}`,
      message: `Your installment of INR ${text(ctx?.amount, "0.00")} is due on ${text(ctx?.dueDate, "the due date")}. Please complete the payment on time.`,
    }),
  },

  "payment-success": {
    sender: (ctx) => ({
      title: "Payment recorded successfully",
      message: `Payment of INR ${text(ctx?.amount, "0.00")} has been recorded for ${text(ctx?.serviceName, "the service")}.`,
    }),
    receiver: (ctx) => ({
      title: "Payment successful",
      message: `Your payment of INR ${text(ctx?.amount, "0.00")} for ${text(ctx?.serviceName, "the service")} was successful.`,
    }),
  },

  "payment-failed": {
    sender: (ctx) => ({
      title: "Payment failed",
      message: `Payment of INR ${text(ctx?.amount, "0.00")} for ${text(ctx?.serviceName, "the service")} failed.`,
    }),
    receiver: (ctx) => ({
      title: "Payment could not be completed",
      message: `Your payment for ${text(ctx?.serviceName, "the service")} could not be completed. Please try again or use another payment method.`,
    }),
  },

  "subscription-expiring": {
    sender: (ctx) => ({
      title: "Subscription reminder sent",
      message: `You sent a subscription reminder to ${text(ctx?.userName, "the user")}.`,
    }),
    receiver: (ctx) => ({
      title: "Your subscription is expiring soon",
      message: `Your ${text(ctx?.planName, "subscription")} plan expires on ${text(ctx?.expiryDate, "the expiry date")}. Renew it to continue uninterrupted access.`,
    }),
  },

  "document-submitted": {
    sender: (ctx) => ({
      title: "Document submitted",
      message: `You submitted ${text(ctx?.documentName, "a document")} for verification.`,
    }),
    receiver: (ctx) => ({
      title: "New document submitted",
      message: `${text(ctx?.userName, "A user")} submitted ${text(ctx?.documentName, "a document")} for verification.`,
    }),
  },

  "document-approved": {
    sender: (ctx) => ({
      title: "Document approved",
      message: `You approved ${text(ctx?.userName, "the user's")} ${text(ctx?.documentName, "document")}.`,
    }),
    receiver: (ctx) => ({
      title: "Document verified",
      message: `Your ${text(ctx?.documentName, "document")} has been verified successfully.`,
    }),
  },

  "document-rejected": {
    sender: (ctx) => ({
      title: "Document rejected",
      message: `You rejected ${text(ctx?.userName, "the user's")} ${text(ctx?.documentName, "document")}.`,
    }),
    receiver: (ctx) => ({
      title: "Document needs attention",
      message: `Your ${text(ctx?.documentName, "document")} could not be verified. ${text(ctx?.remark, "Please upload a valid document and try again.")}`,
    }),
  },

  "profile-update-reminder": {
    sender: (ctx) => ({
      title: "Profile update reminder sent",
      message: `You sent a profile completion reminder to ${text(ctx?.userName, "the user")}.`,
    }),
    receiver: (ctx) => ({
      title: "Complete your profile",
      message:
        "Please complete your profile details to improve matching and service access.",
    }),
  },

  "profile-viewed": {
    sender: (ctx) => ({
      title: `Profile viewed: ${text(ctx?.receiverName, "User")}`,
      message: `You viewed ${text(ctx?.receiverName, "the user's")} profile.`,
    }),
    receiver: (ctx) => ({
      title: "Your profile was viewed",
      message: `${text(ctx?.senderName, "A user")} viewed your profile.`,
    }),
  },

  "contact-unlocked": {
    sender: (ctx) => ({
      title: `Contact unlocked: ${text(ctx?.receiverName, "User")}`,
      message: `You unlocked ${text(ctx?.receiverName, "the user's")} contact details.`,
    }),
    receiver: (ctx) => ({
      title: "Your contact details were unlocked",
      message: `${text(ctx?.senderName, "A user")} unlocked your contact details for hiring or service follow-up.`,
    }),
  },

  "endorsement-request": {
    sender: (ctx) => ({
      title: "Endorsement request sent",
      message: `You requested an endorsement from ${text(ctx?.receiverName, "the user")}.`,
    }),
    receiver: (ctx) => ({
      title: "You received an endorsement request",
      message: `${text(ctx?.senderName, "A user")} requested your endorsement. Please review the request.`,
    }),
  },

  "endorsement-received": {
    sender: (ctx) => ({
      title: "Endorsement submitted",
      message: `You submitted an endorsement for ${text(ctx?.receiverName, "the user")}.`,
    }),
    receiver: (ctx) => ({
      title: "You received an endorsement",
      message: `${text(ctx?.senderName, "A user")} endorsed your profile.`,
    }),
  },

  "course-enrollment-success": {
    sender: (ctx) => ({
      title: "Enrollment confirmed",
      message: `Enrollment for ${text(ctx?.courseName, "the course")} has been confirmed.`,
    }),
    receiver: (ctx) => ({
      title: "Course enrollment confirmed",
      message: `You are enrolled in ${text(ctx?.courseName, "the course")}. Please check your course details.`,
    }),
  },

  "course-payment-pending": {
    sender: (ctx) => ({
      title: "Course payment pending",
      message: `Payment is pending for ${text(ctx?.courseName, "the course")}.`,
    }),
    receiver: (ctx) => ({
      title: "Complete your course payment",
      message: `Your enrollment for ${text(ctx?.courseName, "the course")} is pending payment. Please complete payment to confirm your seat.`,
    }),
  },

  "support-ticket-created": {
    sender: (ctx) => ({
      title: "Support ticket created",
      message: `A support ticket has been created for ${text(ctx?.userName, "the user")}.`,
    }),
    receiver: (ctx) => ({
      title: "Support ticket created",
      message: `Your support ticket ${text(ctx?.ticketNumber, "")} has been created. Our team will review it shortly.`,
    }),
  },

  "support-ticket-updated": {
    sender: (ctx) => ({
      title: "Support ticket updated",
      message: `You updated support ticket ${text(ctx?.ticketNumber, "")}.`,
    }),
    receiver: (ctx) => ({
      title: "Support ticket update",
      message: `Your support ticket ${text(ctx?.ticketNumber, "")} is now marked as ${text(ctx?.status, "updated")}.`,
    }),
  },

  "virtual-hr-created": {
    sender: (ctx) => ({
      title: "New Virtual HR Profile Created",
      message: `A new Virtual HR profile has been created for ${text(ctx?.hrName, "the HR professional")}.`,
    }),
    receiver: (ctx) => ({
      title: "Your Virtual HR Profile Created",
      message: `Your Virtual HR profile has been successfully created. You can now start taking HR consultation requests from clients.`,
    }),
  },

  "virtual-hr-request-created": {
    sender: (ctx) => ({
      title: "New Virtual HR Request Submitted",
      message: `A new Virtual HR request has been submitted by ${text(ctx?.companyName, "the company")} with contact ${text(ctx?.contactPerson, "the contact person")}.`,
    }),
    receiver: (ctx) => ({
      title: "Virtual HR Request Received",
      message: `Your Virtual HR request for ${text(ctx?.companyName, "your company")} has been received. Our admin team will review it and assign it to an available HR consultant shortly.`,
    }),
  },

  "virtual-hr-recruiter-created": {
    sender: (ctx) => ({
      title: "New Virtual HR Recruiter Request Submitted",
      message: `A new Virtual HR Recruiter request has been submitted by ${text(ctx?.companyName, "the company")} with contact ${text(ctx?.contactPerson, "the contact person")}.`,
    }),
    receiver: (ctx) => ({
      title: "Virtual HR Recruiter Request Received",
      message: `Your Virtual HR Recruiter request for ${text(ctx?.companyName, "your company")} has been received. Our admin team will review it and assign it to an available recruiter shortly.`,
    }),
  },
};
