import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateShiftModal } from "./CreateShiftModal";

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

describe("CreateShiftModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    postShift: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("renders modal with title when open", () => {
      render(<CreateShiftModal {...defaultProps} />);

      expect(screen.getByText("New Shift")).toBeInTheDocument();
    });

    it("does not render content when closed", () => {
      render(<CreateShiftModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText("New Shift")).not.toBeInTheDocument();
    });

    it("renders with default form values (1 hour from now, 4 hour duration)", () => {
      render(<CreateShiftModal {...defaultProps} />);

      // Start date input (found by id)
      const startDateInput = document.getElementById("start-date") as HTMLInputElement;
      expect(startDateInput.value).toBe("2024-06-15");

      // Start time should be 11:00 (1 hour from 10:00)
      const startTimeInput = screen.getByTestId("start-time-input") as HTMLInputElement;
      expect(startTimeInput.value).toBe("11:00");

      // End time should be 15:00 (4 hours after start)
      const endTimeInput = screen.getByTestId("end-time-input") as HTMLInputElement;
      expect(endTimeInput.value).toBe("15:00");

      // Spots should default to 1
      const spotsInput = screen.getByLabelText(/spots needed/i) as HTMLInputElement;
      expect(spotsInput.value).toBe("1");
    });

    it("renders Post Shift button", () => {
      render(<CreateShiftModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: /post shift/i })).toBeInTheDocument();
    });
  });

  describe("validation", () => {
    // Use real timers for async validation tests
    it("shows error when start date is empty", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00"));

      render(<CreateShiftModal {...defaultProps} />);

      // Clear the start date
      const startDateInput = document.getElementById("start-date") as HTMLInputElement;
      fireEvent.change(startDateInput, { target: { value: "" } });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /post shift/i }));

      // Validation error should show (sync operation)
      expect(screen.getByText(/please select start and end/i)).toBeInTheDocument();
      expect(defaultProps.postShift).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("shows error when end time is before start time", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00"));

      render(<CreateShiftModal {...defaultProps} />);

      // Set end time before start time (start is 11:00, set end to 10:00)
      const endTimeInput = screen.getByTestId("end-time-input");
      fireEvent.change(endTimeInput, { target: { value: "10:00" } });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /post shift/i }));

      // Validation is synchronous
      expect(screen.getByText(/end time must be after/i)).toBeInTheDocument();
      expect(defaultProps.postShift).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("shows error when duration exceeds 15 hours", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00"));

      render(<CreateShiftModal {...defaultProps} />);

      // Set end date to next day and time to make it > 15 hours
      // Start is 2024-06-15 11:00, end is 2024-06-16 04:00 = 17 hours
      const endDateInput = document.getElementById("end-date") as HTMLInputElement;
      fireEvent.change(endDateInput, { target: { value: "2024-06-16" } });

      const endTimeInput = screen.getByTestId("end-time-input");
      fireEvent.change(endTimeInput, { target: { value: "04:00" } });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /post shift/i }));

      expect(screen.getByText(/cannot exceed 15 hours/i)).toBeInTheDocument();
      expect(defaultProps.postShift).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("shows error when spots is less than 1", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00"));

      render(<CreateShiftModal {...defaultProps} />);

      const spotsInput = screen.getByLabelText(/spots needed/i);
      fireEvent.change(spotsInput, { target: { value: "0" } });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /post shift/i }));

      expect(screen.getByText(/at least 1/i)).toBeInTheDocument();
      expect(defaultProps.postShift).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("shows error when spots is empty", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00"));

      render(<CreateShiftModal {...defaultProps} />);

      const spotsInput = screen.getByLabelText(/spots needed/i);
      fireEvent.change(spotsInput, { target: { value: "" } });

      // Submit
      fireEvent.click(screen.getByRole("button", { name: /post shift/i }));

      expect(screen.getByText(/at least 1/i)).toBeInTheDocument();
      expect(defaultProps.postShift).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("submission", () => {
    it("calls postShift with ISO date strings on valid submission", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00"));

      const postShift = vi.fn().mockResolvedValue(undefined);
      render(<CreateShiftModal {...defaultProps} postShift={postShift} />);

      // Submit with default values
      fireEvent.click(screen.getByRole("button", { name: /post shift/i }));

      // Run pending promises
      await vi.runAllTimersAsync();

      expect(postShift).toHaveBeenCalledTimes(1);

      // Verify structure without checking exact timezone-dependent values
      const callArg = postShift.mock.calls[0]?.[0];
      expect(callArg).toHaveProperty("startsAt");
      expect(callArg).toHaveProperty("endsAt");
      expect(callArg).toHaveProperty("spotsNeeded", 1);

      // Verify ISO format
      expect(callArg.startsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(callArg.endsAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Verify end is after start (4 hours later)
      const start = new Date(callArg.startsAt);
      const end = new Date(callArg.endsAt);
      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      expect(durationHours).toBe(4);

      vi.useRealTimers();
    });

    it("calls onSuccess after successful submission", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00"));

      const onSuccess = vi.fn();
      const postShift = vi.fn().mockResolvedValue(undefined);
      render(<CreateShiftModal {...defaultProps} postShift={postShift} onSuccess={onSuccess} />);

      fireEvent.click(screen.getByRole("button", { name: /post shift/i }));

      await vi.runAllTimersAsync();

      expect(onSuccess).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it("calls onClose after successful submission", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00"));

      const onClose = vi.fn();
      const postShift = vi.fn().mockResolvedValue(undefined);
      render(<CreateShiftModal {...defaultProps} postShift={postShift} onClose={onClose} />);

      fireEvent.click(screen.getByRole("button", { name: /post shift/i }));

      await vi.runAllTimersAsync();

      expect(onClose).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it("does not call onSuccess if postShift throws", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00"));

      const error = new Error("API error");
      const postShift = vi.fn().mockRejectedValue(error);
      const onSuccess = vi.fn();
      const onClose = vi.fn();

      render(<CreateShiftModal {...defaultProps} postShift={postShift} onSuccess={onSuccess} onClose={onClose} />);

      fireEvent.click(screen.getByRole("button", { name: /post shift/i }));

      await vi.runAllTimersAsync();

      expect(postShift).toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe("loading state", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("disables submit button when isLoading is true", () => {
      render(<CreateShiftModal {...defaultProps} isLoading={true} />);

      // When loading, button shows a loading spinner
      const buttons = screen.getAllByRole("button");
      const submitButton = buttons.find((b) => b.textContent?.includes("Loading"));
      expect(submitButton).toBeDisabled();
    });

    it("disables form inputs when loading", () => {
      render(<CreateShiftModal {...defaultProps} isLoading={true} />);

      const spotsInput = screen.getByLabelText(/spots needed/i);
      expect(spotsInput).toBeDisabled();

      const startTimeInput = screen.getByTestId("start-time-input");
      expect(startTimeInput).toBeDisabled();

      const endTimeInput = screen.getByTestId("end-time-input");
      expect(endTimeInput).toBeDisabled();
    });
  });

  describe("form reset", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("resets form to defaults when modal is reopened", () => {
      const { rerender } = render(<CreateShiftModal {...defaultProps} />);

      // Change spots
      const spotsInput = screen.getByLabelText(/spots needed/i);
      fireEvent.change(spotsInput, { target: { value: "5" } });
      expect((spotsInput as HTMLInputElement).value).toBe("5");

      // Close modal
      rerender(<CreateShiftModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<CreateShiftModal {...defaultProps} isOpen={true} />);

      // Should be reset to 1
      const newSpotsInput = screen.getByLabelText(/spots needed/i) as HTMLInputElement;
      expect(newSpotsInput.value).toBe("1");
    });
  });

  describe("custom spots value", () => {
    it("submits with custom spots value", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-06-15T10:00:00"));

      const postShift = vi.fn().mockResolvedValue(undefined);
      render(<CreateShiftModal {...defaultProps} postShift={postShift} />);

      const spotsInput = screen.getByLabelText(/spots needed/i);
      fireEvent.change(spotsInput, { target: { value: "3" } });

      fireEvent.click(screen.getByRole("button", { name: /post shift/i }));

      await vi.runAllTimersAsync();

      expect(postShift).toHaveBeenCalledWith(expect.objectContaining({ spotsNeeded: 3 }));

      vi.useRealTimers();
    });
  });
});
