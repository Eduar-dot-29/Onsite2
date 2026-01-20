import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Plus, Package, MapPin, Clock, AlertTriangle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { api, Shipment } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendiente", color: "text-warning", bg: "bg-warning/10" },
  in_transit: { label: "En Tránsito", color: "text-primary", bg: "bg-primary/10" },
  delivered: { label: "Entregado", color: "text-success", bg: "bg-success/10" },
  delayed: { label: "Retrasado", color: "text-destructive", bg: "bg-destructive/10" },
  cancelled: { label: "Cancelado", color: "text-slate-400", bg: "bg-slate-400/10" },
};

export default function EnviosPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login");
      return;
    }

    loadShipments();
  }, [router]);

  const loadShipments = async () => {
    try {
      const data = await api.getShipments();
      setShipments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar envíos");
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: shipments.length,
    inTransit: shipments.filter((s) => s.status === "in_transit").length,
    delayed: shipments.filter((s) => s.status === "delayed").length,
    delivered: shipments.filter((s) => s.status === "delivered").length,
  };

  if (loading) {
    return (
      <AppLayout>
        <main className="px-6 py-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-400">Cargando envíos...</div>
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="px-6 py-8">
        <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Envíos</h1>
            <p className="mt-1 text-sm text-slate-400">
              Gestiona y monitorea todos tus envíos
            </p>
          </div>
          <Link
            href="/envios/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-glow-primary transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Nuevo Envío
          </Link>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Envíos"
            value={stats.total}
            icon={Package}
            color="text-white"
          />
          <StatCard
            label="En Tránsito"
            value={stats.inTransit}
            icon={MapPin}
            color="text-primary"
          />
          <StatCard
            label="Retrasados"
            value={stats.delayed}
            icon={AlertTriangle}
            color="text-destructive"
          />
          <StatCard
            label="Entregados"
            value={stats.delivered}
            icon={Clock}
            color="text-success"
          />
        </div>

        {/* Shipments List */}
        <div className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="font-medium text-white">Lista de Envíos</h2>
          </div>

          {shipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No hay envíos todavía</p>
              <Link
                href="/envios/nuevo"
                className="mt-4 text-sm text-primary hover:underline"
              >
                Crear tu primer envío
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {shipments.map((shipment) => (
                <ShipmentRow key={shipment.id} shipment={shipment} />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
    </AppLayout>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className={`mt-3 text-3xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function ShipmentRow({ shipment }: { shipment: Shipment }) {
  const status = statusConfig[shipment.status] || statusConfig.pending;

  return (
    <Link
      href={`/envios/${shipment.id}`}
      className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <p className="font-medium text-white truncate">{shipment.customer_name}</p>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.color}`}
          >
            {status.label}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-4 text-sm text-slate-400">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {shipment.origin_text} → {shipment.destination_text}
          </span>
        </div>
      </div>
      <div className="ml-4 text-right text-sm">
        <p className="text-slate-300">
          ETA: {format(new Date(shipment.estimated_arrival_at), "dd MMM, HH:mm", { locale: es })}
        </p>
        <p className="text-xs text-slate-500">
          Creado: {format(new Date(shipment.created_at), "dd/MM/yyyy", { locale: es })}
        </p>
      </div>
    </Link>
  );
}
