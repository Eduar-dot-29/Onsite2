import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Clock,
  User,
  Calendar,
  Navigation,
  Package,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { api, Shipment, Contact } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pendiente", color: "text-warning", bg: "bg-warning/10" },
  in_transit: { label: "En Tránsito", color: "text-primary", bg: "bg-primary/10" },
  delivered: { label: "Entregado", color: "text-success", bg: "bg-success/10" },
  delayed: { label: "Retrasado", color: "text-destructive", bg: "bg-destructive/10" },
  cancelled: { label: "Cancelado", color: "text-slate-400", bg: "bg-slate-400/10" },
};

export default function EnvioDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [selectedContact, setSelectedContact] = useState("");

  useEffect(() => {
    if (!api.isAuthenticated()) {
      router.push("/login");
      return;
    }

    if (id && typeof id === "string") {
      loadData(id);
    }
  }, [id, router]);

  const loadData = async (shipmentId: string) => {
    try {
      const [shipmentData, contactsData] = await Promise.all([
        api.getShipment(shipmentId),
        api.getContacts(),
      ]);
      setShipment(shipmentData);
      setContacts(contactsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignContact = async () => {
    if (!shipment || !selectedContact) return;

    setAssigning(true);
    try {
      const updated = await api.assignContact(shipment.id, selectedContact);
      setShipment(updated);
      setSelectedContact("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar contacto");
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <main className="px-6 py-8">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-400">Cargando envío...</div>
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  if (!shipment) {
    return (
      <AppLayout>
        <main className="px-6 py-8">
          <div className="mx-auto max-w-4xl">
            <div className="text-center py-16">
              <p className="text-slate-400">Envío no encontrado</p>
              <Link href="/envios" className="mt-4 text-primary hover:underline">
                Volver a envíos
              </Link>
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  const status = statusConfig[shipment.status] || statusConfig.pending;
  const assignedContact = contacts.find((c) => c.id === shipment.assigned_contact_id);

  return (
    <AppLayout>
      <main className="px-6 py-8">
        <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/envios"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a envíos
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">
                {shipment.customer_name}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                ID: {shipment.id}
              </p>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium ${status.bg} ${status.color}`}
            >
              {status.label}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Main Info */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Route Card */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-medium text-white mb-4 flex items-center gap-2">
              <Navigation className="h-5 w-5 text-primary" />
              Ruta
            </h2>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="h-3 w-3 rounded-full bg-success" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Origen</p>
                  <p className="text-white">{shipment.origin_text}</p>
                </div>
              </div>

              <div className="ml-1.5 h-8 w-px bg-border" />

              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Destino</p>
                  <p className="text-white">{shipment.destination_text}</p>
                  {shipment.destination_lat && shipment.destination_lon && (
                    <p className="text-xs text-slate-500 mt-1">
                      {shipment.destination_lat.toFixed(4)}, {shipment.destination_lon.toFixed(4)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Timing Card */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-medium text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Tiempos
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Salida programada</span>
                </div>
                <span className="text-white">
                  {format(new Date(shipment.planned_departure_at), "dd MMM yyyy, HH:mm", { locale: es })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">Llegada estimada</span>
                </div>
                <span className="text-white">
                  {format(new Date(shipment.estimated_arrival_at), "dd MMM yyyy, HH:mm", { locale: es })}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">Tiempo estimado</span>
                </div>
                <span className="text-white">{shipment.eta_hours} horas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Assignment */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-medium text-white mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Contacto Asignado
          </h2>

          {assignedContact ? (
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
              <div>
                <p className="text-white font-medium">{assignedContact.name}</p>
                <p className="text-sm text-slate-400">
                  Canal: {assignedContact.channel}
                  {assignedContact.telegram_chat_id && ` · Telegram: ${assignedContact.telegram_chat_id}`}
                  {assignedContact.phone_e164 && ` · Tel: ${assignedContact.phone_e164}`}
                </p>
              </div>
              <span className="text-xs text-success">Asignado</span>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                No hay contacto asignado. Asigna un contacto para recibir notificaciones.
              </p>

              {contacts.length > 0 ? (
                <div className="flex gap-3">
                  <select
                    value={selectedContact}
                    onChange={(e) => setSelectedContact(e.target.value)}
                    className="flex-1 rounded-lg border border-border bg-input px-4 py-2.5 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Seleccionar contacto...</option>
                    {contacts.map((contact) => (
                      <option key={contact.id} value={contact.id}>
                        {contact.name} ({contact.channel})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignContact}
                    disabled={!selectedContact || assigning}
                    className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
                  >
                    {assigning ? "Asignando..." : "Asignar"}
                  </button>
                </div>
              ) : (
                <Link
                  href="/contactos/nuevo"
                  className="text-sm text-primary hover:underline"
                >
                  Crear primer contacto →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="text-center text-xs text-slate-500">
          Creado el {format(new Date(shipment.created_at), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
        </div>
      </div>
    </main>
    </AppLayout>
  );
}
