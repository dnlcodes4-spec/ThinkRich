import { cn } from "@/lib/cn";

// The movement's community chat links (CR-0012). One source of truth for the URLs
// so every surface that promotes them stays in step. Rendered in the app shell so
// it appears on every dashboard and in the members app.
const TELEGRAM = "https://t.me/+RN9Fxs0-4WBmNDdk";
const WHATSAPP = "https://chat.whatsapp.com/Cmkg0QWIJtiExqVrj0rDzA";

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5" fill="currentColor">
      <path d="M21.94 4.66a1.2 1.2 0 0 0-1.27-.19L3.4 11.2c-.9.36-.86 1.66.06 1.96l4.34 1.4 1.64 5.02c.25.72 1.16.9 1.66.33l2.4-2.7 4.3 3.16c.6.44 1.46.12 1.62-.6l3-13.2a1.2 1.2 0 0 0-.48-1.2ZM9.9 14.3l7.4-5.6-6.1 6.5-.2 3.1-1.1-4Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5" fill="currentColor">
      <path d="M12 2a9.94 9.94 0 0 0-8.5 15.1L2 22l4.98-1.46A10 10 0 1 0 12 2Zm5.5 14.2c-.24.66-1.4 1.28-1.94 1.32-.5.04-1.12.2-3.72-.9-3.13-1.35-5.1-4.6-5.26-4.82-.15-.22-1.25-1.66-1.25-3.16s.79-2.24 1.07-2.55a1.1 1.1 0 0 1 .8-.37c.2 0 .4 0 .57.02.2.01.44-.07.68.52.24.6.83 2.06.9 2.2a.53.53 0 0 1 .02.5c-.36.72-.75.9-.5 1.33.9 1.55 1.8 2.09 3.18 2.78.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.58-.18 1.24Z" />
    </svg>
  );
}

const pill =
  "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-foreground transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function CommunityLinks({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-xs font-medium text-muted">Join the community</span>
      <div className="flex flex-wrap gap-2">
        <a href={TELEGRAM} target="_blank" rel="noopener noreferrer" className={pill}>
          <TelegramIcon />
          Telegram
        </a>
        <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className={pill}>
          <WhatsAppIcon />
          WhatsApp
        </a>
      </div>
    </div>
  );
}
