import Link from "next/link";
import { fetchJSON } from "@/lib/api";
import { ShipmentListItem } from "@/lib/types";

// Server Component that fetches shipments from API
export default async function ShipmentsPage() {
  let shipments: ShipmentListItem[] = [];
  let error: string | null = null;

  try {
    shipments = await fetchJSON<ShipmentListItem[]>("/api/shipments");
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to fetch shipments";
  }

  if (error) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Shipments</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-bold">Error loading shipments</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (shipments.length === 0) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Shipments</h1>
          <p className="text-gray-600">No shipments found.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Shipments</h1>
        
        <div className="overflow-x-auto bg-white shadow-md rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origin
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destination
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Departure
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ETA
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shipments.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/shipments/${shipment.id}`}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      {shipment.reference}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {shipment.origin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {shipment.destination}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(shipment.departure_at_utc).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(shipment.eta_at_utc).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-sm text-gray-600">
          Total: {shipments.length} shipment{shipments.length !== 1 ? "s" : ""}
        </p>
      </div>
    </main>
  );
}
