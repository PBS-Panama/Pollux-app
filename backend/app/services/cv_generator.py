"""CV generation: admin-editable HTML template (cv_templates table) rendered
with a real seafarer's data, converted to PDF.

Flow: admin edits html_template/logo/accent_color via /admin/cv-template
(admin.py) -> company downloads a candidate's CV via
/company/seafarers/{id}/cv (company.py), which calls render_template() with
that seafarer's real data, then html_to_pdf().
"""
import html
import io
from datetime import date

DEFAULT_CV_TEMPLATE = """<html>
<head>
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; font-size: 11px; }
  .header table { width: 100%; }
  .header td { padding: 20px; }
  .logo-cell { width: 80px; }
  .name { font-size: 22px; font-weight: bold; color: #ffffff; }
  .rank { font-size: 13px; color: #ffffff; }
  .section-title { font-size: 12px; font-weight: bold; color: {{accent_color}}; border-bottom: 1px solid {{accent_color}}; padding-bottom: 3px; margin-top: 16px; margin-bottom: 8px; }
  .field-label { color: #666666; font-size: 9px; text-transform: uppercase; }
  .field-value { font-size: 11px; margin-bottom: 6px; }
  table.docs { width: 100%; border-collapse: collapse; }
  table.docs th { background-color: #f0f0f0; text-align: left; padding: 5px; font-size: 9px; text-transform: uppercase; color: #666666; }
  table.docs td { padding: 5px; border-bottom: 1px solid #e0e0e0; font-size: 10px; }
  .footer { margin-top: 20px; font-size: 8px; color: #999999; text-align: center; }
  .content { padding: 20px; }
</style>
</head>
<body>
  <div class="header">
    <table bgcolor="{{accent_color}}" style="background-color:{{accent_color}};">
      <tr>
        <td class="logo-cell">{{logo_html}}</td>
        <td>
          <div class="name">{{full_name}}</div>
          <div class="rank">{{rank}} &mdash; {{fleet_category_label}}</div>
        </td>
      </tr>
    </table>
  </div>
  <div class="content">
    <table style="width:100%;">
      <tr>
        <td style="width:50%;">
          <div class="field-label">Seafarer Code</div>
          <div class="field-value">{{seafarer_code}}</div>
        </td>
        <td style="width:50%;">
          <div class="field-label">Nationality</div>
          <div class="field-value">{{nationality}}</div>
        </td>
      </tr>
      <tr>
        <td>
          <div class="field-label">Years of Experience</div>
          <div class="field-value">{{years_experience}}</div>
        </td>
        <td>
          <div class="field-label">Availability</div>
          <div class="field-value">{{availability}}</div>
        </td>
      </tr>
    </table>

    <div class="section-title">About</div>
    <div class="field-value">{{bio}}</div>

    <div class="section-title">Certificates &amp; Documents</div>
    <table class="docs">
      <tr><th>Document</th><th>Cert. Code</th><th>Issued</th><th>Expires</th></tr>
      {{documents_rows}}
    </table>

    <div class="footer">Generated on {{generated_date}} &mdash; via Castor / Pollux Maritime Platform</div>
  </div>
</body>
</html>"""

SAMPLE_CONTEXT = {
    "full_name": "Carlos Mendoza (ejemplo)",
    "rank": "2nd Officer",
    "fleet_category_label": "Marina Mercante",
    "seafarer_code": "SF-00123",
    "nationality": "Panama",
    "years_experience": "8",
    "availability": "Available",
    "bio": "Oficial de guardia con 8 anos de experiencia en portacontenedores y buques ro-ro en rutas del Atlantico. Certificado por AMP Panama.",
    "documents_rows": (
        "<tr><td>Certificate of Competence (CoC) + Endorsement</td><td>STCW Reg. I/2, II/1</td>"
        "<td>2022-03-15</td><td>2027-03-15</td></tr>"
        "<tr><td>Basic Safety Training (BST)</td><td>STCW Reg. VI/1</td><td>2021-08-20</td><td>N/A</td></tr>"
    ),
    "generated_date": date.today().strftime("%d %b %Y"),
}


def _esc(value) -> str:
    if value is None:
        return ""
    return html.escape(str(value))


def build_context(seafarer, docs) -> dict:
    """Real substitution values for one seafarer — everything except
    logo_html/accent_color, which render_template() fills in from the
    admin's saved branding."""
    verified_docs = [d for d in docs if getattr(d, "verification_status", None) == "verified"]
    rows = []
    for d in verified_docs:
        rows.append(
            "<tr><td>{}</td><td>{}</td><td>{}</td><td>{}</td></tr>".format(
                _esc(d.name),
                _esc(d.cert_code),
                _esc(d.issued_date.isoformat() if d.issued_date else ""),
                _esc(d.expiry_date.isoformat() if d.expiry_date else "N/A"),
            )
        )
    documents_rows = "".join(rows) or (
        '<tr><td colspan="4" style="color:#999999;">No verified documents yet.</td></tr>'
    )

    return {
        "full_name": _esc(f"{seafarer.first_name or ''} {seafarer.last_name or ''}".strip()) or "—",
        "rank": _esc(seafarer.rank or "—"),
        "fleet_category_label": _esc(seafarer.fleet_category or "—"),
        "seafarer_code": _esc(getattr(seafarer, "seafarer_code", None) or "—"),
        "nationality": _esc(seafarer.nationality or "—"),
        "years_experience": _esc(seafarer.years_experience if seafarer.years_experience is not None else "—"),
        "availability": "Available" if seafarer.is_available else "Not available",
        "bio": _esc(seafarer.bio or "No bio provided."),
        "documents_rows": documents_rows,
        "generated_date": date.today().strftime("%d %b %Y"),
    }


def render_template(html_template: str, context: dict, logo_b64: str | None, accent_color: str) -> str:
    """Simple {{key}} substitution — context values are already HTML-escaped
    by build_context()/SAMPLE_CONTEXT, and html_template/logo_b64/accent_color
    are admin-authored, so plain str.replace is safe here (no user-facing
    template engine needed for a single flat placeholder set)."""
    ctx = dict(context)
    ctx["accent_color"] = accent_color or "#0ea5e9"
    ctx["logo_html"] = (
        f'<img src="{logo_b64}" style="max-width:70px;max-height:70px;" />' if logo_b64 else ""
    )
    rendered = html_template
    for key, value in ctx.items():
        rendered = rendered.replace("{{" + key + "}}", str(value))
    return rendered


def html_to_pdf(html_content: str) -> bytes:
    from xhtml2pdf import pisa
    buffer = io.BytesIO()
    pisa.CreatePDF(io.StringIO(html_content), dest=buffer)
    return buffer.getvalue()
