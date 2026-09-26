"""Phase 1 foundation.

Revision ID: 0001
"""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Frozen metadata snapshot lives alongside this revision, independent of runtime models.
    from importlib.util import spec_from_file_location, module_from_spec
    from pathlib import Path

    spec = spec_from_file_location(
        "migration_schema", Path(__file__).parent.parent / "schema_0001.py"
    )
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    module.metadata.create_all(bind=op.get_bind())
    if op.get_bind().dialect.name == "postgresql":
        op.execute(
            "CREATE INDEX startups_public_search ON startups USING GIN(to_tsvector('english', name || ' ' || industry || ' ' || description)) WHERE public = true AND deleted_at IS NULL"
        )


def downgrade():
    raise RuntimeError(
        "Destructive downgrade disabled. Restore a tested backup instead."
    )
