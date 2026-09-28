"""Import every model so Base.metadata knows the full schema.

Needed by Alembic (alembic/env.py) and by the baseline migration; importing this
package is enough — you don't need to import each module by hand.
"""
from app.models import company, document, embarkation, notification, seafarer, user  # noqa: F401

__all__ = ["company", "document", "embarkation", "notification", "seafarer", "user"]
