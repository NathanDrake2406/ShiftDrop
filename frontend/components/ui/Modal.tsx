import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Max width class (default: max-w-md) */
  maxWidth?: string;
  /** Show close button in header */
  showCloseButton?: boolean;
}

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-md", showCloseButton = true }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap - focus autoFocus element or first input on open
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    // Prefer element with autoFocus, then first input, then first focusable
    const autoFocusElement = panelRef.current.querySelector<HTMLElement>("[autofocus]");
    if (autoFocusElement) {
      autoFocusElement.focus();
      return;
    }

    const firstInput = panelRef.current.querySelector<HTMLElement>("input, select, textarea");
    if (firstInput) {
      firstInput.focus();
      return;
    }

    const focusableElements = panelRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusableElements[0]?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="ui-modal-backdrop animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        ref={panelRef}
        className={`ui-modal-panel ${maxWidth} animate-in slide-in-from-bottom-10 fade-in duration-200`}
      >
        {(title || showCloseButton) && (
          <div className="ui-modal-header">
            {title && (
              <h2 id="modal-title" className="ui-modal-title">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button onClick={onClose} className="ui-icon-button" aria-label="Close modal">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
