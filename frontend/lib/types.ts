/**
 * TypeScript types matching FastAPI backend schemas
 */

// Enums
export type ShipmentStatus = 
  | "PENDING"
  | "IN_TRANSIT"
  | "DELAYED"
  | "SILENCE"
  | "DELIVERED";

export type CheckinType = "INTERVAL" | "MILESTONE";

export type ShipmentEventType = "CHECK_IN" | "INCIDENT" | "LOCATION" | "SYSTEM";

// Shipment list item (GET /shipments)
export interface ShipmentListItem {
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

// Milestone
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

// Shipment event
export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  event_type: ShipmentEventType;
  description: string;
  created_at_utc: string;
}

// Shipment detail (GET /shipments/{id})
export interface ShipmentDetail extends ShipmentListItem {
  milestones: Milestone[];
  events: ShipmentEvent[];
}
