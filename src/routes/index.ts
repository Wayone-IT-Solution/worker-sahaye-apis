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
import adminRoutes from "../admin/admin/admin.routes";
import bannerRoutes from "../admin/banner/banner.routes";
import bookingRoutes from "../admin/booking/booking.routes";
import coursesRoutes from "../admin/courses/courses.routes";
import supportRoutes from "../admin/support/support.routes";
import communityRoutes from "../admin/community/community.routes";
import dashboardRoutes from "../admin/dashboard/dashboard.routes";
import virtualHRRoutes from "../admin/virtualhr/virtualhr.routes";
import bulkhiringRoutes from "../admin/bulkhiring/bulkhiring.routes";
import jobCategoryRoutes from "../admin/jobcategory/jobcategory.routes";
import workerCategoryRoutes from "../admin/workercategory/workercategory.routes";
import assistantRoutes from "../admin/personalassistant/personalassistant.routes";
import planfeatureRoutes from "../admin/planfeaturemapping/planfeaturemapping.routes";
import subscriptionPlanRoutes from "../admin/subscriptionplan/subscriptionplan.routes";
import complianceCalendarRoutes from "../admin/compliancecalendar/compliancecalendar.routes";
import projectBasedHiringRoutes from "../admin/projectbasedhiring/projectbasedhiring.routes";

// PUBLIC FOLDER
import jobRoutes from "../public/job/job.routes";
import userRoutes from "../public/user/user.routes";
import featureRoutes from "../public/feature/feature.routes";
import messageRoutes from "../public/message/message.routes";
import jobSavedRoutes from "../public/jobsaved/jobsaved.routes";
import forumPostRoutes from "../public/forumpost/forumpost.routes";
import stateCityRoutes from "../public/statecity/statecity.routes";
import connectionRoutes from "../public/connection/connection.routes";
import enrollmentRoutes from "../public/enrollment/enrollment.routes";
import enrollPlanRoutes from "../public/enrollplan/enrollplan.routes";
import fileUploadRoutes from "../public/fileupload/fileupload.routes";
import abuseReportRoutes from "../public/abusereport/abusereport.routes";
import endorsementRoutes from "../public/endorsement/endorsement.routes";
import loanRequestRoutes from "../public/loanrequest/loanrequest.routes";
import topRecruiterRoutes from "../public/toprecruiter/toprecruiter.routes"
import contentBlockRoutes from "../public/contentblock/contentblock.routes";
import courseReviewRoutes from "../public/coursereview/coursereview.routes";
import forumCommentRoutes from "../public/forumcomment/forumcomment.routes";
import fastResponderRoutes from "../public/fastresponder/fastresponder.routes"
import preInterviewDRoutes from "../public/preinterviewd/preinterviewd.routes";
import trainedWorkerRoutes from "../public/trainedworker/trainedworker.routes";
import safeWorkplaceRoutes from "../public/safeworkplace/safeworkplace.routes";
import reliablePayerRoutes from "../public/reliablepayer/reliablepayer.routes";
import trustedPartnerRoutes from "../public/trustedpartner/trustedpartner.routes"
import userPreferenceRoutes from "../public/userpreference/userpreference.routes";
import jobApplicationRoutes from "../public/jobapplication/jobapplication.routes";
import jobRequirementRoutes from "../public/jobrequirement/jobrequirement.routes";
import gratuityRecordRoutes from "../public/gratuityrecord/gratuityrecord.routes";
import postEngagementRoutes from "../public/postengagement/postengagement.routes";
import highlyPreferredRoutes from "../public/highlypreferred/highlypreferred.routes"
import communityMemberRoutes from "../public/communitymember/communitymember.routes";
import employerFeedbackRoutes from "../public/employerfeedback/employerfeedback.routes";
import virtualHRRequestRoutes from "../public/virtualhrrequest/virtualhrrequest.routes";
import skilledCandidateRoutes from "../public/skilledcandidate/skilledcandidate.routes";
import unifiedServcieRequestRoutes from "../public/unifiedrequest/unifiedrequest.routes";
import policeVerificationRoutes from "../public/policeverification/policeverification.routes";
import complianceChecklistRoutes from "../public/compliancechecklist/compliancechecklist.routes";
import bestPracticesFacilityRoutes from "../public/bestpracticesfacility/bestpracticesfacility.routes";
import candidateBrandingBadgeRoutes from "../public/candidatebrandingbadge/candidatebrandingbadge.routes";
import preInterviewedContractorRoutes from "../public/preinterviewedcontractor/preinterviewedcontractor.routes";

// Create main router
const router = Router();

// ROUTE MOUNTS
router.use("/role", roleRoutes);
router.use("/slot", slotRoutes);
router.use("/admin", adminRoutes);
router.use("/badge", badgeRoutes);
router.use("/banner", bannerRoutes);
router.use("/booking", bookingRoutes);
router.use("/courses", coursesRoutes);
router.use("/support", supportRoutes);
router.use("/community", communityRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/virtualhr", virtualHRRoutes);
router.use("/bulkhiring", bulkhiringRoutes);
router.use("/planfeature", planfeatureRoutes);
router.use("/jobcategory", jobCategoryRoutes);
router.use("/workercategory", workerCategoryRoutes);
router.use("/subscriptionplan", subscriptionPlanRoutes);
router.use("/complianceCalendar", complianceCalendarRoutes);
router.use("/projectbasedhiring", projectBasedHiringRoutes);

router.use("/job", jobRoutes);
router.use("/user", userRoutes);
router.use("/feature", featureRoutes);
router.use("/message", messageRoutes);
router.use("/jobsaved", jobSavedRoutes);
router.use("/forumpost", forumPostRoutes);
router.use("/statecity", stateCityRoutes);
router.use("/assistant", assistantRoutes);
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
router.use("/policeverification", policeVerificationRoutes);
router.use("/compliancechecklist", complianceChecklistRoutes);
router.use("/unifiedservicerequest", unifiedServcieRequestRoutes);
router.use("/bestpracticesfacility", bestPracticesFacilityRoutes);
router.use("/candidatebrandingbadge", candidateBrandingBadgeRoutes);
router.use("/preinterviewedcontractor", preInterviewedContractorRoutes);

export default router;