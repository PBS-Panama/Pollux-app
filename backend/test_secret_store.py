#!/usr/bin/env python
# ─────────────────────────────────────────────────────────────────────────────
# Secret store (get_secret, DB-primero/env-fallback) y el endpoint de prueba
# de claves — regresión standalone para T13 (mismo contrato que Castor,
# Handover.md nota 136 de ese repo). No necesita Postgres real (el "db" es un
# objeto falso con un .execute() que devuelve lo que cada caso necesita) ni
# la app de FastAPI levantada. token_crypto.py sí se ejecuta de verdad
# (cifra/descifra con el DRIVE_TOKEN_SECRET real del entorno) para probar el
# camino completo, no una versión mockeada de eso.
#
#   cd backend
#   python test_secret_store.py
#
# Sale con código 1 si algo falla. Mismo patrón que test_ocr_mock_guard.py.
# ─────────────────────────────────────────────────────────────────────────────
import os
import sys
from types import SimpleNamespace

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.services.token_crypto import encrypt_token
from app.services.secret_store import get_secret, invalidate, SECRET_NAMES
from app.routers.admin import _run_key_test

fail = 0


def check(label, cond):
    global fail
    ok = bool(cond)
    if not ok:
        fail += 1
    print(f"  {'✓' if ok else '✗'} {label}")


print("\n  Secret store — get_secret() y endpoint de prueba\n")


# ─── Fakes mínimos de la sesión de SQLAlchemy ────────────────────────────────

class _FakeResult:
    def __init__(self, row):
        self._row = row

    def fetchone(self):
        return self._row


class _FakeDB:
    """db.execute(text(...), {...}).fetchone() -> fila con encrypted_value, o
    None si no hay nada guardado para esa clave — igual que una consulta real
    a api_key_config sin resultados."""

    def __init__(self, encrypted_value=None):
        self._encrypted_value = encrypted_value

    def execute(self, _stmt, _params=None):
        if self._encrypted_value is None:
            return _FakeResult(None)
        return _FakeResult(SimpleNamespace(encrypted_value=self._encrypted_value))


# Una clave de entorno distinta por caso — evita que la caché de 60s de un
# caso contamine la lectura del siguiente.
_K_DB_WINS = "_TEST_SECRET_DB_WINS_T13"
_K_ENV_DB_EMPTY = "_TEST_SECRET_ENV_DB_EMPTY_T13"
_K_ENV_NO_DB = "_TEST_SECRET_ENV_NO_DB_T13"
_K_NONE_WITH_DB = "_TEST_SECRET_NONE_WITH_DB_T13"
_K_NONE_NO_DB = "_TEST_SECRET_NONE_NO_DB_T13"
_K_INVALIDATE = "_TEST_SECRET_INVALIDATE_T13"
_ALL_TEST_KEYS = (_K_DB_WINS, _K_ENV_DB_EMPTY, _K_ENV_NO_DB, _K_NONE_WITH_DB, _K_NONE_NO_DB, _K_INVALIDATE)

_saved_env = {k: os.environ.get(k) for k in _ALL_TEST_KEYS}

try:
    # ── DB gana a env ────────────────────────────────────────────────────────
    os.environ[_K_DB_WINS] = "valor_de_env"
    db_con_valor = _FakeDB(encrypted_value=encrypt_token("valor_de_db"))
    check(
        "get_secret(): con valor en DB y en env, gana la DB",
        get_secret(_K_DB_WINS, db_con_valor) == "valor_de_db",
    )

    # ── DB sin fila, con env -> usa env ──────────────────────────────────────
    os.environ[_K_ENV_DB_EMPTY] = "valor_de_env_2"
    check(
        "get_secret(): DB sin fila, con env -> usa env",
        get_secret(_K_ENV_DB_EMPTY, _FakeDB(encrypted_value=None)) == "valor_de_env_2",
    )

    # ── db=None (sin sesión), con env -> usa env igual ──────────────────────
    os.environ[_K_ENV_NO_DB] = "valor_de_env_3"
    check(
        "get_secret(): db=None, con env -> usa env",
        get_secret(_K_ENV_NO_DB, None) == "valor_de_env_3",
    )

    # ── Sin valor en ningún lado -> None (no "") ────────────────────────────
    os.environ.pop(_K_NONE_WITH_DB, None)
    check(
        "get_secret(): sin DB y sin env -> None",
        get_secret(_K_NONE_WITH_DB, _FakeDB(encrypted_value=None)) is None,
    )
    os.environ.pop(_K_NONE_NO_DB, None)
    check(
        "get_secret(): db=None y sin env -> None",
        get_secret(_K_NONE_NO_DB, None) is None,
    )

    # ── invalidate() hace que el siguiente get_secret() vea el valor nuevo,
    #    sin esperar el TTL de la caché ──────────────────────────────────────
    db_v1 = _FakeDB(encrypted_value=encrypt_token("version_1"))
    primera_lectura = get_secret(_K_INVALIDATE, db_v1)
    check("invalidate(): primera lectura trae version_1", primera_lectura == "version_1")

    db_v2 = _FakeDB(encrypted_value=encrypt_token("version_2"))
    segunda_lectura_sin_invalidar = get_secret(_K_INVALIDATE, db_v2)
    check(
        "invalidate(): sin invalidar, la caché sigue sirviendo version_1 (no pegó a la DB de nuevo)",
        segunda_lectura_sin_invalidar == "version_1",
    )

    invalidate(_K_INVALIDATE)
    tercera_lectura = get_secret(_K_INVALIDATE, db_v2)
    check(
        "invalidate(): después de invalidar, la siguiente lectura trae version_2",
        tercera_lectura == "version_2",
    )

    # ── Whitelist — T13 ──────────────────────────────────────────────────────
    check(
        "SECRET_NAMES tiene exactamente ANTHROPIC_API_KEY, GOOGLE_VISION_API_KEY, GOOGLE_DRIVE_CLIENT_SECRET",
        set(SECRET_NAMES) == {"ANTHROPIC_API_KEY", "GOOGLE_VISION_API_KEY", "GOOGLE_DRIVE_CLIENT_SECRET"},
    )
    for excluded in ("DATABASE_URL", "SECRET_KEY", "DRIVE_TOKEN_SECRET", "DRIVE_STATE_SECRET", "GOOGLE_OAUTH_CLIENT_ID"):
        check(f"SECRET_NAMES NO incluye {excluded}", excluded not in SECRET_NAMES)

finally:
    for k in _ALL_TEST_KEYS:
        invalidate(k)  # no contaminar otros procesos/corridas con la caché de prueba
    for k, v in _saved_env.items():
        if v is None:
            os.environ.pop(k, None)
        else:
            os.environ[k] = v


# ─── _run_key_test() con proveedor mockeado — sin red real, sin claves reales ─
# No se construye una anthropic.AuthenticationError real (su __init__ espera
# un objeto de respuesta httpx — reconstruirlo a mano es frágil y no es lo que
# se está probando); una Exception genérica alcanza para probar que CUALQUIER
# fallo del proveedor cae en ok=False con un detail legible, sin reventar.

class _FakeModels:
    def __init__(self, raise_exc=None):
        self._raise_exc = raise_exc

    def list(self, limit=1):
        if self._raise_exc:
            raise self._raise_exc
        return SimpleNamespace(data=[])


class _FakeAnthropicClient:
    def __init__(self, api_key, raise_exc=None):
        self.models = _FakeModels(raise_exc)


def _patch_anthropic(raise_exc=None):
    import anthropic
    original = anthropic.Anthropic
    anthropic.Anthropic = lambda api_key: _FakeAnthropicClient(api_key, raise_exc)
    return original


def _unpatch_anthropic(original):
    import anthropic
    anthropic.Anthropic = original


_orig = _patch_anthropic(raise_exc=None)
try:
    result = _run_key_test("ANTHROPIC_API_KEY", "fake-key-nunca-llega-a-la-red")
    check("_run_key_test(ANTHROPIC_API_KEY): proveedor OK -> ok=True", result.get("ok") is True)
    check("_run_key_test(ANTHROPIC_API_KEY): nunca expone el valor en el detail",
          "fake-key-nunca-llega-a-la-red" not in str(result.get("detail", "")))
finally:
    _unpatch_anthropic(_orig)

_orig = _patch_anthropic(raise_exc=Exception("simulated provider failure"))
try:
    result = _run_key_test("ANTHROPIC_API_KEY", "fake-key-invalida")
    check("_run_key_test(ANTHROPIC_API_KEY): el proveedor falla -> ok=False", result.get("ok") is False)
finally:
    _unpatch_anthropic(_orig)


class _FakeHttpResponse:
    def __init__(self, payload: bytes):
        self._payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def read(self):
        return self._payload


def _patch_urlopen(fn):
    import urllib.request
    original = urllib.request.urlopen
    urllib.request.urlopen = fn
    return original


def _unpatch_urlopen(original):
    import urllib.request
    urllib.request.urlopen = original


import json as _json

_orig = _patch_urlopen(lambda req, timeout=15: _FakeHttpResponse(
    _json.dumps({"responses": [{"fullTextAnnotation": {"text": "ok"}}]}).encode("utf-8")
))
try:
    result = _run_key_test("GOOGLE_VISION_API_KEY", "fake-vision-key")
    check("_run_key_test(GOOGLE_VISION_API_KEY): proveedor OK -> ok=True", result.get("ok") is True)
finally:
    _unpatch_urlopen(_orig)


def _raise_http_error(req, timeout=15):
    import urllib.error
    raise urllib.error.HTTPError(req.full_url, 400, "Bad Request", {}, None)


_orig = _patch_urlopen(_raise_http_error)
try:
    result = _run_key_test("GOOGLE_VISION_API_KEY", "fake-vision-key-invalida")
    check("_run_key_test(GOOGLE_VISION_API_KEY): HTTPError -> ok=False", result.get("ok") is False)
finally:
    _unpatch_urlopen(_orig)

result = _run_key_test("GOOGLE_DRIVE_CLIENT_SECRET", "cualquier-valor")
check("_run_key_test(GOOGLE_DRIVE_CLIENT_SECRET): ok=None (no verificable sin consentimiento)",
      result.get("ok") is None)
check("_run_key_test(GOOGLE_DRIVE_CLIENT_SECRET): nunca expone el valor en el detail",
      "cualquier-valor" not in str(result.get("detail", "")))


print(f"\n  {'✅ Todo en verde.' if fail == 0 else f'❌ {fail} caso(s) fallando.'} Pegá esta salida en el Handover.\n")
sys.exit(1 if fail else 0)
