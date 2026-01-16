export default function HomePage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-glow-primary">
        <h1 className="text-3xl font-semibold text-white">
          Aplicación en línea
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          La ruta raíz está activa y el frontend se ha desplegado correctamente.
        </p>
      </div>
    </main>
  );
}
