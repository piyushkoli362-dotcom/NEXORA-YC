from alembic import context
from app.db import Base, engine


def include_object(obj, name, type_, reflected, compare_to):
    # PostgreSQL adds implicit casts when reflecting expression indexes. This named
    # index is managed explicitly in revision 0001; skip the false-positive diff.
    return not (type_ == "index" and name == "startups_public_search")


def run():
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=Base.metadata,
            compare_type=True,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()


run()
