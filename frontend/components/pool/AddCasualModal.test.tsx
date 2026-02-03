import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddCasualModal } from "./AddCasualModal";
import { ApiError } from "../../types/api";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe("AddCasualModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    addCasual: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders modal with title when open", () => {
      render(<AddCasualModal {...defaultProps} />);

      expect(screen.getByRole("heading", { name: "Add Casual" })).toBeInTheDocument();
    });

    it("does not render content when closed", () => {
      render(<AddCasualModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("Add Casual")).not.toBeInTheDocument();
    });

    it("renders name and phone inputs", () => {
      render(<AddCasualModal {...defaultProps} />);

      expect(screen.getByLabelText(/casual name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
    });

    it("renders Add Casual and Cancel buttons", () => {
      render(<AddCasualModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: /add casual/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("has autoFocus on name input", () => {
      render(<AddCasualModal {...defaultProps} />);

      const nameInput = screen.getByLabelText(/casual name/i);
      expect(nameInput).toHaveFocus();
    });
  });

  describe("validation", () => {
    it("shows error when name is empty", async () => {
      render(<AddCasualModal {...defaultProps} />);

      // Fill phone but leave name empty
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0412345678" } });
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));

      expect(screen.getByText(/2-50 characters/i)).toBeInTheDocument();
      expect(defaultProps.addCasual).not.toHaveBeenCalled();
    });

    it("shows error when name is too short", async () => {
      render(<AddCasualModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "A" } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0412345678" } });
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));

      expect(screen.getByText(/2-50 characters/i)).toBeInTheDocument();
      expect(defaultProps.addCasual).not.toHaveBeenCalled();
    });

    it("shows error when name has no letters", async () => {
      render(<AddCasualModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "123" } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0412345678" } });
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));

      expect(screen.getByText(/include a letter/i)).toBeInTheDocument();
      expect(defaultProps.addCasual).not.toHaveBeenCalled();
    });

    it("shows error when phone is empty", async () => {
      render(<AddCasualModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "John" } });
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));

      expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();
      expect(defaultProps.addCasual).not.toHaveBeenCalled();
    });

    it("shows error when phone has invalid characters", async () => {
      render(<AddCasualModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "John" } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "abc123" } });
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));

      expect(screen.getByText(/enter a valid phone/i)).toBeInTheDocument();
      expect(defaultProps.addCasual).not.toHaveBeenCalled();
    });

    it("shows error when phone has too few digits", async () => {
      render(<AddCasualModal {...defaultProps} />);

      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "John" } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "123456" } });
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));

      expect(screen.getByText(/enter a valid phone/i)).toBeInTheDocument();
      expect(defaultProps.addCasual).not.toHaveBeenCalled();
    });

    it("clears name error when user types", async () => {
      render(<AddCasualModal {...defaultProps} />);

      // Trigger validation error
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));
      expect(screen.getByText(/2-50 characters/i)).toBeInTheDocument();

      // Type in name field
      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "J" } });

      // Error should be cleared
      expect(screen.queryByText(/2-50 characters/i)).not.toBeInTheDocument();
    });

    it("clears phone error when user types", async () => {
      render(<AddCasualModal {...defaultProps} />);

      // Fill name, trigger phone validation error
      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "John" } });
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));
      expect(screen.getByText(/phone number is required/i)).toBeInTheDocument();

      // Type in phone field
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0" } });

      // Error should be cleared
      expect(screen.queryByText(/phone number is required/i)).not.toBeInTheDocument();
    });
  });

  describe("submission", () => {
    it("calls addCasual with trimmed name and phone on valid submission", async () => {
      vi.useFakeTimers();
      const addCasual = vi.fn().mockResolvedValue(undefined);
      render(<AddCasualModal {...defaultProps} addCasual={addCasual} />);

      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "  John Doe  " } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "  0412 345 678  " } });
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));

      await vi.runAllTimersAsync();

      expect(addCasual).toHaveBeenCalledTimes(1);
      expect(addCasual).toHaveBeenCalledWith({
        name: "John Doe",
        phoneNumber: "0412 345 678",
      });

      vi.useRealTimers();
    });

    it("calls onSuccess with name after successful submission", async () => {
      vi.useFakeTimers();
      const onSuccess = vi.fn();
      const addCasual = vi.fn().mockResolvedValue(undefined);
      render(<AddCasualModal {...defaultProps} addCasual={addCasual} onSuccess={onSuccess} />);

      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "John" } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0412345678" } });
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));

      await vi.runAllTimersAsync();

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith("John");

      vi.useRealTimers();
    });

    it("calls onClose after successful submission", async () => {
      vi.useFakeTimers();
      const onClose = vi.fn();
      const addCasual = vi.fn().mockResolvedValue(undefined);
      render(<AddCasualModal {...defaultProps} addCasual={addCasual} onClose={onClose} />);

      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "John" } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0412345678" } });
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));

      await vi.runAllTimersAsync();

      expect(onClose).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it("shows API error in phone field when addCasual throws ApiError", async () => {
      vi.useFakeTimers();
      const addCasual = vi.fn().mockRejectedValue(new ApiError(400, "Phone already registered"));
      const onSuccess = vi.fn();

      render(<AddCasualModal {...defaultProps} addCasual={addCasual} onSuccess={onSuccess} />);

      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "John" } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0412345678" } });
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));

      await vi.runAllTimersAsync();

      expect(screen.getByText(/phone already registered/i)).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("shows generic error when addCasual throws non-ApiError", async () => {
      vi.useFakeTimers();
      const addCasual = vi.fn().mockRejectedValue(new Error("Network error"));
      const onSuccess = vi.fn();

      render(<AddCasualModal {...defaultProps} addCasual={addCasual} onSuccess={onSuccess} />);

      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "John" } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0412345678" } });
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));

      await vi.runAllTimersAsync();

      expect(screen.getByText(/failed to add casual/i)).toBeInTheDocument();
      expect(onSuccess).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("submits form on Enter key press", async () => {
      vi.useFakeTimers();
      const addCasual = vi.fn().mockResolvedValue(undefined);
      render(<AddCasualModal {...defaultProps} addCasual={addCasual} />);

      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "John" } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0412345678" } });

      // Submit form via form submission (simulates Enter key)
      const form = screen.getByLabelText(/casual name/i).closest("form");
      fireEvent.submit(form!);

      await vi.runAllTimersAsync();

      expect(addCasual).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe("cancel button", () => {
    it("calls onClose when Cancel is clicked", () => {
      const onClose = vi.fn();
      render(<AddCasualModal {...defaultProps} onClose={onClose} />);

      fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("loading state", () => {
    it("disables submit button when isLoading is true", () => {
      render(<AddCasualModal {...defaultProps} isLoading={true} />);

      // Find submit button (will show loading state)
      const buttons = screen.getAllByRole("button");
      const submitButton = buttons.find((b) => b.textContent?.includes("Loading") || b.textContent?.includes("Add Casual"));
      expect(submitButton).toBeDisabled();
    });

    it("disables form inputs when loading", () => {
      render(<AddCasualModal {...defaultProps} isLoading={true} />);

      expect(screen.getByLabelText(/casual name/i)).toBeDisabled();
      expect(screen.getByLabelText(/phone number/i)).toBeDisabled();
    });
  });

  describe("form reset", () => {
    it("resets form to empty when modal is reopened", () => {
      const { rerender } = render(<AddCasualModal {...defaultProps} />);

      // Enter data
      fireEvent.change(screen.getByLabelText(/casual name/i), { target: { value: "John" } });
      fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: "0412345678" } });

      // Close modal
      rerender(<AddCasualModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<AddCasualModal {...defaultProps} isOpen={true} />);

      // Should be reset to empty
      expect((screen.getByLabelText(/casual name/i) as HTMLInputElement).value).toBe("");
      expect((screen.getByLabelText(/phone number/i) as HTMLInputElement).value).toBe("");
    });

    it("clears validation errors when modal is reopened", () => {
      const { rerender } = render(<AddCasualModal {...defaultProps} />);

      // Trigger validation error
      fireEvent.click(screen.getByRole("button", { name: /add casual/i }));
      expect(screen.getByText(/2-50 characters/i)).toBeInTheDocument();

      // Close modal
      rerender(<AddCasualModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<AddCasualModal {...defaultProps} isOpen={true} />);

      // Errors should be cleared
      expect(screen.queryByText(/2-50 characters/i)).not.toBeInTheDocument();
    });
  });
});
