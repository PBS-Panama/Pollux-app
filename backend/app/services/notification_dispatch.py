"""Per-audience notification text (docs/specs/EMBARQUES_MODELO_VERIFICACION.md
§5) — "el mismo evento produce textos distintos según la audiencia" is the
trap of this hito. A single title/body per event, replicated to every
recipient, leaks the naviera's "en revisión" into "se encontró X falso" —
a decision Rick made explicitly (§2, §4: the company sees only the badge,
never the finding). Text is rendered per (kind, recipient_scope), never once
per event and copied.

embarkation_service.py calls dispatch_embarkation_event() at the same points
where it writes an EmbarkationVerificationEvent / EmbarkationRemark row —
never a "fire and forget" notify from the router. Each dispatch call builds
the recipient list itself: seafarer (always), admin (always, every admin
user), company (only a company with an active relationship to this
seafarer, and only for the events the §5 matrix marks for it).
"""
from __future__ import annotations

from typing import Callable, Optional

Renderer = Callable[[dict], tuple[str, str]]

_TEMPLATES: dict[tuple[str, str], Renderer] = {}

# (kind, scope) pairs that require acknowledgement (§5 matrix — only the
# reversal of a verified embarkation is marked "acuse obligatorio", and only
# for the naviera: Rick's own wording was "a la naviera Pollux le debe
# informar... para que ese anuente del cambio" — one audience, not three.
# 2026-09-16 (Rick nota 75): was keyed by kind alone, which meant the
# marino and the admin also got requires_ack=True on this event — a
# notification neither of them has any acuse UI for, since it was never
# theirs to acknowledge. Keying by scope too is what this file's own
# docstring already promised for render()/known_scopes(); this was the one
# place that didn't follow it.
ACK_REQUIRED = {("embarkation_verified_reverted", "company")}


def _register(kind: str, scope: str):
    def _decorator(fn: Renderer) -> Renderer:
        _TEMPLATES[(kind, scope)] = fn
        return fn
    return _decorator


def render(kind: str, scope: str, context: dict) -> tuple[str, str]:
    """Returns (title, body) for this (kind, scope) pair. Raises KeyError if
    no template exists for that combination — a missing template must be
    loud, never a blank notification or a silent fallback to another scope's
    text (that fallback is exactly the bug this module exists to prevent)."""
    renderer = _TEMPLATES.get((kind, scope))
    if renderer is None:
        raise KeyError(f"no notification template for kind={kind!r} scope={scope!r}")
    return renderer(context)


def requires_ack(kind: str, scope: str) -> bool:
    return (kind, scope) in ACK_REQUIRED


def known_scopes(kind: str) -> set[str]:
    """Which recipient_scope values have a template for this kind — used by
    the caller to decide who to notify without hardcoding the list twice."""
    return {scope for (k, scope) in _TEMPLATES if k == kind}


# ─── embarkation_verification_opened ─────────────────────────────────────────
# Admin opens the case (declarado -> en_verificacion).

@_register("embarkation_verification_opened", "seafarer")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Se abrió la verificación de tu embarque",
        f"Un administrador de Castor empezó a verificar tu embarque en "
        f"{ctx['vessel_name']} con {ctx['company_name']}.",
    )


@_register("embarkation_verification_opened", "admin")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Verificación de embarque abierta",
        f"Se abrió la verificación del embarque de {ctx['seafarer_name']} en "
        f"{ctx['vessel_name']} ({ctx['company_name']}).",
    )


@_register("embarkation_verification_opened", "company")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Verificación en curso",
        f"Hay una verificación en curso para el embarque de {ctx['seafarer_name']} "
        f"que consultaste.",
    )


# ─── embarkation_verified ─────────────────────────────────────────────────────

@_register("embarkation_verified", "seafarer")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Tu embarque quedó verificado",
        f"Castor verificó tu embarque en {ctx['vessel_name']} con "
        f"{ctx['company_name']}.",
    )


@_register("embarkation_verified", "admin")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Embarque verificado",
        f"El embarque de {ctx['seafarer_name']} en {ctx['vessel_name']} quedó "
        f"verificado.",
    )


@_register("embarkation_verified", "company")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Embarque verificado",
        f"Castor verificó el embarque de {ctx['seafarer_name']} en "
        f"{ctx['vessel_name']}.",
    )


# ─── embarkation_no_verificable ───────────────────────────────────────────────

@_register("embarkation_no_verificable", "seafarer")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "No pudimos verificar tu embarque",
        f"Tu embarque en {ctx['vessel_name']} quedó como no verificable: "
        f"{ctx['reason']}",
    )


@_register("embarkation_no_verificable", "admin")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Embarque marcado no verificable",
        f"El embarque de {ctx['seafarer_name']} en {ctx['vessel_name']} quedó "
        f"no verificable: {ctx['reason']}",
    )


@_register("embarkation_no_verificable", "company")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "No se pudo verificar",
        f"El embarque de {ctx['seafarer_name']} en {ctx['vessel_name']} no pudo "
        f"verificarse: {ctx['reason']}",
    )


# ─── embarkation_observado ─────────────────────────────────────────────────────
# The audience trap: seafarer/admin get the finding, company gets ONLY the
# badge text — never ctx['field']/ctx['finding'].

@_register("embarkation_observado", "seafarer")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Encontramos una diferencia en tu embarque",
        f"Al verificar tu embarque en {ctx['vessel_name']}, la naviera indicó "
        f"que {ctx['field']} no coincide: {ctx['finding']}. Podés apelarlo desde "
        f"tu perfil.",
    )


@_register("embarkation_observado", "admin")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Embarque en revisión — información no coincide",
        f"El embarque de {ctx['seafarer_name']} en {ctx['vessel_name']} quedó en "
        f"revisión. Campo: {ctx['field']}. Lo que dijo la naviera: {ctx['finding']}.",
    )


@_register("embarkation_observado", "company")
def _(ctx: dict) -> tuple[str, str]:
    # Deliberately no ctx['field']/ctx['finding'] here — §2/§4 of the spec.
    return (
        "En revisión",
        f"El embarque de {ctx['seafarer_name']} en {ctx['vessel_name']} está en "
        f"revisión.",
    )


# ─── embarkation_remark_appealed ───────────────────────────────────────────────
# Admin-only per the §5 matrix.

@_register("embarkation_remark_appealed", "admin")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "El marino apeló una remarca",
        f"{ctx['seafarer_name']} apeló la remarca sobre {ctx['field']} en su "
        f"embarque en {ctx['vessel_name']}: {ctx['appeal_text']}",
    )


# ─── embarkation_remark_resolved ───────────────────────────────────────────────

@_register("embarkation_remark_resolved", "seafarer")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Se resolvió tu apelación",
        f"Tu apelación sobre {ctx['field']} en el embarque en {ctx['vessel_name']} "
        f"se resolvió: {ctx['resolution']}.",
    )


@_register("embarkation_remark_resolved", "admin")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Apelación resuelta",
        f"La apelación de {ctx['seafarer_name']} sobre {ctx['field']} se resolvió "
        f"como {ctx['resolution']}.",
    )


@_register("embarkation_remark_resolved", "company")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Revisión actualizada",
        f"La revisión del embarque de {ctx['seafarer_name']} en "
        f"{ctx['vessel_name']} se actualizó.",
    )


# ─── embarkation_remark_firm ────────────────────────────────────────────────────
# The remark stands because the seafarer never appealed it.

@_register("embarkation_remark_firm", "seafarer")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Una remarca quedó firme",
        f"No apelaste la remarca sobre {ctx['field']} en tu embarque en "
        f"{ctx['vessel_name']}, así que quedó firme.",
    )


@_register("embarkation_remark_firm", "admin")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Remarca firme sin apelación",
        f"La remarca sobre {ctx['field']} de {ctx['seafarer_name']} quedó firme "
        f"— no hubo apelación.",
    )


@_register("embarkation_remark_firm", "company")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Revisión actualizada",
        f"La revisión del embarque de {ctx['seafarer_name']} en "
        f"{ctx['vessel_name']} se actualizó.",
    )


# ─── embarkation_verified_reverted ─────────────────────────────────────────────
# The only kind with requires_ack=True — a naviera relied on this "verificado".

@_register("embarkation_verified_reverted", "seafarer")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Se revirtió la verificación de tu embarque",
        f"La verificación de tu embarque en {ctx['vessel_name']} se revirtió: "
        f"{ctx['reason']}",
    )


@_register("embarkation_verified_reverted", "admin")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Verificación revertida",
        f"Se revirtió la verificación del embarque de {ctx['seafarer_name']} en "
        f"{ctx['vessel_name']}: {ctx['reason']}",
    )


@_register("embarkation_verified_reverted", "company")
def _(ctx: dict) -> tuple[str, str]:
    return (
        "Se revirtió una verificación",
        f"Castor revirtió la verificación del embarque de {ctx['seafarer_name']} "
        f"en {ctx['vessel_name']} que habías consultado. Requiere tu acuse.",
    )
