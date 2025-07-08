/**
 * ===============================================
 * 🌐 Auto Route Loader (src/routes/index.ts)
 * ===============================================
 * Loads *.routes.ts from admin/ and public/ folders,
 * preserving folder structure in route path.
 */

import { Router } from "express";
// ADMIN FOLDER
import adminRoutes from "../admin/admin/admin.routes";
import coursesRoutes from "../admin/courses/courses.routes";
import supportRoutes from "../admin/support/support.routes";
import communityRoutes from "../admin/community/community.routes";
import dashboardRoutes from "../admin/dashboard/dashboard.routes";
import virtualHRRoutes from "../admin/virtualhr/virtualhr.routes";
import bulkhiringRoutes from "../admin/bulkhiring/bulkhiring.routes";
import jobCategoryRoutes from "../admin/jobcategory/jobcategory.routes";
import workerCategoryRoutes from "../admin/workercategory/workercategory.routes";
import subscriptionPlanRoutes from "../admin/subscriptionplan/subscriptionplan.routes";
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
import contentBlockRoutes from "../public/contentblock/contentblock.routes";
import courseReviewRoutes from "../public/coursereview/coursereview.routes";
import forumCommentRoutes from "../public/forumcomment/forumcomment.routes";
import preInterviewDRoutes from "../public/preinterviewd/preinterviewd.routes";
import trainedWorkerRoutes from "../public/trainedworker/trainedworker.routes";
import userPreferenceRoutes from "../public/userpreference/userpreference.routes";
import jobApplicationRoutes from "../public/jobapplication/jobapplication.routes";
import jobRequirementRoutes from "../public/jobrequirement/jobrequirement.routes";
import gratuityRecordRoutes from "../public/gratuityrecord/gratuityrecord.routes";
import postEngagementRoutes from "../public/postengagement/postengagement.routes";
import communityMemberRoutes from "../public/communitymember/communitymember.routes";
import employerFeedbackRoutes from "../public/employerfeedback/employerfeedback.routes";
import virtualHRRequestRoutes from "../public/virtualhrrequest/virtualhrrequest.routes";
import skilledCandidateRoutes from "../public/skilledcandidate/skilledcandidate.routes";
import policeVerificationRoutes from "../public/policeverification/policeverification.routes";
import candidateBrandingBadgeRoutes from "../public/candidatebrandingbadge/candidatebrandingbadge.routes";

// Create main router
const router = Router();

// ROUTE MOUNTS
router.use("/admin", adminRoutes);
router.use("/courses", coursesRoutes);
router.use("/support", supportRoutes);
router.use("/community", communityRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/virtualhr", virtualHRRoutes);
router.use("/bulkhiring", bulkhiringRoutes);
router.use("/jobcategory", jobCategoryRoutes);
router.use("/workercategory", workerCategoryRoutes);
router.use("/subscriptionplan", subscriptionPlanRoutes);
router.use("/projectbasedhiring", projectBasedHiringRoutes);

router.use("/job", jobRoutes);
router.use("/user", userRoutes);
router.use("/feature", featureRoutes);
router.use("/message", messageRoutes);
router.use("/jobsaved", jobSavedRoutes);
router.use("/forumpost", forumPostRoutes);
router.use("/statecity", stateCityRoutes);
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
router.use("/preinterviewd", preInterviewDRoutes);
router.use("/trainedworker", trainedWorkerRoutes);
router.use("/gratuityrecord", gratuityRecordRoutes);
router.use("/jobapplication", jobApplicationRoutes);
router.use("/jobrequirement", jobRequirementRoutes);
router.use("/postengagement", postEngagementRoutes);
router.use("/userpreference", userPreferenceRoutes);
router.use("/communitymember", communityMemberRoutes);
router.use("/skilledcandidate", skilledCandidateRoutes);
router.use("/employerfeedback", employerFeedbackRoutes);
router.use("/virtualhrrequest", virtualHRRequestRoutes);
router.use("/policeverification", policeVerificationRoutes);
router.use("/candidatebrandingbadge", candidateBrandingBadgeRoutes);

export default router;

// import fs from "fs";
// import path from "path";
// import { Router } from "express";
// import { config } from "../config/config";

// const router = Router();

// // Get full route path like /admin/job
// const getRoutePath = (baseDir: string, filePath: string): string => {
//   const relativePath = path
//     .dirname(filePath)
//     .replace(baseDir, "")
//     .split(path.sep)
//     .filter(Boolean)
//     .join("/");

//   const baseFolderName = path.basename(baseDir);
//   return `/${baseFolderName}${relativePath ? `/${relativePath}` : ""}`;
// };

// // Register routes recursively from a base folder
// const registerRoutesRecursively = (baseDir: string) => {
//   fs.readdirSync(baseDir, { withFileTypes: true }).forEach((entry) => {
//     const fullPath = path.join(baseDir, entry.name);

//     if (entry.isDirectory()) {
//       registerRoutesRecursively(fullPath);
//     } else if (entry.isFile() && entry.name.endsWith(".routes.ts")) {
//       try {
//         const routeModule = require(fullPath);
//         const routeExport = routeModule.default;

//         if (routeExport && typeof routeExport === "function") {
//           const routePath = getRoutePath(baseDir, fullPath);
//           router.use(routePath, routeExport);

//           if (config.env === "development")
//             console.info(`✅ Mounted /api${routePath} → ${entry.name}`);
//         } else
//           console.log(`⚠️ Skipped ${entry.name}: No valid default export`);
//       } catch (err) {
//         console.log(`❌ Failed to register ${entry.name}:`, err);
//       }
//     }
//   });
// };

// // Paths for admin and public
// const srcPath = path.resolve(__dirname, "..");
// registerRoutesRecursively(path.join(srcPath, "admin"));
// registerRoutesRecursively(path.join(srcPath, "public"));

// export default router;