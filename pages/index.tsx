import Link from "next/link";
import { Truck, Bell, MapPin, Clock } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="h-3 w-3 rounded-full bg-primary shadow-glow-primary" />
            <span className="text-sm font-medium text-primary">On-site Transit</span>
          </div>
          
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500 mb-4">
            Logística inteligente
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold text-white leading-tight">
            Seguimiento premium para tu red de envíos
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto">
            Centraliza incidencias, estados y tiempos de entrega en un solo panel
            con visibilidad total para operadores y clientes.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3.5 text-sm font-semibold text-white shadow-glow-primary transition hover:brightness-110"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-border px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-white/5"
            >
              Crear Organización
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-16 border-t border-border">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-white mb-12">
            Todo lo que necesitas para gestionar tus envíos
          </h2>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Truck}
              title="Gestión de Envíos"
              description="Crea y administra envíos con origen, destino y tiempos estimados"
            />
            <FeatureCard
              icon={MapPin}
              title="Tracking en Tiempo Real"
              description="Monitorea el estado de cada envío con actualizaciones automáticas"
            />
            <FeatureCard
              icon={Bell}
              title="Notificaciones Telegram"
              description="Alertas automáticas a conductores y clientes vía Telegram"
            />
            <FeatureCard
              icon={Clock}
              title="ETAs Inteligentes"
              description="Cálculo automático de tiempos de llegada estimados"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border">
        <div className="mx-auto max-w-5xl text-center text-sm text-slate-500">
          © 2025 On-site Transit. SaaS de automatización de seguimiento de envíos.
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-medium text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}
