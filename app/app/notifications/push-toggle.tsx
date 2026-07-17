"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { subscribeUser, unsubscribeUser } from "./push-actions";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// SSR-safe support check without setState-in-effect.
function useSupported(): boolean {
  return (
    useSyncExternalStore(
      () => () => {},
      () => ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window ? "1" : "0"),
      () => "0",
    ) === "1"
  );
}

// Opt-in push toggle, shown in context (never prompted on first load).
export function PushToggle() {
  const supported = useSupported();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let active = true;
    void (async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (active) setSubscribed(!!sub);
    })();
    return () => {
      active = false;
    };
  }, [supported]);

  if (!supported) {
    return <p className="text-xs text-muted">Push isn&rsquo;t supported in this browser.</p>;
  }

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) return;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const res = await subscribeUser(JSON.parse(JSON.stringify(sub)));
      if (res.ok) setSubscribed(true);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribeUser(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Push notifications</p>
        <p className="text-xs text-muted">
          {subscribed ? "On for this device." : "Get alerts even when the app is closed."}
        </p>
      </div>
      <button
        type="button"
        onClick={subscribed ? disable : enable}
        disabled={busy || subscribed === null}
        className={
          subscribed
            ? "min-h-9 rounded-md border border-ring px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60"
            : "min-h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
        }
      >
        {busy ? "…" : subscribed ? "Turn off" : "Turn on"}
      </button>
    </div>
  );
}
