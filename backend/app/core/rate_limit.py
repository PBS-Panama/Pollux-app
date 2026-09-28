"""
Rate limiting (Rick/PM, 2026-09-14) — brute-force protection on /auth/*.
Uses slowapi (in-memory, per-process — fine for a single Cloud Run instance
with min-instances=1; if this ever runs with >1 concurrent instance, the
limit becomes "N per instance" not "N total", which is still a real
improvement over nothing today but worth revisiting then).

The IP key — the one detail that actually matters in Cloud Run
--------------------------------------------------------------
Cloud Run terminates TLS at its own load balancer and forwards every request
to the container from that balancer's IP. `request.client.host` is always
the balancer, identical for every visitor — a limiter keyed on that treats
the whole internet as one caller: the FIRST five people to hit /auth/login
in a minute lock out everyone else, and it never protects anything because
an attacker is indistinguishable from a legitimate burst of traffic.

The real client IP arrives in `X-Forwarded-For` (set by the load balancer,
not the caller — Cloud Run's edge overwrites any client-supplied value, so
this header can't be spoofed from outside). It can list a chain of
"client, proxy1, proxy2"; the first entry is the original client.

Local dev (docker-compose) has no proxy in front, so `X-Forwarded-For` is
absent — fall back to `request.client.host` there, which is the only case
where it's actually correct to use it.
"""
from slowapi import Limiter
from starlette.requests import Request


def get_real_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_real_ip)
