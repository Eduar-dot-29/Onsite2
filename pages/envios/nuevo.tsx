import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { api, ShipmentCreate } from "@/lib/api";

export default function NuevoEnvioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<ShipmentCreate>({
    customer_name: "",
    origin_text: "",
    destination_text: "",
    destination_lat: null,
    destination_lon: null,
    planned_departure_at: "",
    eta_hours: 24,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value ? Number(value) : null) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Convert datetime-local to ISO string
      const data = {
        ...formData,
        planned_departure_at: new Date(formData.planned_departure_at).toISOString(),
      };

      await api.createShipment(data);
      router.push("/envios");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear envío");
    } finally {
      setLoading(false);
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
            Completa los datos para crear un nuevo envío
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-border bg-card p-8">
          {error && (
            <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nombre del Cliente *
              </label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
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
                  name="origin_text"
                  value={formData.origin_text}
                  onChange={handleChange}
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
                  name="destination_text"
                  value={formData.destination_text}
                  onChange={handleChange}
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
                  name="destination_lat"
                  value={formData.destination_lat ?? ""}
                  onChange={handleChange}
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
                  name="destination_lon"
                  value={formData.destination_lon ?? ""}
                  onChange={handleChange}
                  step="any"
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="2.1734"
                />
              </div>
            </div>

            {/* Departure & ETA */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Fecha y Hora de Salida *
                </label>
                <input
                  type="datetime-local"
                  name="planned_departure_at"
                  value={formData.planned_departure_at}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  ETA (horas) *
                </label>
                <input
                  type="number"
                  name="eta_hours"
                  value={formData.eta_hours}
                  onChange={handleChange}
                  min="1"
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="24"
                  required
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
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
      </div>
    </main>
    </AppLayout>
  );
}
