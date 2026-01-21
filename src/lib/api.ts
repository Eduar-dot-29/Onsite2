// API Client for On-site On-Transit Backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://on-site-on-transit.onrender.com';

/**
 * FastAPI validation error detail item
 */
interface ValidationErrorDetail {
  loc: (string | number)[];
  msg: string;
  type: string;
}

/**
 * Possible error response structures from the backend
 */
interface ApiErrorResponse {
  detail?: string | ValidationErrorDetail[] | Record<string, unknown>;
  message?: string;
  error?: string;
}

/**
 * Extracts a human-readable error message from various error types.
 * Handles: FastAPI validation errors, standard Error objects, fetch errors, and unknown types.
 */
export function extractErrorMessage(error: unknown): string {
  // Handle null/undefined
  if (error == null) {
    return 'Error desconocido';
  }

  // Handle string directly
  if (typeof error === 'string') {
    return error;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message || 'Error desconocido';
  }

  // Handle API error response objects
  if (typeof error === 'object') {
    const errorObj = error as ApiErrorResponse;

    // FastAPI validation errors: detail is an array
    if (Array.isArray(errorObj.detail)) {
      const messages = errorObj.detail
        .map((item: ValidationErrorDetail) => {
          const field = item.loc?.slice(-1)[0] || 'campo';
          return `${field}: ${item.msg}`;
        })
        .join(', ');
      return messages || 'Error de validación';
    }

    // Standard detail string
    if (typeof errorObj.detail === 'string') {
      return errorObj.detail;
    }

    // Detail is an object (convert to readable string)
    if (errorObj.detail && typeof errorObj.detail === 'object') {
      return JSON.stringify(errorObj.detail);
    }

    // Alternative error fields
    if (typeof errorObj.message === 'string') {
      return errorObj.message;
    }

    if (typeof errorObj.error === 'string') {
      return errorObj.error;
    }
  }

  // Last resort: try to stringify, but avoid [object Object]
  try {
    const str = JSON.stringify(error);
    if (str && str !== '{}') {
      return str;
    }
  } catch {
    // JSON.stringify failed
  }

  return 'Error desconocido';
}

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

export interface Shipment {
  id: string;
  tenant_id: string;
  customer_name: string;
  origin_text: string;
  destination_text: string;
  destination_lat: number | null;
  destination_lon: number | null;
  planned_departure_at: string;
  eta_hours: number;
  estimated_arrival_at: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled';
  assigned_contact_id: string | null;
  created_at: string;
}

export interface ShipmentCreate {
  customer_name: string;
  origin_text: string;
  destination_text: string;
  destination_lat?: number | null;
  destination_lon?: number | null;
  planned_departure_at: string;
  eta_hours: number;
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
  due_at: string;
  sent_at: string | null;
  answered_at: string | null;
  status: 'pending' | 'sent' | 'answered' | 'missed' | 'escalated';
  created_at: string;
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
    planned_departure_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    eta_hours: 6,
    estimated_arrival_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    status: 'in_transit',
    assigned_contact_id: 'contact-001',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ship-002',
    tenant_id: DEMO_TENANT_ID,
    customer_name: 'Supermercados López',
    origin_text: 'Valencia, España',
    destination_text: 'Sevilla, España',
    destination_lat: 37.3891,
    destination_lon: -5.9845,
    planned_departure_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    eta_hours: 8,
    estimated_arrival_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    status: 'delayed',
    assigned_contact_id: null,
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ship-003',
    tenant_id: DEMO_TENANT_ID,
    customer_name: 'Farmacia Central',
    origin_text: 'Bilbao, España',
    destination_text: 'Zaragoza, España',
    destination_lat: 41.6488,
    destination_lon: -0.8891,
    planned_departure_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    eta_hours: 4,
    estimated_arrival_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    status: 'delivered',
    assigned_contact_id: 'contact-002',
    created_at: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ship-004',
    tenant_id: DEMO_TENANT_ID,
    customer_name: 'Textiles Martínez',
    origin_text: 'Málaga, España',
    destination_text: 'Madrid, España',
    destination_lat: 40.4168,
    destination_lon: -3.7038,
    planned_departure_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    eta_hours: 5,
    estimated_arrival_at: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    assigned_contact_id: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
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
      due_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      sent_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      answered_at: new Date(Date.now() - 3.9 * 60 * 60 * 1000).toISOString(),
      status: 'answered',
      created_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'chk-002',
      shipment_id: 'ship-001',
      due_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      sent_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      answered_at: null,
      status: 'sent',
      created_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'chk-003',
      shipment_id: 'ship-001',
      due_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
      sent_at: null,
      answered_at: null,
      status: 'pending',
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
      if (savedShipments) this.demoShipments = JSON.parse(savedShipments);
      if (savedContacts) this.demoContacts = JSON.parse(savedContacts);
    }
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
      const errorBody = await response.json().catch(() => ({ detail: 'Error de conexión' }));
      const errorMessage = extractErrorMessage(errorBody);
      throw new Error(errorMessage);
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
  async getShipments(): Promise<Shipment[]> {
    if (DEMO_MODE) {
      return this.demoShipments;
    }
    return this.request<Shipment[]>('/shipments');
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
      const newShipment: Shipment = {
        id: `ship-${Date.now()}`,
        tenant_id: DEMO_TENANT_ID,
        customer_name: data.customer_name,
        origin_text: data.origin_text,
        destination_text: data.destination_text,
        destination_lat: data.destination_lat || null,
        destination_lon: data.destination_lon || null,
        planned_departure_at: data.planned_departure_at,
        eta_hours: data.eta_hours,
        estimated_arrival_at: new Date(new Date(data.planned_departure_at).getTime() + data.eta_hours * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        assigned_contact_id: null,
        created_at: new Date().toISOString(),
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
      checkin.status = 'answered';
      checkin.answered_at = new Date().toISOString();
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
        shipment.status = 'delayed';
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
    shipment.status = 'in_transit';

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
      due_at: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      answered_at: null,
      status: 'sent',
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
