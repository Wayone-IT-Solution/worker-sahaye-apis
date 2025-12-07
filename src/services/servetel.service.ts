import ApiError from "../utils/ApiError";
import { config } from "../config/config";
import axios, { AxiosInstance } from "axios";

type ClickToCallPayload = {
  to: string;
  from: string;
  callerId?: string;
  customParams?: Record<string, any>;
};

type CallStatsParams = {
  page?: number;
  limit?: number;
  toDate?: string; // ISO string
  fromDate?: string; // ISO string
};

type ServetelListParams = {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  searchKey?: string;
  sortKey?: string;
  sortDir?: string;
};

type PaginatedServetelResponse<T = any> = {
  result: T[];
  pagination: {
    totalPages: number;
    totalItems: number;
    currentPage: number;
    itemsPerPage: number;
  };
};

class ServetelService {
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiresAt: number | null = null;

  private get authPath() {
    return config.servetel.authPath || "/v1/auth/login";
  }
  private get clickToCallPath() {
    return config.servetel.clickToCallPath || "/v1/click-to-call";
  }
  private get statsPath() {
    return config.servetel.statsPath || "/v1/calls/summary";
  }
  private get recordingsPath() {
    return config.servetel.recordingsPath || "/v1/calls/recordings";
  }
  private get forwardingPath() {
    return config.servetel.forwardingPath || "/v1/call-forwarding";
  }

  constructor() {
    this.client = axios.create({
      baseURL: config.servetel.baseUrl || "https://api.servetel.in",
      timeout: 15000,
    });
  }

  private isTokenValid() {
    return (
      this.token &&
      this.tokenExpiresAt &&
      Date.now() < this.tokenExpiresAt - 60 * 1000 // 60s buffer
    );
  }

  private async fetchToken(): Promise<string> {
    if (!config.servetel.clientId || !config.servetel.clientSecret) {
      throw new ApiError(
        500,
        "Servetel credentials missing. Please set SERVETEL_CLIENT_ID and SERVETEL_CLIENT_SECRET."
      );
    }

    const response = await this.client.post(this.authPath, {
      client_id: config.servetel.clientId,
      client_secret: config.servetel.clientSecret,
    });

    const data = (response.data as any) || {};
    const accessToken =
      data.access_token ||
      data.token ||
      data?.data?.token ||
      data?.data?.access_token;
    const expiresIn = data.expires_in || data?.data?.expires_in || 3600;

    if (!accessToken) {
      throw new ApiError(
        500,
        "Failed to retrieve Servetel access token. Check credentials and auth path."
      );
    }

    this.token = accessToken;
    this.tokenExpiresAt = Date.now() + Number(expiresIn) * 1000;
    return accessToken;
  }

  private async getAuthHeader(): Promise<{ Authorization: string }> {
    const token = this.isTokenValid() ? this.token! : await this.fetchToken();
    return { Authorization: `Bearer ${token}` };
  }

  private async getWithAuth<T>(
    path: string,
    params?: Record<string, any>
  ): Promise<T> {
    const headers = await this.getAuthHeader();
    const filteredParams = Object.fromEntries(
      Object.entries(params || {}).filter(
        ([, value]) => value !== undefined && value !== null && value !== ""
      )
    );

    const response = await this.client.get<T>(path, {
      headers,
      params: filteredParams,
    });
    return response.data as any;
  }

  private buildPaginatedResponse<T = any>(
    payload: any,
    defaults: { page?: number; limit?: number }
  ): PaginatedServetelResponse<T> {
    const listCandidate =
      payload?.data?.result ||
      payload?.data?.records ||
      payload?.data ||
      payload?.items ||
      payload?.records ||
      payload?.result ||
      payload;
    const result: T[] = Array.isArray(listCandidate)
      ? (listCandidate as T[])
      : [];

    const meta =
      payload?.pagination || payload?.meta || payload?.data?.pagination || {};

    const totalItems = Number(
      meta.totalItems || meta.total || meta.count || result.length || 0
    );
    const itemsPerPageRaw =
      meta.itemsPerPage ||
      meta.per_page ||
      meta.limit ||
      defaults.limit ||
      result.length ||
      10;
    const itemsPerPage = Number(itemsPerPageRaw) || 10;
    const currentPage =
      Number(meta.currentPage || meta.page || defaults.page || 1) || 1;
    const totalPages =
      Number(meta.totalPages) ||
      (itemsPerPage ? Math.ceil(totalItems / itemsPerPage) : 1);

    return {
      result,
      pagination: {
        totalPages,
        totalItems,
        currentPage,
        itemsPerPage,
      },
    };
  }

  async clickToCall(payload: ClickToCallPayload) {
    const headers = await this.getAuthHeader();
    const body = {
      to: payload.to,
      from: payload.from,
      caller_id: payload.callerId || config.servetel.defaultCallerId,
      ...payload.customParams,
    };

    const response = await this.client.post(this.clickToCallPath, body, {
      headers,
    });
    return response.data;
  }
  async getCallStats(params: CallStatsParams = {}) {
    const headers = await this.getAuthHeader();
    const response = await this.client.get(this.statsPath, {
      headers,
      params: {
        to: params.toDate,
        page: params.page,
        limit: params.limit,
        from: params.fromDate,
      },
    });
    return response.data;
  }

  async getCallRecordings(
    params: ServetelListParams = {}
  ): Promise<PaginatedServetelResponse> {
    const response = await this.getWithAuth(this.recordingsPath, {
      page: params.page,
      limit: params.limit,
      from: params.startDate,
      to: params.endDate,
      search: params.search,
      search_key: params.searchKey,
      sort: params.sortKey,
      order: params.sortDir,
    });

    return this.buildPaginatedResponse(response, {
      page: params.page,
      limit: params.limit,
    });
  }

  async getCallForwardingRules(
    params: ServetelListParams = {}
  ): Promise<PaginatedServetelResponse> {
    const response = await this.getWithAuth(this.forwardingPath, {
      page: params.page,
      limit: params.limit,
      search: params.search,
      search_key: params.searchKey,
      sort: params.sortKey,
      order: params.sortDir,
    });

    return this.buildPaginatedResponse(response, {
      page: params.page,
      limit: params.limit,
    });
  }
}

export const servetelService = new ServetelService();
