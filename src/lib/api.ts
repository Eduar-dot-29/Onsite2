// API Client for On-site On-Transit Backend

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
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
    return this.request<User>('/auth/me');
  }

  // Shipments
  async getShipments(): Promise<Shipment[]> {
    return this.request<Shipment[]>('/shipments');
  }

  async getShipment(id: string): Promise<Shipment> {
    return this.request<Shipment>(`/shipments/${id}`);
  }

  async createShipment(data: ShipmentCreate): Promise<Shipment> {
    return this.request<Shipment>('/shipments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async assignContact(shipmentId: string, contactId: string): Promise<Shipment> {
    return this.request<Shipment>(`/shipments/${shipmentId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ contact_id: contactId }),
    });
  }

  // Contacts
  async getContacts(): Promise<Contact[]> {
    return this.request<Contact[]>('/contacts');
  }

  async createContact(data: ContactCreate): Promise<Contact> {
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
