import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Package, Truck, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { api, Shipment } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string }> = {
  CREATED: { label: "Creado", color: "text-slate-400" },
  ASSIGNED: { label: "Asignado", color: "text-warning" },
  IN_TRANSIT: { label: "En Tránsito", color: "text-primary" },
  INCIDENT: { label: "Incidencia", color: "text-orange-400" },
  DELAYED: { label: "Retrasado", color: "text-destructive" },
  DELIVERED: { label: "Entregado", color: "text-success" },
  // Fallback for old lowercase values
  pending: { label: "Pendiente", color: "text-warning" },
  in_transit: { label: "En Tránsito", color: "text-primary" },
  delivered: { label: "Entregado", color: "text-success" },
  delayed: { label: "Retrasado", color: "text-destructive" },
  cancelled: { label: "Cancelado", color: "text-slate-400" },
};

export default function DashboardPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login");
      return;
    }

    loadData();
  }, [router]);

  const loadData = async () => {
    try {
      const data = await api.getShipments();
      setShipments(data);
    } catch (err) {
      console.error("Error loading shipments:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: shipments.length,
    inTransit: shipments.filter((s) => ['IN_TRANSIT', 'ASSIGNED', 'in_transit', 'pending'].includes(s.status)).length,
    delayed: shipments.filter((s) => ['DELAYED', 'INCIDENT', 'delayed'].includes(s.status)).length,
    delivered: shipments.filter((s) => ['DELIVERED', 'delivered'].includes(s.status)).length,
  };

  const recentShipments = shipments.slice(0, 5);

  return (
    <AppLayout>
      <main className="px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <header className="space-y-2">
            <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
            <p className="text-sm text-slate-400">
              Resumen de actividad de envíos en tu red.
            </p>
          </header>

          {/* Stats - Clickable to filter */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Envíos"
              value={stats.total}
              icon={Package}
              color="text-white"
              loading={loading}
              href="/envios"
            />
            <StatCard
              label="En Tránsito"
              value={stats.inTransit}
              icon={Truck}
              color="text-primary"
              loading={loading}
              href="/envios?status=IN_TRANSIT"
            />
            <StatCard
              label="Retrasados"
              value={stats.delayed}
              icon={AlertTriangle}
              color="text-destructive"
              loading={loading}
              href="/envios?status=DELAYED"
            />
            <StatCard
              label="Entregados"
              value={stats.delivered}
              icon={CheckCircle}
              color="text-success"
              loading={loading}
              href="/envios?status=DELIVERED"
            />
          </section>

          {/* Recent Shipments */}
          <section className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-medium text-white">Envíos Recientes</h2>
              <Link
                href="/envios"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                Ver todos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-slate-400">Cargando...</p>
              </div>
            ) : recentShipments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-10 w-10 text-slate-600 mb-3" />
                <p className="text-slate-400">No hay envíos todavía</p>
                <Link
                  href="/envios/nuevo"
                  className="mt-3 text-sm text-primary hover:underline"
                >
                  Crear tu primer envío
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentShipments.map((shipment) => {
                  const status = statusConfig[shipment.status] || statusConfig.CREATED;
                  return (
                    <Link
                      key={shipment.id}
                      href={`/envios/${shipment.id}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition"
                    >
                      <div>
                        <p className="font-medium text-white">{shipment.customer_name}</p>
                        <p className="text-sm text-slate-400">
                          {shipment.origin_text} → {shipment.destination_text}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm ${status.color}`}>{status.label}</p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(shipment.created_at), "dd/MM/yyyy", { locale: es })}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
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
  loading,
  href,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  loading: boolean;
  href: string;
}) {
  return (
    <Link 
      href={href}
      className="rounded-xl border border-border bg-card p-5 hover:bg-white/5 transition cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <p className={`mt-3 text-3xl font-semibold ${color}`}>
        {loading ? "—" : value}
      </p>
      <p className="mt-2 text-xs text-slate-500">Click para filtrar</p>
    </Link>
  );
}
