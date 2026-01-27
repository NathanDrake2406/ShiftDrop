import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth";
import * as managerApi from "../services/managerApi";
import type { CreateShiftRequest, InviteAdminRequest, AvailabilitySlot } from "../types/api";

// ─────────────────────────────────────────────────────────────────────────────
// Query Keys Factory
// ─────────────────────────────────────────────────────────────────────────────

export const managerKeys = {
  all: ["manager"] as const,
  pools: () => [...managerKeys.all, "pools"] as const,
  pool: (poolId: string) => [...managerKeys.all, "pool", poolId] as const,
  poolShifts: (poolId: string) => [...managerKeys.pool(poolId), "shifts"] as const,
  poolStats: (poolId: string) => [...managerKeys.pool(poolId), "stats"] as const,
  poolAdmins: (poolId: string) => [...managerKeys.pool(poolId), "admins"] as const,
  casualAvailability: (poolId: string, casualId: string) =>
    [...managerKeys.pool(poolId), "casual", casualId, "availability"] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// Hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch all pools for the manager
 */
export function usePools() {
  const { getAccessToken } = useAuth();

  return useQuery({
    queryKey: managerKeys.pools(),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.getPools(token);
    },
    staleTime: 30_000, // Consider fresh for 30s
  });
}

/**
 * Fetch a single pool with casuals
 */
export function usePool(poolId: string | undefined) {
  const { getAccessToken } = useAuth();

  return useQuery({
    queryKey: managerKeys.pool(poolId!),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.getPool(poolId!, token);
    },
    enabled: !!poolId,
    staleTime: 30_000,
  });
}

/**
 * Fetch shifts for a pool
 */
export function usePoolShifts(poolId: string | undefined) {
  const { getAccessToken } = useAuth();

  return useQuery({
    queryKey: managerKeys.poolShifts(poolId!),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.getPoolShifts(poolId!, token);
    },
    enabled: !!poolId,
    staleTime: 15_000, // Shifts are more time-sensitive
  });
}

/**
 * Fetch pool stats
 */
export function usePoolStats(poolId: string | undefined) {
  const { getAccessToken } = useAuth();

  return useQuery({
    queryKey: managerKeys.poolStats(poolId!),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.getPoolStats(poolId!, token);
    },
    enabled: !!poolId,
    staleTime: 60_000, // Stats can be staler
  });
}

/**
 * Fetch pool admins
 */
export function usePoolAdmins(poolId: string | undefined) {
  const { getAccessToken } = useAuth();

  return useQuery({
    queryKey: managerKeys.poolAdmins(poolId!),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.getPoolAdmins(poolId!, token);
    },
    enabled: !!poolId,
    staleTime: 60_000,
  });
}

/**
 * Fetch casual availability
 */
export function useCasualAvailability(poolId: string | undefined, casualId: string | undefined) {
  const { getAccessToken } = useAuth();

  return useQuery({
    queryKey: managerKeys.casualAvailability(poolId!, casualId!),
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.getCasualAvailability(poolId!, casualId!, token);
    },
    enabled: !!poolId && !!casualId,
    staleTime: 60_000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export function useCreatePool() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.createPool(name, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.pools() });
    },
  });
}

export function useDeletePool() {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (poolId: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.deletePool(poolId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.pools() });
    },
  });
}

export function useAddCasual(poolId: string) {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, phoneNumber }: { name: string; phoneNumber: string }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.addCasual(poolId, name, phoneNumber, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.pool(poolId) });
      queryClient.invalidateQueries({ queryKey: managerKeys.poolStats(poolId) });
    },
  });
}

export function useRemoveCasual(poolId: string) {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (casualId: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.removeCasual(poolId, casualId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.pool(poolId) });
      queryClient.invalidateQueries({ queryKey: managerKeys.poolStats(poolId) });
    },
  });
}

export function usePostShift(poolId: string) {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shift: CreateShiftRequest) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.postShift(poolId, shift, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.poolShifts(poolId) });
      queryClient.invalidateQueries({ queryKey: managerKeys.poolStats(poolId) });
    },
  });
}

export function useCancelShift(poolId: string) {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.cancelShift(poolId, shiftId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.poolShifts(poolId) });
      queryClient.invalidateQueries({ queryKey: managerKeys.poolStats(poolId) });
    },
  });
}

export function useReleaseCasual(poolId: string) {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shiftId, casualId }: { shiftId: string; casualId: string }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.releaseCasual(poolId, shiftId, casualId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.poolShifts(poolId) });
      queryClient.invalidateQueries({ queryKey: managerKeys.poolStats(poolId) });
    },
  });
}

export function useResendInvite(poolId: string) {
  const { getAccessToken } = useAuth();

  return useMutation({
    mutationFn: async (casualId: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.resendInvite(poolId, casualId, token);
    },
    // No cache invalidation needed - resending doesn't change data
  });
}

export function useResendShiftNotification(poolId: string) {
  const { getAccessToken } = useAuth();

  return useMutation({
    mutationFn: async (shiftId: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.resendShiftNotification(poolId, shiftId, token);
    },
    // No cache invalidation needed
  });
}

export function useInviteAdmin(poolId: string) {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: InviteAdminRequest) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.inviteAdmin(poolId, request, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.poolAdmins(poolId) });
    },
  });
}

export function useRemoveAdmin(poolId: string) {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (adminId: string) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.removeAdmin(poolId, adminId, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: managerKeys.poolAdmins(poolId) });
    },
  });
}

export function useSetCasualAvailability(poolId: string, casualId: string) {
  const { getAccessToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (availability: AvailabilitySlot[]) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Unable to authenticate");
      return managerApi.setCasualAvailability(poolId, casualId, availability, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: managerKeys.casualAvailability(poolId, casualId),
      });
    },
  });
}
