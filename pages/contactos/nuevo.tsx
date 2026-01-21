import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { api, ContactCreate } from "@/lib/api";

export default function NuevoContactoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Normalizar teléfono: asegurar que empiece con +
      let normalizedPhone = phone.trim();
      if (!normalizedPhone.startsWith("+")) {
        normalizedPhone = "+" + normalizedPhone;
      }

      const data: ContactCreate = {
        name: name,
        channel: "telegram",
        telegram_chat_id: null,  // Se vincula cuando el conductor hace /start
        phone_e164: normalizedPhone,
      };

      await api.createContact(data);
      router.push("/contactos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear contacto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <main className="px-6 py-8">
        <div className="mx-auto max-w-xl space-y-8">
        {/* Header */}
        <div>
          <Link
            href="/contactos"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a contactos
          </Link>
          <h1 className="text-3xl font-semibold text-white">Nuevo Conductor</h1>
          <p className="mt-1 text-sm text-slate-400">
            Agrega un conductor para asignarlo a envíos
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
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nombre del conductor *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Juan Pérez"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Teléfono *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="+34612345678"
                required
              />
              <p className="mt-1.5 text-xs text-slate-500">
                El teléfono con el que tiene Telegram registrado
              </p>
            </div>

            {/* Info box */}
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
              <p className="text-sm text-slate-300">
                <strong className="text-white">Siguiente paso:</strong> El conductor debe abrir el bot de Telegram y pulsar "Iniciar". 
                El sistema lo vinculará automáticamente por su número de teléfono.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Link
                href="/contactos"
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-center text-sm font-medium text-slate-300 transition hover:bg-white/5"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-glow-primary transition hover:brightness-110 disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear Conductor"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
    </AppLayout>
  );
}
