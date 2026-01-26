import { apiRequest } from "./apiClient";
import { getDemoMode } from "./demoMode";
import { demoCasualApi } from "./demoApi";
import type {
  BailShiftResponse,
  CasualAvailableShiftsResponse,
  ClaimByTokenResponse,
  ClaimShiftResponse,
  OptOutResponse,
  ShiftResponse,
  VerifyInviteResponse,
} from "../types/api";

export const getAvailableShifts = (phoneNumber: string) => {
  if (getDemoMode()) {
    return demoCasualApi.getAvailableShifts(phoneNumber);
  }
  const query = new URLSearchParams({ phoneNumber }).toString();
  return apiRequest<CasualAvailableShiftsResponse>(`/casual/shifts?${query}`);
};

export const getMyShifts = (phoneNumber: string) => {
  if (getDemoMode()) {
    return demoCasualApi.getMyShifts(phoneNumber);
  }
  const query = new URLSearchParams({ phoneNumber }).toString();
  return apiRequest<ShiftResponse[]>(`/casual/my-shifts?${query}`);
};

export const claimShift = (shiftId: string, phoneNumber: string) =>
  getDemoMode()
    ? demoCasualApi.claimShift(shiftId, phoneNumber)
    : apiRequest<ClaimShiftResponse>(`/casual/shifts/${shiftId}/claim`, {
        method: "POST",
        body: { phoneNumber },
      });

export const bailShift = (shiftId: string, phoneNumber: string) =>
  getDemoMode()
    ? demoCasualApi.bailShift(shiftId, phoneNumber)
    : apiRequest<BailShiftResponse>(`/casual/shifts/${shiftId}/release`, {
        method: "POST",
        body: { phoneNumber },
      });

// ─────────────────────────────────────────────────────────────────────────────
// Token-based endpoints (anonymous, SMS-initiated)
// ─────────────────────────────────────────────────────────────────────────────

/** Verify phone number via SMS invite token */
export const verifyInvite = (token: string) =>
  getDemoMode()
    ? demoCasualApi.verifyInvite()
    : apiRequest<VerifyInviteResponse>("/casual/verify", {
        method: "POST",
        body: { token },
      });

/** Opt out of SMS notifications */
export const optOut = (token: string) =>
  getDemoMode()
    ? demoCasualApi.optOut()
    : apiRequest<OptOutResponse>("/casual/opt-out", {
        method: "POST",
        body: { token },
      });

/** One-click shift claim from SMS link */
export const claimByToken = (token: string) =>
  getDemoMode()
    ? demoCasualApi.claimByToken()
    : apiRequest<ClaimByTokenResponse>(`/casual/claim/${token}`, {
        method: "POST",
      });
