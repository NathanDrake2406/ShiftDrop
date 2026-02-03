import { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { ApiError } from "../../types/api";

export interface AddCasualRequest {
  name: string;
  phoneNumber: string;
}

export interface AddCasualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (name: string) => void;
  addCasual: (data: AddCasualRequest) => Promise<void>;
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

function validateCasualForm(nameInput: string, phoneInput: string) {
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function AddCasualModal({ isOpen, onClose, onSuccess, addCasual, isLoading }: AddCasualModalProps) {
  const [casualForm, setCasualForm] = useState({ name: "", phone: "" });
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setCasualForm({ name: "", phone: "" });
      setErrors({});
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const validation = validateCasualForm(casualForm.name, casualForm.phone);
    setErrors(validation.errors);

    if (validation.errors.name || validation.errors.phone) {
      return;
    }

    try {
      await addCasual({
        name: validation.name,
        phoneNumber: validation.phone,
      });
      onSuccess(validation.name);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ phone: err.message });
      } else {
        setErrors({ phone: "Failed to add casual" });
      }
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Casual">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div>
          <label htmlFor="casual-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Casual Name
          </label>
          <input
            id="casual-name"
            type="text"
            className={`ui-input ${errors.name ? "ui-input-error" : ""}`}
            value={casualForm.name}
            onChange={(e) => {
              setCasualForm({ ...casualForm, name: e.target.value });
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            disabled={isLoading}
            autoFocus
          />
          {errors.name && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="casual-phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Phone Number
          </label>
          <input
            id="casual-phone"
            type="tel"
            className={`ui-input ${errors.phone ? "ui-input-error" : ""}`}
            value={casualForm.phone}
            onChange={(e) => {
              setCasualForm({ ...casualForm, phone: e.target.value });
              if (errors.phone) {
                setErrors((prev) => ({ ...prev, phone: undefined }));
              }
            }}
            disabled={isLoading}
          />
          {errors.phone && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{errors.phone}</p>}
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={isLoading}>
            Add Casual
          </Button>
        </div>
      </form>
    </Modal>
  );
}
