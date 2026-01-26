import { api as mockApi } from "./mockApi";
import { ApiError } from "../types/api";
import type {
  PoolResponse,
  PoolDetailResponse,
  PoolStatsResponse,
  ShiftDetailResponse,
  ShiftResponse,
  CasualResponse,
  ClaimResponse,
  InviteStatusValue,
  ClaimStatusValue,
  ShiftStatusValue,
  CasualAvailableShiftsResponse,
  ClaimShiftResponse,
  BailShiftResponse,
  VerifyInviteResponse,
  OptOutResponse,
  ClaimByTokenResponse,
  ResendInviteResponse,
  ResendShiftNotificationResponse,
} from "../types/api";
import type { Pool, Casual, Shift, ShiftClaim } from "../types";
import { ClaimStatus, InviteStatus, ShiftStatus } from "../types";

const toInviteStatusValue = (status: InviteStatus): InviteStatusValue =>
  status === InviteStatus.Accepted ? "Accepted" : "Pending";

const toCasualResponse = (casual: Casual): CasualResponse => {
  const inviteStatus = toInviteStatusValue(casual.inviteStatus);
  return {
    id: casual.id,
    name: casual.name,
    phoneNumber: casual.phoneNumber,
    inviteStatus,
    isActive: inviteStatus === "Accepted",
    isOptedOut: false,
  };
};

const toPoolResponse = (pool: Pool): PoolResponse => ({
  id: pool.id,
  name: pool.name,
  createdAt: new Date().toISOString(),
});

const toPoolDetailResponse = (pool: Pool): PoolDetailResponse => ({
  ...toPoolResponse(pool),
  casuals: pool.casuals.map(toCasualResponse),
});

const toShiftResponse = (shift: Shift): ShiftResponse => ({
  id: shift.id,
  startsAt: shift.startsAt,
  endsAt: shift.endsAt,
  spotsNeeded: shift.spotsNeeded,
  spotsRemaining: shift.spotsRemaining,
  status: shift.status as ShiftStatusValue,
});

const toClaimResponse = (claim: ShiftClaim): ClaimResponse => ({
  casualId: claim.casualId,
  casualName: claim.casualName,
  status: claim.status as ClaimStatusValue,
  claimedAt: claim.claimedAt,
});

const toShiftDetailResponse = (shift: Shift): ShiftDetailResponse => ({
  ...toShiftResponse(shift),
  claims: shift.claims.map(toClaimResponse),
});

const getPoolOrThrow = async (poolId: string): Promise<Pool> => {
  const pool = await mockApi.manager.getPoolDetails(poolId);
  if (!pool) {
    throw new ApiError(404, "Pool not found");
  }
  return pool;
};

const getCasualOrThrow = async (phoneNumber: string): Promise<Casual> => {
  const casual = await mockApi.casual.login(phoneNumber);
  if (!casual) {
    throw new ApiError(404, "Casual not found");
  }
  return casual;
};

export const demoManagerApi = {
  getPools: async (): Promise<PoolResponse[]> => {
    const pools = await mockApi.manager.getPools();
    return pools.map(toPoolResponse);
  },

  getPool: async (poolId: string): Promise<PoolDetailResponse> => {
    const pool = await getPoolOrThrow(poolId);
    return toPoolDetailResponse(pool);
  },

  getPoolShifts: async (poolId: string): Promise<ShiftDetailResponse[]> => {
    const pool = await getPoolOrThrow(poolId);
    return pool.shifts.map(toShiftDetailResponse);
  },

  createPool: async (name: string): Promise<PoolResponse> => {
    const pool = await mockApi.manager.createPool(name);
    return toPoolResponse(pool);
  },

  deletePool: async (poolId: string): Promise<void> => {
    await mockApi.manager.deletePool(poolId);
  },

  addCasual: async (poolId: string, name: string, phoneNumber: string): Promise<CasualResponse> => {
    const casual = await mockApi.manager.addCasual(poolId, name, phoneNumber);
    return toCasualResponse(casual);
  },

  postShift: async (poolId: string, shift: { startsAt: string; endsAt: string; spotsNeeded: number }) =>
    toShiftResponse(await mockApi.manager.postShift(poolId, shift)),

  removeCasual: async (poolId: string, casualId: string): Promise<void> => {
    await mockApi.manager.removeCasual(poolId, casualId);
  },

  cancelShift: async (poolId: string, shiftId: string): Promise<void> => {
    await mockApi.manager.cancelShift(poolId, shiftId);
  },

  releaseCasual: async (poolId: string, shiftId: string, casualId: string): Promise<void> => {
    const pool = await getPoolOrThrow(poolId);
    const shift = pool.shifts.find((s) => s.id === shiftId);
    if (!shift) {
      throw new ApiError(404, "Shift not found");
    }
    const claim = shift.claims.find((c) => c.casualId === casualId);
    if (!claim) {
      throw new ApiError(404, "Claim not found");
    }
    await mockApi.manager.releaseClaim(poolId, shiftId, claim.id);
  },

  resendInvite: async (poolId: string, casualId: string): Promise<ResendInviteResponse> => {
    const pool = await getPoolOrThrow(poolId);
    const casual = pool.casuals.find((c) => c.id === casualId);
    if (!casual) {
      throw new ApiError(404, "Casual not found");
    }
    return {
      message: `Invite resent to ${casual.name}`,
      casual: toCasualResponse(casual),
    };
  },

  resendShiftNotification: async (poolId: string, shiftId: string): Promise<ResendShiftNotificationResponse> => {
    const pool = await getPoolOrThrow(poolId);
    const shift = pool.shifts.find((s) => s.id === shiftId);
    if (!shift) {
      throw new ApiError(404, "Shift not found");
    }
    if (shift.status === ShiftStatus.Cancelled) {
      throw new ApiError(400, "Cannot resend notifications for cancelled shifts");
    }
    if (shift.status === ShiftStatus.Filled) {
      throw new ApiError(400, "Shift is already filled");
    }
    // In demo mode, simulate notifying active casuals who haven't claimed
    const claimedCasualIds = new Set(
      shift.claims.filter((c) => c.status === ClaimStatus.Claimed).map((c) => c.casualId),
    );
    const eligibleCasuals = pool.casuals.filter(
      (c) => c.inviteStatus === InviteStatus.Accepted && !claimedCasualIds.has(c.id),
    );
    const notifiedCount = eligibleCasuals.length;
    return {
      notifiedCount,
      message:
        notifiedCount === 0
          ? "No casuals to notify"
          : `Notification sent to ${notifiedCount} casual${notifiedCount === 1 ? "" : "s"}`,
    };
  },

  getPoolStats: async (poolId: string): Promise<PoolStatsResponse> => {
    const pool = await getPoolOrThrow(poolId);

    const totalShiftsPosted = pool.shifts.length;
    const shiftsFilled = pool.shifts.filter((s) => s.status === ShiftStatus.Filled).length;
    const shiftsCancelled = pool.shifts.filter((s) => s.status === ShiftStatus.Cancelled).length;
    const shiftsOpen = pool.shifts.filter((s) => s.status === ShiftStatus.Open).length;

    const totalSpotsClaimed = pool.shifts.reduce(
      (sum, s) => sum + s.claims.filter((c) => c.status === ClaimStatus.Claimed).length,
      0,
    );

    const nonCancelledShifts = totalShiftsPosted - shiftsCancelled;
    const fillRatePercent = nonCancelledShifts > 0 ? Math.round((shiftsFilled / nonCancelledShifts) * 1000) / 10 : 0;

    const activeCasuals = pool.casuals.filter((c) => c.inviteStatus === InviteStatus.Accepted).length;
    const totalCasuals = pool.casuals.length;

    return {
      totalShiftsPosted,
      shiftsFilled,
      shiftsCancelled,
      shiftsOpen,
      totalSpotsClaimed,
      fillRatePercent,
      activeCasuals,
      totalCasuals,
    };
  },
};

export const demoCasualApi = {
  getAvailableShifts: async (phoneNumber: string): Promise<CasualAvailableShiftsResponse> => {
    const casual = await getCasualOrThrow(phoneNumber);
    const shifts = await mockApi.casual.getAvailableShifts(phoneNumber);
    const available = shifts.filter(
      (shift) =>
        shift.status === ShiftStatus.Open &&
        shift.spotsRemaining > 0 &&
        !shift.claims.some((claim) => claim.casualId === casual.id && claim.status === ClaimStatus.Claimed),
    );

    return {
      casual: toCasualResponse(casual),
      availableShifts: available.map(toShiftResponse),
    };
  },

  getMyShifts: async (phoneNumber: string): Promise<ShiftResponse[]> => {
    const casual = await getCasualOrThrow(phoneNumber);
    const shifts = await mockApi.casual.getAvailableShifts(phoneNumber);
    return shifts
      .filter((shift) =>
        shift.claims.some((claim) => claim.casualId === casual.id && claim.status === ClaimStatus.Claimed),
      )
      .map(toShiftResponse);
  },

  claimShift: async (shiftId: string, phoneNumber: string): Promise<ClaimShiftResponse> => {
    const casual = await getCasualOrThrow(phoneNumber);
    const shift = await mockApi.casual.claimShift(shiftId, casual);
    return {
      message: "Shift claimed!",
      shift: toShiftDetailResponse(shift),
    };
  },

  bailShift: async (shiftId: string, phoneNumber: string): Promise<BailShiftResponse> => {
    const casual = await getCasualOrThrow(phoneNumber);
    await mockApi.casual.bailShift(shiftId, casual);
    return { message: "Bailed from shift" };
  },

  verifyInvite: async (): Promise<VerifyInviteResponse> => {
    const pools = await mockApi.manager.getPools();
    const pool = pools[0];
    if (!pool || pool.casuals.length === 0) {
      throw new ApiError(404, "No demo casuals available");
    }
    const casual = pool.casuals[0]!;
    return {
      casualId: casual.id,
      casualName: casual.name,
      poolName: pool.name,
      message: "Invite verified (demo).",
    };
  },

  optOut: async (): Promise<OptOutResponse> => ({
    message: "You've been opted out of SMS notifications (demo).",
  }),

  claimByToken: async (): Promise<ClaimByTokenResponse> => {
    const pools = await mockApi.manager.getPools();
    const pool = pools[0];
    const casual = pool?.casuals[0];
    const shift = pool?.shifts.find((s) => s.status === ShiftStatus.Open && s.spotsRemaining > 0) ?? pool?.shifts[0];

    if (!pool || !casual || !shift) {
      throw new ApiError(404, "No demo shift available");
    }

    const signedInCasual = await mockApi.casual.login(casual.phoneNumber);
    if (!signedInCasual) {
      throw new ApiError(404, "Casual not found");
    }

    const claimed = await mockApi.casual.claimShift(shift.id, signedInCasual);
    return {
      message: "Shift claimed (demo).",
      shift: toShiftResponse(claimed),
      casualName: signedInCasual.name,
      phoneNumber: signedInCasual.phoneNumber,
    };
  },
};
