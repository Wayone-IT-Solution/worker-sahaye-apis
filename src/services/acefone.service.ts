import Admin from "../modals/admin.model";
import Role from "../modals/role.model";
import { config } from "../config/config";
import ApiError from "../utils/ApiError";
import { User } from "../modals/user.model";

class AcefoneService {
    /**
     * Selects the best admin for an incoming call based on:
     * 1. Minimum calls taken
     * 2. If calls are equal, the person who hasn't taken a call for the longest time
     * 3. Must have the 'call-person' role
     */
    static async getBestAdmin() {
        // Find the "call-person" role first
        const callPersonRole = await Role.findOne({ name: "call-person" });

        const filter: any = {
            status: true,
            phoneNumber: { $exists: true, $ne: "" }
        };

        if (callPersonRole) {
            filter.role = callPersonRole._id;
        }

        // Find active admins with the specific role who have a phone number configured
        const admin = await Admin.findOne(filter)
            .sort({ callsTaken: 1, lastCallAt: 1, createdAt: 1 })
            .exec();

        if (!admin) {
            throw new ApiError(404, `No active admin with${callPersonRole ? " 'call-person' role and" : ""} a phone number found for call assignment`);
        }

        return admin;
    }

    /**
     * Initiates a Click-to-Call between agent and customer.
     */
    static async initiateCall(agentNumber: string, destinationNumber: string) {
        if (!config.acefone.apiKey) {
            throw new ApiError(500, "Acefone API key is not configured");
        }

        const payload = {
            async: '1',
            agent_number: agentNumber,
            destination_number: destinationNumber,
        };

        console.log(`[AcefoneService] Initiating call: ${agentNumber} -> ${destinationNumber}`);

        try {
            const response = await fetch(`${config.acefone.baseUrl}/click_to_call`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': config.acefone.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok) {
                console.error("[AcefoneService] Error response:", result);
                throw new ApiError(response.status, result.message || 'Failed to initiate Acefone call');
            }

            console.log("[AcefoneService] Call success:", result);
            return result;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            console.error("[AcefoneService] Network/Unknown error:", error);
            throw new ApiError(500, error instanceof Error ? error.message : "Internal server error during call initiation");
        }
    }

    /**
     * Increments the call count for an admin and updates lastCallAt.
     */
    static async incrementCallCount(adminId: string) {
        return await Admin.findByIdAndUpdate(
            adminId,
            {
                $inc: { callsTaken: 1 },
                $set: { lastCallAt: new Date() }
            },
            { new: true }
        );
    }

    /**
     * Fetch call records from Acefone
     */
    static async getCallRecords(params: any, skipUserMapping: boolean = false) {
        if (!config.acefone.apiKey) {
            throw new ApiError(500, "Acefone API key is not configured");
        }

        try {
            const queryParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null) {
                    queryParams.append(key, params[key]);
                }
            });

            console.log(`[AcefoneService] Fetching call records with params: ${queryParams.toString()}`);

            const response = await fetch(`${config.acefone.baseUrl}/call/records?${queryParams.toString()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${config.acefone.apiKey}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("[AcefoneService] Error fetching records:", data);
                throw new ApiError(response.status, data.message || 'Failed to fetch Acefone call records');
            }

            const records = data.results || (Array.isArray(data) ? data : data.data) || [];

            // Normalize return structure
            const normalizedData = {
                ...data,
                results: records,
                count: data.count || records.length
            };

            if (!skipUserMapping && records.length > 0) {
                // Fetch all users to map numbers (can be optimized if volume is high)
                const users = await User.find({}, { mobile: 1, fullName: 1 }).lean();

                const nameMap: Record<string, string> = {};
                users.forEach((u: any) => {
                    if (u.mobile) {
                        const digits = String(u.mobile).replace(/\D/g, '');
                        if (digits) {
                            nameMap[digits] = u.fullName;
                            if (digits.length >= 10) {
                                nameMap[digits.slice(-10)] = u.fullName;
                            }
                        }
                    }
                });

                records.forEach((r: any) => {
                    const digits = r.client_number ? String(r.client_number).replace(/\D/g, '') : "";
                    let foundName = nameMap[digits];

                    if (!foundName && digits.length >= 10) {
                        foundName = nameMap[digits.slice(-10)];
                    }

                    r.user_name = foundName || 'Unknown User';
                });
            }

            return normalizedData;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            console.error("[AcefoneService] Error fetching call records:", error);
            throw new ApiError(500, error instanceof Error ? error.message : "Internal server error while fetching call records");
        }
    }

    /**
     * Get call statistics/counts
     */
    static async getCounts(query: any = {}) {
        try {
            // Default to last 30 days
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 1);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            const params = {
                from_date: query.from_date || startDate.toISOString().split('T')[0],
                to_date: query.to_date || endDate.toISOString().split('T')[0],
                limit: 1000,
                agents: query.agents,
                call_type: query.call_type
            };

            const response = await this.getCallRecords(params, true);
            const calls = response.results || [];

            const stats: any = {
                totalCalls: calls.length,
                totalDuration: 0,
                avgDuration: 0,
                answered: 0,
                missed: 0,
                failed: 0,
                inbound: 0,
                outbound: 0,
                missedInbound: 0,
                missedOutbound: 0,
                byAgent: {},
            };

            calls.forEach((call: any) => {
                const duration = Number(call.total_call_duration) || 0;
                stats.totalDuration += duration;

                const isMissed = call.status === 'missed' || call.status === 'failed';

                if (call.status === 'answered') stats.answered++;
                else if (call.status === 'missed') stats.missed++;
                else if (call.status === 'failed') stats.failed++;

                if (call.direction === 'inbound') {
                    stats.inbound++;
                    if (isMissed) stats.missedInbound++;
                } else if (call.direction === 'outbound') {
                    stats.outbound++;
                    if (isMissed) stats.missedOutbound++;
                }

                // Agent stats
                const agentName = call.agent_name || 'Unassigned';
                if (!stats.byAgent[agentName]) {
                    stats.byAgent[agentName] = {
                        name: agentName,
                        total: 0,
                        answered: 0,
                        missed: 0,
                        duration: 0
                    };
                }
                stats.byAgent[agentName].total++;
                stats.byAgent[agentName].duration += duration;
                if (call.status === 'answered') stats.byAgent[agentName].answered++;
                else stats.byAgent[agentName].missed++;
            });

            if (stats.totalCalls > 0) {
                stats.avgDuration = Math.round(stats.totalDuration / stats.totalCalls);
            }

            stats.byAgent = Object.values(stats.byAgent).sort((a: any, b: any) => b.total - a.total);

            return stats;
        } catch (error) {
            console.error("[AcefoneService] Error calculating counts:", error);
            throw error;
        }
    }

    /**
     * Fetch all agents from Acefone
     */
    static async getAgents() {
        if (!config.acefone.apiKey) {
            throw new ApiError(500, "Acefone API key is not configured");
        }

        try {
            const response = await fetch(`${config.acefone.baseUrl}/users`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${config.acefone.apiKey}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("[AcefoneService] Error fetching agents:", data);
                throw new ApiError(response.status, data.message || 'Failed to fetch Acefone agents');
            }

            return data || [];
        } catch (error) {
            if (error instanceof ApiError) throw error;
            console.error("[AcefoneService] Error fetching agents:", error);
            throw new ApiError(500, error instanceof Error ? error.message : "Internal server error while fetching agents");
        }
    }
}

export default AcefoneService;
