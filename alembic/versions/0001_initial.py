"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2026-01-16 00:00:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("hashed_password", sa.String(length=200), nullable=False),
        sa.Column("role", sa.Enum("ADMIN", "OPERATOR", name="user_role"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
    )
    op.create_table(
        "contacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("channel", sa.Enum("TELEGRAM", "WHATSAPP", name="contact_channel"), nullable=False),
        sa.Column("telegram_chat_id", sa.String(length=64), nullable=True),
        sa.Column("phone_e164", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
    )
    op.create_table(
        "shipments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("customer_name", sa.String(length=200), nullable=False),
        sa.Column("origin_text", sa.String(length=300), nullable=False),
        sa.Column("destination_text", sa.String(length=300), nullable=False),
        sa.Column("destination_lat", sa.Float(), nullable=True),
        sa.Column("destination_lon", sa.Float(), nullable=True),
        sa.Column("planned_departure_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("eta_hours", sa.Integer(), nullable=False),
        sa.Column("estimated_arrival_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "CREATED",
                "ASSIGNED",
                "IN_TRANSIT",
                "INCIDENT",
                "DELIVERED",
                name="shipment_status",
            ),
            nullable=False,
        ),
        sa.Column("assigned_contact_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["assigned_contact_id"], ["contacts.id"]),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
    )
    op.create_table(
        "shipment_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("shipment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "event_type",
            sa.Enum(
                "SHIPMENT_CREATED",
                "DRIVER_ASSIGNED",
                "CHECKIN_SCHEDULED",
                "CHECKIN_SENT",
                "CHECKIN_OK",
                "INCIDENT_BREAKDOWN",
                "INCIDENT_TRAFFIC",
                "DELAY_REPORTED",
                "LOCATION_RECEIVED",
                "ROUTE_RECALCULATED",
                "ETA_UPDATED",
                "NO_RESPONSE",
                "ESCALATED",
                name="event_type",
            ),
            nullable=False,
        ),
        sa.Column("payload_json", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["shipment_id"], ["shipments.id"]),
    )
    op.create_table(
        "tracking_rules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("customer_name", sa.String(length=200), nullable=True),
        sa.Column("checkin_every_minutes", sa.Integer(), nullable=False),
        sa.Column("max_silence_minutes", sa.Integer(), nullable=False),
        sa.Column("delay_escalation_minutes", sa.Integer(), nullable=False),
        sa.Column("notify_customer", sa.Boolean(), nullable=False),
        sa.Column("notify_customer_delay_threshold_minutes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "tracking_checkins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("shipment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("answered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "PENDING",
                "SENT",
                "ANSWERED",
                "MISSED",
                "ESCALATED",
                name="checkin_status",
            ),
            nullable=False,
        ),
        sa.Column("last_outbound_message_id", sa.String(length=64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["shipment_id"], ["shipments.id"]),
    )
    op.create_table(
        "shipment_locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("shipment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("lat", sa.Float(), nullable=False),
        sa.Column("lon", sa.Float(), nullable=False),
        sa.Column("accuracy_m", sa.Float(), nullable=True),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["shipment_id"], ["shipments.id"]),
    )
    op.create_table(
        "shipment_incident_states",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("shipment_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("contact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "incident_type",
            sa.Enum("BREAKDOWN", "TRAFFIC", name="incident_type"),
            nullable=False,
        ),
        sa.Column(
            "state",
            sa.Enum("WAITING_DELAY", "WAITING_LOCATION", name="incident_state"),
            nullable=False,
        ),
        sa.Column("delay_minutes", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["shipment_id"], ["shipments.id"]),
    )


def downgrade() -> None:
    op.drop_table("shipment_incident_states")
    op.drop_table("shipment_locations")
    op.drop_table("tracking_checkins")
    op.drop_table("tracking_rules")
    op.drop_table("shipment_events")
    op.drop_table("shipments")
    op.drop_table("contacts")
    op.drop_table("users")
    op.drop_table("tenants")
    op.execute("DROP TYPE IF EXISTS incident_state")
    op.execute("DROP TYPE IF EXISTS incident_type")
    op.execute("DROP TYPE IF EXISTS checkin_status")
    op.execute("DROP TYPE IF EXISTS event_type")
    op.execute("DROP TYPE IF EXISTS shipment_status")
    op.execute("DROP TYPE IF EXISTS contact_channel")
    op.execute("DROP TYPE IF EXISTS user_role")
