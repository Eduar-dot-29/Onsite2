"use client";

import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Truck,
} from "lucide-react";

import {
  timelineEvents,
  type TimelineEvent,
  type TimelineEventType,
} from "../data/timeline-dummy";

const typeStyles: Record<
  TimelineEventType,
  { icon: typeof Truck; className: string }
> = {
  PICKUP: {
    icon: Truck,
    className: "bg-emerald-500/10 text-emerald-500",
  },
  DELIVERY: {
    icon: CheckCircle,
    className: "bg-emerald-500/10 text-emerald-500",
  },
  CHECKIN: {
    icon: CheckCircle,
    className: "bg-blue-500/10 text-blue-500",
  },
  INCIDENT: {
    icon: AlertTriangle,
    className: "bg-red-500/20 text-red-500 ring-1 ring-red-500",
  },
  SYSTEM: {
    icon: Clock,
    className: "bg-purple-500/10 text-purple-500",
  },
  ORDER: {
    icon: Clock,
    className: "bg-gray-800 text-gray-400",
  },
};

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function ShipmentTimeline() {
  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {timelineEvents.map((event, index) => (
        <TimelineItem
          key={event.id}
          event={event}
          isLast={index === timelineEvents.length - 1}
        />
      ))}
    </motion.div>
  );
}

type TimelineItemProps = {
  event: TimelineEvent;
  isLast: boolean;
};

function TimelineItem({ event, isLast }: TimelineItemProps) {
  const { icon: Icon, className } = typeStyles[event.type];
  const isFuture = event.status === "PENDING";
  const timeLabel = format(new Date(event.at), "HH:mm");

  return (
    <motion.div
      variants={itemVariants}
      className="flex items-stretch gap-4"
    >
      <div className="w-14 pt-1 text-right text-sm text-gray-400">
        {timeLabel}
      </div>
      <div className="relative flex w-8 flex-col items-center">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm ${className}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && (
          <div
            className={
              isFuture
                ? "absolute top-10 bottom-0 left-1/2 w-0 -translate-x-1/2 border-l-2 border-dashed border-gray-800"
                : "absolute top-10 bottom-0 left-1/2 w-0.5 -translate-x-1/2 bg-gray-800"
            }
            aria-hidden
          />
        )}
      </div>
      <div className="flex-1 pb-6">
        <div className="rounded-2xl border border-border bg-card/90 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-medium text-white">{event.title}</h4>
            {event.meta?.delayMinutes ? (
              <span className="inline-flex items-center rounded-full border border-red-500/50 bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                +{event.meta.delayMinutes} min
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-gray-400">{event.description}</p>
          {event.location ? (
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-gray-400">
              <MapPin className="h-3.5 w-3.5 text-gray-500" />
              <span>{event.location}</span>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default ShipmentTimeline;
