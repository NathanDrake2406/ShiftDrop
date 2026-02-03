import { useRef, useCallback } from "react";
import type { CasualResponse } from "../types/api";

interface CasualCallbackHandlers {
  onRemove: (casualId: string) => void;
  onResendInvite: (casual: CasualResponse) => void;
  onEditAvailability: (casual: CasualResponse) => void;
}

interface CasualCallbacks {
  onRemove: () => void;
  onResendInvite: () => void;
  onEditAvailability: () => void;
}

/**
 * Hook that provides stable callback references for CasualRow components.
 *
 * Without this, inline callbacks like `onRemove={() => handleRemoveCasual(casual.id)}`
 * create new function references on every render, defeating React.memo.
 *
 * This hook caches callbacks by casualId, so the same casual always receives
 * the same callback references. The cached callbacks use refs to access the
 * latest handler versions, so even when handlers change, callbacks remain stable.
 *
 * @example
 * ```tsx
 * const callbacks = useCasualCallbacks({
 *   onRemove: handleRemoveCasual,
 *   onResendInvite: handleResendInvite,
 *   onEditAvailability: handleOpenAvailability,
 * });
 *
 * // In render:
 * {casuals.map(casual => (
 *   <CasualRow
 *     key={casual.id}
 *     casual={casual}
 *     {...callbacks.getCallbacks(casual)}
 *   />
 * ))}
 * ```
 */
export function useCasualCallbacks(handlers: CasualCallbackHandlers) {
  // Store handlers in refs so cached callbacks always use latest versions
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  // Cache callbacks by casualId to maintain referential stability
  const callbackCacheRef = useRef(new Map<string, CasualCallbacks>());

  const getCallbacks = useCallback((casual: CasualResponse): CasualCallbacks => {
    const cached = callbackCacheRef.current.get(casual.id);
    if (cached) {
      return cached;
    }

    // Create stable callbacks that read from ref (always use latest handlers)
    const callbacks: CasualCallbacks = {
      onRemove: () => handlersRef.current.onRemove(casual.id),
      onResendInvite: () => handlersRef.current.onResendInvite(casual),
      onEditAvailability: () => handlersRef.current.onEditAvailability(casual),
    };

    callbackCacheRef.current.set(casual.id, callbacks);
    return callbacks;
  }, []);

  return { getCallbacks };
}
