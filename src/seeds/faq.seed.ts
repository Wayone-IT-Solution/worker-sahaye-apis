import mongoose from "mongoose";
import { config } from "../config/config";
import { Faq } from "../modals/faq.model";
import { FaqCategory } from "../modals/faqcategory.model";
import { FaqRole } from "../utils/faq";

const MONGO_URI = `${config.db.url}/${config.db.name}`;

type SeedFaqCategory = {
  name: string;
  description: string;
  visibleFor: FaqRole[];
};

type SeedFaq = {
  question: string;
  answer: string;
  category: string;
  visibilityFor: FaqRole;
  pageSlug?: string;
  isActive?: boolean;
};

const categorySeeds: SeedFaqCategory[] = [
  {
    name: "Getting Started",
    description: "Basic app access, sign in, and first-time setup guidance.",
    visibleFor: ["all"],
  },
  {
    name: "Profile & Account",
    description: "Profile updates, account preferences, and access details.",
    visibleFor: ["all", "worker", "contractor", "employer"],
  },
  {
    name: "Training Academy",
    description: "Learning, certification, and skill upgrade support.",
    visibleFor: ["worker", "contractor"],
  },
  {
    name: "Hiring & Projects",
    description: "Bulk hiring, project hiring, and recruitment workflows.",
    visibleFor: ["employer"],
  },
  {
    name: "Payments & Plans",
    description: "Plans, enrollment, invoices, and payment related support.",
    visibleFor: ["worker", "contractor", "employer"],
  },
  {
    name: "Reports & Support",
    description: "Concerns, abuse reporting, and support escalation.",
    visibleFor: ["all", "employer"],
  },
];

const faqSeeds: SeedFaq[] = [
  {
    question: "How do I create my account?",
    answer:
      "Download the app, choose your role, and complete mobile verification to create your account.",
    category: "Getting Started",
    visibilityFor: "all",
    pageSlug: "create-account",
  },
  {
    question: "How do I update my profile details?",
    answer:
      "Open Profile, tap Edit Profile, update the required fields, and save the changes.",
    category: "Profile & Account",
    visibilityFor: "all",
    pageSlug: "update-profile",
  },
  {
    question: "How can I reset my password?",
    answer:
      "Use the Forgot Password option on the login screen and follow the OTP verification flow.",
    category: "Profile & Account",
    visibilityFor: "all",
    pageSlug: "reset-password",
  },
  {
    question: "Where can I find training courses?",
    answer:
      "Go to Training Academy from the home or profile screen to browse available courses and certifications.",
    category: "Training Academy",
    visibilityFor: "worker",
    pageSlug: "training-courses-worker",
  },
  {
    question: "Can an agency member access training content?",
    answer:
      "Yes. Training Academy content is available for both worker and contractor roles.",
    category: "Training Academy",
    visibilityFor: "contractor",
    pageSlug: "training-courses-contractor",
  },
  {
    question: "How do I raise a bulk hiring request?",
    answer:
      "Open the Hiring section, choose bulk hiring, and complete the manpower and project details form.",
    category: "Hiring & Projects",
    visibilityFor: "employer",
    pageSlug: "bulk-hiring-request",
  },
  {
    question: "How do I submit a project hiring request?",
    answer:
      "Use Project Hiring from the employer profile menu and complete the project details form.",
    category: "Hiring & Projects",
    visibilityFor: "employer",
    pageSlug: "project-hiring-request",
  },
  {
    question: "How do I report a concern?",
    answer:
      "Open Report a Concern from the profile menu, fill in the issue details, and submit the report.",
    category: "Reports & Support",
    visibilityFor: "all",
    pageSlug: "report-concern",
  },
  {
    question: "How do I manage subscription or plan payments?",
    answer:
      "Open Plans or Subscriptions from your profile, review the available options, and complete payment securely.",
    category: "Payments & Plans",
    visibilityFor: "employer",
    pageSlug: "plan-payments",
  },
  {
    question: "Can I save and revisit my enrollment details?",
    answer:
      "Yes. Your enrolled courses and related payment details are available inside the subscription or enrollment sections.",
    category: "Payments & Plans",
    visibilityFor: "worker",
    pageSlug: "course-enrollment-details",
  },
  {
    question: "How do I contact support for an issue?",
    answer:
      "Use the support or help option in the app to raise a concern, then follow the instructions shown on screen.",
    category: "Reports & Support",
    visibilityFor: "all",
    pageSlug: "contact-support",
  },
];

export const seedFaqData = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    const categoryOps = categorySeeds.map((category) => ({
      updateOne: {
        filter: { name: category.name },
        update: { $set: category },
        upsert: true,
      },
    }));

    if (categoryOps.length > 0) {
      await FaqCategory.bulkWrite(categoryOps);
    }

    const savedCategories = await FaqCategory.find(
      { name: { $in: categorySeeds.map((item) => item.name) } },
      { name: 1 }
    ).lean();

    const categoryMap = new Map(
      savedCategories.map((category) => [category.name, String(category._id)])
    );

    const faqOps = faqSeeds.map((faq) => {
      const categoryId = categoryMap.get(faq.category);

      if (!categoryId) {
        throw new Error(`Missing FAQ category seed for: ${faq.category}`);
      }

      return {
        updateOne: {
          filter: { question: faq.question },
          update: {
            $set: {
              question: faq.question,
              answer: faq.answer,
              category: categoryId,
              visibilityFor: faq.visibilityFor,
              pageSlug: faq.pageSlug,
              isActive: faq.isActive ?? true,
            },
          },
          upsert: true,
        },
      };
    });

    if (faqOps.length > 0) {
      await Faq.bulkWrite(faqOps);
    }

    console.log("✅ FAQ seed completed");
  } catch (error) {
    console.error("❌ FAQ seed failed:", error);
    process.exitCode = 1;
  }
};
