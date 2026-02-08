import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, MapPin } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { api, Shipment } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function IncidenciasPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const all = await api.getShipments();
        setShipments(all.filter((s) => s.status === "DELAYED" || s.status === "SILENCE"));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al cargar incidencias");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <AppLayout>
      <main className="px-6 py-8">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white">Incidencias</h1>
              <p className="mt-1 text-sm text-slate-400">
                Envíos con retraso o sin respuesta del conductor.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-slate-400">Cargando incidencias...</div>
              </div>
            ) : shipments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <AlertTriangle className="h-12 w-12 text-slate-600 mb-4" />
                <p className="text-slate-400">No hay incidencias activas</p>
                <Link href="/envios" className="mt-3 text-sm text-primary hover:underline">
                  Ver envíos →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {shipments.map((s) => (
                  <Link
                    key={s.id}
                    href={`/envios/${s.id}`}
                    className="block px-6 py-4 hover:bg-white/5 transition"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white truncate">{s.reference}</p>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              s.status === "SILENCE"
                                ? "bg-warning/10 text-warning"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {s.status === "SILENCE" ? "Silencio" : "Retrasado"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {s.origin} → {s.destination}
                          </span>
                        </div>
                      </div>

                      <div className="text-right text-sm text-slate-300">
                        <div className="flex items-center justify-end gap-1 text-slate-300">
                          <Clock className="h-4 w-4 text-slate-500" />
                          ETA {format(new Date(s.eta_at_utc), "dd MMM, HH:mm", { locale: es })}
                        </div>
                        <p className="text-xs text-slate-500">
                          Actualizado: {format(new Date(s.created_at_utc), "dd/MM/yyyy", { locale: es })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </AppLayout>
  );
}

