// API Client for On-site On-Transit Backend (v2)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://on-site-on-transit-1.onrender.com";

// Demo mode - set NEXT_PUBLIC_DEMO_MODE=false to use real backend
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export type ShipmentStatus = "PENDING" | "IN_TRANSIT" | "DELAYED" | "SILENCE" | "DELIVERED";
export type CheckinType = "INTERVAL" | "MILESTONE";
export type ContactLinkStatus = "UNLINKED" | "LINKED";

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  event_type: "CHECK_IN" | "INCIDENT" | "LOCATION" | "SYSTEM";
  description: string;
  created_at_utc: string;
}

export interface Milestone {
  id: string;
  shipment_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  is_completed: boolean;
  created_at_utc: string;
}

export interface Shipment {
  id: string;
  reference: string;
  origin: string;
  destination: string;
  status: ShipmentStatus;
  departure_at_utc: string;
  eta_at_utc: string;
  timezone: string;
  checkin_type: CheckinType;
  interval_minutes: number | null;
  driver_id: string | null;
  created_at_utc: string;
}

export interface ShipmentDetail extends Shipment {
  milestones: Milestone[];
  events: ShipmentEvent[];
}

export interface ShipmentCreate {
  reference: string;
  origin: string;
  destination: string;
  departure_at_local: string;
  timezone: string;
  estimated_duration_minutes: number;
  checkin_type: CheckinType;
  interval_minutes?: number | null;
  driver_id?: string | null;
  milestones?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    radius_km?: number;
    is_completed?: boolean;
  }>;
}

export interface ShipmentUpdate {
  reference?: string;
  origin?: string;
  destination?: string;
  status?: ShipmentStatus;
  departure_at_local?: string;
  timezone?: string;
  estimated_duration_minutes?: number;
  checkin_type?: CheckinType;
  interval_minutes?: number | null;
  driver_id?: string | null;
}

export interface Contact {
  id: string;
  name: string;
  phone_e164: string | null;
  telegram_chat_id: string | null;
  link_status: ContactLinkStatus;
  created_at_utc: string;
}

export interface ContactCreate {
  name: string;
  phone_e164?: string | null;
  telegram_chat_id?: string | null;
}

// Demo data (minimal)
const demoShipments: Shipment[] = [];
const demoContacts: Contact[] = [];

class ApiClientV2 {
  private demoShipments: Shipment[] = [...demoShipments];
  private demoContacts: Contact[] = [...demoContacts];

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || "Request failed");
    }
    return response.json();
  }

  isAuthenticated(): boolean {
    // v2 backend has no auth; keep UI accessible
    return true;
  }

  clearToken() {
    // no-op
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    if (DEMO_MODE) return this.demoContacts;
    return this.request<Contact[]>("/contacts");
  }

  async createContact(data: ContactCreate): Promise<Contact> {
    if (DEMO_MODE) {
      const c: Contact = {
        id: `contact-${Date.now()}`,
        name: data.name,
        phone_e164: data.phone_e164 || null,
        telegram_chat_id: data.telegram_chat_id || null,
        link_status: data.telegram_chat_id ? "LINKED" : "UNLINKED",
        created_at_utc: new Date().toISOString(),
      };
      this.demoContacts.unshift(c);
      return c;
    }
    return this.request<Contact>("/contacts", { method: "POST", body: JSON.stringify(data) });
  }

  // Shipments
  async getShipments(statusFilter?: "IN_TRANSIT" | "DELAYED" | "DELIVERED"): Promise<Shipment[]> {
    if (DEMO_MODE) {
      if (!statusFilter) return this.demoShipments;
      return this.demoShipments.filter((s) => s.status === statusFilter);
    }
    const url = statusFilter ? `/shipments?status=${statusFilter}` : "/shipments";
    return this.request<Shipment[]>(url);
  }

  async getShipmentDetail(id: string): Promise<ShipmentDetail> {
    if (DEMO_MODE) {
      const s = this.demoShipments.find((x) => x.id === id);
      if (!s) throw new Error("Envío no encontrado");
      return { ...s, milestones: [], events: [] };
    }
    return this.request<ShipmentDetail>(`/shipments/${id}`);
  }

  async createShipment(data: ShipmentCreate): Promise<Shipment> {
    if (DEMO_MODE) {
      const newShip: Shipment = {
        id: `ship-${Date.now()}`,
        reference: data.reference,
        origin: data.origin,
        destination: data.destination,
        status: "PENDING",
        departure_at_utc: new Date(data.departure_at_local).toISOString(),
        eta_at_utc: new Date(new Date(data.departure_at_local).getTime() + data.estimated_duration_minutes * 60 * 1000).toISOString(),
        timezone: data.timezone,
        checkin_type: data.checkin_type,
        interval_minutes: data.interval_minutes ?? null,
        driver_id: data.driver_id ?? null,
        created_at_utc: new Date().toISOString(),
      };
      this.demoShipments.unshift(newShip);
      return newShip;
    }
    return this.request<Shipment>("/shipments", { method: "POST", body: JSON.stringify(data) });
  }

  async updateShipment(shipmentId: string, data: ShipmentUpdate): Promise<Shipment> {
    if (DEMO_MODE) {
      const s = this.demoShipments.find((x) => x.id === shipmentId);
      if (!s) throw new Error("Envío no encontrado");
      Object.assign(s, data);
      return s;
    }
    return this.request<Shipment>(`/shipments/${shipmentId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async assignDriver(shipmentId: string, contactId: string): Promise<Shipment> {
    return this.updateShipment(shipmentId, { driver_id: contactId });
  }

  async sendManualCheckin(shipmentId: string): Promise<ShipmentEvent> {
    if (DEMO_MODE) {
      return {
        id: `evt-${Date.now()}`,
        shipment_id: shipmentId,
        event_type: "CHECK_IN",
        description: "CHECK_IN_SENT (demo)",
        created_at_utc: new Date().toISOString(),
      };
    }
    return this.request<ShipmentEvent>(`/shipments/${shipmentId}/send-checkin`, { method: "POST" });
  }

  async deleteShipment(shipmentId: string): Promise<void> {
    if (DEMO_MODE) {
      this.demoShipments = this.demoShipments.filter((s) => s.id !== shipmentId);
      return;
    }
    await this.request<void>(`/shipments/${shipmentId}`, { method: "DELETE" });
  }
}

export const api = new ApiClientV2();
