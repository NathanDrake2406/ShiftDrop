import { Bell, BellOff } from "lucide-react";
import { usePushNotifications } from "../hooks/usePushNotifications";

interface PushToggleProps {
  phoneNumber: string;
}

export function PushToggle({ phoneNumber }: PushToggleProps) {
  const { isSupported, isSubscribed, isLoading, error, subscribe, unsubscribe } = usePushNotifications(phoneNumber);

  if (!isSupported) {
    return null; // Don't show if push not supported
  }

  return (
    <div className="ui-surface p-4 rounded-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubscribed ? <Bell className="w-5 h-5 text-orange-500" /> : <BellOff className="w-5 h-5 text-slate-400" />}
          <div>
            <div className="font-medium text-slate-900 dark:text-white">Push Notifications</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {isSubscribed ? "Get instant alerts for new shifts" : "Enable to get instant alerts"}
            </div>
          </div>
        </div>
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isSubscribed ? "bg-orange-500" : "bg-slate-300 dark:bg-slate-600"
          } ${isLoading ? "opacity-50" : ""}`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              isSubscribed ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  );
}
