import { apiRequest } from "./apiClient";
import { getDemoMode } from "./demoMode";
import { demoManagerApi } from "./demoApi";
import type {
  AcceptAdminInviteResponse,
  AddCasualRequest,
  AvailabilitySlot,
  CasualResponse,
  CreatePoolRequest,
  CreateShiftRequest,
  InviteAdminRequest,
  PoolAdminResponse,
  PoolDetailResponse,
  PoolResponse,
  PoolStatsResponse,
  ResendInviteResponse,
  SetAvailabilityRequest,
  ShiftDetailResponse,
  ShiftResponse,
} from "../types/api";
import { ApiError } from "../types/api";

export const getPools = (token: string) =>
  getDemoMode() ? demoManagerApi.getPools() : apiRequest<PoolResponse[]>("/pools", { token });

export const getPool = (poolId: string, token: string) =>
  getDemoMode() ? demoManagerApi.getPool(poolId) : apiRequest<PoolDetailResponse>(`/pools/${poolId}`, { token });

export const getPoolShifts = (poolId: string, token: string) =>
  getDemoMode()
    ? demoManagerApi.getPoolShifts(poolId)
    : apiRequest<ShiftDetailResponse[]>(`/pools/${poolId}/shifts`, { token });

export const getPoolStats = (poolId: string, token: string) =>
  getDemoMode()
    ? demoManagerApi.getPoolStats(poolId)
    : apiRequest<PoolStatsResponse>(`/pools/${poolId}/stats`, { token });

export const createPool = (name: string, token: string) => {
  if (getDemoMode()) {
    return demoManagerApi.createPool(name);
  }
  const body: CreatePoolRequest = { name };
  return apiRequest<PoolResponse>("/pools", { method: "POST", body, token });
};

export const deletePool = (poolId: string, token: string) =>
  getDemoMode() ? demoManagerApi.deletePool(poolId) : apiRequest<void>(`/pools/${poolId}`, { method: "DELETE", token });

export const addCasual = (poolId: string, name: string, phoneNumber: string, token: string) => {
  if (getDemoMode()) {
    return demoManagerApi.addCasual(poolId, name, phoneNumber);
  }
  const body: AddCasualRequest = { name, phoneNumber };
  return apiRequest<CasualResponse>(`/pools/${poolId}/casuals`, { method: "POST", body, token });
};

export const postShift = (poolId: string, shift: CreateShiftRequest, token: string) =>
  getDemoMode()
    ? demoManagerApi.postShift(poolId, shift)
    : apiRequest<ShiftResponse>(`/pools/${poolId}/shifts`, { method: "POST", body: shift, token });

export const removeCasual = (poolId: string, casualId: string, token: string) =>
  getDemoMode()
    ? demoManagerApi.removeCasual(poolId, casualId)
    : apiRequest<void>(`/pools/${poolId}/casuals/${casualId}`, { method: "DELETE", token });

export const cancelShift = (poolId: string, shiftId: string, token: string) =>
  getDemoMode()
    ? demoManagerApi.cancelShift(poolId, shiftId)
    : apiRequest<void>(`/pools/${poolId}/shifts/${shiftId}/cancel`, { method: "POST", token });

/** Release a casual from a shift (manager action) */
export const releaseCasual = (poolId: string, shiftId: string, casualId: string, token: string) =>
  getDemoMode()
    ? demoManagerApi.releaseCasual(poolId, shiftId, casualId)
    : apiRequest<void>(`/pools/${poolId}/shifts/${shiftId}/release/${casualId}`, { method: "POST", token });

export const resendInvite = (poolId: string, casualId: string, token: string) =>
  getDemoMode()
    ? demoManagerApi.resendInvite(poolId, casualId)
    : apiRequest<ResendInviteResponse>(`/pools/${poolId}/casuals/${casualId}/resend-invite`, {
        method: "POST",
        token,
      });

// ─────────────────────────────────────────────────────────────────────────────
// Pool Admin (2IC) API
// ─────────────────────────────────────────────────────────────────────────────

export const getPoolAdmins = (poolId: string, token: string) =>
  getDemoMode()
    ? Promise.resolve([]) // Demo mode: no admins
    : apiRequest<PoolAdminResponse[]>(`/pools/${poolId}/admins`, { token });

export const inviteAdmin = (poolId: string, request: InviteAdminRequest, token: string) =>
  getDemoMode()
    ? Promise.reject(new ApiError(501, "Admin invite not available in demo mode"))
    : apiRequest<PoolAdminResponse>(`/pools/${poolId}/admins`, {
        method: "POST",
        body: request,
        token,
      });

export const removeAdmin = (poolId: string, adminId: string, token: string) =>
  getDemoMode()
    ? Promise.reject(new ApiError(501, "Admin removal not available in demo mode"))
    : apiRequest<void>(`/pools/${poolId}/admins/${adminId}`, {
        method: "DELETE",
        token,
      });

export const acceptAdminInvite = (inviteToken: string, authToken: string) =>
  apiRequest<AcceptAdminInviteResponse>(`/pool-admins/accept/${inviteToken}`, {
    method: "POST",
    token: authToken,
  });

// ─────────────────────────────────────────────────────────────────────────────
// Casual Availability API
// ─────────────────────────────────────────────────────────────────────────────

export const getCasualAvailability = (poolId: string, casualId: string, token: string) =>
  getDemoMode()
    ? Promise.resolve([]) // Demo mode: no availability restrictions
    : apiRequest<AvailabilitySlot[]>(`/pools/${poolId}/casuals/${casualId}/availability`, { token });

export const setCasualAvailability = (
  poolId: string,
  casualId: string,
  availability: AvailabilitySlot[],
  token: string,
) => {
  if (getDemoMode()) {
    return Promise.resolve(availability);
  }
  const body: SetAvailabilityRequest = { availability };
  return apiRequest<AvailabilitySlot[]>(`/pools/${poolId}/casuals/${casualId}/availability`, {
    method: "PUT",
    body,
    token,
  });
};
