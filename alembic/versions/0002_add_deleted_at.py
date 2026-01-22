"""Add deleted_at to shipments for soft delete

Revision ID: 0002
Revises: 0001_initial
Create Date: 2026-01-21

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0002'
down_revision = '0001_initial'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add deleted_at column to shipments table
    op.add_column(
        'shipments',
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True)
    )
    
    # Add index for efficient filtering of non-deleted records
    op.create_index(
        'ix_shipments_deleted_at',
        'shipments',
        ['deleted_at'],
        unique=False
    )
    
    # Add DELAYED status to enum (if not exists)
    # Note: PostgreSQL enum alteration is handled differently
    # This is a safe no-op if the value already exists
    try:
        op.execute("ALTER TYPE shipment_status ADD VALUE IF NOT EXISTS 'DELAYED'")
    except Exception:
        # SQLite doesn't support enum types
        pass


def downgrade() -> None:
    op.drop_index('ix_shipments_deleted_at', table_name='shipments')
    op.drop_column('shipments', 'deleted_at')
