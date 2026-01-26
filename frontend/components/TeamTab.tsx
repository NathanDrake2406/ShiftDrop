import { useState } from "react";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import type { PoolAdminResponse } from "../types/api";

interface TeamTabProps {
  ownerLabel: string;
  admins: PoolAdminResponse[];
  onInviteAdmin: (phoneNumber: string, name: string) => Promise<void>;
  onRemoveAdmin: (adminId: string) => Promise<void>;
  isLoading?: boolean;
  isDemoMode?: boolean;
}

export function TeamTab({ ownerLabel, admins, onInviteAdmin, onRemoveAdmin, isLoading, isDemoMode }: TeamTabProps) {
  const [isInviting, setIsInviting] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleInvite = async () => {
    setError(null);
    setIsSaving(true);
    try {
      await onInviteAdmin(phoneNumber.trim(), name.trim());
      setIsInviting(false);
      setPhoneNumber("");
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite admin");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (adminId: string) => {
    try {
      await onRemoveAdmin(adminId);
    } catch (err) {
      // Handle error silently or show toast
      console.error("Failed to remove admin:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="ui-surface p-4 rounded-xl">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-3" />
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32" />
        </div>
        <div className="ui-surface p-4 rounded-xl">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24 mb-3" />
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="ui-surface p-4 rounded-xl">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Pool Owner</p>
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-800 dark:text-slate-200">{ownerLabel}</span>
          <span className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
            Owner
          </span>
        </div>
      </div>

      <div className="ui-surface p-4 rounded-xl">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">Admins (2IC)</p>

        {admins.length === 0 && <p className="text-slate-400 dark:text-slate-500 text-sm mb-3">No admins yet</p>}

        {admins.map((admin) => (
          <div
            key={admin.id}
            className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0"
          >
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">{admin.name}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{admin.phoneNumber}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  admin.isAccepted
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                }`}
              >
                {admin.isAccepted ? "Active" : "Pending"}
              </span>
              <button
                onClick={() => handleRemove(admin.id)}
                className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                title="Remove admin"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}

        <Button variant="secondary" className="w-full mt-3" onClick={() => setIsInviting(true)} disabled={isDemoMode}>
          + Add Admin
        </Button>
        {isDemoMode && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
            Admin management not available in demo mode
          </p>
        )}
      </div>

      <Modal isOpen={isInviting} onClose={() => setIsInviting(false)} title="Invite Admin">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
            <input
              type="text"
              className="ui-input-field w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah Chen"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
            <input
              type="tel"
              className="ui-input-field w-full"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+61400123456"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsInviting(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isSaving || !phoneNumber || !name} className="flex-1">
              {isSaving ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
