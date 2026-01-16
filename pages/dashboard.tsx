export default function DashboardPage() {
  const stats = [
    { label: "Active Shipments", value: "42" },
    { label: "In Transit", value: "18" },
    { label: "Delayed", value: "3" },
    { label: "Incidents", value: "5" },
  ];

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
          <p className="text-sm text-slate-400">
            Overview of shipment activity across your network.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-card p-5 shadow-glow-primary"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {stat.label}
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {stat.value}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Updated just now
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
