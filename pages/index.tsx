export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-20 text-foreground">
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-10 text-center shadow-glow-primary">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
          Logística inteligente
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-white">
          Seguimiento premium para tu red de envíos
        </h1>
        <p className="mt-4 text-sm text-slate-400">
          Centraliza incidencias, estados y tiempos de entrega en un solo panel
          con visibilidad total para operadores y clientes.
        </p>
        <div className="mt-8 flex justify-center">
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white shadow-glow-primary transition hover:brightness-110"
          >
            Entrar al dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
