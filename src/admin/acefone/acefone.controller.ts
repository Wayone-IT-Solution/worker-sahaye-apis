import { NextFunction, Request, Response } from "express";
import AcefoneService from "../../services/acefone.service";
import ApiResponse from "../../utils/ApiResponse";
import ApiError from "../../utils/ApiError";
import Admin from "../../modals/admin.model";
import { User } from "../../modals/user.model";

export class AcefoneController {
    /**
     * Initiates a click-to-call.
     */
    static async initiateCall(req: Request, res: Response, next: NextFunction) {
        try {
            const { to: customerId } = req.body;
            const userContext = (req as any).user;

            // 1. Determine the Customer Number ('to' field)
            let customerNumber = "";

            if (customerId) {
                // If customerId is provided, it's an Admin calling a specific User
                const user = await User.findById(customerId);
                if (!user) {
                    throw new ApiError(404, "Target user not found");
                }
                customerNumber = user.mobile;
            } else {
                // If no customerId provided, check if a User is calling support
                const user = await User.findById(userContext.id);
                if (user) {
                    customerNumber = user.mobile;
                }
            }

            if (!customerNumber) {
                throw new ApiError(400, "Customer phone number could not be determined");
            }

            // 2. Select the Best Admin ('from' field)
            const bestAdmin = await AcefoneService.getBestAdmin();
            const adminPhoneNumber = bestAdmin.phoneNumber;

            if (!adminPhoneNumber) {
                throw new ApiError(400, "Selected admin does not have a phone number configured");
            }

            // 3. Initiate the Call via Acefone
            const response = await AcefoneService.initiateCall(adminPhoneNumber, customerNumber);

            // 4. Increment Admin's Call Count
            await AcefoneService.incrementCallCount(bestAdmin._id.toString());

            return res.status(200).json(new ApiResponse(200, response, "Acefone call initiated successfully"));
        } catch (err) {
            next(err);
        }
    }

    /**
     * Routes an incoming call to the best admin.
     */
    static async getBestAdminForCall(req: Request, res: Response, next: NextFunction) {
        try {
            const bestAdmin = await AcefoneService.getBestAdmin();

            // Increment count when chosen
            await AcefoneService.incrementCallCount(bestAdmin._id.toString());

            return res.status(200).json(new ApiResponse(200, {
                adminId: bestAdmin._id,
                username: bestAdmin.username,
                phoneNumber: bestAdmin.phoneNumber
            }, "Best admin selected for incoming call"));
        } catch (err) {
            next(err);
        }
    }

    /**
     * Fetch call records from Acefone
     */
    static async getCallRecords(req: Request, res: Response, next: NextFunction) {
        try {
            const { from_date, to_date, startDate, endDate, page, limit } = req.query as any;

            // Set default dates if not provided
            const endDateDefault = new Date();
            endDateDefault.setDate(endDateDefault.getDate() + 1);

            const startDateDefault = new Date(endDateDefault);
            startDateDefault.setDate(endDateDefault.getDate() - (req.query.callerid ? 30 : 7));

            const params = {
                from_date: from_date || startDate || startDateDefault.toISOString().split('T')[0],
                to_date: to_date || endDate || endDateDefault.toISOString().split('T')[0],
                page: Number(page) || 1,
                limit: Number(limit) || 10,
                agents: req.query.agents,
                callerid: req.query.callerid,
                call_type: req.query.call_type
            };

            const data = await AcefoneService.getCallRecords(params);

            return res.status(200).json(new ApiResponse(200, {
                result: data.results,
                pagination: {
                    totalPages: Math.ceil((data.count || 0) / (data.limit || 10)),
                    totalItems: data.count || 0,
                    currentPage: data.page || 1,
                    itemsPerPage: data.limit || 10
                }
            }, "Call records fetched successfully"));
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get a specific call record by ID
     */
    static async getCallRecordById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 1);

            const startDate = new Date(endDate);
            startDate.setDate(endDate.getDate() - 31);

            const params = {
                from_date: startDate.toISOString().split('T')[0],
                to_date: endDate.toISOString().split('T')[0],
                limit: 100
            };

            const data = await AcefoneService.getCallRecords(params);
            const record = data.results.find((r: any) => String(r.id) === String(id));

            if (!record) {
                throw new ApiError(404, "Call record not found");
            }

            return res.status(200).json(new ApiResponse(200, record, "Call record fetched successfully"));
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get call statistics/counts
     */
    static async getCounts(req: Request, res: Response, next: NextFunction) {
        try {
            const { from_date, to_date, startDate, endDate, agents, call_type } = req.query as any;

            const params = {
                from_date: from_date || startDate,
                to_date: to_date || endDate,
                agents,
                call_type
            };

            const data = await AcefoneService.getCounts(params);

            return res.status(200).json(new ApiResponse(200, data, "Call counts fetched successfully"));
        } catch (err) {
            next(err);
        }
    }

    /**
     * Fetch all agents from Acefone
     */
    static async getAgents(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await AcefoneService.getAgents();
            return res.status(200).json(new ApiResponse(200, data, "Acefone agents fetched successfully"));
        } catch (err) {
            next(err);
        }
    }
}
