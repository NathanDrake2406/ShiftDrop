import React, { useEffect, useState } from "react";
import { api } from "../services/mockApi";
import { Shift, Casual, ClaimStatus } from "../types";
import { Layout } from "../components/ui/Layout";
import { Button } from "../components/ui/Button";
import { ShiftCard } from "../components/ShiftCard";
import { formatDateDMY } from "../utils/date";

interface CasualFeedProps {
  currentUser: Casual;
  onLogout: () => void;
}

export const CasualFeed: React.FC<CasualFeedProps> = ({ currentUser, onLogout }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Confirmation Modal State
  const [confirmingShift, setConfirmingShift] = useState<Shift | null>(null);
  const [confirmingBailShift, setConfirmingBailShift] = useState<Shift | null>(null);
  const [isBailing, setIsBailing] = useState(false);

  const loadShifts = async () => {
    try {
      setLoading(true);
      const data = await api.casual.getAvailableShifts(currentUser.phoneNumber);
      setShifts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleClaimClick = (shiftId: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (shift) {
      setConfirmingShift(shift);
    }
  };

  const confirmClaim = async () => {
    if (!confirmingShift) return;
    const shiftId = confirmingShift.id;
    setClaimingId(shiftId);
    setConfirmingShift(null); // Close modal
    try {
      await api.casual.claimShift(shiftId, currentUser);
      await loadShifts();
    } catch (e: any) {
      alert(`Failed to claim: ${e.message}`);
    } finally {
      setClaimingId(null);
    }
  };

  const handleBail = (shiftId: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (shift) {
      setConfirmingBailShift(shift);
    }
  };

  const confirmBail = async () => {
    if (!confirmingBailShift) return;
    setLoading(true);
    setIsBailing(true);
    try {
      await api.casual.bailShift(confirmingBailShift.id, currentUser);
      await loadShifts();
    } catch (e: any) {
      alert("Could not bail: " + e.message);
    } finally {
      setIsBailing(false);
      setConfirmingBailShift(null);
      setLoading(false);
    }
  };

  // Separate shifts into Open and My Shifts
  const myClaims = shifts.filter((s) =>
    s.claims.some((c) => c.casualId === currentUser.id && c.status === ClaimStatus.Claimed),
  );

  const availableShifts = shifts.filter(
    (s) => !s.claims.some((c) => c.casualId === currentUser.id) && s.status === "Open",
  );

  return (
    <Layout
      title={`Hi, ${currentUser.name.split(" ")[0]}`}
      actions={
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Log Out
        </Button>
      }
    >
      {loading && shifts.length === 0 && <div className="text-center p-4 text-slate-400">Loading shifts...</div>}

      {!loading && (
        <>
          {/* Section: My Upcoming Shifts */}
          {myClaims.length > 0 && (
            <div className="mb-6">
              <h2 className="ui-section-label">
                My Shifts
              </h2>
              <div className="space-y-4">
                {myClaims.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    userType="casual"
                    userClaimStatus={ClaimStatus.Claimed}
                    onBail={handleBail}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section: Available */}
          <div>
            <h2 className="ui-section-label">
              Available Now
            </h2>
            {availableShifts.length === 0 ? (
              <div className="rounded-xl p-8 text-center text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800">
                No new shifts available right now.
              </div>
            ) : (
              <div className="space-y-4">
                {availableShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    userType="casual"
                    onClaim={handleClaimClick}
                    isLoading={claimingId === shift.id}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {confirmingShift && (
        <div className="ui-modal-backdrop animate-in fade-in duration-200">
          <div className="ui-modal-panel max-w-xs scale-100">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Confirm Shift</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
              Are you sure you want to take this shift on{" "}
              <span className="font-semibold">{formatDateDMY(new Date(confirmingShift.startsAt))}</span>?
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmingShift(null)}>
                No, Cancel
              </Button>
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={confirmClaim}>
                Yes, Claim
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmingBailShift && (
        <div className="ui-modal-backdrop animate-in fade-in duration-200">
          <div className="ui-modal-panel max-w-xs scale-100">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Bail on Shift</h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
              Are you sure you want to bail on the shift on{" "}
              <span className="font-semibold">{formatDateDMY(new Date(confirmingBailShift.startsAt))}</span>?
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmingBailShift(null)}>
                Keep Shift
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={confirmBail} isLoading={isBailing}>
                Bail
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
