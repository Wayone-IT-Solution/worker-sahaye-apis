import mongoose from "mongoose";
import ApiError from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { NextFunction, Request, Response } from "express";
import { config } from "../../config/config";
import { CommonService } from "../../services/common.services";
import { sendEmail } from "../../utils/emailService";
import {
  ContactAs,
  ContactSource,
  ContactUrgency,
  ContactUs,
  ContactUsStatus,
  IndustryType,
  ServiceRequired,
} from "../../modals/contactus.model";

const contactUsService = new CommonService(ContactUs);
const CONTACT_NOTIFICATION_TO = "workersahay@gmail.com";

const toTrimmedString = (value: any) => String(value ?? "").trim();

const toBooleanSafe = (value: any) => {
  if (value === true) return true;
  if (value === false) return false;
  const normalized = toTrimmedString(value).toLowerCase();
  return ["true", "1", "yes", "y", "on"].includes(normalized);
};

const normalizeStringArray = (value: any): string[] => {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value))
    return value.map(toTrimmedString).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [toTrimmedString(value)].filter(Boolean);
};

const normalizeContactAs = (value: any): ContactAs | null => {
  const raw = toTrimmedString(value);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if ((Object.values(ContactAs) as string[]).includes(lower)) return lower as ContactAs;

  const map: Record<string, ContactAs> = {
    "worker / job seeker": ContactAs.WORKER,
    worker: ContactAs.WORKER,
    "job seeker": ContactAs.WORKER,
    "employer / company": ContactAs.EMPLOYER,
    employer: ContactAs.EMPLOYER,
    company: ContactAs.EMPLOYER,
    "recruitment agency": ContactAs.AGENCY,
    agency: ContactAs.AGENCY,
    contractor: ContactAs.CONTRACTOR,
    "service provider": ContactAs.SERVICE_PROVIDER,
    "service_provider": ContactAs.SERVICE_PROVIDER,
    recruiter: ContactAs.RECRUITER,
    "recruiter / consultant": ContactAs.RECRUITER,
    consultant: ContactAs.RECRUITER,
    "training partner": ContactAs.TRAINING_PARTNER,
    training_partner: ContactAs.TRAINING_PARTNER,
    government: ContactAs.GOVERNMENT,
    "government / psu": ContactAs.GOVERNMENT,
    other: ContactAs.OTHER,
  };
  return map[lower] ?? null;
};

const normalizeIndustryType = (value: any): IndustryType | null => {
  const raw = toTrimmedString(value);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if ((Object.values(IndustryType) as string[]).includes(lower))
    return lower as IndustryType;

  const map: Record<string, IndustryType> = {
    manufacturing: IndustryType.MANUFACTURING,
    construction: IndustryType.CONSTRUCTION,
    logistics: IndustryType.LOGISTICS,
    "logistics / warehouse": IndustryType.LOGISTICS,
    warehouse: IndustryType.LOGISTICS,
    healthcare: IndustryType.HEALTHCARE,
    hospitality: IndustryType.HOSPITALITY,
    retail: IndustryType.RETAIL,
    "retail / fmcg": IndustryType.RETAIL,
    fmcg: IndustryType.RETAIL,
    it: IndustryType.IT,
    "it / technology": IndustryType.IT,
    technology: IndustryType.IT,
    education: IndustryType.EDUCATION,
    "education / training": IndustryType.EDUCATION,
    training: IndustryType.EDUCATION,
    government: IndustryType.GOVERNMENT,
    "government / psu": IndustryType.GOVERNMENT,
    other: IndustryType.OTHER,
  };
  return map[lower] ?? null;
};

const normalizeUrgency = (value: any): ContactUrgency | null => {
  const raw = toTrimmedString(value);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if ((Object.values(ContactUrgency) as string[]).includes(lower))
    return lower as ContactUrgency;

  const map: Record<string, ContactUrgency> = {
    immediate: ContactUrgency.IMMEDIATE,
    "within 7 days": ContactUrgency.WITHIN_7_DAYS,
    "within_7_days": ContactUrgency.WITHIN_7_DAYS,
    "within 30 days": ContactUrgency.WITHIN_30_DAYS,
    "within_30_days": ContactUrgency.WITHIN_30_DAYS,
    enquiry: ContactUrgency.ENQUIRY,
    inquiry: ContactUrgency.ENQUIRY,
  };
  return map[lower] ?? null;
};

const normalizeServiceRequired = (value: any): ServiceRequired | null => {
  const raw = toTrimmedString(value);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if ((Object.values(ServiceRequired) as string[]).includes(lower))
    return lower as ServiceRequired;

  const map: Record<string, ServiceRequired> = {
    "job search assistance": ServiceRequired.JOB_SEARCH_ASSISTANCE,
    "job_search_assistance": ServiceRequired.JOB_SEARCH_ASSISTANCE,
    "hire workers": ServiceRequired.HIRE_WORKERS,
    hire_workers: ServiceRequired.HIRE_WORKERS,
    "bulk hiring": ServiceRequired.BULK_HIRING,
    bulk_hiring: ServiceRequired.BULK_HIRING,
    "pf / esic support": ServiceRequired.PF_ESIC_SUPPORT,
    "pf/esic support": ServiceRequired.PF_ESIC_SUPPORT,
    pf_esic_support: ServiceRequired.PF_ESIC_SUPPORT,
    "labour compliance": ServiceRequired.LABOUR_COMPLIANCE,
    labour_compliance: ServiceRequired.LABOUR_COMPLIANCE,
    "payroll / hr": ServiceRequired.PAYROLL_HR,
    payroll_hr: ServiceRequired.PAYROLL_HR,
    "training programs": ServiceRequired.TRAINING_PROGRAMS,
    training_programs: ServiceRequired.TRAINING_PROGRAMS,
    "subscription / pricing": ServiceRequired.SUBSCRIPTION_PRICING,
    subscription_pricing: ServiceRequired.SUBSCRIPTION_PRICING,
    "partnership / franchise": ServiceRequired.PARTNERSHIP_FRANCHISE,
    partnership_franchise: ServiceRequired.PARTNERSHIP_FRANCHISE,
    other: ServiceRequired.OTHER,
  };
  return map[lower] ?? null;
};

const normalizeSource = (value: any): ContactSource | null => {
  const raw = toTrimmedString(value);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  if ((Object.values(ContactSource) as string[]).includes(lower))
    return lower as ContactSource;

  const map: Record<string, ContactSource> = {
    google: ContactSource.GOOGLE,
    "google search": ContactSource.GOOGLE,
    instagram: ContactSource.INSTAGRAM,
    linkedin: ContactSource.LINKEDIN,
    whatsapp: ContactSource.WHATSAPP,
    referral: ContactSource.REFERRAL,
    advertisement: ContactSource.ADVERTISEMENT,
    event: ContactSource.EVENT,
    "event / exhibition": ContactSource.EVENT,
    other: ContactSource.OTHER,
  };
  return map[lower] ?? null;
};

const normalizeStatus = (value: any): ContactUsStatus | null => {
  const raw = toTrimmedString(value);
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  const map: Record<string, ContactUsStatus> = {
    new: ContactUsStatus.NEW,
    "in progress": ContactUsStatus.IN_PROGRESS,
    in_progress: ContactUsStatus.IN_PROGRESS,
    closed: ContactUsStatus.CLOSED,
  };
  return map[normalized] ?? null;
};

const formatList = (values: unknown): string => {
  if (!Array.isArray(values) || values.length === 0) return "N/A";
  return values.map((value) => toTrimmedString(value)).filter(Boolean).join(", ") || "N/A";
};

const escapeHtml = (value: unknown): string =>
  toTrimmedString(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildContactEmailHtml = (record: any) => {
  const rows = [
    ["Full Name", record.fullName],
    ["Mobile Number", record.mobileNumber],
    ["Email", record.email],
    ["City", record.city],
    ["State", record.state],
    ["Company", record.company || "N/A"],
    ["Contacting As", record.contactAs],
    ["Contacting As Other", record.contactAsOther || "N/A"],
    ["Industry Type", record.industryType],
    ["Industry Other", record.industryOther || "N/A"],
    ["Services Required", formatList(record.servicesRequired)],
    ["Service Other", record.serviceOther || "N/A"],
    ["Requirement Details", record.requirementDetails || "N/A"],
    ["Urgency", record.urgency],
    ["Sources", formatList(record.sources)],
    ["Source Other", record.sourceOther || "N/A"],
    ["Consent To Contact", record.consentToContact ? "Yes" : "No"],
    ["Status", record.status],
    ["Submitted At", record.createdAt ? new Date(record.createdAt).toLocaleString("en-IN") : "N/A"],
    ["IP Address", record.meta?.ip || "N/A"],
    ["User Agent", record.meta?.userAgent || "N/A"],
    ["Referrer", record.meta?.referrer || "N/A"],
  ];

  return `
    <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
      <h2 style="margin: 0 0 16px;">New website contact enquiry</h2>
      <p style="margin: 0 0 20px;">A new contact form submission was received from the Worker Sahay website.</p>
      <table cellpadding="10" cellspacing="0" border="0" style="border-collapse: collapse; width: 100%; max-width: 720px;">
        ${rows
          .map(
            ([label, value]) => `
              <tr>
                <td style="border: 1px solid #e5e7eb; background: #f9fafb; width: 220px; font-weight: bold;">${label}</td>
                <td style="border: 1px solid #e5e7eb;">${escapeHtml(value) || "N/A"}</td>
              </tr>
            `,
          )
          .join("")}
      </table>
    </div>
  `;
};

export class ContactUsController {
  static async createContactUs(req: Request, res: Response, next: NextFunction) {
    try {
      const fullName = toTrimmedString(req.body?.fullName);
      const mobileNumber = toTrimmedString(req.body?.mobileNumber);
      const email = toTrimmedString(req.body?.email);
      const city = toTrimmedString(req.body?.city);
      const state = toTrimmedString(req.body?.state);
      const company = toTrimmedString(
        req.body?.company ?? req.body?.companyOrganization,
      );

      const contactAs = normalizeContactAs(req.body?.contactAs);
      const contactAsOther = toTrimmedString(req.body?.contactAsOther);

      const industryType = normalizeIndustryType(req.body?.industryType);
      const industryOther = toTrimmedString(req.body?.industryOther);

      const servicesRaw = normalizeStringArray(
        req.body?.servicesRequired ??
          req.body?.services ??
          req.body?.serviceRequired,
      );
      const servicesRequired = servicesRaw
        .map(normalizeServiceRequired)
        .filter(Boolean) as ServiceRequired[];
      const serviceOther = toTrimmedString(
        req.body?.serviceOther ?? req.body?.serviceOtherInput,
      );

      const requirementDetails = toTrimmedString(req.body?.requirementDetails);
      const urgency = normalizeUrgency(req.body?.urgency);

      const sourcesRaw = normalizeStringArray(req.body?.sources ?? req.body?.source);
      const sources = sourcesRaw
        .map(normalizeSource)
        .filter(Boolean) as ContactSource[];
      const sourceOther = toTrimmedString(
        req.body?.sourceOther ?? req.body?.sourceOtherInput,
      );

      const consentToContact = toBooleanSafe(req.body?.consentToContact ?? req.body?.consent);

      if (!fullName) return res.status(400).json(new ApiError(400, "Full Name is required"));
      if (!mobileNumber)
        return res.status(400).json(new ApiError(400, "Mobile Number is required"));
      if (!email) return res.status(400).json(new ApiError(400, "Email is required"));
      if (!city) return res.status(400).json(new ApiError(400, "City is required"));
      if (!state) return res.status(400).json(new ApiError(400, "State is required"));
      if (!contactAs)
        return res.status(400).json(new ApiError(400, "You are contacting as is required"));
      if (contactAs === ContactAs.OTHER && !contactAsOther) {
        return res.status(400).json(new ApiError(400, "Please specify contactAsOther"));
      }
      if (!industryType)
        return res.status(400).json(new ApiError(400, "Industry Type is required"));
      if (industryType === IndustryType.OTHER && !industryOther) {
        return res.status(400).json(new ApiError(400, "Please specify industryOther"));
      }
      if (!urgency) return res.status(400).json(new ApiError(400, "Urgency is required"));
      if (!consentToContact) {
        return res.status(400).json(
          new ApiError(400, "Consent is required to submit this enquiry"),
        );
      }

      if (servicesRequired.includes(ServiceRequired.OTHER) && !serviceOther) {
        return res
          .status(400)
          .json(new ApiError(400, "Please specify serviceOther"));
      }

      if (sources.includes(ContactSource.OTHER) && !sourceOther) {
        return res
          .status(400)
          .json(new ApiError(400, "Please specify sourceOther"));
      }

      const payload: any = {
        fullName,
        mobileNumber,
        email: email.toLowerCase(),
        city,
        state,
        contactAs,
        industryType,
        urgency,
        consentToContact,
        servicesRequired,
        sources,
        meta: {
          ip: req.ip,
          userAgent: req.get("user-agent"),
          referrer: req.get("referer") || req.get("referrer"),
        },
      };

      if (company) payload.company = company;
      if (requirementDetails) payload.requirementDetails = requirementDetails;

      if (contactAs === ContactAs.OTHER) payload.contactAsOther = contactAsOther;
      if (industryType === IndustryType.OTHER) payload.industryOther = industryOther;
      if (servicesRequired.includes(ServiceRequired.OTHER))
        payload.serviceOther = serviceOther;
      if (sources.includes(ContactSource.OTHER)) payload.sourceOther = sourceOther;

      const result = await contactUsService.create(payload);

      try {
        await sendEmail({
          to: CONTACT_NOTIFICATION_TO,
          from: {
            name: "Worker Sahay Contact Form",
            email: config.email.user,
          },
          subject: `New website contact enquiry from ${result.fullName}`,
          text: [
            `New website contact enquiry from ${result.fullName}`,
            `Mobile: ${result.mobileNumber}`,
            `Email: ${result.email}`,
            `City: ${result.city}`,
            `State: ${result.state}`,
            `Urgency: ${result.urgency}`,
          ].join("\n"),
          html: buildContactEmailHtml(result),
        });
      } catch (mailError) {
        console.log("Contact enquiry email notification failed:", mailError);
      }

      return res
        .status(201)
        .json(new ApiResponse(201, result, "Enquiry submitted successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getAllContactUs(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await contactUsService.getAll(req.query);
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async getContactUsById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json(new ApiError(400, "Invalid contact enquiry id"));
      }

      const result = await ContactUs.findById(id);
      if (!result) return res.status(404).json(new ApiError(404, "Enquiry not found"));
      return res
        .status(200)
        .json(new ApiResponse(200, result, "Data fetched successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async updateContactUsById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json(new ApiError(400, "Invalid contact enquiry id"));
      }

      const record = await ContactUs.findById(id);
      if (!record) return res.status(404).json(new ApiError(404, "Enquiry not found"));

      const nextStatus = normalizeStatus(req.body?.status);
      if (req.body?.status !== undefined && !nextStatus) {
        return res.status(400).json(new ApiError(400, "Invalid status value"));
      }

      if (nextStatus) record.status = nextStatus;
      if (req.body?.isActive !== undefined) record.isActive = toBooleanSafe(req.body?.isActive);

      const updated = await record.save();
      return res
        .status(200)
        .json(new ApiResponse(200, updated, "Updated successfully"));
    } catch (err) {
      next(err);
    }
  }

  static async deleteContactUsById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json(new ApiError(400, "Invalid contact enquiry id"));
      }

      const result = await ContactUs.findByIdAndDelete(id);
      if (!result) return res.status(404).json(new ApiError(404, "Enquiry not found"));

      return res
        .status(200)
        .json(new ApiResponse(200, result, "Deleted successfully"));
    } catch (err) {
      next(err);
    }
  }
}
