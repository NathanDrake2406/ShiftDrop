import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "../components/ui/Layout";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { TimeInput } from "../components/ui/TimeInput";
import { ShiftCard } from "../components/ShiftCard";
import { ShiftCardSkeleton } from "../components/ui/Skeleton";
import { TeamTab } from "../components/TeamTab";
import { AvailabilityEditor } from "../components/AvailabilityEditor";
import { Plus, Trash2, RefreshCw, Calendar, BarChart3, Users, CheckCircle, Clock } from "lucide-react";
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
  const [casualForm, setCasualForm] = useState({ name: "", phone: "" });
  const [casualErrors, setCasualErrors] = useState<{ name?: string; phone?: string }>({});
  const [confirmAction, setConfirmAction] = useState<null | {
    type: "cancelShift" | "removeCasual" | "releaseCasual";
    shiftId?: string;
    casualId?: string;
  }>(null);
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  const [resendingShiftNotification, setResendingShiftNotification] = useState<string | null>(null);

  // Availability query (only when a casual is selected)
  const { data: casualAvailability = [], isLoading: loadingAvailability } = useCasualAvailability(
    id,
    selectedCasual?.id,
  );
  const setAvailabilityMutation = useSetCasualAvailability(id ?? "", selectedCasual?.id ?? "");

  // Create Shift State
  const toDateInput = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  };

  const toTimeInput = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const parseDateTimeInput = (dateValue: string, timeValue: string) => {
    const dateParts = dateValue.split("-").map(Number);
    const timeParts = timeValue.split(":").map(Number);

    const yearValue = dateParts[0];
    const monthValue = dateParts[1];
    const dayValue = dateParts[2];
    const hoursValue = timeParts[0];
    const minutesValue = timeParts[1];

    if (
      yearValue === undefined ||
      monthValue === undefined ||
      dayValue === undefined ||
      hoursValue === undefined ||
      minutesValue === undefined
    ) {
      return null;
    }

    if (
      Number.isNaN(yearValue) ||
      Number.isNaN(monthValue) ||
      Number.isNaN(dayValue) ||
      Number.isNaN(hoursValue) ||
      Number.isNaN(minutesValue)
    ) {
      return null;
    }

    if (monthValue < 1 || monthValue > 12 || dayValue < 1 || dayValue > 31) {
      return null;
    }

    if (hoursValue < 0 || hoursValue > 23 || minutesValue < 0 || minutesValue > 59) {
      return null;
    }

    const parsed = new Date(yearValue, monthValue - 1, dayValue, hoursValue, minutesValue, 0, 0);
    if (
      parsed.getFullYear() !== yearValue ||
      parsed.getMonth() !== monthValue - 1 ||
      parsed.getDate() !== dayValue ||
      parsed.getHours() !== hoursValue ||
      parsed.getMinutes() !== minutesValue
    ) {
      return null;
    }

    return parsed;
  };

  const buildDefaultShiftForm = () => {
    const start = new Date();
    start.setSeconds(0, 0);
    start.setMinutes(0);
    start.setHours(start.getHours() + 1);
    const end = new Date(start);
    end.setHours(start.getHours() + 4);

    return {
      startDate: toDateInput(start),
      startTime: toTimeInput(start),
      endDate: toDateInput(end),
      endTime: toTimeInput(end),
      spotsNeeded: 1,
    };
  };

  const [shiftForm, setShiftForm] = useState(buildDefaultShiftForm());

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

  const handlePostShift = async () => {
    if (!id) return;

    if (!shiftForm.startDate || !shiftForm.startTime || !shiftForm.endDate || !shiftForm.endTime) {
      showToast("Please select start and end dates and times.", "error");
      return;
    }

    const startDate = parseDateTimeInput(shiftForm.startDate, shiftForm.startTime);
    const endDate = parseDateTimeInput(shiftForm.endDate, shiftForm.endTime);
    if (!startDate || !endDate) {
      showToast("Invalid dates. Please choose valid start and end times.", "error");
      return;
    }

    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    if (durationHours <= 0) {
      showToast("End time must be after the start time.", "error");
      return;
    }
    if (durationHours > 15) {
      showToast("Shift duration cannot exceed 15 hours.", "error");
      return;
    }
    if (
      !Number.isFinite(shiftForm.spotsNeeded) ||
      !Number.isInteger(shiftForm.spotsNeeded) ||
      shiftForm.spotsNeeded <= 0
    ) {
      showToast("Spots needed must be at least 1.", "error");
      return;
    }

    try {
      await postShiftMutation.mutateAsync({
        startsAt: startDate.toISOString(),
        endsAt: endDate.toISOString(),
        spotsNeeded: shiftForm.spotsNeeded,
      });
      setIsCreating(false);
      setShiftForm(buildDefaultShiftForm());
      showToast("Shift posted successfully!", "success");
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message, "error");
      } else {
        showToast("Failed to post shift", "error");
      }
    }
  };

  const handleCancelShift = (shiftId: string) => {
    setConfirmAction({ type: "cancelShift", shiftId });
  };

  const validateCasualForm = (nameInput: string, phoneInput: string) => {
    const errors: { name?: string; phone?: string } = {};
    const name = nameInput.trim();
    if (name.length < 2 || name.length > 50 || !/[A-Za-z]/.test(name)) {
      errors.name = "Name must be 2-50 characters and include a letter.";
    }

    const phone = phoneInput.trim();
    const digitsOnly = phone.replace(/\D/g, "");
    if (!phone) {
      errors.phone = "Phone number is required.";
    } else if (!/^[0-9+()\s-]+$/.test(phone) || digitsOnly.length < 7 || digitsOnly.length > 15) {
      errors.phone = "Enter a valid phone number.";
    }

    return { errors, name, phone };
  };

  const openAddCasual = () => {
    setCasualForm({ name: "", phone: "" });
    setCasualErrors({});
    setIsAddingCasual(true);
  };

  const closeAddCasual = () => {
    setIsAddingCasual(false);
    setCasualErrors({});
    setCasualForm({ name: "", phone: "" });
  };

  const handleAddCasual = async () => {
    if (!id) return;

    const { errors, name, phone } = validateCasualForm(casualForm.name, casualForm.phone);
    setCasualErrors(errors);
    if (errors.name || errors.phone) {
      return;
    }

    try {
      await addCasualMutation.mutateAsync({ name, phoneNumber: phone });
      closeAddCasual();
      showToast(`${name} added to pool`, "success");
    } catch (err) {
      if (err instanceof ApiError) {
        setCasualErrors({ phone: err.message });
      } else {
        setCasualErrors({ phone: "Failed to add casual" });
      }
    }
  };

  const handleRemoveCasual = (casualId: string) => {
    setConfirmAction({ type: "removeCasual", casualId });
  };

  const handleReleaseCasual = (shiftId: string, casualId: string) => {
    setConfirmAction({ type: "releaseCasual", shiftId, casualId });
  };

  const handleResendInvite = async (casual: CasualResponse) => {
    if (!id) return;
    setResendingInvite(casual.id);
    try {
      await resendInviteMutation.mutateAsync(casual.id);
      showToast(`Invite resent to ${casual.name}`, "success");
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message, "error");
      } else {
        showToast("Failed to resend invite", "error");
      }
    } finally {
      setResendingInvite(null);
    }
  };

  const handleResendShiftNotification = async (shiftId: string) => {
    if (!id) return;
    setResendingShiftNotification(shiftId);
    try {
      const result = await resendShiftMutation.mutateAsync(shiftId);
      showToast(result.message, "success");
    } catch (err) {
      if (err instanceof ApiError) {
        showToast(err.message, "error");
      } else {
        showToast("Failed to resend notifications", "error");
      }
    } finally {
      setResendingShiftNotification(null);
    }
  };

  const confirmActionCopy = (() => {
    if (!confirmAction) return null;
    switch (confirmAction.type) {
      case "cancelShift":
        return {
          title: "Cancel Shift",
          message: "Cancel this shift? It will be removed for everyone.",
          confirmLabel: "Cancel Shift",
        };
      case "removeCasual":
        return {
          title: "Remove Casual",
          message: "Remove this casual from the pool?",
          confirmLabel: "Remove Casual",
        };
      case "releaseCasual":
        return {
          title: "Remove Worker",
          message: "Remove this worker from the shift?",
          confirmLabel: "Remove Worker",
        };
      default:
        return null;
    }
  })();

  const isConfirmingAction =
    cancelShiftMutation.isPending || removeCasualMutation.isPending || releaseCasualMutation.isPending;

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

  const activeCasuals = pool.casuals.filter((c) => c.isActive);
  const pendingCasuals = pool.casuals.filter((c) => !c.isActive);

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
                isResending={resendingShiftNotification === shift.id}
              />
            ))}
        </div>
      )}

      {activeTab === "casuals" && (
        <div className="space-y-3">
          <Button variant="secondary" onClick={openAddCasual} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Add Casual
          </Button>

          {activeCasuals.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Active</p>
              {activeCasuals.map((casual) => (
                <CasualRow
                  key={casual.id}
                  casual={casual}
                  onRemove={() => handleRemoveCasual(casual.id)}
                  onResendInvite={() => handleResendInvite(casual)}
                  onEditAvailability={() => handleOpenAvailability(casual)}
                  isResending={resendingInvite === casual.id}
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
                  onRemove={() => handleRemoveCasual(casual.id)}
                  onResendInvite={() => handleResendInvite(casual)}
                  onEditAvailability={() => handleOpenAvailability(casual)}
                  isResending={resendingInvite === casual.id}
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
            onClick={() => {
              setShiftForm(buildDefaultShiftForm());
              setIsCreating(true);
            }}
          >
            <Plus className="w-5 h-5" /> Post Shift
          </Button>
        </div>
      )}

      {/* Create Shift Modal */}
      <Modal isOpen={isCreating} onClose={() => setIsCreating(false)} title="New Shift">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Start</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date</label>
                <div className="ui-input-shell">
                  <input
                    type="date"
                    className="ui-input-field"
                    value={shiftForm.startDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={(e) => setShiftForm({ ...shiftForm, startDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Time</label>
                <TimeInput
                  value={shiftForm.startTime}
                  onChange={(value) => setShiftForm({ ...shiftForm, startTime: value })}
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">End</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Date</label>
                <div className="ui-input-shell">
                  <input
                    type="date"
                    className="ui-input-field"
                    value={shiftForm.endDate}
                    min={shiftForm.startDate || new Date().toISOString().split("T")[0]}
                    onChange={(e) => setShiftForm({ ...shiftForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Time</label>
                <TimeInput
                  value={shiftForm.endTime}
                  onChange={(value) => setShiftForm({ ...shiftForm, endTime: value })}
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Spots Needed</label>
            <div className="ui-input-shell">
              <input
                type="number"
                min="1"
                step="1"
                className="ui-input-field"
                value={Number.isFinite(shiftForm.spotsNeeded) ? shiftForm.spotsNeeded : ""}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  const parsed = rawValue === "" ? Number.NaN : Number(rawValue);
                  setShiftForm({ ...shiftForm, spotsNeeded: parsed });
                }}
              />
            </div>
          </div>
          <Button className="w-full mt-2" onClick={handlePostShift} isLoading={postShiftMutation.isPending}>
            Post Shift
          </Button>
        </div>
      </Modal>

      {/* Add Casual Modal */}
      <Modal isOpen={isAddingCasual} onClose={closeAddCasual} title="Add Casual">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddCasual();
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Casual Name</label>
            <input
              type="text"
              className={`ui-input ${casualErrors.name ? "ui-input-error" : ""}`}
              value={casualForm.name}
              onChange={(e) => {
                setCasualForm({ ...casualForm, name: e.target.value });
                if (casualErrors.name) {
                  setCasualErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              autoFocus
            />
            {casualErrors.name && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{casualErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
            <input
              type="tel"
              className={`ui-input ${casualErrors.phone ? "ui-input-error" : ""}`}
              value={casualForm.phone}
              onChange={(e) => {
                setCasualForm({ ...casualForm, phone: e.target.value });
                if (casualErrors.phone) {
                  setCasualErrors((prev) => ({ ...prev, phone: undefined }));
                }
              }}
            />
            {casualErrors.phone && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{casualErrors.phone}</p>}
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeAddCasual}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={addCasualMutation.isPending}>
              Add Casual
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Action Modal */}
      <ConfirmDialog
        isOpen={confirmAction !== null && confirmActionCopy !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        title={confirmActionCopy?.title ?? ""}
        message={confirmActionCopy?.message ?? ""}
        confirmLabel={confirmActionCopy?.confirmLabel ?? "Confirm"}
        isDanger={confirmAction?.type === "cancelShift" || confirmAction?.type === "removeCasual"}
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

// Extracted CasualRow component for cleaner code
interface CasualRowProps {
  casual: CasualResponse;
  onRemove: () => void;
  onResendInvite: () => void;
  onEditAvailability: () => void;
  isResending: boolean;
}

function CasualRow({ casual, onRemove, onResendInvite, onEditAvailability, isResending }: CasualRowProps) {
  const statusBadge = casual.isOptedOut ? (
    <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
      Opted Out
    </span>
  ) : casual.isActive ? (
    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      Active
    </span>
  ) : (
    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
      Pending
    </span>
  );

  const canResend = !casual.isOptedOut && casual.inviteStatus === "Pending";

  return (
    <div className="ui-surface p-4 rounded-xl flex justify-between items-center mb-2">
      <div>
        <div className="font-medium text-slate-900 dark:text-slate-100">{casual.name}</div>
        <div className="text-sm text-slate-500 dark:text-slate-400">{casual.phoneNumber}</div>
      </div>
      <div className="flex items-center gap-2">
        {statusBadge}
        <button
          onClick={onEditAvailability}
          className="p-2 text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
          title="Edit availability"
        >
          <Calendar className="w-4 h-4" />
        </button>
        {canResend && (
          <button
            onClick={onResendInvite}
            disabled={isResending}
            className="p-2 text-slate-400 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors disabled:opacity-50"
            title="Resend invite"
          >
            <RefreshCw className={`w-4 h-4 ${isResending ? "animate-spin" : ""}`} />
          </button>
        )}
        <button
          onClick={onRemove}
          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
