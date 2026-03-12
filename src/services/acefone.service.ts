import axios from "axios";
import { config } from "../config/config";
import ApiError from "../utils/ApiError";

class AcefoneService {
  /**
   * Initiate a Click-to-Call between agent and customer
   * @param agentNumber - The agent's phone number (From)
   * @param destinationNumber - The customer's phone number (To)
   */
  async clickToCall(
    agentNumber: string,
    destinationNumber: string,
    callField?: string,
  ) {
    try {
      if (!config.acefone.apiKey) {
        throw new ApiError(500, "Acefone API key is not configured");
      }

      const payload: any = {
        async: "1",
        agent_number: agentNumber,
        destination_number: destinationNumber,
      };
      // include callField in the payload for logging/tracking if provided
      if (callField) payload.callField = callField;

      const response = await axios.post(
        `${config.acefone.baseUrl}/click_to_call`,
        payload,
        {
          headers: {
            accept: "application/json",
            Authorization: config.acefone.apiKey,
            "content-type": "application/json",
          },
        },
      );

      return response.data;
    } catch (error: any) {
      console.error("[AcefoneService] Error initiating call:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new ApiError(
        error.response?.status || 500,
        error.response?.data?.message || "Failed to initiate call via Acefone",
      );
    }
  }

  /**
   * Fetch call records from Acefone
   * @param params - Query parameters (from_date, to_date, page, limit, etc.)
   */
  async getCallRecords(params: any) {
    try {
      if (!config.acefone.apiKey) {
        throw new ApiError(500, "Acefone API key is not configured");
      }

      const response = await axios.get(
        `${config.acefone.baseUrl}/call/records`,
        {
          params,
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${config.acefone.apiKey}`,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      console.error("[AcefoneService] Error fetching call records:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      throw new ApiError(
        error.response?.status || 500,
        error.response?.data?.message ||
        "Failed to fetch call records from Acefone",
      );
    }
  }
}

export const acefoneService = new AcefoneService();
