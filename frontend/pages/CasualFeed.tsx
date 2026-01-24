import { useEffect, useState, useCallback } from "react";
import { Layout } from "../components/ui/Layout";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ShiftCard } from "../components/ShiftCard";
import { ShiftCardSkeleton } from "../components/ui/Skeleton";
import { formatDateDMY } from "../utils/date";
import { useToast } from "../contexts/ToastContext";
import * as casualApi from "../services/casualApi";
import type { ShiftResponse } from "../types/api";
import { ApiError } from "../types/api";

interface CasualFeedProps {
  currentUser: { phoneNumber: string; name: string; id: string };
  onLogout: () => void;
}

export const CasualFeed: React.FC<CasualFeedProps> = ({ currentUser, onLogout }) => {
  const { showToast } = useToast();
  const [availableShifts, setAvailableShifts] = useState<ShiftResponse[]>([]);
  const [myShifts, setMyShifts] = useState<ShiftResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Confirmation Modal State
  const [confirmingShift, setConfirmingShift] = useState<ShiftResponse | null>(null);
  const [confirmingBailShift, setConfirmingBailShift] = useState<ShiftResponse | null>(null);
  const [isBailing, setIsBailing] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const loadShifts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch both available shifts and claimed shifts in parallel
      const [availableData, claimedData] = await Promise.all([
        casualApi.getAvailableShifts(currentUser.phoneNumber),
        casualApi.getMyShifts(currentUser.phoneNumber),
      ]);
      setAvailableShifts(availableData.availableShifts);
      setMyShifts(claimedData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load shifts");
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser.phoneNumber]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const handleClaimClick = (shiftId: string) => {
    const shift = availableShifts.find((s) => s.id === shiftId);
    if (shift) {
      setConfirmingShift(shift);
    }
  };

  const confirmClaim = async () => {
    if (!confirmingShift) return;
    const shiftId = confirmingShift.id;
    setIsClaiming(true);
    try {
      await casualApi.claimShift(shiftId, currentUser.phoneNumber);
      showToast("Shift claimed! You're on the roster.", "success");
      setConfirmingShift(null);
      await loadShifts();
    } catch (err) {
      setConfirmingShift(null);
      if (err instanceof ApiError) {
        if (err.isConflict) {
          showToast("Sorry, this shift was just filled. Try another!", "error");
        } else {
          showToast(`Failed to claim: ${err.message}`, "error");
        }
      } else {
        showToast("Failed to claim shift", "error");
      }
    } finally {
      setClaimingId(null);
      setIsClaiming(false);
    }
  };

  const handleBail = (shiftId: string) => {
    const shift = myShifts.find((s) => s.id === shiftId);
    if (shift) {
      setConfirmingBailShift(shift);
    }
  };

  const confirmBail = async () => {
    if (!confirmingBailShift) return;
    setIsBailing(true);
    try {
      await casualApi.bailShift(confirmingBailShift.id, currentUser.phoneNumber);
      showToast("You've bailed on the shift", "info");
      setConfirmingBailShift(null);
      await loadShifts();
    } catch (err) {
      setConfirmingBailShift(null);
      if (err instanceof ApiError) {
        showToast(`Could not bail: ${err.message}`, "error");
      } else {
        showToast("Could not bail from shift", "error");
      }
    } finally {
      setIsBailing(false);
    }
  };

  return (
    <Layout
      title={`Hi, ${currentUser.name.split(" ")[0]}`}
      actions={
        <Button variant="ghost" size="sm" onClick={onLogout}>
          Log Out
        </Button>
      }
    >
      {loading && availableShifts.length === 0 && myShifts.length === 0 && (
        <div className="space-y-4">
          <h2 className="ui-section-label">Available Now</h2>
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
        </div>
      )}

      {error && (
        <div className="text-center p-4 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg mb-4">
          {error}
          <Button variant="secondary" size="sm" className="ml-4" onClick={loadShifts}>
            Retry
          </Button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Section: My Upcoming Shifts */}
          {myShifts.length > 0 && (
            <div className="mb-6">
              <h2 className="ui-section-label">My Shifts</h2>
              <div className="space-y-4">
                {myShifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    userType="casual"
                    userClaimStatus="Claimed"
                    onBail={handleBail}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Section: Available */}
          <div>
            <h2 className="ui-section-label">Available Now</h2>
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

      {/* Confirm Claim Dialog */}
      <ConfirmDialog
        isOpen={confirmingShift !== null}
        onClose={() => setConfirmingShift(null)}
        onConfirm={confirmClaim}
        title="Confirm Shift"
        message={`Are you sure you want to take this shift on ${confirmingShift ? formatDateDMY(new Date(confirmingShift.startsAt)) : ""}?`}
        confirmLabel="Yes, Claim"
        cancelLabel="No, Cancel"
        isLoading={isClaiming}
      />

      {/* Confirm Bail Dialog */}
      <ConfirmDialog
        isOpen={confirmingBailShift !== null}
        onClose={() => setConfirmingBailShift(null)}
        onConfirm={confirmBail}
        title="Bail on Shift"
        message={`Are you sure you want to bail on the shift on ${confirmingBailShift ? formatDateDMY(new Date(confirmingBailShift.startsAt)) : ""}?`}
        confirmLabel="Bail"
        cancelLabel="Keep Shift"
        isDanger
        isLoading={isBailing}
      />
    </Layout>
  );
};
