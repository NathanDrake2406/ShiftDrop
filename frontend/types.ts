export enum InviteStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Expired = 'Expired'
}

export enum ShiftStatus {
  Open = 'Open',
  Filled = 'Filled',
  Cancelled = 'Cancelled'
}

export enum ClaimStatus {
  Claimed = 'Claimed',
  Bailed = 'Bailed',
  ReleasedByManager = 'ReleasedByManager'
}

export interface ShiftClaim {
  id: string;
  shiftId: string;
  casualId: string;
  casualName: string; // Added for frontend display convenience
  status: ClaimStatus;
  claimedAt: string;
  releasedAt?: string;
}

export interface Shift {
  id: string;
  poolId: string;
  startsAt: string;
  endsAt: string;
  spotsNeeded: number;
  spotsRemaining: number;
  status: ShiftStatus;
  claims: ShiftClaim[];
}

export interface Casual {
  id: string;
  name: string;
  phoneNumber: string;
  poolId: string;
  inviteStatus: InviteStatus;
  inviteToken?: string;
}

export interface Pool {
  id: string;
  name: string;
  managerAuth0Id: string;
  casuals: Casual[];
  shifts: Shift[];
}
