import Link from "next/link";
import { AlertTriangle, LayoutGrid, Truck, Users } from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Envios", href: "/envios", icon: Truck },
  { label: "Incidencias", href: "/incidencias", icon: AlertTriangle },
  { label: "Conductores", href: "/conductores", icon: Users },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-20 h-screen w-64 border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 px-6 text-sm font-semibold text-white">
        <span className="h-2.5 w-2.5 rounded-full bg-primary shadow-glow-primary" />
        On-site Transit
      </div>
      <nav className="space-y-2 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/";
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-primary/10 text-primary shadow-[inset_2px_0_0_0_rgba(59,130,246,1)]"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
