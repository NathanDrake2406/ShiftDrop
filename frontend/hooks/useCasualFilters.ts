import { useMemo } from "react";
import type { CasualResponse } from "../types/api";

/**
 * Hook that memoizes filtered casual lists.
 *
 * Without memoization, filtering creates new array references on every render,
 * causing unnecessary re-renders in child components and defeating React.memo.
 *
 * @param casuals - Array of casuals from the pool
 * @returns Object with memoized `activeCasuals` and `pendingCasuals` arrays
 */
export function useCasualFilters(casuals: CasualResponse[]) {
  const activeCasuals = useMemo(() => casuals.filter((c) => c.isActive), [casuals]);

  const pendingCasuals = useMemo(() => casuals.filter((c) => !c.isActive), [casuals]);

  return { activeCasuals, pendingCasuals };
}
