import { apiRequest } from "./apiClient";
import type {
  AddCasualRequest,
  CasualResponse,
  CreatePoolRequest,
  CreateShiftRequest,
  PoolDetailResponse,
  PoolResponse,
  ShiftDetailResponse,
  ShiftResponse,
} from "../types/api";

export const getPools = (token: string) => apiRequest<PoolResponse[]>("/pools", { token });

export const getPool = (poolId: string, token: string) =>
  apiRequest<PoolDetailResponse>(`/pools/${poolId}`, { token });

export const getPoolShifts = (poolId: string, token: string) =>
  apiRequest<ShiftDetailResponse[]>(`/pools/${poolId}/shifts`, { token });

export const createPool = (name: string, token: string) => {
  const body: CreatePoolRequest = { name };
  return apiRequest<PoolResponse>("/pools", { method: "POST", body, token });
};

export const addCasual = (poolId: string, name: string, phoneNumber: string, token: string) => {
  const body: AddCasualRequest = { name, phoneNumber };
  return apiRequest<CasualResponse>(`/pools/${poolId}/casuals`, { method: "POST", body, token });
};

export const postShift = (poolId: string, shift: CreateShiftRequest, token: string) =>
  apiRequest<ShiftResponse>(`/pools/${poolId}/shifts`, { method: "POST", body: shift, token });

export const removeCasual = (poolId: string, casualId: string, token: string) =>
  apiRequest<void>(`/pools/${poolId}/casuals/${casualId}`, { method: "DELETE", token });

export const cancelShift = (poolId: string, shiftId: string, token: string) =>
  apiRequest<void>(`/pools/${poolId}/shifts/${shiftId}/cancel`, { method: "POST", token });

export const releaseClaim = (poolId: string, shiftId: string, claimId: string, token: string) =>
  apiRequest<void>(`/pools/${poolId}/shifts/${shiftId}/claims/${claimId}/release`, { method: "POST", token });
