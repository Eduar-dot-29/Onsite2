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
  CheckCircle,
  AlertTriangle,
  Send,
  MessageSquare,
  Truck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { api, Shipment, Contact, ShipmentEvent, TrackingCheckin } from "@/lib/api";
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
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [checkins, setCheckins] = useState<TrackingCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [selectedContact, setSelectedContact] = useState("");

  // Telegram simulation state
  const [simStep, setSimStep] = useState<'idle' | 'checkin_sent' | 'waiting_delay' | 'waiting_location'>('idle');
  const [currentCheckin, setCurrentCheckin] = useState<TrackingCheckin | null>(null);
  const [selectedDelay, setSelectedDelay] = useState<number>(0);

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
      const [shipmentData, contactsData, eventsData, checkinsData] = await Promise.all([
        api.getShipment(shipmentId),
        api.getContacts(),
        api.getShipmentEvents(shipmentId),
        api.getShipmentCheckins(shipmentId),
      ]);
      setShipment(shipmentData);
      setContacts(contactsData);
      setEvents(eventsData);
      setCheckins(checkinsData);

      // Check if there's a pending checkin
      const pendingCheckin = checkinsData.find(c => c.status === 'sent');
      if (pendingCheckin) {
        setCurrentCheckin(pendingCheckin);
        setSimStep('checkin_sent');
      }
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

  // Telegram simulation handlers
  const handleSendCheckin = async () => {
    if (!shipment) return;
    const newCheckin = await api.simulateSendCheckin(shipment.id);
    if (newCheckin) {
      setCurrentCheckin(newCheckin);
      setSimStep('checkin_sent');
      await loadData(shipment.id);
    }
  };

  const handleCheckinResponse = async (response: 'ok' | 'breakdown' | 'traffic') => {
    if (!shipment || !currentCheckin) return;
    
    await api.simulateCheckinResponse(shipment.id, currentCheckin.id, response);
    
    if (response === 'ok') {
      setSimStep('idle');
      setCurrentCheckin(null);
    } else {
      setSimStep('waiting_delay');
    }
    await loadData(shipment.id);
  };

  const handleDelayReport = async (minutes: number) => {
    if (!shipment) return;
    setSelectedDelay(minutes);
    await api.simulateDelayReport(shipment.id, minutes);
    setSimStep('waiting_location');
    await loadData(shipment.id);
  };

  const handleSendLocation = async () => {
    if (!shipment) return;
    // Simulated coordinates (Spain area)
    const lat = 40.0 + Math.random() * 2;
    const lon = -4.0 + Math.random() * 2;
    
    await api.simulateLocationAndRecalculate(shipment.id, lat, lon, selectedDelay);
    setSimStep('idle');
    setCurrentCheckin(null);
    setSelectedDelay(0);
    await loadData(shipment.id);
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
        <div className="mx-auto max-w-6xl space-y-8">
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

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column - Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Main Info */}
              <div className="grid gap-6 sm:grid-cols-2">
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

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Salida</span>
                      <span className="text-white">
                        {format(new Date(shipment.planned_departure_at), "dd MMM, HH:mm", { locale: es })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">ETA</span>
                      <span className="text-white font-medium">
                        {format(new Date(shipment.estimated_arrival_at), "dd MMM, HH:mm", { locale: es })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Duración</span>
                      <span className="text-white">{shipment.eta_hours}h</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Assignment */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-medium text-white mb-4 flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Conductor Asignado
                </h2>

                {assignedContact ? (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                    <div>
                      <p className="text-white font-medium">{assignedContact.name}</p>
                      <p className="text-sm text-slate-400">
                        {assignedContact.channel === 'telegram' ? '📱 Telegram' : assignedContact.channel}
                        {assignedContact.telegram_chat_id && ` · ID: ${assignedContact.telegram_chat_id}`}
                      </p>
                    </div>
                    <span className="text-xs text-success bg-success/10 px-2 py-1 rounded">Asignado</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-400">
                      Asigna un conductor para iniciar el seguimiento automático.
                    </p>
                    {contacts.length > 0 ? (
                      <div className="flex gap-3">
                        <select
                          value={selectedContact}
                          onChange={(e) => setSelectedContact(e.target.value)}
                          className="flex-1 rounded-lg border border-border bg-input px-4 py-2.5 text-white focus:border-primary focus:outline-none"
                        >
                          <option value="">Seleccionar...</option>
                          {contacts.filter(c => c.channel === 'telegram').map((contact) => (
                            <option key={contact.id} value={contact.id}>
                              {contact.name} (Telegram)
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAssignContact}
                          disabled={!selectedContact || assigning}
                          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
                        >
                          {assigning ? "..." : "Asignar"}
                        </button>
                      </div>
                    ) : (
                      <Link href="/contactos/nuevo" className="text-sm text-primary hover:underline">
                        Crear contacto →
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Timeline */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-medium text-white mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Timeline de Eventos
                </h2>

                {events.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">
                    No hay eventos registrados
                  </p>
                ) : (
                  <div className="space-y-4">
                    {events.slice().reverse().map((event) => (
                      <EventItem key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column - Telegram Simulator */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-primary/30 bg-card p-6">
                <h2 className="font-medium text-white mb-4 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Simulador Telegram
                </h2>
                <p className="text-xs text-slate-400 mb-4">
                  Simula la interacción del conductor con el bot de Telegram
                </p>

                {!assignedContact ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    Asigna un conductor para usar el simulador
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Send Check-in */}
                    {simStep === 'idle' && (
                      <button
                        onClick={handleSendCheckin}
                        className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/30 px-4 py-3 text-sm font-medium text-primary transition hover:bg-primary/20"
                      >
                        <Send className="h-4 w-4" />
                        Enviar Check-in
                      </button>
                    )}

                    {/* Check-in Response */}
                    {simStep === 'checkin_sent' && (
                      <div className="space-y-3">
                        <div className="rounded-lg bg-white/5 p-3 text-sm">
                          <p className="text-slate-300 mb-2">📩 Check-in enviado:</p>
                          <p className="text-white">"{shipment.origin_text} → {shipment.destination_text}. ¿Estado actual?"</p>
                        </div>
                        <p className="text-xs text-slate-400">El conductor responde:</p>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            onClick={() => handleCheckinResponse('ok')}
                            className="rounded-lg bg-success/10 border border-success/30 px-3 py-2 text-xs font-medium text-success hover:bg-success/20"
                          >
                            ✅ OK
                          </button>
                          <button
                            onClick={() => handleCheckinResponse('breakdown')}
                            className="rounded-lg bg-warning/10 border border-warning/30 px-3 py-2 text-xs font-medium text-warning hover:bg-warning/20"
                          >
                            ⚠️ Avería
                          </button>
                          <button
                            onClick={() => handleCheckinResponse('traffic')}
                            className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/20"
                          >
                            🚦 Tráfico
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Delay Selection */}
                    {simStep === 'waiting_delay' && (
                      <div className="space-y-3">
                        <div className="rounded-lg bg-white/5 p-3 text-sm">
                          <p className="text-white">Indica retraso estimado:</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {[30, 60, 120, 180].map((mins) => (
                            <button
                              key={mins}
                              onClick={() => handleDelayReport(mins)}
                              className="rounded-lg bg-white/5 border border-border px-3 py-2 text-sm text-white hover:bg-white/10"
                            >
                              {mins < 60 ? `${mins} min` : `${mins / 60}h`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Location Request */}
                    {simStep === 'waiting_location' && (
                      <div className="space-y-3">
                        <div className="rounded-lg bg-white/5 p-3 text-sm">
                          <p className="text-white">Retraso: +{selectedDelay} min</p>
                          <p className="text-slate-400 mt-1">Envía tu ubicación actual:</p>
                        </div>
                        <button
                          onClick={handleSendLocation}
                          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-white hover:brightness-110"
                        >
                          <MapPin className="h-4 w-4" />
                          📍 Enviar Ubicación
                        </button>
                      </div>
                    )}

                    {/* Check-ins status */}
                    <div className="pt-4 border-t border-border">
                      <p className="text-xs text-slate-400 mb-2">Check-ins programados:</p>
                      <div className="space-y-2">
                        {checkins.slice(0, 5).map((checkin) => (
                          <div key={checkin.id} className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">
                              {format(new Date(checkin.due_at), "HH:mm", { locale: es })}
                            </span>
                            <CheckinStatusBadge status={checkin.status} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}

// Event item component
function EventItem({ event }: { event: ShipmentEvent }) {
  const config = eventConfig[event.event_type] || { icon: AlertCircle, color: 'text-slate-400', label: event.event_type };
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 p-1.5 rounded-full bg-white/5 ${config.color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white">{config.label}</p>
        {event.payload && Object.keys(event.payload).length > 0 && (
          <p className="text-xs text-slate-500 truncate">
            {formatPayload(event.payload)}
          </p>
        )}
        <p className="text-xs text-slate-500 mt-0.5">
          {format(new Date(event.created_at), "dd/MM HH:mm:ss", { locale: es })}
        </p>
      </div>
    </div>
  );
}

function CheckinStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pendiente', color: 'text-slate-400 bg-slate-400/10' },
    sent: { label: 'Enviado', color: 'text-primary bg-primary/10' },
    answered: { label: 'Respondido', color: 'text-success bg-success/10' },
    missed: { label: 'Sin respuesta', color: 'text-warning bg-warning/10' },
    escalated: { label: 'Escalado', color: 'text-destructive bg-destructive/10' },
  };
  const c = config[status] || config.pending;
  return <span className={`px-2 py-0.5 rounded text-xs ${c.color}`}>{c.label}</span>;
}

const eventConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  SHIPMENT_CREATED: { icon: Package, color: 'text-primary', label: 'Envío creado' },
  DRIVER_ASSIGNED: { icon: User, color: 'text-success', label: 'Conductor asignado' },
  CHECKIN_SCHEDULED: { icon: Calendar, color: 'text-slate-400', label: 'Check-ins programados' },
  CHECKIN_SENT: { icon: Send, color: 'text-primary', label: 'Check-in enviado' },
  CHECKIN_OK: { icon: CheckCircle, color: 'text-success', label: 'Check-in OK' },
  INCIDENT_BREAKDOWN: { icon: AlertTriangle, color: 'text-warning', label: 'Incidencia: Avería' },
  INCIDENT_TRAFFIC: { icon: Truck, color: 'text-warning', label: 'Incidencia: Tráfico' },
  DELAY_REPORTED: { icon: Clock, color: 'text-warning', label: 'Retraso reportado' },
  LOCATION_RECEIVED: { icon: MapPin, color: 'text-primary', label: 'Ubicación recibida' },
  ROUTE_RECALCULATED: { icon: Navigation, color: 'text-primary', label: 'Ruta recalculada' },
  ETA_UPDATED: { icon: RefreshCw, color: 'text-success', label: 'ETA actualizada' },
  NO_RESPONSE: { icon: AlertCircle, color: 'text-warning', label: 'Sin respuesta' },
  ESCALATED: { icon: AlertTriangle, color: 'text-destructive', label: 'Escalado a operador' },
};

function formatPayload(payload: Record<string, unknown>): string {
  if (payload.delay_minutes) return `+${payload.delay_minutes} minutos`;
  if (payload.count) return `${payload.count} check-ins`;
  if (payload.contact_name) return payload.contact_name as string;
  if (payload.lat && payload.lon) return `${(payload.lat as number).toFixed(3)}, ${(payload.lon as number).toFixed(3)}`;
  if (payload.reason) return payload.reason === 'no_response' ? 'Sin respuesta del conductor' : payload.reason as string;
  return '';
}
