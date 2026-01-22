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

  const [formData, setFormData] = useState<ContactCreate>({
    name: "",
    channel: "telegram",
    telegram_chat_id: "",
    phone_e164: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data: ContactCreate = {
        name: formData.name,
        channel: formData.channel,
        telegram_chat_id: formData.telegram_chat_id || null,
        phone_e164: formData.phone_e164 || null,
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
          <h1 className="text-3xl font-semibold text-white">Nuevo Contacto</h1>
          <p className="mt-1 text-sm text-slate-400">
            Agrega un contacto para recibir notificaciones
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
                Nombre *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Juan Pérez"
                required
              />
            </div>

            {/* Channel */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Canal de Comunicación *
              </label>
              <select
                name="channel"
                value={formData.channel}
                onChange={handleChange}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              >
                <option value="telegram">Telegram</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>

            {/* Phone - always shown for identification */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Teléfono (formato E.164) *
              </label>
              <input
                type="tel"
                name="phone_e164"
                value={formData.phone_e164 || ""}
                onChange={handleChange}
                className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="+34612345678"
                required
              />
              <p className="mt-1.5 text-xs text-slate-500">
                {formData.channel === "telegram" 
                  ? "El conductor compartirá su teléfono en Telegram para vincularse automáticamente"
                  : "Incluye el código de país, ej: +34612345678"}
              </p>
            </div>

            {/* Telegram Chat ID - optional, auto-filled when driver shares phone */}
            {formData.channel === "telegram" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Telegram Chat ID
                  <span className="text-slate-500 ml-1">(opcional - se vincula automáticamente)</span>
                </label>
                <input
                  type="text"
                  name="telegram_chat_id"
                  value={formData.telegram_chat_id || ""}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-border bg-input px-4 py-2.5 text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="123456789"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Si lo dejas vacío, se vinculará cuando el conductor envíe /start y comparta su teléfono
                </p>
              </div>
            )}

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
                {loading ? "Creando..." : "Crear Contacto"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
    </AppLayout>
  );
}
