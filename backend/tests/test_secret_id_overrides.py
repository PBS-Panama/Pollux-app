import re
from pathlib import Path

import pytest

from app.services.secret_loader import SECRET_ID_OVERRIDES, GcpSecretManagerStore

CASTOR_LOADER = Path(__file__).resolve().parents[3] / "Castor-app/backend/app/services/secret_loader.py"


def test_shared_secret_uses_leto_alias_and_state_stays_literal():
    store = GcpSecretManagerStore("p")
    assert store._secret_path("DRIVE_TOKEN_SECRET") == "projects/p/secrets/leto-drive-token-secret"
    assert store._secret_path("DRIVE_STATE_SECRET").endswith("/secrets/DRIVE_STATE_SECRET")


def test_overrides_match_castor():
    if not CASTOR_LOADER.exists():
        pytest.skip("Castor-app no esta al lado")
    block = re.search(r"SECRET_ID_OVERRIDES[^=]*=\s*\{(.*?)\}", CASTOR_LOADER.read_text(), re.S).group(1)
    assert dict(re.findall(r'"(\w+)":\s*"([\w-]+)"', block)) == SECRET_ID_OVERRIDES
