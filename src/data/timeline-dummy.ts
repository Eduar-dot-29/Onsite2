export type EventType = 'ORDER' | 'PICKUP' | 'CHECKIN' | 'INCIDENT' | 'SYSTEM' | 'DELIVERY';

export interface TimelineEvent {
  id: string;
  type: EventType;
  title: string;
  description?: string;
  timestamp: string; // ISO String
  location?: string;
  status: 'COMPLETED' | 'ACTIVE' | 'PENDING';
  meta?: {
    delayMinutes?: number;
    newEta?: string;
    operator?: string;
  };
}

export const shipmentEvents: TimelineEvent[] = [
  {
    id: 'evt-006',
    type: 'DELIVERY',
    title: 'Entrega Estimada (Londres)',
    description: 'Muelle de carga B4',
    timestamp: '2024-03-10T19:30:00Z',
    status: 'PENDING',
    location: 'London, UK'
  },
  {
    id: 'evt-005',
    type: 'SYSTEM',
    title: 'ETA Recalculada',
    description: 'El sistema actualizó la hora de llegada por tráfico.',
    timestamp: '2024-03-10T14:15:00Z',
    status: 'COMPLETED',
    meta: {
      newEta: '19:30',
      delayMinutes: 45
    }
  },
  {
    id: 'evt-004',
    type: 'INCIDENT',
    title: 'Retraso Reportado: Tráfico',
    description: 'Conductor reporta retención en A10. Solicita ampliación de ventana.',
    timestamp: '2024-03-10T14:10:00Z',
    location: 'Orléans, France',
    status: 'COMPLETED',
    meta: {
      delayMinutes: 45
    }
  },
  {
    id: 'evt-003',
    type: 'CHECKIN',
    title: 'Check-in Automático',
    description: 'Todo correcto. Conductor respondió vía Telegram.',
    timestamp: '2024-03-10T12:00:00Z',
    location: 'Vierzon, France',
    status: 'COMPLETED'
  },
  {
    id: 'evt-002',
    type: 'PICKUP',
    title: 'Salida de Almacén',
    description: 'Carga completada. Ruta iniciada.',
    timestamp: '2024-03-10T08:30:00Z',
    location: 'Madrid, ES',
    status: 'COMPLETED'
  },
  {
    id: 'evt-001',
    type: 'ORDER',
    title: 'Envío Creado',
    description: 'Asignado a Transportes J.L.',
    timestamp: '2024-03-10T07:00:00Z',
    status: 'COMPLETED',
    meta: {
      operator: 'Admin User'
    }
  }
];
