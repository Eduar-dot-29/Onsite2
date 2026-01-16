import ShipmentTimeline from "@/components/ShipmentTimeline";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Shipment timeline</h1>
        <p className="text-sm text-slate-400">
          Activity and incidents for the selected shipment.
        </p>
      </div>
      <section className="rounded-2xl border border-border bg-card p-6 shadow-glow-primary">
        <ShipmentTimeline />
      </section>
    </div>
  );
}
