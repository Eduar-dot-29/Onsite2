// API Client for On-site On-Transit Backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Demo mode - set to true to bypass backend authentication
const DEMO_MODE = true;

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

  isAuthenticated(): boolean {
    return !!this.token;
  }
}

export const api = new ApiClient();
