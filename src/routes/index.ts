/**
 * ===============================================
 * 🌐 Auto Route Loader (src/routes/index.ts)
 * ===============================================
 * Loads *.routes.ts from admin/ and public/ folders,
 * preserving folder structure in route path.
 */

import { Router } from "express";
// ADMIN FOLDER
import slotRoutes from "../admin/slot/slot.routes";
import roleRoutes from "../admin/role/role.routes";
import badgeRoutes from "../admin/badge/badge.routes";
import badgeBundleRoutes from "../admin/badgeBundle/badgeBundle.routes";
import adminRoutes from "../admin/admin/admin.routes";
import tradeRoutes from "../admin/trade/trade.routes";
import bannerRoutes from "../admin/banner/banner.routes";
import bookingRoutes from "../admin/booking/booking.routes";
import coursesRoutes from "../admin/courses/courses.routes";
import supportRoutes from "../admin/support/support.routes";
import industryRoutes from "../admin/industry/industry.routes";
import hrMasterRoutes from "../admin/hrmaster/hrmaster.routes";
import servetelRoutes from "../admin/servetel/servetel.routes";
import questionsRoutes from "../admin/question/question.routes";
import pageBannerRoutes from "../admin/pagebanner/banner.routes";
import communityRoutes from "../admin/community/community.routes";
import dashboardRoutes from "../admin/dashboard/dashboard.routes";
import virtualHRRoutes from "../admin/virtualhr/virtualhr.routes";
import quotationRoutes from "../admin/quotation/quotation.routes";
import natureRoutes from "../admin/natureofwork/natureofwork.routes";
import bulkhiringRoutes from "../admin/bulkhiring/bulkhiring.routes";
import jobCategoryRoutes from "../admin/jobcategory/jobcategory.routes";
import salespersonRoutes from "../admin/salesperson/salesperson.routes";
import contentRoutes from "../admin/brandingcontent/brandingcontent.routes";
import workerCategoryRoutes from "../admin/workercategory/workercategory.routes";
import assistantRoutes from "../admin/personalassistant/personalassistant.routes";
import planfeatureRoutes from "../admin/planfeaturemapping/planfeaturemapping.routes";
import callSupportAgentRoutes from "../admin/callsupportagent/callsupportagent.routes";
import subscriptionPlanRoutes from "../admin/subscriptionplan/subscriptionplan.routes";
import complianceCalendarRoutes from "../admin/compliancecalendar/compliancecalendar.routes";
import projectBasedHiringRoutes from "../admin/projectbasedhiring/projectbasedhiring.routes";
import faqRoutes from "../admin/faq/faq.routes";
import faqCategoryRoutes from "../admin/faqcategory/faqcategory.routes";
import jobRoleRoutes from "../admin/jobrole/jobrole.routes";
import supportServiceRoutes from "../admin/supportservice/supportservice.routes";
import serviceLocationRoutes from "../admin/servicelocation/servicelocation.routes";
import subIndustryRoutes from "../admin/subindustry/subindustry.routes";

// PUBLIC FOLDER
import jobRoutes from "../public/job/job.routes";
import userRoutes from "../public/user/user.routes";
import engagementRoutes from "../public/engagement/engagement.routes";
import featureRoutes from "../public/feature/feature.routes";
import messageRoutes from "../public/message/message.routes";
import IVRCallRoutes from "../public/ivrcall/ivrcall.routes";
import jobSavedRoutes from "../public/jobsaved/jobsaved.routes";
import saveItemRoutes from "../public/saveitems/saveitems.routes";
import forumPostRoutes from "../public/forumpost/forumpost.routes";
import stateCityRoutes from "../public/statecity/statecity.routes";
import connectionRoutes from "../public/connection/connection.routes";
import enrollmentRoutes from "../public/enrollment/enrollment.routes";
import enrollPlanRoutes from "../public/enrollplan/enrollplan.routes";
import fileUploadRoutes from "../public/fileupload/fileupload.routes";
import abuseReportRoutes from "../public/abusereport/abusereport.routes";
import endorsementRoutes from "../public/endorsement/endorsement.routes";
import loanRequestRoutes from "../public/loanrequest/loanrequest.routes";
import topRecruiterRoutes from "../public/toprecruiter/toprecruiter.routes";
import contentBlockRoutes from "../public/contentblock/contentblock.routes";
import courseReviewRoutes from "../public/coursereview/coursereview.routes";
import forumCommentRoutes from "../public/forumcomment/forumcomment.routes";
import fastResponderRoutes from "../public/fastresponder/fastresponder.routes";
import preInterviewDRoutes from "../public/preinterviewd/preinterviewd.routes";
import trainedWorkerRoutes from "../public/trainedworker/trainedworker.routes";
import safeWorkplaceRoutes from "../public/safeworkplace/safeworkplace.routes";
import reliablePayerRoutes from "../public/reliablepayer/reliablepayer.routes";
import trustedPartnerRoutes from "../public/trustedpartner/trustedpartner.routes";
import userPreferenceRoutes from "../public/userpreference/userpreference.routes";
import jobApplicationRoutes from "../public/jobapplication/jobapplication.routes";
import jobRequirementRoutes from "../public/jobrequirement/jobrequirement.routes";
import gratuityRecordRoutes from "../public/gratuityrecord/gratuityrecord.routes";
import postEngagementRoutes from "../public/postengagement/postengagement.routes";
import highlyPreferredRoutes from "../public/highlypreferred/highlypreferred.routes";
import communityMemberRoutes from "../public/communitymember/communitymember.routes";
import employerFeedbackRoutes from "../public/employerfeedback/employerfeedback.routes";
import virtualHRRequestRoutes from "../public/virtualhrrequest/virtualhrrequest.routes";
import virtualHrRecruiterRoutes from "../public/virtualhrecruiter/virtualhrecruiter.routes";
import skilledCandidateRoutes from "../public/skilledcandidate/skilledcandidate.routes";
import unifiedServcieRequestRoutes from "../public/unifiedrequest/unifiedrequest.routes";
import policeVerificationRoutes from "../public/policeverification/policeverification.routes";
import complianceChecklistRoutes from "../public/compliancechecklist/compliancechecklist.routes";
import bestPracticesFacilityRoutes from "../public/bestpracticesfacility/bestpracticesfacility.routes";
import candidateBrandingBadgeRoutes from "../public/candidatebrandingbadge/candidatebrandingbadge.routes";
import preInterviewedContractorRoutes from "../public/preinterviewedcontractor/preinterviewedcontractor.routes";
import publicComplianceCalendarRoutes from "../public/compliancecalendar/compliancecalendar.routes";
import headerRoutes from "../public/header/header.routes";
import pdfFileRoutes from "../public/pdffile/pdffile.routes";
import loanSupportRoutes from "../public/loansupport/loansupport.routes";
import notificationRoutes from "../public/notification/notification.routes";
import paymentRoutes from "../public/payment/payment.routes";
import subscriptionRoutes from "../public/subscription/subscription.routes";

// Create main router
const router = Router();

// ROUTE MOUNTS
// Specific routes MUST come before general routes to avoid conflicts
router.use("/admin/compliancecalendar", complianceCalendarRoutes);

router.use("/faq", faqRoutes);
router.use("/role", roleRoutes);
router.use("/slot", slotRoutes);
router.use("/admin", adminRoutes);
router.use("/badge", badgeRoutes);
router.use("/trade", tradeRoutes);
router.use("/nature", natureRoutes);
router.use("/banner", bannerRoutes);
router.use("/jobrole", jobRoleRoutes);
router.use("/page", pageBannerRoutes);
router.use("/booking", bookingRoutes);
router.use("/courses", coursesRoutes);
router.use("/support", supportRoutes);
router.use("/chatbot", questionsRoutes);
router.use("/servetel", servetelRoutes);
router.use("/industry", industryRoutes);
router.use("/hrmaster", hrMasterRoutes);
router.use("/community", communityRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/virtualhr", virtualHRRoutes);
router.use("/quotation", quotationRoutes);
router.use("/bulkhiring", bulkhiringRoutes);
router.use("/salesperson", salespersonRoutes);
router.use("/faqcategory", faqCategoryRoutes);
router.use("/subindustry", subIndustryRoutes);
router.use("/planfeature", planfeatureRoutes);
router.use("/jobcategory", jobCategoryRoutes);
router.use("/branding-content", contentRoutes);
router.use("/badge-bundles", badgeBundleRoutes);
router.use("/callsupport", callSupportAgentRoutes);
router.use("/workercategory", workerCategoryRoutes);
router.use("/supportservice", supportServiceRoutes);
router.use("/servicelocation", serviceLocationRoutes);
router.use("/subscriptionplan", subscriptionPlanRoutes);
router.use("/projectbasedhiring", projectBasedHiringRoutes);

router.use("/job", jobRoutes);
router.use("/user", userRoutes);
router.use("/ivr", IVRCallRoutes);
router.use("/feature", featureRoutes);
router.use("/message", messageRoutes);
router.use("/invite", engagementRoutes);
router.use("/jobsaved", jobSavedRoutes);
router.use("/saveitems", saveItemRoutes);
router.use("/forumpost", forumPostRoutes);
router.use("/statecity", stateCityRoutes);
router.use("/assistant", assistantRoutes);
router.use("/engagement", engagementRoutes);
router.use("/enrollment", enrollmentRoutes);
router.use("/enrollplan", enrollPlanRoutes);
router.use("/connection", connectionRoutes);
router.use("/fileupload", fileUploadRoutes);
router.use("/endorsement", endorsementRoutes);
router.use("/abusereport", abuseReportRoutes);
router.use("/loanrequest", loanRequestRoutes);
router.use("/contentblock", contentBlockRoutes);
router.use("/coursereview", courseReviewRoutes);
router.use("/forumcomment", forumCommentRoutes);
router.use("/toprecruiter", topRecruiterRoutes);
router.use("/preinterviewd", preInterviewDRoutes);
router.use("/fastresponder", fastResponderRoutes);
router.use("/trainedworker", trainedWorkerRoutes);
router.use("/reliablepayer", reliablePayerRoutes);
router.use("/safeworkplace", safeWorkplaceRoutes);
router.use("/gratuityrecord", gratuityRecordRoutes);
router.use("/jobapplication", jobApplicationRoutes);
router.use("/jobrequirement", jobRequirementRoutes);
router.use("/postengagement", postEngagementRoutes);
router.use("/userpreference", userPreferenceRoutes);
router.use("/trustedpartner", trustedPartnerRoutes);
router.use("/highlypreferred", highlyPreferredRoutes);
router.use("/communitymember", communityMemberRoutes);
router.use("/skilledcandidate", skilledCandidateRoutes);
router.use("/employerfeedback", employerFeedbackRoutes);
router.use("/virtualhrrequest", virtualHRRequestRoutes);
router.use("/virtualhrecruiter", virtualHrRecruiterRoutes);
router.use("/policeverification", policeVerificationRoutes);
router.use("/compliancechecklist", complianceChecklistRoutes);
router.use("/unifiedservicerequest", unifiedServcieRequestRoutes);
router.use("/bestpracticesfacility", bestPracticesFacilityRoutes);
router.use("/compliancecalendar", publicComplianceCalendarRoutes);
router.use("/candidatebrandingbadge", candidateBrandingBadgeRoutes);
router.use("/preinterviewedcontractor", preInterviewedContractorRoutes);
router.use("/header", headerRoutes);
router.use("/pdffile", pdfFileRoutes);
router.use("/payment", paymentRoutes);
router.use("/loansupport", loanSupportRoutes);
router.use("/notifications", notificationRoutes);
router.use("/subscription", subscriptionRoutes);

export default router;
