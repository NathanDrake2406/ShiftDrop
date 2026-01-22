import { Pool, Casual, Shift, ShiftStatus, InviteStatus, ClaimStatus } from '../types';
import { MOCK_MANAGER_ID } from '../constants';

const createInitialPools = (): Pool[] => [
  {
    id: 'pool-1',
    name: 'Downtown Cafe Team',
    managerAuth0Id: MOCK_MANAGER_ID,
    casuals: [
      { id: 'cas-1', name: 'Sarah Jenkins', phoneNumber: '555-0101', poolId: 'pool-1', inviteStatus: InviteStatus.Accepted },
      { id: 'cas-2', name: 'Mike Ross', phoneNumber: '555-0102', poolId: 'pool-1', inviteStatus: InviteStatus.Accepted },
      { id: 'cas-3', name: 'Jessica Pearson', phoneNumber: '555-0103', poolId: 'pool-1', inviteStatus: InviteStatus.Pending },
    ],
    shifts: [
      {
        id: 'shift-1',
        poolId: 'pool-1',
        startsAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        endsAt: new Date(Date.now() + 86400000 + 14400000).toISOString(), // +4 hours
        spotsNeeded: 2,
        spotsRemaining: 1,
        status: ShiftStatus.Open,
        claims: [
          {
            id: 'claim-1',
            shiftId: 'shift-1',
            casualId: 'cas-1',
            casualName: 'Sarah Jenkins',
            status: ClaimStatus.Claimed,
            claimedAt: new Date().toISOString()
          }
        ]
      },
      {
        id: 'shift-2',
        poolId: 'pool-1',
        startsAt: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
        endsAt: new Date(Date.now() + 172800000 + 21600000).toISOString(), // +6 hours
        spotsNeeded: 3,
        spotsRemaining: 3,
        status: ShiftStatus.Open,
        claims: []
      }
    ]
  }
];

let pools: Pool[] = createInitialPools();

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const resetMockData = () => {
  pools = createInitialPools();
};

export const api = {
  manager: {
    getPools: async (): Promise<Pool[]> => {
      await delay(400);
      return JSON.parse(JSON.stringify(pools.filter(p => p.managerAuth0Id === MOCK_MANAGER_ID)));
    },

    getPoolDetails: async (poolId: string): Promise<Pool | undefined> => {
      await delay(300);
      const pool = pools.find(p => p.id === poolId);
      return pool ? JSON.parse(JSON.stringify(pool)) : undefined;
    },

    createPool: async (name: string): Promise<Pool> => {
      await delay(500);
      const newPool: Pool = {
        id: `pool-${Date.now()}`,
        name,
        managerAuth0Id: MOCK_MANAGER_ID,
        casuals: [],
        shifts: []
      };
      pools.push(newPool);
      return JSON.parse(JSON.stringify(newPool));
    },

    addCasual: async (poolId: string, name: string, phoneNumber: string): Promise<Casual> => {
      await delay(400);
      const pool = pools.find(p => p.id === poolId);
      if (!pool) throw new Error('Pool not found');
      
      const newCasual: Casual = {
        id: `cas-${Date.now()}`,
        name,
        phoneNumber,
        poolId,
        inviteStatus: InviteStatus.Pending
      };
      pool.casuals.push(newCasual);
      return JSON.parse(JSON.stringify(newCasual));
    },
    
    removeCasual: async (poolId: string, casualId: string): Promise<void> => {
        await delay(300);
        const pool = pools.find(p => p.id === poolId);
        if (pool) {
            pool.casuals = pool.casuals.filter(c => c.id !== casualId);
        }
    },

    postShift: async (poolId: string, shiftData: Partial<Shift>): Promise<Shift> => {
      await delay(600);
      const pool = pools.find(p => p.id === poolId);
      if (!pool) throw new Error('Pool not found');

      const startsAt = shiftData.startsAt ? new Date(shiftData.startsAt) : null;
      const endsAt = shiftData.endsAt ? new Date(shiftData.endsAt) : null;
      if (!startsAt || !endsAt || isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
        throw new Error('Invalid shift dates');
      }
      const durationHours = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60);
      if (durationHours <= 0) {
        throw new Error('End time must be after start time');
      }
      if (durationHours > 15) {
        throw new Error('Shift duration too long');
      }

      const spotsNeeded = shiftData.spotsNeeded ?? 0;
      if (spotsNeeded <= 0) {
        throw new Error('Spots needed must be at least 1');
      }

      const newShift: Shift = {
        id: `shift-${Date.now()}`,
        poolId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        spotsNeeded,
        spotsRemaining: spotsNeeded,
        status: ShiftStatus.Open,
        claims: []
      };
      pool.shifts.push(newShift);
      return JSON.parse(JSON.stringify(newShift));
    },

    cancelShift: async (poolId: string, shiftId: string): Promise<void> => {
       await delay(300);
       const pool = pools.find(p => p.id === poolId);
       if (!pool) return;
       const shift = pool.shifts.find(s => s.id === shiftId);
       if (shift) shift.status = ShiftStatus.Cancelled;
    },

    releaseClaim: async (poolId: string, shiftId: string, claimId: string): Promise<void> => {
        await delay(300);
        const pool = pools.find(p => p.id === poolId);
        if (!pool) return;
        const shift = pool.shifts.find(s => s.id === shiftId);
        if (!shift) return;
        
        const claim = shift.claims.find(c => c.id === claimId);
        if (claim && claim.status === ClaimStatus.Claimed) {
            claim.status = ClaimStatus.ReleasedByManager;
            claim.releasedAt = new Date().toISOString();
            shift.spotsRemaining++;
            if (shift.status === ShiftStatus.Filled) {
                shift.status = ShiftStatus.Open;
            }
        }
    }
  },

  casual: {
    login: async (phoneNumber: string): Promise<Casual | undefined> => {
        await delay(500);
        // Find casual across all pools
        for (const pool of pools) {
            const casual = pool.casuals.find(c => c.phoneNumber === phoneNumber);
            if (casual) return JSON.parse(JSON.stringify(casual));
        }
        return undefined;
    },

    getAvailableShifts: async (phoneNumber: string): Promise<Shift[]> => {
        await delay(400);
        const shifts: Shift[] = [];
        for (const pool of pools) {
            const isMember = pool.casuals.some(c => c.phoneNumber === phoneNumber);
            if (isMember) {
                // Return open shifts and shifts the user has claimed
                const visibleShifts = pool.shifts.filter(s => 
                    (s.status === ShiftStatus.Open && s.spotsRemaining > 0) ||
                    s.claims.some(c => c.casualId && c.status === ClaimStatus.Claimed)
                );
                shifts.push(...visibleShifts);
            }
        }
        return JSON.parse(JSON.stringify(shifts));
    },

    claimShift: async (shiftId: string, casual: Casual): Promise<Shift> => {
        await delay(700); 
        
        let targetShift: Shift | undefined;
        // Find shift
        for (const pool of pools) {
            const s = pool.shifts.find(x => x.id === shiftId);
            if (s) {
                targetShift = s;
                break;
            }
        }

        if (!targetShift) throw new Error('Shift not found');
        if (targetShift.spotsRemaining <= 0) throw new Error('Shift full');
        if (targetShift.status !== ShiftStatus.Open) throw new Error('Shift closed');
        
        if (targetShift.claims.some(c => c.casualId === casual.id && c.status === ClaimStatus.Claimed)) {
             throw new Error('Already claimed');
        }

        targetShift.spotsRemaining--;
        if (targetShift.spotsRemaining === 0) {
            targetShift.status = ShiftStatus.Filled;
        }

        targetShift.claims.push({
            id: `claim-${Date.now()}`,
            shiftId: targetShift.id,
            casualId: casual.id,
            casualName: casual.name,
            status: ClaimStatus.Claimed,
            claimedAt: new Date().toISOString()
        });

        return JSON.parse(JSON.stringify(targetShift));
    },

    bailShift: async (shiftId: string, casual: Casual): Promise<void> => {
        await delay(500);
        let targetShift: Shift | undefined;
        for (const pool of pools) {
            const s = pool.shifts.find(x => x.id === shiftId);
            if (s) {
                targetShift = s;
                break;
            }
        }
        if (!targetShift) throw new Error('Shift not found');

        const claim = targetShift.claims.find(c => c.casualId === casual.id && c.status === ClaimStatus.Claimed);
        if (!claim) throw new Error('Claim not found');

        claim.status = ClaimStatus.Bailed;
        claim.releasedAt = new Date().toISOString();
        targetShift.spotsRemaining++;
        if (targetShift.status === ShiftStatus.Filled) {
            targetShift.status = ShiftStatus.Open;
        }
    }
  }
};
