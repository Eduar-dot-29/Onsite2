import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft, Save, Settings, AlertCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { api, CheckinType, Contact, ShipmentDetail, ShipmentStatus } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Validation constants
const MIN_INTERVAL_MINUTES = 30;
const MAX_CHECKINS = 200;

export default function EditarEnvioPage() {
  const router = useRouter();
  const { id } = router.query;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  // Form state
  const [reference, setReference] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [plannedDeparture, setPlannedDeparture] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(180);
  const [timezone, setTimezone] = useState("Europe/Madrid");
  const [status, setStatus] = useState<ShipmentStatus>("PENDING");
  const [assignedContactId, setAssignedContactId] = useState<string>("");
  
  // Check-in plan state
  const [checkinPlanMode, setCheckinPlanMode] = useState<CheckinType>("INTERVAL");
  const [checkinIntervalMinutes, setCheckinIntervalMinutes] = useState(30);
  const [checkinCount, setCheckinCount] = useState(3);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, router]);

  const loadData = async () => {
    try {
      const [shipment, contactList] = await Promise.all([
        api.getShipmentDetail(id as string),
        api.getContacts(),
      ]);
      
      const s = shipment as ShipmentDetail;
      setReference(s.reference);
      setOrigin(s.origin);
      setDestination(s.destination);
      setPlannedDeparture(format(new Date(s.departure_at_utc), "yyyy-MM-dd'T'HH:mm"));
      // Estimate duration from departure->eta
      const dur = Math.max(
        1,
        Math.round(
          (new Date(s.eta_at_utc).getTime() - new Date(s.departure_at_utc).getTime()) / 60000
        )
      );
      setDurationMinutes(dur);
      setTimezone(s.timezone || "Europe/Madrid");
      setStatus(s.status);
      setAssignedContactId(s.driver_id || "");
      
      // Load check-in plan
      setCheckinPlanMode(s.checkin_type || "INTERVAL");
      setCheckinIntervalMinutes(s.interval_minutes || 30);
      
      setContacts(contactList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  // Calculate check-in schedule preview
  const checkinSchedule = useMemo(() => {
    if (!plannedDeparture || !durationMinutes) return [];
    
    const departure = new Date(plannedDeparture).getTime();
    const eta = departure + durationMinutes * 60 * 1000;
    const now = Date.now();
    const schedule: Date[] = [];
    
    if (checkinPlanMode === "INTERVAL" && checkinIntervalMinutes >= MIN_INTERVAL_MINUTES) {
      const intervalMs = checkinIntervalMinutes * 60 * 1000;
      let current = departure + intervalMs;
      
      while (current < eta && schedule.length < MAX_CHECKINS) {
        if (current > now) {
          schedule.push(new Date(current));
        }
        current += intervalMs;
      }
    } else if (checkinPlanMode === "MILESTONE" && checkinCount > 0) {
      const count = Math.min(checkinCount, MAX_CHECKINS);
      const duration = eta - departure;
      
      for (let i = 1; i <= count; i++) {
        const fraction = i / (count + 1);
        const checkTime = departure + duration * fraction;
        if (checkTime > now) {
          schedule.push(new Date(checkTime));
        }
      }
    }
    
    return schedule;
  }, [plannedDeparture, durationMinutes, checkinPlanMode, checkinIntervalMinutes, checkinCount]);

  // Validation errors
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    
    if (checkinPlanMode === "INTERVAL" && checkinIntervalMinutes < MIN_INTERVAL_MINUTES) {
      errors.push(`El intervalo mínimo es ${MIN_INTERVAL_MINUTES} minutos.`);
    }
    if (checkinPlanMode === "MILESTONE" && (checkinCount > MAX_CHECKINS || checkinCount < 1)) {
      errors.push(`Debe haber entre 1 y ${MAX_CHECKINS} check-ins.`);
    }
    
    return errors;
  }, [checkinPlanMode, checkinIntervalMinutes, checkinCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validationErrors.length > 0) {
      setError(validationErrors.join(" "));
      return;
    }
    
    setSaving(true);
    setError("");

    try {
      await api.updateShipment(id as string, {
        reference,
        origin,
        destination,
        departure_at_local: plannedDeparture,
        estimated_duration_minutes: durationMinutes,
        timezone,
        checkin_type: checkinPlanMode,
        interval_minutes: checkinPlanMode === "INTERVAL" ? checkinIntervalMinutes : null,
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
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
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
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
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
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Ej: Barcelona"
                    required
                  />
                </div>
              </div>

              {/* Fecha salida y duración */}
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
                  <label htmlFor="duration" className="block text-sm font-medium text-slate-300 mb-2">
                    Duración estimada (minutos)
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      id="duration"
                      type="number"
                      min="1"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                    <span className="text-sm text-slate-400">
                      = {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}min
                    </span>
                  </div>
                </div>
              </div>

              {/* Status (read-only info) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Estado actual
                </label>
                <div className="text-slate-400 text-sm">
                  {status === "PENDING" && "Pendiente"}
                  {status === "IN_TRANSIT" && "En Tránsito"}
                  {status === "DELAYED" && "Retrasado"}
                  {status === "SILENCE" && "Silencio"}
                  {status === "DELIVERED" && "Entregado"}
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

            {/* Check-in Configuration */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Configuración de Check-ins
              </h2>
              <p className="text-xs text-slate-500">
                Si modificas el plan de check-ins, los pendientes se cancelarán y se reprogramarán.
              </p>

              {/* Plan Mode */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Modo de Check-in
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setCheckinPlanMode("INTERVAL")}
                    className={`p-3 rounded-lg border text-left transition ${
                      checkinPlanMode === "INTERVAL"
                        ? "border-primary bg-primary/10 text-white"
                        : "border-border text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <div className="font-medium">Intervalo fijo</div>
                    <div className="text-xs mt-1 opacity-70">Check-in cada X minutos</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckinPlanMode("MILESTONE")}
                    className={`p-3 rounded-lg border text-left transition ${
                      checkinPlanMode === "MILESTONE"
                        ? "border-primary bg-primary/10 text-white"
                        : "border-border text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    <div className="font-medium">Hitos</div>
                    <div className="text-xs mt-1 opacity-70">N check-ins distribuidos</div>
                  </button>
                </div>
              </div>

              {/* Interval or Count */}
              {checkinPlanMode === "INTERVAL" ? (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Intervalo entre check-ins (minutos)
                    <span className="text-slate-500 ml-1">(mín. {MIN_INTERVAL_MINUTES})</span>
                  </label>
                  <input
                    type="number"
                    value={checkinIntervalMinutes}
                    onChange={(e) => setCheckinIntervalMinutes(Number(e.target.value))}
                    min={MIN_INTERVAL_MINUTES}
                    className={`w-full rounded-lg border bg-background px-4 py-2.5 text-white focus:outline-none focus:ring-1 ${
                      checkinIntervalMinutes < MIN_INTERVAL_MINUTES 
                        ? "border-destructive focus:border-destructive focus:ring-destructive" 
                        : "border-border focus:border-primary focus:ring-primary"
                    }`}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Número de check-ins
                    <span className="text-slate-500 ml-1">(máx. {MAX_CHECKINS})</span>
                  </label>
                  <input
                    type="number"
                    value={checkinCount}
                    onChange={(e) => setCheckinCount(Number(e.target.value))}
                    min="1"
                    max={MAX_CHECKINS}
                    className={`w-full rounded-lg border bg-background px-4 py-2.5 text-white focus:outline-none focus:ring-1 ${
                      checkinCount > MAX_CHECKINS || checkinCount < 1
                        ? "border-destructive focus:border-destructive focus:ring-destructive" 
                        : "border-border focus:border-primary focus:ring-primary"
                    }`}
                  />
                </div>
              )}

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  {validationErrors.map((error, idx) => (
                    <p key={idx} className="text-sm text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {error}
                    </p>
                  ))}
                </div>
              )}

              {/* Schedule Preview */}
              {checkinSchedule.length > 0 && validationErrors.length === 0 && (
                <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-3 space-y-2">
                  <p className="text-sm text-slate-300">
                    <strong className="text-white">{checkinSchedule.length} check-ins</strong> pendientes:
                  </p>
                  <div className="grid gap-1 max-h-32 overflow-y-auto">
                    {checkinSchedule.slice(0, 5).map((time, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-medium text-xs">
                          {idx + 1}
                        </span>
                        <span className="text-slate-300">
                          {format(time, "dd MMM, HH:mm", { locale: es })}
                        </span>
                      </div>
                    ))}
                    {checkinSchedule.length > 5 && (
                      <p className="text-xs text-slate-500 ml-7">
                        ... y {checkinSchedule.length - 5} más
                      </p>
                    )}
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
                disabled={saving || validationErrors.length > 0}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-white shadow-glow-primary transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
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
