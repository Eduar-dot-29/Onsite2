import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Plus, Package, MapPin, Clock, AlertTriangle, Pencil, Trash2, CheckCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { api, Shipment } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  CREATED: { label: "Creado", color: "text-slate-400", bg: "bg-slate-400/10" },
  ASSIGNED: { label: "Asignado", color: "text-warning", bg: "bg-warning/10" },
  IN_TRANSIT: { label: "En Tránsito", color: "text-primary", bg: "bg-primary/10" },
  INCIDENT: { label: "Incidencia", color: "text-orange-400", bg: "bg-orange-400/10" },
  DELAYED: { label: "Retrasado", color: "text-destructive", bg: "bg-destructive/10" },
  DELIVERED: { label: "Entregado", color: "text-success", bg: "bg-success/10" },
  // Fallback for old lowercase values
  pending: { label: "Pendiente", color: "text-warning", bg: "bg-warning/10" },
  in_transit: { label: "En Tránsito", color: "text-primary", bg: "bg-primary/10" },
  delivered: { label: "Entregado", color: "text-success", bg: "bg-success/10" },
  delayed: { label: "Retrasado", color: "text-destructive", bg: "bg-destructive/10" },
};

type StatusFilter = 'ALL' | 'IN_TRANSIT' | 'DELAYED' | 'DELIVERED';

export default function EnviosPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('ALL');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Get filter from URL on mount
  useEffect(() => {
    const urlFilter = router.query.status as StatusFilter;
    if (urlFilter && ['ALL', 'IN_TRANSIT', 'DELAYED', 'DELIVERED'].includes(urlFilter)) {
      setActiveFilter(urlFilter);
    }
  }, [router.query.status]);

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login");
      return;
    }

    loadShipments();
  }, [router, activeFilter]);

  const loadShipments = async () => {
    setLoading(true);
    try {
      const statusParam = activeFilter === 'ALL' ? undefined : activeFilter;
      const data = await api.getShipments(statusParam as 'IN_TRANSIT' | 'DELAYED' | 'DELIVERED' | undefined);
      setShipments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar envíos");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter: StatusFilter) => {
    setActiveFilter(filter);
    // Update URL for shareable links
    const url = filter === 'ALL' ? '/envios' : `/envios?status=${filter}`;
    router.push(url, undefined, { shallow: true });
  };

  const handleDelete = async (shipmentId: string) => {
    try {
      await api.deleteShipment(shipmentId);
      setShipments(shipments.filter(s => s.id !== shipmentId));
      setDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar envío");
    }
  };

  // Calculate stats from ALL shipments (not filtered)
  const stats = {
    total: shipments.length,
    inTransit: shipments.filter((s) => ['IN_TRANSIT', 'ASSIGNED', 'in_transit', 'pending'].includes(s.status)).length,
    delayed: shipments.filter((s) => ['DELAYED', 'INCIDENT', 'delayed'].includes(s.status)).length,
    delivered: shipments.filter((s) => ['DELIVERED', 'delivered'].includes(s.status)).length,
  };

  const filterTabs: { key: StatusFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'Todos', count: stats.total },
    { key: 'IN_TRANSIT', label: 'En Tránsito', count: stats.inTransit },
    { key: 'DELAYED', label: 'Retrasados', count: stats.delayed },
    { key: 'DELIVERED', label: 'Entregados', count: stats.delivered },
  ];

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
            icon={CheckCircle}
            color="text-success"
          />
        </div>

        {/* Shipments List */}
        <div className="rounded-2xl border border-border bg-card">
          {/* Filter Tabs */}
          <div className="border-b border-border px-6 py-3">
            <div className="flex items-center gap-1">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleFilterChange(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
                    activeFilter === tab.key
                      ? 'bg-primary text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                  <span className={`ml-2 text-xs ${activeFilter === tab.key ? 'text-white/70' : 'text-slate-500'}`}>
                    ({tab.count})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-slate-400">Cargando envíos...</div>
            </div>
          ) : shipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">
                {activeFilter === 'ALL' 
                  ? 'No hay envíos todavía' 
                  : `No hay envíos con estado "${filterTabs.find(t => t.key === activeFilter)?.label}"`}
              </p>
              {activeFilter === 'ALL' && (
                <Link
                  href="/envios/nuevo"
                  className="mt-4 text-sm text-primary hover:underline"
                >
                  Crear tu primer envío
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {shipments.map((shipment) => (
                <ShipmentRow 
                  key={shipment.id} 
                  shipment={shipment}
                  onDelete={() => setDeleteConfirm(shipment.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-white mb-2">Eliminar Envío</h3>
              <p className="text-slate-400 mb-6">
                ¿Estás seguro de que quieres eliminar este envío? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border text-slate-300 hover:bg-white/5 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-destructive text-white hover:brightness-110 transition"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
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

function ShipmentRow({ shipment, onDelete }: { shipment: Shipment; onDelete: () => void }) {
  const status = statusConfig[shipment.status] || statusConfig.CREATED;

  return (
    <div className="flex items-center justify-between px-6 py-4 hover:bg-white/5 transition group">
      <Link href={`/envios/${shipment.id}`} className="flex-1 min-w-0">
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
      </Link>
      <div className="flex items-center gap-4">
        <div className="text-right text-sm">
        <p className="text-slate-300">
          ETA: {format(new Date(shipment.eta_at_utc), "dd MMM, HH:mm", { locale: es })}
        </p>
          <p className="text-xs text-slate-500">
            Creado: {format(new Date(shipment.created_at), "dd/MM/yyyy", { locale: es })}
          </p>
        </div>
        {/* Action buttons - visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <Link
            href={`/envios/${shipment.id}/editar`}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-destructive hover:bg-destructive/10 transition"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
