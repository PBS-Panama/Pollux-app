# My Learning Record — Feature Strategy & Claude Code Prompt
**Prepared:** 2026-05-24  
**Route:** `#/myexams` → `IDM/src/routes/Addons/Addons.js`  
**Status:** Phase 1 — Static badge panel (no links, no persistence yet)

---

## Concept Overview

The **My Learning Record** is the right-side panel of the `#/myexams` view (alongside the existing STCW Exams list). It acts as a **knowledge achievement board** — a visual map of the maritime regulatory framework that the seafarer can progressively master through free learning videos (YouTube channel, in development) and self-study.

Each badge represents a discrete body of knowledge. Earning a badge signals that the seafarer understands that subject at a working level. The five categories reflect the real hierarchical structure of maritime law and industry practice:

```
Conventions  ←  the root legal instruments (IMO + ILO)
   └── Codes      ←  technical rules issued under conventions
       └── Regulations  ←  specific chapters/annexes (frequently updated)

Skills, Competences & Proficiencies  ←  parallel track — practical knowledge per rank
Industry Standards & Publications    ←  parallel track — OCIMF, ISGOTT, OPITO, etc.
```

### Why this order matters
- A seafarer cannot truly understand a **Convention** without first knowing the **Codes** issued under it.
- A seafarer cannot apply a **Regulation** without understanding the **Convention** it derives from.
- **Skills** are the practical application layer — STCW competency tables (Table A-II/1, etc.) mapped to each position.
- **Industry Standards** are not IMO instruments — they are publications by organizations like OCIMF, ICS, OPITO, and IAPH that govern day-to-day commercial and specialized operations (tankers, offshore, vetting).

This hierarchy will drive the badge unlock logic in a future phase. For now, all badges render as available (clickable style, no action).

### Vessel-type coverage note
All five categories now include vessel-type-specific badges for **merchant, fishing, yacht, and offshore** fleets. Badges are tagged in the tables below with 🐟 (fishing), ⚓ (offshore), ⛵ (yacht), and 🛢️ (tanker/specialist) for clarity.

---

## Badge Categories

### Color scheme
| Category | Color | Hex |
|---|---|---|
| Conventions | Magenta / Pink | `#e91e8c` |
| Codes | Green | `#00c853` |
| Regulations | Orange | `#ff6d00` |
| Skills, Competences & Proficiencies | Cyan | `#00bcd4` |
| Industry Standards & Publications | Violet | `#9c27b0` |

---

### Category 1 — Conventions
The top-level IMO and ILO legal instruments. Most dense and comprehensive — mastering a Convention badge requires knowledge of its Codes and key Regulations first (future unlock logic).

| id | Label | Fleet |
|---|---|---|
| `solas` | SOLAS | All |
| `marpol` | MARPOL | All |
| `stcw` | STCW | All |
| `mlc_2006` | MLC 2006 | All |
| `colregs` | COLREGS | All |
| `ll_1966` | LL 1966 | All |
| `sar_1979` | SAR 1979 | All |
| `tonnage` | TONNAGE | All |
| `sua` | SUA | All |
| `fal` | FAL | All |
| `stcw_f` | STCW-F 1995 | 🐟 Fishing |
| `ilo_188` | ILO C188 | 🐟 Fishing |
| `torremolinos` | Torremolinos | 🐟 Fishing |

---

### Category 2 — Codes
Technical codes issued under conventions. Each code is a prerequisite for the corresponding convention badge.

| id | Label | Parent Convention | Fleet |
|---|---|---|---|
| `ism_code` | ISM Code | SOLAS | All |
| `isps_code` | ISPS Code | SOLAS | All |
| `imdg_code` | IMDG Code | SOLAS | All |
| `imsbc_code` | IMSBC Code | SOLAS | All |
| `igf_code` | IGF Code | SOLAS | All |
| `igc_code` | IGC Code | SOLAS | 🛢️ Gas |
| `ibc_code` | IBC Code | SOLAS / MARPOL | 🛢️ Chemical |
| `polar_code` | Polar Code | SOLAS / MARPOL | All |
| `lsa_code` | LSA Code | SOLAS | All |
| `fss_code` | FSS Code | SOLAS | All |
| `css_code` | CSS Code | SOLAS | All |
| `nox_tec` | NOx TEC | MARPOL | All |
| `modu_code` | MODU Code | SOLAS | ⚓ Offshore |
| `osv_code` | OSV Guidelines | SOLAS | ⚓ Offshore |
| `ly3_code` | Large Yacht Code LY3 | Flag State (MCA) | ⛵ Yacht |
| `fishing_code` | FAO/ILO/IMO Fishing Code | STCW-F / ILO 188 | 🐟 Fishing |

---

### Category 3 — Regulations
Specific SOLAS chapters, MARPOL annexes, STCW regulation groups, and flag-state rules. Minor but operationally critical and frequently updated.

| id | Label | Fleet |
|---|---|---|
| `solas_ii1` | SOLAS Ch. II-1 | All |
| `solas_ii2` | SOLAS Ch. II-2 | All |
| `solas_iii` | SOLAS Ch. III | All |
| `solas_iv` | SOLAS Ch. IV | All |
| `solas_v` | SOLAS Ch. V | All |
| `solas_vi` | SOLAS Ch. VI | All |
| `marpol_i` | MARPOL Ann. I | All |
| `marpol_ii` | MARPOL Ann. II | 🛢️ Chemical |
| `marpol_v` | MARPOL Ann. V | All |
| `marpol_vi` | MARPOL Ann. VI | All |
| `stcw_reg_ii` | STCW Reg. II | All (Deck) |
| `stcw_reg_iii` | STCW Reg. III | All (Engine) |
| `stcw_reg_v` | STCW Reg. V | Specialist |
| `stcw_reg_v3` | STCW Reg. V/3 | 🐟 Fishing |
| `stcw_f_regs` | STCW-F Regs. | 🐟 Fishing |
| `panama_flag` | Panama Flag | All |
| `mlc_titles` | MLC Titles 1–5 | All |
| `mou_psc` | MOU / PSC | All |

---

### Category 4 — Skills, Competences & Proficiencies
Theoretical and practical knowledge mapped to the STCW Code competency tables (A-II/1, A-II/2, A-III/1, etc.). These are the building blocks for each rank's operational capability.

| id | Label | Fleet |
|---|---|---|
| `nav_terrestrial` | Terrestrial Nav. | All |
| `nav_electronic` | ECDIS & e-Nav | All |
| `radar_arpa` | Radar & ARPA | All |
| `meteorology` | Meteorology | All |
| `ship_stability` | Ship Stability | All |
| `cargo_handling` | Cargo Handling | All |
| `dangerous_goods` | Dangerous Goods | All |
| `fire_fighting` | Fire Fighting | All |
| `survival_sea` | Survival at Sea | All |
| `medical_aid` | Medical First Aid | All |
| `brm` | BRM | All |
| `erm` | ERM | All |
| `gmdss` | GMDSS | All |
| `leadership` | Leadership & Team | All |
| `environment` | Env. Stewardship | All |
| `security` | Security Awareness | All |
| `dp_operations` | DP Operations | ⚓ Offshore |
| `anchor_handling` | Anchor Handling | ⚓ Offshore |
| `huet_survival` | HUET / Heli Survival | ⚓ Offshore |
| `fishing_gear` | Fishing Gear Ops. | 🐟 Fishing |
| `catch_handling` | Catch Handling | 🐟 Fishing |
| `yacht_seamanship` | Yacht Seamanship | ⛵ Yacht |
| `passenger_safety` | Passenger Safety | ⛵ Yacht / Passenger |
| `tanker_ops` | Tanker Operations | 🛢️ Tanker |
| `gas_ops` | Gas Carrier Ops. | 🛢️ Gas |

---

### Category 5 — Industry Standards & Publications
Publications by industry bodies (OCIMF, ICS, OPITO, IAPH, Nautical Institute) that govern commercial and specialist operations. These are **not IMO conventions** — they are industry-driven standards widely enforced through vetting (SIRE, CDI, RightShip) and flag-state requirements. Essential knowledge for seafarers in tanker, offshore, and specialist trades.

| id | Label | Issuing Body | Fleet |
|---|---|---|---|
| `isgott` | ISGOTT | ICS / OCIMF / IAPH | 🛢️ Tanker |
| `ocimf_sire` | OCIMF SIRE 2.0 | OCIMF | 🛢️ Tanker |
| `ocimf_meg4` | OCIMF MEG4 | OCIMF | All (mooring) |
| `ocimf_osv` | OCIMF OSV Rec. | OCIMF | ⚓ Offshore |
| `tmsa` | OCIMF TMSA | OCIMF | 🛢️ Tanker |
| `cdi_scheme` | CDI Scheme | CDI | 🛢️ Chemical |
| `opito_bosiet` | OPITO BOSIET | OPITO | ⚓ Offshore |
| `opito_huet` | OPITO HUET | OPITO | ⚓ Offshore |
| `dp_ni` | DP Operator (NI) | Nautical Institute | ⚓ Offshore |
| `ics_bridge` | ICS Bridge Guide | ICS | All |
| `ics_tanker` | ICS Tanker Guide | ICS | 🛢️ Tanker |
| `rightship` | RightShip GHG | RightShip | Bulk / Container |
| `imca_dp` | IMCA DP Standards | IMCA | ⚓ Offshore |
| `ocimf_ovid` | OCIMF OVID | OCIMF | ⚓ Offshore |

> **Design note for Phase 4 unlock logic:** Category 5 badges unlock independently of the Conventions→Codes→Regulations chain. They are enabled once the relevant vessel type is selected in the seafarer's profile (`vesselTypes[]` array from MyProfile). For example, a seafarer with `oil_tanker_crude` in their vessel types automatically sees ISGOTT, SIRE, TMSA, and ICS Tanker Guide as available; a seafarer with `modu_jackup` sees OPITO BOSIET/HUET, DP (NI), IMCA DP, and OCIMF OVID.

---

## Badge States (for future phases)

| State | Visual |
|---|---|
| `available` | Full color, white text — can start |
| `in_progress` | Full color + subtle pulse ring |
| `completed` | Full color + `✓` overlay |
| `locked` | Gray `#3a4050`, `opacity: 0.4`, `cursor: not-allowed` |

**Phase 1 (current):** All badges render as `available`. No state persistence yet.

---

## Content Management — How it Works

**Rick manages all content manually from the Admin Panel CMS (Module 4).** The developer never needs to touch the frontend to add or update course content. The workflow is:

```
Rick (Admin Panel) → creates Series / Seasons / Episodes
                   → uploads images, pastes YouTube links
                   → publishes
                            ↓
                   FastAPI /api/learning/series/:id
                            ↓
                   MetaDetails fetches & renders
                            ↓
                   Seafarer watches in clean Stremio-style layout
```

### What Rick inputs per content level

**Series** (= one badge's full course):
- Title & description/synopsis
- `badge_id` (links to the Learning Record badge that opens this series)
- Category (conventions / codes / regulations / skills / industry)
- **Background image** — large hero/banner shown behind the title in MetaDetails header
- **Card thumbnail** — smaller poster image shown on the badge panel and any preview cards
- Intro/trailer YouTube link (optional — plays before the first season)
- `is_published` toggle (unpublished = visible only in admin, not to users)
- Tags (e.g., `tanker`, `offshore`, `deck`, `engine`)

**Season** (= one module within the course):
- Title (e.g., "Chapter II-2 — Fire Protection Systems")
- Description (what this module covers)
- Order number (controls display sequence)
- Season thumbnail (optional — overrides series card for this module)
- `is_published` toggle

**Episode** (= one video lesson):
- Title
- YouTube link or YouTube video ID
- Description / lesson notes
- Duration (manual input or auto-fetched from YouTube oEmbed API)
- Episode thumbnail (auto-pulled from YouTube or custom upload)
- Order number within the season
- `is_published` toggle

---

## Future Phases

**Phase 2 — Backend + MetaDetails wired up:**
Badge click navigates to `#/metadetails/learning/:badgeId`. MetaDetails detects `type = "learning"` and fetches from `GET /api/learning/series/:badgeId`. If backend has no content yet for that badge, shows a clean "Content coming soon" placeholder — no broken screens. Content is managed entirely by Rick via the Admin Panel CMS.

**Phase 3 — Progress tracking:**  
`localStorage` key `leto-learning-record` stores completed episode IDs and badge states. Badges transition through `available → in_progress → completed`. Completed badges show ✓ and contribute to a progress bar per category.

**Phase 4 — Unlock logic:**  
Convention badges lock until all their Code prerequisites are completed. The hierarchy drives the unlock chain: Skills → Regulations → Codes → Conventions.

**Phase 5 — Company visibility:**  
Completed Learning Record badges are visible to Company users on the seafarer's profile card (opt-in), alongside certified documents.

---

## Claude Code Prompt

```
Modifica `IDM/src/routes/Addons/Addons.js` y `IDM/src/routes/Addons/styles.less` para agregar el panel derecho "My Learning Record" dentro del div `.exams-body`, al lado del `exam-list-wrapper` existente.

### Objetivo
Agregar un panel scrollable fijo a la derecha con el título "My Learning Record" y 4 secciones de badges de conocimiento. Por ahora todos los badges son estáticos (sin links, sin persistencia). Son botones con estilo pero sin onClick funcional — onClick puede ser noop: `() => {}`.

---

### Datos del panel — definir como constante inline en Addons.js (NO en archivo separado)

Agregar esta constante ANTES del componente principal:

```js
const LEARNING_RECORD = [
  {
    id: 'conventions',
    label: 'Conventions',
    color: '#e91e8c',
    badges: [
      { id: 'solas',    label: 'SOLAS'    },
      { id: 'marpol',   label: 'MARPOL'   },
      { id: 'stcw',     label: 'STCW'     },
      { id: 'mlc_2006', label: 'MLC 2006' },
      { id: 'colregs',  label: 'COLREGS'  },
      { id: 'll_1966',  label: 'LL 1966'  },
      { id: 'sar_1979', label: 'SAR 1979' },
      { id: 'tonnage',  label: 'TONNAGE'  },
      { id: 'sua',          label: 'SUA'          },
      { id: 'fal',          label: 'FAL'          },
      { id: 'stcw_f',       label: 'STCW-F 1995'  },
      { id: 'ilo_188',      label: 'ILO C188'     },
      { id: 'torremolinos', label: 'Torremolinos' },
    ],
  },
  {
    id: 'codes',
    label: 'Codes',
    color: '#00c853',
    badges: [
      { id: 'ism_code',   label: 'ISM Code'   },
      { id: 'isps_code',  label: 'ISPS Code'  },
      { id: 'imdg_code',  label: 'IMDG Code'  },
      { id: 'imsbc_code', label: 'IMSBC Code' },
      { id: 'igf_code',   label: 'IGF Code'   },
      { id: 'igc_code',   label: 'IGC Code'   },
      { id: 'ibc_code',   label: 'IBC Code'   },
      { id: 'polar_code', label: 'Polar Code' },
      { id: 'lsa_code',   label: 'LSA Code'   },
      { id: 'fss_code',   label: 'FSS Code'   },
      { id: 'css_code',   label: 'CSS Code'   },
      { id: 'nox_tec',      label: 'NOx TEC'           },
      { id: 'modu_code',    label: 'MODU Code'         },
      { id: 'osv_code',     label: 'OSV Guidelines'    },
      { id: 'ly3_code',     label: 'Large Yacht LY3'   },
      { id: 'fishing_code', label: 'FAO/ILO/IMO Fish.' },
    ],
  },
  {
    id: 'regulations',
    label: 'Regulations',
    color: '#ff6d00',
    badges: [
      { id: 'solas_ii1',   label: 'SOLAS Ch. II-1'  },
      { id: 'solas_ii2',   label: 'SOLAS Ch. II-2'  },
      { id: 'solas_iii',   label: 'SOLAS Ch. III'   },
      { id: 'solas_iv',    label: 'SOLAS Ch. IV'    },
      { id: 'solas_v',     label: 'SOLAS Ch. V'     },
      { id: 'solas_vi',    label: 'SOLAS Ch. VI'    },
      { id: 'marpol_i',    label: 'MARPOL Ann. I'   },
      { id: 'marpol_ii',   label: 'MARPOL Ann. II'  },
      { id: 'marpol_v',    label: 'MARPOL Ann. V'   },
      { id: 'marpol_vi',   label: 'MARPOL Ann. VI'  },
      { id: 'stcw_reg_ii', label: 'STCW Reg. II'   },
      { id: 'stcw_reg_iii',label: 'STCW Reg. III'  },
      { id: 'stcw_reg_v',  label: 'STCW Reg. V'    },
      { id: 'panama_flag', label: 'Panama Flag'     },
      { id: 'mlc_titles',   label: 'MLC Titles 1–5'  },
      { id: 'stcw_reg_v3',  label: 'STCW Reg. V/3'   },
      { id: 'stcw_f_regs',  label: 'STCW-F Regs.'    },
      { id: 'mou_psc',      label: 'MOU / PSC'        },
    ],
  },
  {
    id: 'skills',
    label: 'Skills, Competences & Proficiencies',
    color: '#00bcd4',
    badges: [
      { id: 'nav_terrestrial', label: 'Terrestrial Nav.'  },
      { id: 'nav_electronic',  label: 'ECDIS & e-Nav'     },
      { id: 'radar_arpa',      label: 'Radar & ARPA'      },
      { id: 'meteorology',     label: 'Meteorology'       },
      { id: 'ship_stability',  label: 'Ship Stability'    },
      { id: 'cargo_handling',  label: 'Cargo Handling'    },
      { id: 'dangerous_goods', label: 'Dangerous Goods'   },
      { id: 'fire_fighting',   label: 'Fire Fighting'     },
      { id: 'survival_sea',    label: 'Survival at Sea'   },
      { id: 'medical_aid',     label: 'Medical First Aid' },
      { id: 'brm',             label: 'BRM'               },
      { id: 'erm',             label: 'ERM'               },
      { id: 'gmdss',           label: 'GMDSS'             },
      { id: 'leadership',      label: 'Leadership & Team' },
      { id: 'environment',     label: 'Env. Stewardship'  },
      { id: 'security',        label: 'Security Awareness'},
      { id: 'dp_operations',   label: 'DP Operations'     },
      { id: 'anchor_handling', label: 'Anchor Handling'   },
      { id: 'huet_survival',   label: 'HUET / Heli Surv.' },
      { id: 'fishing_gear',    label: 'Fishing Gear Ops.' },
      { id: 'catch_handling',  label: 'Catch Handling'    },
      { id: 'yacht_seamanship',label: 'Yacht Seamanship'  },
      { id: 'passenger_safety',label: 'Passenger Safety'  },
      { id: 'tanker_ops',      label: 'Tanker Operations' },
      { id: 'gas_ops',         label: 'Gas Carrier Ops.'  },
    ],
  },
  {
    id: 'industry',
    label: 'Industry Standards & Publications',
    color: '#9c27b0',
    badges: [
      { id: 'isgott',       label: 'ISGOTT'          },
      { id: 'ocimf_sire',   label: 'OCIMF SIRE 2.0'  },
      { id: 'ocimf_meg4',   label: 'OCIMF MEG4'      },
      { id: 'ocimf_osv',    label: 'OCIMF OSV Rec.'  },
      { id: 'tmsa',         label: 'OCIMF TMSA'      },
      { id: 'cdi_scheme',   label: 'CDI Scheme'      },
      { id: 'opito_bosiet', label: 'OPITO BOSIET'    },
      { id: 'opito_huet',   label: 'OPITO HUET'      },
      { id: 'dp_ni',        label: 'DP Operator (NI)'},
      { id: 'ics_bridge',   label: 'ICS Bridge Guide'},
      { id: 'ics_tanker',   label: 'ICS Tanker Guide'},
      { id: 'rightship',    label: 'RightShip GHG'   },
      { id: 'imca_dp',      label: 'IMCA DP'         },
      { id: 'ocimf_ovid',   label: 'OCIMF OVID'      },
    ],
  },
];
```

---

### JSX a agregar

Dentro de `<div className={styles['exams-body']}>`, DESPUÉS del `exam-list-wrapper` existente, agregar:

```jsx
{/* ── My Learning Record panel ── */}
<div className={styles['learning-record-panel']}>
  <h2 className={styles['lr-title']}>My Learning Record</h2>
  {LEARNING_RECORD.map(function(cat) {
    return (
      <div key={cat.id} className={styles['lr-category']}>
        <h3 className={styles['lr-cat-title']}>{cat.label}</h3>
        <div className={styles['lr-badges']}>
          {cat.badges.map(function(badge) {
            return (
              <button
                key={badge.id}
                className={styles['lr-badge']}
                style={{ backgroundColor: cat.color }}
                onClick={function() {}}
                title={badge.label}
              >
                {badge.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  })}
</div>
```

---

### CSS a agregar en styles.less

Agregar al final del archivo (antes de cualquier media query de cierre):

```less
// ─── My Learning Record Panel ───────────────────────────────────────
.learning-record-panel {
    width: 38%;
    min-width: 300px;
    max-width: 480px;
    flex: none;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 1rem 1.5rem 1.5rem;
    margin-left: 1.5rem;
    background: rgba(0, 180, 200, 0.10);
    border-radius: 12px;
    border: 1px solid rgba(0, 210, 211, 0.18);
}

.lr-title {
    font-size: 1.4rem;
    font-weight: 700;
    color: #ffffff;
    text-align: center;
    margin: 0 0 1.25rem;
    letter-spacing: 0.02em;
}

.lr-category {
    margin-bottom: 1.25rem;

    &:last-child {
        margin-bottom: 0;
    }
}

.lr-cat-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #d0dde8;
    margin: 0 0 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.lr-badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.lr-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px 10px;
    border-radius: 6px;
    border: none;
    font-size: 0.72rem;
    font-weight: 600;
    color: #ffffff;
    cursor: pointer;
    white-space: nowrap;
    letter-spacing: 0.03em;
    opacity: 0.92;
    transition: opacity 0.15s, transform 0.1s;

    &:hover {
        opacity: 1;
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
        opacity: 0.85;
    }
}
```

---

### Responsive — dentro del bloque @media existente (pantallas pequeñas)

En el bloque `@media` donde ya hay reglas para `.exams-body`, agregar:

```less
.learning-record-panel {
    display: none;
}
```

---

### NO tocar
- El `exam-list-wrapper` existente y toda su lógica
- Los filtros, el modal de Book Course, los ActionButtons
- Cualquier lógica de estado existente
- El bloque AMP Panamá si existe
```
