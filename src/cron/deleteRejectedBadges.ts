import cron from "node-cron";
import colors from "colors";
import { subDays } from "date-fns";

import { TopRecruiter } from "../modals/toprecruiter.model";
import { ReliablePayer } from "../modals/reliablepayer.model";
import { SafeWorkplace } from "../modals/safeworkplace.model";
import { TrainedWorker } from "../modals/trainedworker.model";
import { FastResponder } from "../modals/fastresponder.model";
import { PreInterviewed } from "../modals/preinterviewd.model";
import { TrustedPartner } from "../modals/trustedpartner.model";
import { HighlyPreferred } from "../modals/highlypreferred.model";
import { SkilledCandidate } from "../modals/skilledcandidate.model";
import { PoliceVerification } from "../modals/policeverification.model";
import { ComplianceChecklist } from "../modals/compliancechecklist.model";
import { BestPracticesFacility } from "../modals/bestpracticesfacility.model";
import { PreInterviewedContractor } from "../modals/preinterviewedcontractor.model";

const models: Record<string, any> = {
    "Top Recruiter": TopRecruiter,
    "Reliable Payer": ReliablePayer,
    "Safe Workplace": SafeWorkplace,
    "Fast Responder": FastResponder,
    "Trusted Partner": TrustedPartner,
    "Highly Preferred": HighlyPreferred,
    "Police Verified": PoliceVerification,
    "Skilled Candidate": SkilledCandidate,
    "Compliance Pro": ComplianceChecklist,
    "Trained by Worker Sahaye": TrainedWorker,
    "Pre-Interviewed Candidate": PreInterviewed,
    "Best Facility Practices": BestPracticesFacility,
    "Pre-Screened Contractor": PreInterviewedContractor,
};

cron.schedule("0 0 * * *", async () => {
    const startTime = new Date();
    const cutoffDate = subDays(new Date(), 1);

    console.log(colors.blue(`\n🚀 [${startTime.toISOString()}] Running badge cleanup cron job...`));
    console.log(colors.gray(`Cutoff date for rejection: ${cutoffDate.toISOString()}`));

    for (const [label, Model] of Object.entries(models)) {
        try {
            const result = await Model.deleteMany({
                status: "rejected",
                updatedAt: { $lte: cutoffDate },
            });
            if (result.deletedCount > 0) {
                console.log(colors.green(`✔️ ${label}: Deleted ${result.deletedCount} rejected record(s)`));
            } else {
                console.log(colors.yellow(`➖ ${label}: No rejected records found to delete`));
            }
        } catch (err) {
            console.log(colors.red(`❌ ${label}: Failed to delete rejected records`));
            console.log(colors.red(`   ↳ ${err instanceof Error ? err.message : err}`));
        }
    }
    const endTime = new Date();
    console.log(colors.cyan(`✅ Completed badge cleanup at ${endTime.toISOString()}`));
});
