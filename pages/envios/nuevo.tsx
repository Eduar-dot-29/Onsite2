import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, Settings, Sparkles, AlertCircle } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { api, ShipmentCreate, CheckinType } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Common timezones for Spain and Latin America
const TIMEZONES = [
  { value: "Europe/Madrid", label: "España (Madrid)" },
  { value: "Europe/London", label: "Reino Unido (Londres)" },
  { value: "America/Mexico_City", label: "México (Ciudad de México)" },
  { value: "America/Bogota", label: "Colombia (Bogotá)" },
  { value: "America/Lima", label: "Perú (Lima)" },
  { value: "America/Santiago", label: "Chile (Santiago)" },
  { value: "America/Buenos_Aires", label: "Argentina (Buenos Aires)" },
  { value: "America/Sao_Paulo", label: "Brasil (São Paulo)" },
];

// Validation constants
const MIN_INTERVAL_MINUTES = 30;
const MAX_CHECKINS = 200;

export default function NuevoEnvioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [originText, setOriginText] = useState("");
  const [destinationText, setDestinationText] = useState("");
  const [destinationLat, setDestinationLat] = useState<number | null>(null);
  const [destinationLon, setDestinationLon] = useState<number | null>(null);
  const [departureAtLocal, setDepartureAtLocal] = useState("");
  const [timezone, setTimezone] = useState("Europe/Madrid");
  const [durationMinutes, setDurationMinutes] = useState(180); // 3 hours default
  const [checkinPlanMode, setCheckinPlanMode] = useState<CheckinType>("INTERVAL");
  const [checkinIntervalMinutes, setCheckinIntervalMinutes] = useState(30);
  const [checkinCount, setCheckinCount] = useState(3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data: ShipmentCreate = {
        reference: customerName,
        origin: originText,
        destination: destinationText,
        departure_at_local: departureAtLocal,
        timezone,
        estimated_duration_minutes: durationMinutes,
        checkin_type: checkinPlanMode,
        interval_minutes: checkinPlanMode === "INTERVAL" ? checkinIntervalMinutes : undefined,
        milestones:
          destinationLat !== null && destinationLon !== null
            ? [
                {
                  name: "Destino",
                  latitude: destinationLat,
                  longitude: destinationLon,
                  radius_km: 1.0,
                  is_completed: false,
                },
              ]
            : undefined,
      };

      await api.createShipment(data);
      router.push("/envios");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear envío");
    } finally {
      setLoading(false);
    }
  };

  // Calculate estimated ETA for display
  const calculateEtaPreview = () => {
    if (!departureAtLocal || !durationMinutes) return null;
    const departure = new Date(departureAtLocal);
    const eta = new Date(departure.getTime() + durationMinutes * 60 * 1000);
    return format(eta, "dd MMM yyyy, HH:mm", { locale: es });
  };

  // Calculate the actual check-in schedule with timestamps
  const checkinSchedule = useMemo(() => {
    if (!departureAtLocal || !durationMinutes) return [];
    
    const departure = new Date(departureAtLocal).getTime();
    const eta = departure + durationMinutes * 60 * 1000;
    const schedule: Date[] = [];
    
    if (checkinPlanMode === "INTERVAL" && checkinIntervalMinutes >= MIN_INTERVAL_MINUTES) {
      const intervalMs = checkinIntervalMinutes * 60 * 1000;
      let current = departure + intervalMs; // Skip departure itself
      
      while (current < eta && schedule.length < MAX_CHECKINS) {
        schedule.push(new Date(current));
        current += intervalMs;
      }
    } else if (checkinPlanMode === "MILESTONE" && checkinCount > 0) {
      const count = Math.min(checkinCount, MAX_CHECKINS);
      const duration = eta - departure;
      
      for (let i = 1; i <= count; i++) {
        const fraction = i / (count + 1);
        schedule.push(new Date(departure + duration * fraction));
      }
    }
    
    return schedule;
  }, [departureAtLocal, durationMinutes, checkinPlanMode, checkinIntervalMinutes, checkinCount]);

  // Validation errors
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    
    if (checkinPlanMode === "INTERVAL") {
      if (checkinIntervalMinutes < MIN_INTERVAL_MINUTES) {
        errors.push(`El intervalo mínimo es ${MIN_INTERVAL_MINUTES} minutos para evitar spam.`);
      }
      if (checkinSchedule.length > MAX_CHECKINS) {
        errors.push(`Se superan los ${MAX_CHECKINS} check-ins máximos permitidos.`);
      }
    } else {
      if (checkinCount > MAX_CHECKINS) {
        errors.push(`Máximo ${MAX_CHECKINS} check-ins permitidos.`);
      }
      if (checkinCount < 1) {
        errors.push("Debe haber al menos 1 check-in.");
      }
    }
    
    return errors;
  }, [checkinPlanMode, checkinIntervalMinutes, checkinCount, checkinSchedule]);

  // Suggest optimal configuration based on duration
  const applySuggestion = () => {
    if (durationMinutes <= 60) {
      // Short trip: 1 check-in at 50%
      setCheckinPlanMode("MILESTONE");
      setCheckinCount(1);
    } else if (durationMinutes <= 180) {
      // 1-3 hours: every 30 min
      setCheckinPlanMode("INTERVAL");
      setCheckinIntervalMinutes(30);
    } else if (durationMinutes <= 360) {
      // 3-6 hours: every 45 min
      setCheckinPlanMode("INTERVAL");
      setCheckinIntervalMinutes(45);
    } else if (durationMinutes <= 720) {
      // 6-12 hours: every 60 min
      setCheckinPlanMode("INTERVAL");
      setCheckinIntervalMinutes(60);
    } else {
      // 12+ hours: every 90 min
      setCheckinPlanMode("INTERVAL");
      setCheckinIntervalMinutes(90);
    }
  };

  return (
    <AppLayout>
      <main className="px-6 py-8">
        <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/envios"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a envíos
          </Link>
          <h1 className="text-3xl font-semibold text-white">Nuevo Envío</h1>
          <p className="mt-1 text-sm text-slate-400">
            Los check-ins se programarán automáticamente
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Información del Envío
            </h2>

            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nombre del Cliente / Referencia *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Empresa ABC S.L."
                required
              />
            </div>

            {/* Origin & Destination */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Origen *
                </label>
                <input
                  type="text"
                  value={originText}
                  onChange={(e) => setOriginText(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Madrid, España"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Destino *
                </label>
                <input
                  type="text"
                  value={destinationText}
                  onChange={(e) => setDestinationText(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Barcelona, España"
                  required
                />
              </div>
            </div>

            {/* Coordinates (optional) */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Latitud Destino
                  <span className="text-slate-500 ml-1">(opcional)</span>
                </label>
                <input
                  type="number"
                  value={destinationLat ?? ""}
                  onChange={(e) => setDestinationLat(e.target.value ? Number(e.target.value) : null)}
                  step="any"
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="41.3851"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Longitud Destino
                  <span className="text-slate-500 ml-1">(opcional)</span>
                </label>
                <input
                  type="number"
                  value={destinationLon ?? ""}
                  onChange={(e) => setDestinationLon(e.target.value ? Number(e.target.value) : null)}
                  step="any"
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="2.1734"
                />
              </div>
            </div>
          </div>

          {/* Time Configuration */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Fecha, Hora y Duración
            </h2>

            {/* Departure & Timezone */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Fecha y Hora de Salida *
                </label>
                <input
                  type="datetime-local"
                  value={departureAtLocal}
                  onChange={(e) => setDepartureAtLocal(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Zona Horaria *
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Duración Estimada (minutos) *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  min="1"
                  className="flex-1 rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
                <span className="flex items-center text-slate-400 text-sm">
                  = {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}min
                </span>
              </div>
            </div>

            {/* ETA Preview */}
            {calculateEtaPreview() && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                <p className="text-sm text-slate-300">
                  <strong className="text-white">ETA estimada:</strong> {calculateEtaPreview()}
                </p>
              </div>
            )}
          </div>

          {/* Check-in Configuration */}
          <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Configuración de Check-ins
              </h2>
              <button
                type="button"
                onClick={applySuggestion}
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Aplicar sugerencia
              </button>
            </div>

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
                  <div className="text-xs mt-1 opacity-70">
                    Check-in cada X minutos
                  </div>
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
                  <div className="text-xs mt-1 opacity-70">
                    N check-ins distribuidos
                  </div>
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
                  className={`w-full rounded-lg border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${
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
                  className={`w-full rounded-lg border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${
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

            {/* Real Schedule Preview */}
            {checkinSchedule.length > 0 && validationErrors.length === 0 && (
              <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-3 space-y-2">
                <p className="text-sm text-slate-300">
                  <strong className="text-white">{checkinSchedule.length} check-ins</strong> programados:
                </p>
                <div className="grid gap-1 max-h-40 overflow-y-auto">
                  {checkinSchedule.slice(0, 5).map((time, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs">
                      <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-medium">
                        {idx + 1}
                      </span>
                      <span className="text-slate-300">
                        {format(time, "dd MMM, HH:mm", { locale: es })}
                      </span>
                    </div>
                  ))}
                  {checkinSchedule.length > 5 && (
                    <p className="text-xs text-slate-500 ml-8">
                      ... y {checkinSchedule.length - 5} más
                    </p>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  En modo "Hitos", los check-ins automáticos por intervalo no se envían. Usa milestones/geofencing.
                </p>
              </div>
            )}

            {/* No schedule yet */}
            {checkinSchedule.length === 0 && validationErrors.length === 0 && (
              <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-3">
                <p className="text-sm text-slate-400">
                  Configura la fecha de salida y duración para ver los check-ins programados.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Link
              href="/envios"
              className="flex-1 rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-slate-300 transition hover:bg-white/5"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading || validationErrors.length > 0}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-glow-primary transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creando..." : "Crear Envío"}
            </button>
          </div>
        </form>
      </div>
    </main>
    </AppLayout>
  );
}
