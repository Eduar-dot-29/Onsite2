// API Client for On-site On-Transit Backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://on-site-on-transit.onrender.com';

// Demo mode - set to false to use real backend
const DEMO_MODE = false;

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
  created_at: string;
}

export type CheckinPlanMode = 'INTERVAL' | 'MILESTONE';

export interface Shipment {
  id: string;
  tenant_id: string;
  customer_name: string;
  origin_text: string;
  destination_text: string;
  destination_lat: number | null;
  destination_lon: number | null;
  // UTC times
  departure_at_utc: string;
  eta_at_utc: string;
  // Timezone for display
  timezone: string;
  // Duration in minutes
  estimated_duration_minutes: number;
  // Check-in configuration
  checkin_plan_mode: CheckinPlanMode;
  checkin_interval_minutes: number | null;
  checkin_count: number | null;
  status: 'CREATED' | 'ASSIGNED' | 'IN_TRANSIT' | 'INCIDENT' | 'DELAYED' | 'DELIVERED';
  assigned_contact_id: string | null;
  delivered_at_utc: string | null;
  created_at: string;
  deleted_at: string | null;
  // Legacy fields for backward compatibility
  planned_departure_at?: string;
  eta_hours?: number;
  estimated_arrival_at?: string;
}

export interface ShipmentCreate {
  customer_name: string;
  origin_text: string;
  destination_text: string;
  destination_lat?: number | null;
  destination_lon?: number | null;
  // Local datetime (ISO format) - will be converted to UTC by backend
  departure_at_local: string;
  // IANA timezone
  timezone?: string;
  // Duration in minutes
  estimated_duration_minutes: number;
  // Check-in plan
  checkin_plan_mode?: CheckinPlanMode;
  checkin_interval_minutes?: number;
  checkin_count?: number;
  // Optional: assign driver at creation
  assigned_contact_id?: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  name: string;
  channel: 'telegram' | 'sms' | 'whatsapp';
  telegram_chat_id: string | null;
  phone_e164: string | null;
  created_at: string;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  event_type: string;
  payload_json: Record<string, unknown>;
  created_at: string;
}

export interface TrackingCheckin {
  id: string;
  shipment_id: string;
  scheduled_for_utc: string;
  status: 'PENDING' | 'SENDING' | 'SENT' | 'ANSWERED' | 'MISSED' | 'ESCALATED' | 'FAILED' | 'CANCELLED';
  locked_at_utc: string | null;
  sent_at_utc: string | null;
  answered_at_utc: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  // Legacy fields
  due_at?: string;
  sent_at?: string | null;
  answered_at?: string | null;
}

export interface ContactCreate {
  name: string;
  channel: 'telegram' | 'sms' | 'whatsapp';
  telegram_chat_id?: string | null;
  phone_e164?: string | null;
}

// Demo data storage
const DEMO_TENANT_ID = 'demo-tenant-001';

const demoShipments: Shipment[] = [
  {
    id: 'ship-001',
    tenant_id: DEMO_TENANT_ID,
    customer_name: 'Electrodomésticos García',
    origin_text: 'Madrid, España',
    destination_text: 'Barcelona, España',
    destination_lat: 41.3851,
    destination_lon: 2.1734,
    departure_at_utc: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    eta_at_utc: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    timezone: 'Europe/Madrid',
    estimated_duration_minutes: 360,
    checkin_plan_mode: 'INTERVAL',
    checkin_interval_minutes: 30,
    checkin_count: null,
    status: 'IN_TRANSIT',
    assigned_contact_id: 'contact-001',
    delivered_at_utc: null,
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'ship-002',
    tenant_id: DEMO_TENANT_ID,
    customer_name: 'Supermercados López',
    origin_text: 'Valencia, España',
    destination_text: 'Sevilla, España',
    destination_lat: 37.3891,
    destination_lon: -5.9845,
    departure_at_utc: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    eta_at_utc: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    timezone: 'Europe/Madrid',
    estimated_duration_minutes: 480,
    checkin_plan_mode: 'INTERVAL',
    checkin_interval_minutes: 60,
    checkin_count: null,
    status: 'DELAYED',
    assigned_contact_id: null,
    delivered_at_utc: null,
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'ship-003',
    tenant_id: DEMO_TENANT_ID,
    customer_name: 'Farmacia Central',
    origin_text: 'Bilbao, España',
    destination_text: 'Zaragoza, España',
    destination_lat: 41.6488,
    destination_lon: -0.8891,
    departure_at_utc: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    eta_at_utc: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    timezone: 'Europe/Madrid',
    estimated_duration_minutes: 240,
    checkin_plan_mode: 'MILESTONE',
    checkin_interval_minutes: null,
    checkin_count: 3,
    status: 'DELIVERED',
    assigned_contact_id: 'contact-002',
    delivered_at_utc: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'ship-004',
    tenant_id: DEMO_TENANT_ID,
    customer_name: 'Textiles Martínez',
    origin_text: 'Málaga, España',
    destination_text: 'Madrid, España',
    destination_lat: 40.4168,
    destination_lon: -3.7038,
    departure_at_utc: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    eta_at_utc: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    timezone: 'Europe/Madrid',
    estimated_duration_minutes: 300,
    checkin_plan_mode: 'INTERVAL',
    checkin_interval_minutes: 30,
    checkin_count: null,
    status: 'CREATED',
    assigned_contact_id: null,
    delivered_at_utc: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
];

const demoContacts: Contact[] = [
  {
    id: 'contact-001',
    tenant_id: DEMO_TENANT_ID,
    name: 'Carlos Rodríguez',
    channel: 'telegram',
    telegram_chat_id: '123456789',
    phone_e164: null,
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'contact-002',
    tenant_id: DEMO_TENANT_ID,
    name: 'María González',
    channel: 'whatsapp',
    telegram_chat_id: null,
    phone_e164: '+34612345678',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'contact-003',
    tenant_id: DEMO_TENANT_ID,
    name: 'Pedro Sánchez',
    channel: 'sms',
    telegram_chat_id: null,
    phone_e164: '+34698765432',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo events for shipments
const demoEvents: Record<string, ShipmentEvent[]> = {
  'ship-001': [
    {
      id: 'evt-001',
      shipment_id: 'ship-001',
      event_type: 'SHIPMENT_CREATED',
      payload_json: {},
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'evt-002',
      shipment_id: 'ship-001',
      event_type: 'DRIVER_ASSIGNED',
      payload_json: { contact_name: 'Carlos Rodríguez' },
      created_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'evt-003',
      shipment_id: 'ship-001',
      event_type: 'CHECKIN_SCHEDULED',
      payload_json: { count: 3 },
      created_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'evt-004',
      shipment_id: 'ship-001',
      event_type: 'CHECKIN_SENT',
      payload_json: { checkin_id: 'chk-001' },
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'evt-005',
      shipment_id: 'ship-001',
      event_type: 'CHECKIN_OK',
      payload_json: { checkin_id: 'chk-001' },
      created_at: new Date(Date.now() - 3.9 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'evt-006',
      shipment_id: 'ship-001',
      event_type: 'CHECKIN_SENT',
      payload_json: { checkin_id: 'chk-002' },
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ],
  'ship-002': [
    {
      id: 'evt-010',
      shipment_id: 'ship-002',
      event_type: 'SHIPMENT_CREATED',
      payload_json: {},
      created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'evt-011',
      shipment_id: 'ship-002',
      event_type: 'CHECKIN_SENT',
      payload_json: { checkin_id: 'chk-010' },
      created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'evt-012',
      shipment_id: 'ship-002',
      event_type: 'INCIDENT_TRAFFIC',
      payload_json: { checkin_id: 'chk-010' },
      created_at: new Date(Date.now() - 9.5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'evt-013',
      shipment_id: 'ship-002',
      event_type: 'DELAY_REPORTED',
      payload_json: { delay_minutes: 120 },
      created_at: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'evt-014',
      shipment_id: 'ship-002',
      event_type: 'LOCATION_RECEIVED',
      payload_json: { lat: 38.5, lon: -4.2 },
      created_at: new Date(Date.now() - 8.5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'evt-015',
      shipment_id: 'ship-002',
      event_type: 'ETA_UPDATED',
      payload_json: { old_eta: '2025-01-20T10:00:00Z', new_eta: '2025-01-20T12:30:00Z' },
      created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'evt-016',
      shipment_id: 'ship-002',
      event_type: 'NO_RESPONSE',
      payload_json: { checkin_id: 'chk-011' },
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'evt-017',
      shipment_id: 'ship-002',
      event_type: 'ESCALATED',
      payload_json: { reason: 'no_response' },
      created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

// Demo checkins
const demoCheckins: Record<string, TrackingCheckin[]> = {
  'ship-001': [
    {
      id: 'chk-001',
      shipment_id: 'ship-001',
      scheduled_for_utc: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      status: 'ANSWERED',
      locked_at_utc: null,
      sent_at_utc: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      answered_at_utc: new Date(Date.now() - 3.9 * 60 * 60 * 1000).toISOString(),
      attempts: 1,
      last_error: null,
      created_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'chk-002',
      shipment_id: 'ship-001',
      scheduled_for_utc: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      status: 'SENT',
      locked_at_utc: null,
      sent_at_utc: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      answered_at_utc: null,
      attempts: 1,
      last_error: null,
      created_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'chk-003',
      shipment_id: 'ship-001',
      scheduled_for_utc: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
      status: 'PENDING',
      locked_at_utc: null,
      sent_at_utc: null,
      answered_at_utc: null,
      attempts: 0,
      last_error: null,
      created_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

class ApiClient {
  private token: string | null = null;
  private demoShipments: Shipment[] = [...demoShipments];
  private demoContacts: Contact[] = [...demoContacts];

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
      // Load demo data from localStorage if exists
      const savedShipments = localStorage.getItem('demo_shipments');
      const savedContacts = localStorage.getItem('demo_contacts');
      if (savedShipments) {
        const parsed = JSON.parse(savedShipments);
        // Migrate old shipment data to new format
        this.demoShipments = parsed.map((s: Shipment & { planned_departure_at?: string; estimated_arrival_at?: string; eta_hours?: number }) => this.migrateShipment(s));
        // Save migrated data
        this.saveDemoData();
      }
      if (savedContacts) this.demoContacts = JSON.parse(savedContacts);
    }
  }

  // Migrate old shipment format to new UTC-based format
  private migrateShipment(s: Shipment & { planned_departure_at?: string; estimated_arrival_at?: string; eta_hours?: number }): Shipment {
    // If already has new fields, return as-is
    if (s.departure_at_utc && s.eta_at_utc) {
      return s;
    }
    
    // Convert from old format
    const departure = s.departure_at_utc || s.planned_departure_at || new Date().toISOString();
    const eta = s.eta_at_utc || s.estimated_arrival_at || new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const durationMinutes = s.estimated_duration_minutes || (s.eta_hours ? s.eta_hours * 60 : 240);
    
    // Map old status values to new uppercase format
    let status = s.status;
    const statusMap: Record<string, Shipment['status']> = {
      'pending': 'ASSIGNED',
      'in_transit': 'IN_TRANSIT',
      'delivered': 'DELIVERED',
      'delayed': 'DELAYED',
      'incident': 'INCIDENT',
      'created': 'CREATED',
      'assigned': 'ASSIGNED',
    };
    if (statusMap[status.toLowerCase()]) {
      status = statusMap[status.toLowerCase()];
    }
    
    return {
      ...s,
      departure_at_utc: departure,
      eta_at_utc: eta,
      timezone: s.timezone || 'Europe/Madrid',
      estimated_duration_minutes: durationMinutes,
      checkin_plan_mode: s.checkin_plan_mode || 'INTERVAL',
      checkin_interval_minutes: s.checkin_interval_minutes ?? 30,
      checkin_count: s.checkin_count ?? null,
      delivered_at_utc: s.delivered_at_utc || null,
      deleted_at: s.deleted_at || null,
      status,
    };
  }

  private saveDemoData() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('demo_shipments', JSON.stringify(this.demoShipments));
      localStorage.setItem('demo_contacts', JSON.stringify(this.demoContacts));
    }
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('tenant_id');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(tenantId: string, email: string, password: string): Promise<TokenResponse> {
    if (DEMO_MODE) {
      // Demo mode: accept any email
      const demoToken = `demo-token-${Date.now()}`;
      this.setToken(demoToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tenant_id', DEMO_TENANT_ID);
        localStorage.setItem('user_email', email);
      }
      return { access_token: demoToken, token_type: 'bearer' };
    }

    const response = await this.request<TokenResponse>('/auth/token', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: tenantId, email, password }),
    });
    this.setToken(response.access_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('tenant_id', tenantId);
    }
    return response;
  }

  /**
   * Simplified login for development/testing - only requires email.
   * Creates user automatically if doesn't exist.
   */
  async devLogin(email: string): Promise<TokenResponse> {
    if (DEMO_MODE) {
      // Demo mode: accept any email
      const demoToken = `demo-token-${Date.now()}`;
      this.setToken(demoToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('tenant_id', DEMO_TENANT_ID);
        localStorage.setItem('user_email', email);
      }
      return { access_token: demoToken, token_type: 'bearer' };
    }

    const response = await this.request<TokenResponse>('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    this.setToken(response.access_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user_email', email);
    }
    return response;
  }

  async bootstrap(tenantName: string, adminEmail: string, adminPassword: string) {
    if (DEMO_MODE) {
      // Demo mode: simulate bootstrap
      if (typeof window !== 'undefined') {
        localStorage.setItem('tenant_name', tenantName);
      }
      return { id: DEMO_TENANT_ID, name: tenantName };
    }

    return this.request('/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify({
        tenant_name: tenantName,
        admin_email: adminEmail,
        admin_password: adminPassword,
      }),
    });
  }

  async getMe(): Promise<User> {
    if (DEMO_MODE) {
      const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') || 'demo@example.com' : 'demo@example.com';
      return {
        id: 'demo-user-001',
        tenant_id: DEMO_TENANT_ID,
        email,
        role: 'admin',
        created_at: new Date().toISOString(),
      };
    }
    return this.request<User>('/auth/me');
  }

  // Shipments
  async getShipments(statusFilter?: 'IN_TRANSIT' | 'DELAYED' | 'DELIVERED'): Promise<Shipment[]> {
    if (DEMO_MODE) {
      if (!statusFilter) return this.demoShipments;
      return this.demoShipments.filter(s => {
        if (statusFilter === 'IN_TRANSIT') return s.status === 'IN_TRANSIT' || s.status === 'ASSIGNED';
        if (statusFilter === 'DELAYED') return s.status === 'DELAYED' || s.status === 'INCIDENT';
        if (statusFilter === 'DELIVERED') return s.status === 'DELIVERED';
        return true;
      });
    }
    const url = statusFilter ? `/shipments?status=${statusFilter}` : '/shipments';
    return this.request<Shipment[]>(url);
  }

  async getShipment(id: string): Promise<Shipment> {
    if (DEMO_MODE) {
      const shipment = this.demoShipments.find(s => s.id === id);
      if (!shipment) throw new Error('Envío no encontrado');
      return shipment;
    }
    return this.request<Shipment>(`/shipments/${id}`);
  }

  async createShipment(data: ShipmentCreate): Promise<Shipment> {
    if (DEMO_MODE) {
      const departureUtc = new Date(data.departure_at_local).toISOString();
      const etaUtc = new Date(new Date(data.departure_at_local).getTime() + data.estimated_duration_minutes * 60 * 1000).toISOString();
      const newShipment: Shipment = {
        id: `ship-${Date.now()}`,
        tenant_id: DEMO_TENANT_ID,
        customer_name: data.customer_name,
        origin_text: data.origin_text,
        destination_text: data.destination_text,
        destination_lat: data.destination_lat || null,
        destination_lon: data.destination_lon || null,
        departure_at_utc: departureUtc,
        eta_at_utc: etaUtc,
        timezone: data.timezone || 'Europe/Madrid',
        estimated_duration_minutes: data.estimated_duration_minutes,
        checkin_plan_mode: data.checkin_plan_mode || 'INTERVAL',
        checkin_interval_minutes: data.checkin_interval_minutes || 30,
        checkin_count: data.checkin_count || null,
        status: 'CREATED',
        assigned_contact_id: data.assigned_contact_id || null,
        delivered_at_utc: null,
        created_at: new Date().toISOString(),
        deleted_at: null,
      };
      this.demoShipments.unshift(newShipment);
      this.saveDemoData();
      return newShipment;
    }
    return this.request<Shipment>('/shipments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async assignContact(shipmentId: string, contactId: string): Promise<Shipment> {
    if (DEMO_MODE) {
      const shipment = this.demoShipments.find(s => s.id === shipmentId);
      if (!shipment) throw new Error('Envío no encontrado');
      shipment.assigned_contact_id = contactId;
      this.saveDemoData();
      return shipment;
    }
    return this.request<Shipment>(`/shipments/${shipmentId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ contact_id: contactId }),
    });
  }

  async updateShipment(shipmentId: string, data: Partial<ShipmentCreate>): Promise<Shipment> {
    if (DEMO_MODE) {
      const shipment = this.demoShipments.find(s => s.id === shipmentId);
      if (!shipment) throw new Error('Envío no encontrado');
      if (data.customer_name) shipment.customer_name = data.customer_name;
      if (data.origin_text) shipment.origin_text = data.origin_text;
      if (data.destination_text) shipment.destination_text = data.destination_text;
      if (data.departure_at_local) {
        shipment.departure_at_utc = new Date(data.departure_at_local).toISOString();
      }
      if (data.estimated_duration_minutes) {
        shipment.estimated_duration_minutes = data.estimated_duration_minutes;
        shipment.eta_at_utc = new Date(
          new Date(shipment.departure_at_utc).getTime() + data.estimated_duration_minutes * 60 * 1000
        ).toISOString();
      }
      if (data.timezone) shipment.timezone = data.timezone;
      this.saveDemoData();
      return shipment;
    }
    return this.request<Shipment>(`/shipments/${shipmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteShipment(shipmentId: string): Promise<void> {
    if (DEMO_MODE) {
      const index = this.demoShipments.findIndex(s => s.id === shipmentId);
      if (index === -1) throw new Error('Envío no encontrado');
      this.demoShipments.splice(index, 1);
      this.saveDemoData();
      return;
    }
    await this.request<void>(`/shipments/${shipmentId}`, {
      method: 'DELETE',
    });
  }

  async markDelivered(shipmentId: string): Promise<Shipment> {
    if (DEMO_MODE) {
      const shipment = this.demoShipments.find(s => s.id === shipmentId);
      if (!shipment) throw new Error('Envío no encontrado');
      shipment.status = 'DELIVERED';
      this.saveDemoData();
      return shipment;
    }
    return this.request<Shipment>(`/shipments/${shipmentId}/deliver`, {
      method: 'POST',
    });
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    if (DEMO_MODE) {
      return this.demoContacts;
    }
    return this.request<Contact[]>('/contacts');
  }

  async createContact(data: ContactCreate): Promise<Contact> {
    if (DEMO_MODE) {
      const newContact: Contact = {
        id: `contact-${Date.now()}`,
        tenant_id: DEMO_TENANT_ID,
        name: data.name,
        channel: data.channel,
        telegram_chat_id: data.telegram_chat_id || null,
        phone_e164: data.phone_e164 || null,
        created_at: new Date().toISOString(),
      };
      this.demoContacts.unshift(newContact);
      this.saveDemoData();
      return newContact;
    }
    return this.request<Contact>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Tracking - Events
  async getShipmentEvents(shipmentId: string): Promise<ShipmentEvent[]> {
    if (DEMO_MODE) {
      const savedEvents = typeof window !== 'undefined' ? localStorage.getItem('demo_events') : null;
      const events = savedEvents ? JSON.parse(savedEvents) : demoEvents;
      return events[shipmentId] || [];
    }
    return this.request<ShipmentEvent[]>(`/tracking/shipments/${shipmentId}/events`);
  }

  async getShipmentCheckins(shipmentId: string): Promise<TrackingCheckin[]> {
    if (DEMO_MODE) {
      const savedCheckins = typeof window !== 'undefined' ? localStorage.getItem('demo_checkins') : null;
      const checkins = savedCheckins ? JSON.parse(savedCheckins) : demoCheckins;
      return checkins[shipmentId] || [];
    }
    return this.request<TrackingCheckin[]>(`/tracking/shipments/${shipmentId}/checkins`);
  }

  async sendManualCheckin(shipmentId: string): Promise<TrackingCheckin> {
    return this.request<TrackingCheckin>(`/tracking/shipments/${shipmentId}/send-checkin`, {
      method: 'POST',
    });
  }

  // Demo simulation methods
  async simulateCheckinResponse(
    shipmentId: string,
    checkinId: string,
    response: 'ok' | 'breakdown' | 'traffic'
  ): Promise<{ success: boolean }> {
    if (!DEMO_MODE) return { success: false };

    const savedEvents = typeof window !== 'undefined' ? localStorage.getItem('demo_events') : null;
    const events: Record<string, ShipmentEvent[]> = savedEvents ? JSON.parse(savedEvents) : { ...demoEvents };
    
    const savedCheckins = typeof window !== 'undefined' ? localStorage.getItem('demo_checkins') : null;
    const checkins: Record<string, TrackingCheckin[]> = savedCheckins ? JSON.parse(savedCheckins) : { ...demoCheckins };

    if (!events[shipmentId]) events[shipmentId] = [];
    if (!checkins[shipmentId]) checkins[shipmentId] = [];

    // Update checkin status
    const checkin = checkins[shipmentId].find(c => c.id === checkinId);
    if (checkin) {
      checkin.status = 'ANSWERED';
      checkin.answered_at_utc = new Date().toISOString();
    }

    // Add event
    const eventType = response === 'ok' ? 'CHECKIN_OK' : response === 'breakdown' ? 'INCIDENT_BREAKDOWN' : 'INCIDENT_TRAFFIC';
    events[shipmentId].push({
      id: `evt-${Date.now()}`,
      shipment_id: shipmentId,
      event_type: eventType,
      payload_json: { checkin_id: checkinId },
      created_at: new Date().toISOString(),
    });

    // Update shipment status if incident
    if (response !== 'ok') {
      const shipment = this.demoShipments.find(s => s.id === shipmentId);
      if (shipment) {
        shipment.status = 'DELAYED';
        this.saveDemoData();
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('demo_events', JSON.stringify(events));
      localStorage.setItem('demo_checkins', JSON.stringify(checkins));
    }

    return { success: true };
  }

  async simulateDelayReport(shipmentId: string, delayMinutes: number): Promise<{ success: boolean }> {
    if (!DEMO_MODE) return { success: false };

    const savedEvents = typeof window !== 'undefined' ? localStorage.getItem('demo_events') : null;
    const events: Record<string, ShipmentEvent[]> = savedEvents ? JSON.parse(savedEvents) : { ...demoEvents };

    if (!events[shipmentId]) events[shipmentId] = [];

    events[shipmentId].push({
      id: `evt-${Date.now()}`,
      shipment_id: shipmentId,
      event_type: 'DELAY_REPORTED',
      payload_json: { delay_minutes: delayMinutes },
      created_at: new Date().toISOString(),
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('demo_events', JSON.stringify(events));
    }

    return { success: true };
  }

  async simulateLocationAndRecalculate(
    shipmentId: string,
    lat: number,
    lon: number,
    delayMinutes: number
  ): Promise<{ success: boolean; newEta?: string }> {
    if (!DEMO_MODE) return { success: false };

    const savedEvents = typeof window !== 'undefined' ? localStorage.getItem('demo_events') : null;
    const events: Record<string, ShipmentEvent[]> = savedEvents ? JSON.parse(savedEvents) : { ...demoEvents };

    if (!events[shipmentId]) events[shipmentId] = [];

    const shipment = this.demoShipments.find(s => s.id === shipmentId);
    if (!shipment) return { success: false };

    const oldEta = shipment.estimated_arrival_at;
    const newEta = new Date(Date.now() + (delayMinutes + 60) * 60 * 1000).toISOString();
    shipment.estimated_arrival_at = newEta;
    shipment.status = 'IN_TRANSIT';

    // Add events
    events[shipmentId].push({
      id: `evt-${Date.now()}-loc`,
      shipment_id: shipmentId,
      event_type: 'LOCATION_RECEIVED',
      payload_json: { lat, lon },
      created_at: new Date().toISOString(),
    });

    events[shipmentId].push({
      id: `evt-${Date.now()}-route`,
      shipment_id: shipmentId,
      event_type: 'ROUTE_RECALCULATED',
      payload_json: { distance_km: 150, duration_minutes: 90 },
      created_at: new Date(Date.now() + 1000).toISOString(),
    });

    events[shipmentId].push({
      id: `evt-${Date.now()}-eta`,
      shipment_id: shipmentId,
      event_type: 'ETA_UPDATED',
      payload_json: { old_eta: oldEta, new_eta: newEta },
      created_at: new Date(Date.now() + 2000).toISOString(),
    });

    this.saveDemoData();
    if (typeof window !== 'undefined') {
      localStorage.setItem('demo_events', JSON.stringify(events));
    }

    return { success: true, newEta };
  }

  async simulateSendCheckin(shipmentId: string): Promise<TrackingCheckin | null> {
    if (!DEMO_MODE) return null;

    const savedCheckins = typeof window !== 'undefined' ? localStorage.getItem('demo_checkins') : null;
    const checkins: Record<string, TrackingCheckin[]> = savedCheckins ? JSON.parse(savedCheckins) : { ...demoCheckins };
    
    const savedEvents = typeof window !== 'undefined' ? localStorage.getItem('demo_events') : null;
    const events: Record<string, ShipmentEvent[]> = savedEvents ? JSON.parse(savedEvents) : { ...demoEvents };

    if (!checkins[shipmentId]) checkins[shipmentId] = [];
    if (!events[shipmentId]) events[shipmentId] = [];

    const newCheckin: TrackingCheckin = {
      id: `chk-${Date.now()}`,
      shipment_id: shipmentId,
      scheduled_for_utc: new Date().toISOString(),
      status: 'SENT',
      locked_at_utc: null,
      sent_at_utc: new Date().toISOString(),
      answered_at_utc: null,
      attempts: 1,
      last_error: null,
      created_at: new Date().toISOString(),
    };

    checkins[shipmentId].push(newCheckin);
    
    events[shipmentId].push({
      id: `evt-${Date.now()}`,
      shipment_id: shipmentId,
      event_type: 'CHECKIN_SENT',
      payload_json: { checkin_id: newCheckin.id },
      created_at: new Date().toISOString(),
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('demo_checkins', JSON.stringify(checkins));
      localStorage.setItem('demo_events', JSON.stringify(events));
    }

    return newCheckin;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const api = new ApiClient();
