"""Add UTC timezone fields and automatic check-in support

Revision ID: 0003
Revises: 0002
Create Date: 2026-01-21

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to shipments table
    op.add_column('shipments', sa.Column('departure_at_utc', sa.DateTime(timezone=True), nullable=True))
    op.add_column('shipments', sa.Column('eta_at_utc', sa.DateTime(timezone=True), nullable=True))
    op.add_column('shipments', sa.Column('timezone', sa.String(50), nullable=True, server_default='Europe/Madrid'))
    op.add_column('shipments', sa.Column('estimated_duration_minutes', sa.Integer(), nullable=True))
    op.add_column('shipments', sa.Column('delivered_at_utc', sa.DateTime(timezone=True), nullable=True))
    op.add_column('shipments', sa.Column('checkin_plan_mode', sa.String(20), nullable=True, server_default='INTERVAL'))
    op.add_column('shipments', sa.Column('checkin_interval_minutes', sa.Integer(), nullable=True, server_default='30'))
    op.add_column('shipments', sa.Column('checkin_count', sa.Integer(), nullable=True))
    
    # Migrate existing data: copy planned_departure_at to departure_at_utc, etc.
    op.execute("""
        UPDATE shipments 
        SET departure_at_utc = planned_departure_at,
            eta_at_utc = estimated_arrival_at,
            timezone = 'Europe/Madrid',
            estimated_duration_minutes = eta_hours * 60
        WHERE departure_at_utc IS NULL
    """)
    
    # Now make the new columns NOT NULL (after data migration)
    op.alter_column('shipments', 'departure_at_utc', nullable=False)
    op.alter_column('shipments', 'eta_at_utc', nullable=False)
    op.alter_column('shipments', 'timezone', nullable=False)
    op.alter_column('shipments', 'estimated_duration_minutes', nullable=False)
    
    # Add new columns to tracking_checkins table
    op.add_column('tracking_checkins', sa.Column('scheduled_for_utc', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tracking_checkins', sa.Column('locked_at_utc', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tracking_checkins', sa.Column('sent_at_utc', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tracking_checkins', sa.Column('answered_at_utc', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tracking_checkins', sa.Column('attempts', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('tracking_checkins', sa.Column('last_error', sa.Text(), nullable=True))
    op.add_column('tracking_checkins', sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('tracking_checkins', sa.Column('rule_id', sa.String(36), nullable=True))
    
    # Migrate existing data
    op.execute("""
        UPDATE tracking_checkins 
        SET scheduled_for_utc = COALESCE(due_at, created_at),
            sent_at_utc = sent_at,
            answered_at_utc = answered_at,
            attempts = 0
        WHERE scheduled_for_utc IS NULL
    """)
    
    # Make scheduled_for_utc NOT NULL
    op.alter_column('tracking_checkins', 'scheduled_for_utc', nullable=False)
    op.alter_column('tracking_checkins', 'attempts', nullable=False)
    
    # Add new columns to tracking_rules table
    op.add_column('tracking_rules', sa.Column('name', sa.String(200), nullable=True, server_default='Default'))
    op.add_column('tracking_rules', sa.Column('interval_minutes', sa.Integer(), nullable=True))
    op.add_column('tracking_rules', sa.Column('max_no_response', sa.Integer(), nullable=True, server_default='3'))
    op.add_column('tracking_rules', sa.Column('is_default', sa.Boolean(), nullable=True, server_default='false'))
    
    # Migrate existing rule data
    op.execute("""
        UPDATE tracking_rules 
        SET interval_minutes = checkin_every_minutes,
            name = 'Default',
            max_no_response = 3,
            is_default = false
        WHERE interval_minutes IS NULL
    """)
    
    # Create indexes for efficient querying
    op.create_index('ix_tracking_checkins_scheduled_for_utc', 'tracking_checkins', ['scheduled_for_utc'])
    op.create_index('ix_tracking_checkins_status', 'tracking_checkins', ['status'])
    op.create_index('ix_shipments_departure_at_utc', 'shipments', ['departure_at_utc'])
    op.create_index('ix_shipments_eta_at_utc', 'shipments', ['eta_at_utc'])
    
    # Add SENDING, FAILED, CANCELLED to checkin_status enum (if using PostgreSQL)
    try:
        op.execute("ALTER TYPE checkin_status ADD VALUE IF NOT EXISTS 'SENDING'")
        op.execute("ALTER TYPE checkin_status ADD VALUE IF NOT EXISTS 'FAILED'")
        op.execute("ALTER TYPE checkin_status ADD VALUE IF NOT EXISTS 'CANCELLED'")
    except Exception:
        # SQLite doesn't support enum types
        pass
    
    # Add checkin_plan_mode enum (if using PostgreSQL)
    try:
        op.execute("CREATE TYPE checkin_plan_mode AS ENUM ('INTERVAL', 'MILESTONE')")
    except Exception:
        pass


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_tracking_checkins_scheduled_for_utc', table_name='tracking_checkins')
    op.drop_index('ix_tracking_checkins_status', table_name='tracking_checkins')
    op.drop_index('ix_shipments_departure_at_utc', table_name='shipments')
    op.drop_index('ix_shipments_eta_at_utc', table_name='shipments')
    
    # Drop new columns from tracking_rules
    op.drop_column('tracking_rules', 'is_default')
    op.drop_column('tracking_rules', 'max_no_response')
    op.drop_column('tracking_rules', 'interval_minutes')
    op.drop_column('tracking_rules', 'name')
    
    # Drop new columns from tracking_checkins
    op.drop_column('tracking_checkins', 'rule_id')
    op.drop_column('tracking_checkins', 'scheduled_at')
    op.drop_column('tracking_checkins', 'last_error')
    op.drop_column('tracking_checkins', 'attempts')
    op.drop_column('tracking_checkins', 'answered_at_utc')
    op.drop_column('tracking_checkins', 'sent_at_utc')
    op.drop_column('tracking_checkins', 'locked_at_utc')
    op.drop_column('tracking_checkins', 'scheduled_for_utc')
    
    # Drop new columns from shipments
    op.drop_column('shipments', 'checkin_count')
    op.drop_column('shipments', 'checkin_interval_minutes')
    op.drop_column('shipments', 'checkin_plan_mode')
    op.drop_column('shipments', 'delivered_at_utc')
    op.drop_column('shipments', 'estimated_duration_minutes')
    op.drop_column('shipments', 'timezone')
    op.drop_column('shipments', 'eta_at_utc')
    op.drop_column('shipments', 'departure_at_utc')
