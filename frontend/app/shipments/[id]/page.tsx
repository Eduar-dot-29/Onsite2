import Link from "next/link";
import { fetchJSON } from "@/lib/api";
import { ShipmentDetail } from "@/lib/types";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ShipmentDetailPage({ params }: PageProps) {
  let shipment: ShipmentDetail | null = null;
  let error: string | null = null;

  try {
    shipment = await fetchJSON<ShipmentDetail>(`/api/shipments/${params.id}`);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to fetch shipment";
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/shipments"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Shipments
          </Link>
          <h1 className="text-3xl font-bold mb-6">Shipment Detail</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error loading shipment</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!shipment) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/shipments"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Shipments
          </Link>
          <h1 className="text-3xl font-bold mb-6">Shipment Detail</h1>
          <p className="text-gray-600">Shipment not found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/shipments"
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Back to Shipments
        </Link>

        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl font-bold">{shipment.reference}</h1>
            <span
              className={`px-3 py-1 text-sm font-semibold rounded-full ${
                shipment.status === "DELIVERED"
                  ? "bg-green-100 text-green-800"
                  : shipment.status === "IN_TRANSIT"
                  ? "bg-blue-100 text-blue-800"
                  : shipment.status === "DELAYED"
                  ? "bg-yellow-100 text-yellow-800"
                  : shipment.status === "SILENCE"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {shipment.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-600">Origin</p>
              <p className="font-medium">{shipment.origin}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Destination</p>
              <p className="font-medium">{shipment.destination}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Departure</p>
              <p className="font-medium">
                {new Date(shipment.departure_at_utc).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">ETA</p>
              <p className="font-medium">
                {new Date(shipment.eta_at_utc).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Check-in Type</p>
              <p className="font-medium">{shipment.checkin_type}</p>
            </div>
            {shipment.interval_minutes && (
              <div>
                <p className="text-sm text-gray-600">Check-in Interval</p>
                <p className="font-medium">{shipment.interval_minutes} minutes</p>
              </div>
            )}
          </div>
        </div>

        {/* Milestones */}
        {shipment.milestones && shipment.milestones.length > 0 && (
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Milestones</h2>
            <div className="space-y-3">
              {shipment.milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <p className="font-medium">{milestone.name}</p>
                    <p className="text-sm text-gray-600">
                      {milestone.latitude.toFixed(4)}, {milestone.longitude.toFixed(4)}{" "}
                      (radius: {milestone.radius_km} km)
                    </p>
                  </div>
                  {milestone.is_completed && (
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                      Completed
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline (Events) */}
        {shipment.events && shipment.events.length > 0 && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Timeline</h2>
            <div className="space-y-4">
              {shipment.events
                .sort(
                  (a, b) =>
                    new Date(b.created_at_utc).getTime() -
                    new Date(a.created_at_utc).getTime()
                )
                .map((event) => (
                  <div
                    key={event.id}
                    className="flex gap-4 pb-4 border-b border-gray-200 last:border-0"
                  >
                    <div className="flex-shrink-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          event.event_type === "CHECK_IN"
                            ? "bg-blue-500"
                            : event.event_type === "INCIDENT"
                            ? "bg-red-500"
                            : event.event_type === "LOCATION"
                            ? "bg-green-500"
                            : "bg-gray-500"
                        }`}
                      >
                        {event.event_type === "CHECK_IN"
                          ? "✓"
                          : event.event_type === "INCIDENT"
                          ? "!"
                          : event.event_type === "LOCATION"
                          ? "📍"
                          : "ℹ"}
                      </div>
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {event.event_type}
                          </p>
                          <p className="text-sm text-gray-600">{event.description}</p>
                        </div>
                        <p className="text-xs text-gray-500 whitespace-nowrap ml-4">
                          {new Date(event.created_at_utc).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {(!shipment.events || shipment.events.length === 0) && (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Timeline</h2>
            <p className="text-gray-600">No events yet.</p>
          </div>
        )}
      </div>
    </main>
  );
}
