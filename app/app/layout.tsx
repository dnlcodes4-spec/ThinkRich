import { ToastProvider } from "@/components/ui/toast";

// The signed-in app wraps its routes in the toast provider so any action can give
// transient feedback. (The public marketing site does not need it.)
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
