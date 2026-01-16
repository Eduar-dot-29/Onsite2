export type TimelineEventType =
  | "ORDER"
  | "PICKUP"
  | "CHECKIN"
  | "INCIDENT"
  | "SYSTEM"
  | "DELIVERY";

export type TimelineEventStatus = "DONE" | "PENDING";

export type TimelineEventMeta = {
  delayMinutes?: number;
};

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  status: TimelineEventStatus;
  at: string;
  title: string;
  description: string;
  location?: string;
  meta?: TimelineEventMeta;
};

export const timelineEvents: TimelineEvent[] = [
  {
    id: "evt_001",
    type: "ORDER",
    status: "DONE",
    at: "2026-01-16T08:30:00Z",
    title: "Order created",
    description: "Shipment created by operator.",
  },
  {
    id: "evt_002",
    type: "PICKUP",
    status: "DONE",
    at: "2026-01-16T09:10:00Z",
    title: "Pickup completed",
    description: "Driver confirmed pickup at origin.",
    location: "Madrid DC",
  },
  {
    id: "evt_003",
    type: "CHECKIN",
    status: "DONE",
    at: "2026-01-16T10:00:00Z",
    title: "Check-in OK",
    description: "Driver reported all good.",
  },
  {
    id: "evt_004",
    type: "INCIDENT",
    status: "DONE",
    at: "2026-01-16T12:05:00Z",
    title: "Incident reported",
    description: "Driver reported a breakdown.",
    location: "Km 240 A-2",
    meta: { delayMinutes: 45 },
  },
  {
    id: "evt_005",
    type: "SYSTEM",
    status: "DONE",
    at: "2026-01-16T12:12:00Z",
    title: "ETA updated",
    description: "Route recalculated after incident.",
  },
  {
    id: "evt_006",
    type: "CHECKIN",
    status: "PENDING",
    at: "2026-01-16T13:00:00Z",
    title: "Next check-in",
    description: "Awaiting driver response.",
  },
  {
    id: "evt_007",
    type: "DELIVERY",
    status: "PENDING",
    at: "2026-01-16T18:10:00Z",
    title: "Delivery ETA",
    description: "Estimated arrival at destination.",
  },
];
