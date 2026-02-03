import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CasualRow, isCasualRowMemoized } from "./CasualRow";
import type { CasualResponse } from "../types/api";

// Mock window.matchMedia for any components that might use it
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

// Factory for creating test casuals
const createCasual = (overrides: Partial<CasualResponse> = {}): CasualResponse => ({
  id: "casual-1",
  name: "Jane Doe",
  phoneNumber: "+61400000001",
  inviteStatus: "Accepted",
  isActive: true,
  isOptedOut: false,
  ...overrides,
});

describe("CasualRow", () => {
  const defaultProps = {
    casual: createCasual(),
    onRemove: vi.fn(),
    onResendInvite: vi.fn(),
    onEditAvailability: vi.fn(),
  };

  describe("display", () => {
    it("displays casual name and phone number", () => {
      render(<CasualRow {...defaultProps} />);

      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("+61400000001")).toBeInTheDocument();
    });
  });

  describe("status badges", () => {
    it("shows Active badge when casual is active", () => {
      render(<CasualRow {...defaultProps} casual={createCasual({ isActive: true, isOptedOut: false })} />);

      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    it("shows Pending badge when casual is not active and not opted out", () => {
      render(<CasualRow {...defaultProps} casual={createCasual({ isActive: false, isOptedOut: false })} />);

      expect(screen.getByText("Pending")).toBeInTheDocument();
    });

    it("shows Opted Out badge when casual has opted out", () => {
      render(<CasualRow {...defaultProps} casual={createCasual({ isOptedOut: true, isActive: false })} />);

      expect(screen.getByText("Opted Out")).toBeInTheDocument();
    });

    it("shows Opted Out badge even when isActive is true (opted out takes precedence)", () => {
      // Edge case: isOptedOut should take precedence over isActive
      render(<CasualRow {...defaultProps} casual={createCasual({ isOptedOut: true, isActive: true })} />);

      expect(screen.getByText("Opted Out")).toBeInTheDocument();
    });
  });

  describe("callbacks", () => {
    it("calls onRemove when remove button is clicked", () => {
      const onRemove = vi.fn();
      render(<CasualRow {...defaultProps} onRemove={onRemove} />);

      // Find the trash button (last button in the row)
      const buttons = screen.getAllByRole("button");
      const removeButton = buttons[buttons.length - 1];
      if (!removeButton) throw new Error("Remove button not found");

      fireEvent.click(removeButton);

      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it("calls onEditAvailability when calendar button is clicked", () => {
      const onEditAvailability = vi.fn();
      render(<CasualRow {...defaultProps} onEditAvailability={onEditAvailability} />);

      // Calendar button should have a title
      const calendarButton = screen.getByTitle("Edit availability");
      fireEvent.click(calendarButton);

      expect(onEditAvailability).toHaveBeenCalledTimes(1);
    });
  });

  describe("resend invite button", () => {
    it("shows resend invite button when invite status is Pending and not opted out", () => {
      render(
        <CasualRow
          {...defaultProps}
          casual={createCasual({ inviteStatus: "Pending", isOptedOut: false })}
        />,
      );

      expect(screen.getByTitle("Resend invite")).toBeInTheDocument();
    });

    it("hides resend invite button when invite status is Accepted", () => {
      render(
        <CasualRow
          {...defaultProps}
          casual={createCasual({ inviteStatus: "Accepted", isOptedOut: false })}
        />,
      );

      expect(screen.queryByTitle("Resend invite")).not.toBeInTheDocument();
    });

    it("hides resend invite button when casual has opted out", () => {
      render(
        <CasualRow
          {...defaultProps}
          casual={createCasual({ inviteStatus: "Pending", isOptedOut: true })}
        />,
      );

      expect(screen.queryByTitle("Resend invite")).not.toBeInTheDocument();
    });

    it("calls onResendInvite when resend button is clicked", () => {
      const onResendInvite = vi.fn();
      render(
        <CasualRow
          {...defaultProps}
          onResendInvite={onResendInvite}
          casual={createCasual({ inviteStatus: "Pending", isOptedOut: false })}
        />,
      );

      fireEvent.click(screen.getByTitle("Resend invite"));

      expect(onResendInvite).toHaveBeenCalledTimes(1);
    });
  });

  describe("memoization", () => {
    it("is wrapped with React.memo for performance optimization", () => {
      // This test verifies the component is memoized at the module level
      expect(isCasualRowMemoized).toBe(true);
    });
  });
});
