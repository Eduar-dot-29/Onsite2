import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft, Clock, Calendar, Settings } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { api, ShipmentCreate, CheckinPlanMode } from "@/lib/api";

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
  const [checkinPlanMode, setCheckinPlanMode] = useState<CheckinPlanMode>("INTERVAL");
  const [checkinIntervalMinutes, setCheckinIntervalMinutes] = useState(30);
  const [checkinCount, setCheckinCount] = useState(3);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data: ShipmentCreate = {
        customer_name: customerName,
        origin_text: originText,
        destination_text: destinationText,
        destination_lat: destinationLat,
        destination_lon: destinationLon,
        departure_at_local: departureAtLocal,
        timezone,
        estimated_duration_minutes: durationMinutes,
        checkin_plan_mode: checkinPlanMode,
        checkin_interval_minutes: checkinPlanMode === "INTERVAL" ? checkinIntervalMinutes : undefined,
        checkin_count: checkinPlanMode === "MILESTONE" ? checkinCount : undefined,
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
    return eta.toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  // Calculate number of checkins for preview
  const calculateCheckinsPreview = () => {
    if (!durationMinutes) return 0;
    if (checkinPlanMode === "INTERVAL") {
      return Math.max(0, Math.floor(durationMinutes / checkinIntervalMinutes) - 1);
    }
    return checkinCount;
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
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Configuración de Check-ins
            </h2>

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
                </label>
                <input
                  type="number"
                  value={checkinIntervalMinutes}
                  onChange={(e) => setCheckinIntervalMinutes(Number(e.target.value))}
                  min="5"
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Número de check-ins
                </label>
                <input
                  type="number"
                  value={checkinCount}
                  onChange={(e) => setCheckinCount(Number(e.target.value))}
                  min="1"
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}

            {/* Preview */}
            <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-3">
              <p className="text-sm text-slate-300">
                Se programarán aproximadamente <strong className="text-white">{calculateCheckinsPreview()} check-ins</strong> automáticos.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Los check-ins se enviarán automáticamente al conductor asignado.
              </p>
            </div>
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
              disabled={loading}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-glow-primary transition hover:brightness-110 disabled:opacity-50"
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
