import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as casualApi from "../services/casualApi";

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys Factory
// ─────────────────────────────────────────────────────────────────────────────

export const casualKeys = {
  all: ["casual"] as const,
  availableShifts: (phoneNumber: string) => [...casualKeys.all, "available", phoneNumber] as const,
  myShifts: (phoneNumber: string) => [...casualKeys.all, "myShifts", phoneNumber] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch available shifts for a casual
 */
export function useAvailableShifts(phoneNumber: string) {
  return useQuery({
    queryKey: casualKeys.availableShifts(phoneNumber),
    queryFn: () => casualApi.getAvailableShifts(phoneNumber),
    staleTime: 15_000, // Shifts are time-sensitive
    enabled: !!phoneNumber,
  });
}

/**
 * Fetch shifts the casual has claimed
 */
export function useMyShifts(phoneNumber: string) {
  return useQuery({
    queryKey: casualKeys.myShifts(phoneNumber),
    queryFn: () => casualApi.getMyShifts(phoneNumber),
    staleTime: 15_000,
    enabled: !!phoneNumber,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useClaimShift(phoneNumber: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftId: string) => casualApi.claimShift(shiftId, phoneNumber),
    onSuccess: () => {
      // Invalidate both lists - the shift moves from available to my shifts
      queryClient.invalidateQueries({ queryKey: casualKeys.availableShifts(phoneNumber) });
      queryClient.invalidateQueries({ queryKey: casualKeys.myShifts(phoneNumber) });
    },
  });
}

export function useBailShift(phoneNumber: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (shiftId: string) => casualApi.bailShift(shiftId, phoneNumber),
    onSuccess: () => {
      // Invalidate both lists - the shift moves from my shifts back to available
      queryClient.invalidateQueries({ queryKey: casualKeys.availableShifts(phoneNumber) });
      queryClient.invalidateQueries({ queryKey: casualKeys.myShifts(phoneNumber) });
    },
  });
}

// Token-based mutations (for SMS links - no cache involvement)
export function useVerifyInvite() {
  return useMutation({
    mutationFn: (token: string) => casualApi.verifyInvite(token),
  });
}

export function useOptOut() {
  return useMutation({
    mutationFn: (token: string) => casualApi.optOut(token),
  });
}

export function useClaimByToken() {
  return useMutation({
    mutationFn: (token: string) => casualApi.claimByToken(token),
  });
}
