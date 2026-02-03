import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/ui/Layout";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ShiftCard } from "../components/ShiftCard";
import { ShiftCardSkeleton } from "../components/ui/Skeleton";
import { TeamTab } from "../components/TeamTab";
import { AvailabilityEditor } from "../components/AvailabilityEditor";
import { CasualRow } from "../components/CasualRow";
import { CreateShiftModal } from "../components/pool/CreateShiftModal";
import { AddCasualModal } from "../components/pool/AddCasualModal";
import { Plus, BarChart3, Users, CheckCircle, Clock } from "lucide-react";
import { StatsCard } from "../components/ui/StatsCard";
import { useToast } from "../contexts/ToastContext";
import { useDemo } from "../contexts/DemoContext";
import {
  usePool,
  usePoolShifts,
  usePoolStats,
  usePoolAdmins,
  useCasualAvailability,
  useAddCasual,
  useRemoveCasual,
  usePostShift,
  useCancelShift,
  useReleaseCasual,
  useResendInvite,
  useResendShiftNotification,
  useInviteAdmin,
  useRemoveAdmin,
  useSetCasualAvailability,
} from "../hooks/useManagerQueries";
import { useCasualFilters } from "../hooks/useCasualFilters";
import { useCasualCallbacks } from "../hooks/useCasualCallbacks";
import type { CasualResponse } from "../types/api";
import { ApiError } from "../types/api";

export const PoolDetails: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { demoMode } = useDemo();

  // React Query hooks for data fetching
  const { data: pool, isLoading: loadingPool, error: poolError } = usePool(id);
  const { data: shifts = [], isLoading: loadingShifts, error: shiftsError } = usePoolShifts(id);
  const { data: admins = [] } = usePoolAdmins(id);
  const { data: stats } = usePoolStats(id);

  // Derive loading and error states
  const loading = loadingPool || loadingShifts;
  const queryError = poolError || shiftsError;
  const error = queryError instanceof ApiError ? queryError.message : queryError ? "Failed to load pool details" : null;

  // Mutations
  const addCasualMutation = useAddCasual(id ?? "");
  const removeCasualMutation = useRemoveCasual(id ?? "");
  const postShiftMutation = usePostShift(id ?? "");
  const cancelShiftMutation = useCancelShift(id ?? "");
  const releaseCasualMutation = useReleaseCasual(id ?? "");
  const resendInviteMutation = useResendInvite(id ?? "");
  const resendShiftMutation = useResendShiftNotification(id ?? "");
  const inviteAdminMutation = useInviteAdmin(id ?? "");
  const removeAdminMutation = useRemoveAdmin(id ?? "");

  // Local UI state
  const [activeTab, setActiveTab] = useState<"shifts" | "casuals" | "team">("shifts");
  const [selectedCasual, setSelectedCasual] = useState<CasualResponse | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingCasual, setIsAddingCasual] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | {
    type: "cancelShift" | "removeCasual" | "releaseCasual" | "resendInvite" | "resendShiftNotification";
    shiftId?: string;
    casualId?: string;
    casualName?: string;
  }>(null);

  // Availability query (only when a casual is selected)
  const { data: casualAvailability = [], isLoading: loadingAvailability } = useCasualAvailability(
    id,
    selectedCasual?.id,
  );
  const setAvailabilityMutation = useSetCasualAvailability(id ?? "", selectedCasual?.id ?? "");

  // Admin handlers
  const handleInviteAdmin = async (phoneNumber: string, name: string) => {
    if (!id) return;
    try {
      await inviteAdminMutation.mutateAsync({ phoneNumber, name });
      showToast(`Invite sent to ${phoneNumber}`, "success");
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message, "error");
      } else {
        showToast("Failed to invite admin", "error");
      }
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    if (!id) return;
    try {
      await removeAdminMutation.mutateAsync(adminId);
      showToast("Admin removed", "success");
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message, "error");
      } else {
        showToast("Failed to remove admin", "error");
      }
    }
  };

  // Availability handlers
  const handleOpenAvailability = (casual: CasualResponse) => {
    setSelectedCasual(casual);
  };

  const handleSaveAvailability = async (availability: typeof casualAvailability) => {
    try {
      await setAvailabilityMutation.mutateAsync(availability);
      showToast("Availability saved", "success");
      setSelectedCasual(null);
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message, "error");
      } else {
        showToast("Failed to save availability", "error");
      }
    }
  };

  const handleCancelShift = (shiftId: string) => {
    setConfirmAction({ type: "cancelShift", shiftId });
  };

  const handleRemoveCasual = (casualId: string) => {
    setConfirmAction({ type: "removeCasual", casualId });
  };

  const handleReleaseCasual = (shiftId: string, casualId: string) => {
    setConfirmAction({ type: "releaseCasual", shiftId, casualId });
  };

  const handleResendInvite = (casual: CasualResponse) => {
    setConfirmAction({ type: "resendInvite", casualId: casual.id, casualName: casual.name });
  };

  const handleResendShiftNotification = (shiftId: string) => {
    setConfirmAction({ type: "resendShiftNotification", shiftId });
  };

  const confirmActionCopy = (() => {
    if (!confirmAction) return null;
    switch (confirmAction.type) {
      case "cancelShift":
        return {
          title: "Cancel Shift",
          message: "Cancel this shift? It will be removed for everyone.",
          confirmLabel: "Cancel Shift",
          isDanger: true,
        };
      case "removeCasual":
        return {
          title: "Remove Casual",
          message: "Remove this casual from the pool?",
          confirmLabel: "Remove Casual",
          isDanger: true,
        };
      case "releaseCasual":
        return {
          title: "Remove Worker",
          message: "Remove this worker from the shift?",
          confirmLabel: "Remove Worker",
          isDanger: true,
        };
      case "resendInvite":
        return {
          title: "Resend Invite",
          message: `Resend the invite SMS to ${confirmAction.casualName ?? "this casual"}?`,
          confirmLabel: "Resend",
          isDanger: false,
        };
      case "resendShiftNotification":
        return {
          title: "Resend Notifications",
          message: "Resend shift notifications to all active casuals who haven't claimed this shift?",
          confirmLabel: "Resend",
          isDanger: false,
        };
      default:
        return null;
    }
  })();

  const isConfirmingAction =
    cancelShiftMutation.isPending ||
    removeCasualMutation.isPending ||
    releaseCasualMutation.isPending ||
    resendInviteMutation.isPending ||
    resendShiftMutation.isPending;

  const handleConfirmAction = async () => {
    if (!id || !confirmAction) return;
    try {
      if (confirmAction.type === "cancelShift" && confirmAction.shiftId) {
        await cancelShiftMutation.mutateAsync(confirmAction.shiftId);
        showToast("Shift cancelled", "success");
      }
      if (confirmAction.type === "removeCasual" && confirmAction.casualId) {
        await removeCasualMutation.mutateAsync(confirmAction.casualId);
        showToast("Casual removed from pool", "success");
      }
      if (confirmAction.type === "releaseCasual" && confirmAction.shiftId && confirmAction.casualId) {
        await releaseCasualMutation.mutateAsync({
          shiftId: confirmAction.shiftId,
          casualId: confirmAction.casualId,
        });
        showToast("Worker released from shift", "success");
      }
      if (confirmAction.type === "resendInvite" && confirmAction.casualId) {
        await resendInviteMutation.mutateAsync(confirmAction.casualId);
        showToast(`Invite resent to ${confirmAction.casualName ?? "casual"}`, "success");
      }
      if (confirmAction.type === "resendShiftNotification" && confirmAction.shiftId) {
        const result = await resendShiftMutation.mutateAsync(confirmAction.shiftId);
        showToast(result.message, "success");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message, "error");
      } else {
        showToast("Action failed", "error");
      }
    } finally {
      setConfirmAction(null);
    }
  };

  if (loading)
    return (
      <Layout title="Loading..." showBack onBack={() => navigate("/manager")}>
        {/* Tab skeleton */}
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
          <div className="flex-1 py-2 px-4">
            <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto" />
          </div>
          <div className="flex-1 py-2 px-4">
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto" />
          </div>
        </div>
        {/* Shift skeleton list */}
        <div className="space-y-4">
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
          <ShiftCardSkeleton />
        </div>
      </Layout>
    );
  if (error)
    return (
      <Layout>
        <div className="p-4 text-center text-red-600 dark:text-red-400">{error}</div>
      </Layout>
    );
  if (!pool)
    return (
      <Layout>
        <div className="p-4 text-center dark:text-slate-400">Pool not found</div>
      </Layout>
    );

  const { activeCasuals, pendingCasuals } = useCasualFilters(pool.casuals);

  // Stable callback references for CasualRow components (prevents re-renders)
  const casualCallbacks = useCasualCallbacks({
    onRemove: handleRemoveCasual,
    onResendInvite: handleResendInvite,
    onEditAvailability: handleOpenAvailability,
  });

  return (
    <Layout title={pool.name} showBack onBack={() => navigate("/manager")}>
      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <StatsCard
            label="Fill Rate"
            value={`${stats.fillRatePercent}%`}
            icon={<BarChart3 className="w-4 h-4" />}
            trend={stats.fillRatePercent >= 70 ? "up" : stats.fillRatePercent >= 40 ? "neutral" : "down"}
          />
          <StatsCard
            label="Active Casuals"
            value={stats.activeCasuals}
            icon={<Users className="w-4 h-4" />}
            subtext={`of ${stats.totalCasuals}`}
          />
          <StatsCard label="Shifts Filled" value={stats.shiftsFilled} icon={<CheckCircle className="w-4 h-4" />} />
          <StatsCard label="Open Shifts" value={stats.shiftsOpen} icon={<Clock className="w-4 h-4" />} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "shifts" ? "bg-white dark:bg-slate-700 shadow text-orange-500 dark:text-orange-400" : "text-slate-500 dark:text-slate-400"}`}
          onClick={() => setActiveTab("shifts")}
        >
          Shifts
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "casuals" ? "bg-white dark:bg-slate-700 shadow text-orange-500 dark:text-orange-400" : "text-slate-500 dark:text-slate-400"}`}
          onClick={() => setActiveTab("casuals")}
        >
          Casuals ({pool.casuals.length})
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "team" ? "bg-white dark:bg-slate-700 shadow text-orange-500 dark:text-orange-400" : "text-slate-500 dark:text-slate-400"}`}
          onClick={() => setActiveTab("team")}
        >
          Team
        </button>
      </div>

      {activeTab === "shifts" && (
        <div className="space-y-4 pb-20">
          {shifts.filter((shift) => shift.status !== "Cancelled").length === 0 && (
            <div className="text-center py-10 text-slate-400">No shifts yet. Post one!</div>
          )}
          {shifts
            .filter((shift) => shift.status !== "Cancelled")
            .reverse()
            .map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                userType="manager"
                onCancel={handleCancelShift}
                onReleaseCasual={handleReleaseCasual}
                onResendNotification={handleResendShiftNotification}
              />
            ))}
        </div>
      )}

      {activeTab === "casuals" && (
        <div className="space-y-3">
          <Button variant="secondary" onClick={() => setIsAddingCasual(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Add Casual
          </Button>

          {activeCasuals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Active</p>
              {activeCasuals.map((casual) => (
                <CasualRow
                  key={casual.id}
                  casual={casual}
                  {...casualCallbacks.getCallbacks(casual)}
                />
              ))}
            </div>
          )}

          {pendingCasuals.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Pending</p>
              {pendingCasuals.map((casual) => (
                <CasualRow
                  key={casual.id}
                  casual={casual}
                  {...casualCallbacks.getCallbacks(casual)}
                />
              ))}
            </div>
          )}

          {activeCasuals.length === 0 && pendingCasuals.length === 0 && (
            <div className="text-center py-10 text-slate-400">No casuals yet. Add your first team member!</div>
          )}
        </div>
      )}

      {activeTab === "team" && (
        <TeamTab
          ownerLabel="You (Owner)"
          admins={admins}
          onInviteAdmin={handleInviteAdmin}
          onRemoveAdmin={handleRemoveAdmin}
          isDemoMode={demoMode}
        />
      )}

      {/* Floating Action Button for Create */}
      {activeTab === "shifts" && !isCreating && (
        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-20">
          <Button
            className="shadow-xl rounded-full px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-2"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="w-5 h-5" /> Post Shift
          </Button>
        </div>
      )}

      {/* Create Shift Modal */}
      <CreateShiftModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onSuccess={() => showToast("Shift posted", "success")}
        postShift={(data) => postShiftMutation.mutateAsync(data).then(() => {})}
        isLoading={postShiftMutation.isPending}
      />

      {/* Add Casual Modal */}
      <AddCasualModal
        isOpen={isAddingCasual}
        onClose={() => setIsAddingCasual(false)}
        onSuccess={(name) => showToast(`${name} added to pool`, "success")}
        addCasual={(data) => addCasualMutation.mutateAsync(data).then(() => {})}
        isLoading={addCasualMutation.isPending}
      />

      {/* Confirm Action Modal */}
      <ConfirmDialog
        isOpen={confirmAction !== null && confirmActionCopy !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmActionCopy?.title ?? ""}
        message={confirmActionCopy?.message ?? ""}
        confirmLabel={confirmActionCopy?.confirmLabel ?? "Confirm"}
        isDanger={confirmActionCopy?.isDanger ?? false}
        isLoading={isConfirmingAction}
      />

      {/* Availability Modal */}
      <Modal
        isOpen={selectedCasual !== null}
        onClose={() => setSelectedCasual(null)}
        title={selectedCasual ? `${selectedCasual.name}'s Availability` : "Availability"}
      >
        <AvailabilityEditor
          availability={casualAvailability}
          onSave={handleSaveAvailability}
          isLoading={loadingAvailability}
        />
      </Modal>
    </Layout>
  );
};

export default PoolDetails;
