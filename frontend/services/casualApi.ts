import { apiRequest } from "./apiClient";
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
  const query = new URLSearchParams({ phoneNumber }).toString();
  return apiRequest<CasualAvailableShiftsResponse>(`/casual/shifts?${query}`);
};

export const getMyShifts = (phoneNumber: string) => {
  const query = new URLSearchParams({ phoneNumber }).toString();
  return apiRequest<ShiftResponse[]>(`/casual/my-shifts?${query}`);
};

export const claimShift = (shiftId: string, phoneNumber: string) =>
  apiRequest<ClaimShiftResponse>(`/casual/shifts/${shiftId}/claim`, {
    method: "POST",
    body: { phoneNumber },
  });

export const bailShift = (shiftId: string, phoneNumber: string) =>
  apiRequest<BailShiftResponse>(`/casual/shifts/${shiftId}/release`, {
    method: "POST",
    body: { phoneNumber },
  });

// ─────────────────────────────────────────────────────────────────────────────
// Token-based endpoints (anonymous, SMS-initiated)
// ─────────────────────────────────────────────────────────────────────────────

/** Verify phone number via SMS invite token */
export const verifyInvite = (token: string) =>
  apiRequest<VerifyInviteResponse>("/casual/verify", {
    method: "POST",
    body: { token },
  });

/** Opt out of SMS notifications */
export const optOut = (token: string) =>
  apiRequest<OptOutResponse>("/casual/opt-out", {
    method: "POST",
    body: { token },
  });

/** One-click shift claim from SMS link */
export const claimByToken = (token: string) =>
  apiRequest<ClaimByTokenResponse>(`/casual/claim/${token}`, {
    method: "POST",
  });
