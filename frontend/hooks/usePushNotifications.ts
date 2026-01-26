import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "";
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface PushState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export function usePushNotifications(phoneNumber: string | null) {
  const [state, setState] = useState<PushState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const checkSupport = async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;

      if (!supported) {
        setState((s) => ({
          ...s,
          isSupported: false,
          isLoading: false,
        }));
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setState({
          isSupported: true,
          isSubscribed: !!subscription,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: "Failed to check subscription status",
        }));
      }
    };

    checkSupport();
  }, []);

  const subscribe = useCallback(async () => {
    if (!phoneNumber || !VAPID_PUBLIC_KEY) return;

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: "Notification permission denied",
        }));
        return;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON();

      // Send to backend
      const response = await fetch(`${API_URL}/casual/push/subscribe/${encodeURIComponent(phoneNumber)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save subscription");
      }

      setState((s) => ({ ...s, isSubscribed: true, isLoading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to subscribe",
      }));
    }
  }, [phoneNumber]);

  const unsubscribe = useCallback(async () => {
    if (!phoneNumber) return;

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const json = subscription.toJSON();

        // Tell backend
        await fetch(`${API_URL}/casual/push/unsubscribe/${encodeURIComponent(phoneNumber)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: json.endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
          }),
        });

        await subscription.unsubscribe();
      }

      setState((s) => ({ ...s, isSubscribed: false, isLoading: false }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: "Failed to unsubscribe",
      }));
    }
  }, [phoneNumber]);

  return { ...state, subscribe, unsubscribe };
}
