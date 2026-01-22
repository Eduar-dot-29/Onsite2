import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { api, Contact } from "@/lib/api";
import { format } from "date-fns";

export default function EditarEnvioPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  // Form state
  const [customerName, setCustomerName] = useState("");
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [plannedDeparture, setPlannedDeparture] = useState("");
  const [etaHours, setEtaHours] = useState("4");
  const [status, setStatus] = useState("CREATED");
  const [assignedContactId, setAssignedContactId] = useState<string>("");

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login");
      return;
    }

    if (id) {
      loadData();
    }
  }, [id, router]);

  const loadData = async () => {
    try {
      const [shipment, contactList] = await Promise.all([
        api.getShipment(id as string),
        api.getContacts(),
      ]);
      
      setCustomerName(shipment.customer_name);
      setOriginText(shipment.origin_text);
      setDestinationText(shipment.destination_text);
      // Use new UTC field
      setPlannedDeparture(format(new Date(shipment.departure_at_utc), "yyyy-MM-dd'T'HH:mm"));
      setEtaHours(String(Math.round(shipment.estimated_duration_minutes / 60)));
      setStatus(shipment.status);
      setAssignedContactId(shipment.assigned_contact_id || "");
      setContacts(contactList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      await api.updateShipment(id as string, {
        customer_name: customerName,
        origin_text: originText,
        destination_text: destinationText,
        departure_at_local: plannedDeparture,
        estimated_duration_minutes: parseInt(etaHours, 10) * 60,
      });

      router.push(`/envios/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar cambios");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <main className="px-6 py-8">
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-400">Cargando envío...</div>
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="px-6 py-8">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link
              href={`/envios/${id}`}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-white">Editar Envío</h1>
              <p className="mt-1 text-sm text-slate-400">
                Modifica los datos del envío
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
              {/* Cliente */}
              <div>
                <label htmlFor="customer" className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre del cliente / envío
                </label>
                <input
                  id="customer"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ej: Mercancías García"
                  required
                />
              </div>

              {/* Origen y Destino */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="origin" className="block text-sm font-medium text-slate-300 mb-2">
                    Origen
                  </label>
                  <input
                    id="origin"
                    type="text"
                    value={originText}
                    onChange={(e) => setOriginText(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Ej: Madrid"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="destination" className="block text-sm font-medium text-slate-300 mb-2">
                    Destino
                  </label>
                  <input
                    id="destination"
                    type="text"
                    value={destinationText}
                    onChange={(e) => setDestinationText(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Ej: Barcelona"
                    required
                  />
                </div>
              </div>

              {/* Fecha salida y ETA */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="departure" className="block text-sm font-medium text-slate-300 mb-2">
                    Fecha y hora de salida
                  </label>
                  <input
                    id="departure"
                    type="datetime-local"
                    value={plannedDeparture}
                    onChange={(e) => setPlannedDeparture(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="eta" className="block text-sm font-medium text-slate-300 mb-2">
                    Tiempo estimado (horas)
                  </label>
                  <input
                    id="eta"
                    type="number"
                    min="1"
                    value={etaHours}
                    onChange={(e) => setEtaHours(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Status (read-only info) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Estado actual
                </label>
                <div className="text-slate-400 text-sm">
                  {status === 'CREATED' && 'Creado'}
                  {status === 'ASSIGNED' && 'Asignado'}
                  {status === 'IN_TRANSIT' && 'En Tránsito'}
                  {status === 'INCIDENT' && 'Incidencia'}
                  {status === 'DELAYED' && 'Retrasado'}
                  {status === 'DELIVERED' && 'Entregado'}
                  <span className="ml-2 text-slate-500">
                    (El estado se actualiza automáticamente según el flujo del envío)
                  </span>
                </div>
              </div>

              {/* Conductor asignado (read-only info) */}
              {assignedContactId && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Conductor asignado
                  </label>
                  <div className="text-slate-400 text-sm">
                    {contacts.find(c => c.id === assignedContactId)?.name || 'Conductor no encontrado'}
                    <span className="ml-2 text-slate-500">
                      (Para cambiar conductor, usa la acción "Asignar" en el detalle)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-4">
              <Link
                href={`/envios/${id}`}
                className="flex-1 rounded-lg border border-border py-2.5 text-center text-sm font-medium text-slate-300 hover:bg-white/5 transition"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-white shadow-glow-primary transition hover:brightness-110 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </AppLayout>
  );
}
