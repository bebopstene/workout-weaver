import { Link, useRouterState } from "@tanstack/react-router";
import { Dumbbell, History, LineChart, User } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { hydrate } from "@/lib/gym-store";

const tabs = [
  { to: "/", label: "Log", icon: Dumbbell },
  { to: "/storico", label: "Storico", icon: History },
  { to: "/progressi", label: "Progressi", icon: LineChart },
  { to: "/profilo", label: "Profilo", icon: User },
] as const;

export function AppShell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    hydrate();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <main className="flex-1 pb-40">{children}</main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-md">
          {footer}
          <nav className="flex h-16 items-center justify-around px-4 pb-[env(safe-area-inset-bottom)]">
            {tabs.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex min-w-0 flex-col items-center gap-1 px-3 py-1 transition-opacity ${
                    active ? "text-accent opacity-100" : "text-foreground opacity-40"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}