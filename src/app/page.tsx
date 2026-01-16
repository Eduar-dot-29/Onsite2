export default function HomePage() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center rounded-2xl border border-border bg-card p-10 text-center shadow-glow-primary">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-white">
          Frontend desplegado correctamente
        </h1>
        <p className="text-sm text-slate-400">
          La ruta raíz está activa y lista para continuar el dashboard.
        </p>
      </div>
    </main>
  );
}
