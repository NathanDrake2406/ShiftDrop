import { apiRequest } from "./apiClient";
import type { BailShiftResponse, CasualAvailableShiftsResponse, ClaimShiftResponse, ShiftResponse } from "../types/api";

export const getAvailableShifts = (phoneNumber: string) => {
  const query = new URLSearchParams({ phoneNumber }).toString();
  return apiRequest<CasualAvailableShiftsResponse>(`/casual/available-shifts?${query}`);
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
  apiRequest<BailShiftResponse>(`/casual/shifts/${shiftId}/bail`, {
    method: "POST",
    body: { phoneNumber },
  });
