import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Plus, User, Link2, MessageSquare } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { api, Contact } from "@/lib/api";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ContactosPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadContacts();
  }, [router]);

  const loadContacts = async () => {
    try {
      const data = await api.getContacts();
      setContacts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar contactos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <main className="px-6 py-8">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-400">Cargando contactos...</div>
            </div>
          </div>
        </main>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <main className="px-6 py-8">
        <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Contactos</h1>
            <p className="mt-1 text-sm text-slate-400">
              Gestiona los contactos para notificaciones de envíos
            </p>
          </div>
          <Link
            href="/contactos/nuevo"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-glow-primary transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Nuevo Contacto
          </Link>
        </div>

        {error && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Contacts Grid */}
        {contacts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <User className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No hay contactos todavía</p>
              <Link
                href="/contactos/nuevo"
                className="mt-4 text-sm text-primary hover:underline"
              >
                Crear tu primer contacto
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {contacts.map((contact) => {
              return (
                <div
                  key={contact.id}
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/50 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center">
                        <User className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{contact.name}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Link2 className="h-3 w-3" />
                          {contact.link_status === "LINKED" ? "Vinculado" : "No vinculado"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    {contact.telegram_chat_id && (
                      <p className="text-slate-400">
                        <span className="text-slate-500">Chat ID:</span> {contact.telegram_chat_id}
                      </p>
                    )}
                    {contact.phone_e164 && (
                      <p className="text-slate-400">
                        <span className="text-slate-500">Teléfono:</span> {contact.phone_e164}
                      </p>
                    )}
                    {!contact.telegram_chat_id && (
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        En Telegram: enviar <span className="text-slate-300">/start</span> y compartir teléfono
                      </p>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Creado: {format(new Date(contact.created_at_utc), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
    </AppLayout>
  );
}
