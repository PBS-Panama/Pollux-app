"""
Learning Record seed data — 77 series from learning_cms_badge_traceability.md.
No YouTube URLs — admin pastes them via /admin/learning.
is_published = False on all series until enabled by admin.
"""

LEARNING_SEED = [
    # ── CATEGORY 1: CODES ──────────────────────────────────────────────────
    {
        "badge_id": "css-code",
        "title": "CSS Code — Code of Safe Practice for Solid Bulk Cargoes",
        "description": "Regula el transporte seguro de cargas sólidas a granel, abordando riesgos de licuefacción, gases tóxicos y distribución de peso. Complementa SOLAS Capítulo VI.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Introducción al CSS Code", "order": 1, "episodes": [
                {"title": "Qué es el CSS Code", "order": 1},
                {"title": "Su relación con SOLAS Ch. VI", "order": 2},
                {"title": "Alcance y aplicación", "order": 3},
            ]},
            {"title": "T2 — Propiedades y Clasificación de Cargas", "order": 2, "episodes": [
                {"title": "Sólidos a granel vs. cargas sólidas sueltas", "order": 1},
                {"title": "Factores de riesgo (humedad, densidad)", "order": 2},
                {"title": "Fichas de datos", "order": 3},
            ]},
            {"title": "T3 — Estiba y Sujeción", "order": 3, "episodes": [
                {"title": "Planes de carga", "order": 1},
                {"title": "Distribución de peso", "order": 2},
                {"title": "Materiales de sujeción", "order": 3},
                {"title": "Cálculo de fuerzas", "order": 4},
            ]},
            {"title": "T4 — Peligros y Respuesta de Emergencia", "order": 4, "episodes": [
                {"title": "Licuefacción de carga", "order": 1},
                {"title": "Gases tóxicos", "order": 2},
                {"title": "Autopropulsión", "order": 3},
                {"title": "Acción de emergencia", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "nox-tec",
        "title": "NOx Technical Code — MARPOL Annex VI",
        "description": "Código técnico que define los niveles Tier I, II y III de emisiones de óxidos de nitrógeno para motores marinos. Parte esencial de MARPOL Anexo VI.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Introducción al NOx Technical Code", "order": 1, "episodes": [
                {"title": "Relación con MARPOL Annex VI", "order": 1},
                {"title": "Regulación 13", "order": 2},
                {"title": "Por qué controlar NOx", "order": 3},
            ]},
            {"title": "T2 — Niveles NOx: Tier I, II y III", "order": 2, "episodes": [
                {"title": "Diferencias entre Tiers", "order": 1},
                {"title": "Áreas de control de emisiones (ECA)", "order": 2},
                {"title": "Cumplimiento por fecha de construcción", "order": 3},
            ]},
            {"title": "T3 — Certificación y Encuestas de Motores", "order": 3, "episodes": [
                {"title": "Ciclo de pruebas E3/D2", "order": 1},
                {"title": "EIAPP Certificate", "order": 2},
                {"title": "Technical File del motor", "order": 3},
            ]},
            {"title": "T4 — Monitoreo y Registros", "order": 4, "episodes": [
                {"title": "Fuel Oil Record Book", "order": 1},
                {"title": "Métodos alternativos de cumplimiento", "order": 2},
                {"title": "Scrubbers y futuros combustibles", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "modu-code",
        "title": "MODU Code — Mobile Offshore Drilling Units",
        "description": "Código IMO para unidades móviles de perforación offshore: jackups, semisumergibles y drillships. Cubre estabilidad, seguridad y certificación específica.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Qué es un MODU", "order": 1, "episodes": [
                {"title": "Tipos de MODUs (jackups, semisumergibles, drillships)", "order": 1},
                {"title": "Aplicación del código", "order": 2},
                {"title": "Diferencias con buques convencionales", "order": 3},
            ]},
            {"title": "T2 — Estabilidad para MODUs", "order": 2, "episodes": [
                {"title": "Criterios especiales de estabilidad", "order": 1},
                {"title": "Operaciones en diferentes configuraciones", "order": 2},
                {"title": "Planes de emergencia", "order": 3},
            ]},
            {"title": "T3 — Equipos de Seguridad", "order": 3, "episodes": [
                {"title": "LSA específico para MODUs", "order": 1},
                {"title": "Sistemas contra incendios", "order": 2},
                {"title": "Helipuertos", "order": 3},
            ]},
            {"title": "T4 — Tripulación y Certificación", "order": 4, "episodes": [
                {"title": "Documentación requerida", "order": 1},
                {"title": "Manning mínimo", "order": 2},
                {"title": "Certificados aplicables", "order": 3},
                {"title": "Rol de la administración", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "osv-guidelines",
        "title": "OSV — Offshore Support Vessel Guidelines",
        "description": "Directrices para operaciones seguras en buques de apoyo offshore (AHTS, PSV, CSV). Cubre transferencia de carga, maniobras y gestión de SMS específico.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — OSV Types & Operations", "order": 1, "episodes": [
                {"title": "Tipos de OSVs (AHTS, PSV, CSV)", "order": 1},
                {"title": "Rol en industria offshore", "order": 2},
                {"title": "Diferencias regulatorias", "order": 3},
            ]},
            {"title": "T2 — Operaciones de Carga en Cubierta", "order": 2, "episodes": [
                {"title": "Slinging y lifting", "order": 1},
                {"title": "Peligros de cubierta", "order": 2},
                {"title": "Comunicación barco–plataforma", "order": 3},
            ]},
            {"title": "T3 — Transferencia Offshore", "order": 3, "episodes": [
                {"title": "Crane operations", "order": 1},
                {"title": "Personnel transfer by basket", "order": 2},
                {"title": "Boat landing approach", "order": 3},
            ]},
            {"title": "T4 — Anchor Handling & Remolque", "order": 4, "episodes": [
                {"title": "Equipos AHTS", "order": 1},
                {"title": "Procedimientos seguros", "order": 2},
                {"title": "Gestión de riesgos en AH", "order": 3},
            ]},
            {"title": "T5 — Safety Management en OSVs", "order": 5, "episodes": [
                {"title": "SMS específico offshore", "order": 1},
                {"title": "Drilling support operations", "order": 2},
                {"title": "DP requirements para OSVs", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "large-yacht-ly3",
        "title": "MCA Large Yacht Code — LY3",
        "description": "Código MCA para yates comerciales de más de 24 metros. Regula manning, equipos de seguridad, encuestas y operaciones watchkeeping.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — LY3 Overview", "order": 1, "episodes": [
                {"title": "Alcance del código", "order": 1},
                {"title": "Yates comerciales >24m", "order": 2},
                {"title": "Diferencias LY2 → LY3", "order": 3},
            ]},
            {"title": "T2 — Equipos de Seguridad", "order": 2, "episodes": [
                {"title": "LSA requerido", "order": 1},
                {"title": "Sistemas contra incendios", "order": 2},
                {"title": "Radio & GMDSS en yates", "order": 3},
            ]},
            {"title": "T3 — Manning y Certificación", "order": 3, "episodes": [
                {"title": "Requisitos de tripulación mínima", "order": 1},
                {"title": "Títulos MCA aplicables", "order": 2},
                {"title": "STCW en contexto yacht", "order": 3},
            ]},
            {"title": "T4 — Encuestas y Certificación", "order": 4, "episodes": [
                {"title": "Tipos de encuesta", "order": 1},
                {"title": "MCA surveyors", "order": 2},
                {"title": "Certificado de clase para yates", "order": 3},
            ]},
            {"title": "T5 — Operaciones y Guardias", "order": 5, "episodes": [
                {"title": "Watchkeeping en yates", "order": 1},
                {"title": "Planificación de travesías", "order": 2},
                {"title": "Código de conducta a bordo", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "fao-ilo-imo-fish",
        "title": "FAO/ILO/IMO — International Framework for Fishing Vessels",
        "description": "Marco internacional tripartito para buques pesqueros: Convenio de Cabo Town, STCW-F y condiciones laborales ILO C188.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Marco Internacional para Buques Pesqueros", "order": 1, "episodes": [
                {"title": "Convenio de Cabo Town 2012", "order": 1},
                {"title": "Diferencias con SOLAS", "order": 2},
                {"title": "Estado de ratificaciones", "order": 3},
            ]},
            {"title": "T2 — Seguridad en Buques Pesqueros", "order": 2, "episodes": [
                {"title": "Estabilidad", "order": 1},
                {"title": "LSA específico", "order": 2},
                {"title": "Diseño estructural", "order": 3},
                {"title": "Riesgos inherentes", "order": 4},
            ]},
            {"title": "T3 — STCW-F — Formación para Pescadores", "order": 3, "episodes": [
                {"title": "Estructura del convenio STCW-F", "order": 1},
                {"title": "Certificación de patrón", "order": 2},
                {"title": "Guardias en pesca", "order": 3},
            ]},
            {"title": "T4 — Condiciones Laborales (MLC / ILO 188)", "order": 4, "episodes": [
                {"title": "ILO C188 — Trabajo en la pesca", "order": 1},
                {"title": "Descanso", "order": 2},
                {"title": "Remuneración", "order": 3},
                {"title": "Repatriación", "order": 4},
            ]},
        ],
    },

    # ── CATEGORY 2: REGULATIONS ────────────────────────────────────────────
    {
        "badge_id": "solas-ch-ii-1",
        "title": "SOLAS Capítulo II-1 — Construcción, Subdivisión y Estabilidad",
        "description": "Requisitos de construcción estructural, subdivisión en compartimentos y criterios de estabilidad intacta y en avería para buques mercantes.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Estructura del Buque", "order": 1, "episodes": [
                {"title": "Elementos estructurales principales", "order": 1},
                {"title": "Mamparos", "order": 2},
                {"title": "Cubiertas", "order": 3},
                {"title": "Doble fondo", "order": 4},
            ]},
            {"title": "T2 — Subdivisión y Estabilidad de Compartimentos", "order": 2, "episodes": [
                {"title": "Teoría de subdivisión", "order": 1},
                {"title": "Factor de permeabilidad", "order": 2},
                {"title": "Compartimentos estancos", "order": 3},
            ]},
            {"title": "T3 — Estabilidad Intacta e Incremental", "order": 3, "episodes": [
                {"title": "Curva GZ", "order": 1},
                {"title": "Criterios IMO", "order": 2},
                {"title": "Angle of loll", "order": 3},
                {"title": "Corrección por superficies libres", "order": 4},
            ]},
            {"title": "T4 — Estabilidad en Avería", "order": 4, "episodes": [
                {"title": "Daño hipotético vs. real", "order": 1},
                {"title": "Cálculo de estabilidad en daño", "order": 2},
                {"title": "SOLAS probability concept", "order": 3},
            ]},
            {"title": "T5 — Maquinaria y Sistemas Eléctricos", "order": 5, "episodes": [
                {"title": "Redundancia de propulsión", "order": 1},
                {"title": "Grupos electrógenos de emergencia", "order": 2},
                {"title": "Sistemas remotos", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "solas-ch-ii-2",
        "title": "SOLAS Capítulo II-2 — Protección contra Incendios",
        "description": "Marco completo de prevención, detección y extinción de incendios a bordo: divisiones estructurales, sistemas fijos, equipos portátiles y planes de lucha.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Principios de Protección contra Incendios", "order": 1, "episodes": [
                {"title": "El triángulo del fuego", "order": 1},
                {"title": "División del buque en zonas", "order": 2},
                {"title": "Principio de tres capas SOLAS", "order": 3},
            ]},
            {"title": "T2 — Detección y Alarma", "order": 2, "episodes": [
                {"title": "Detectores de humo, calor y llama", "order": 1},
                {"title": "Sistemas de alarma centralizados", "order": 2},
                {"title": "Pruebas y mantenimiento", "order": 3},
            ]},
            {"title": "T3 — Protección Estructural", "order": 3, "episodes": [
                {"title": "Divisiones Clase A, B, C", "order": 1},
                {"title": "Materiales ignífugos", "order": 2},
                {"title": "Penetraciones y sellados", "order": 3},
            ]},
            {"title": "T4 — Sistemas Fijos de Extinción", "order": 4, "episodes": [
                {"title": "CO2", "order": 1},
                {"title": "Hi-Fog/Sprinkler", "order": 2},
                {"title": "Espuma fija", "order": 3},
                {"title": "Criterios de activación", "order": 4},
            ]},
            {"title": "T5 — Equipo Portátil y EPI", "order": 5, "episodes": [
                {"title": "Extintores portátiles", "order": 1},
                {"title": "Equipo de bombero (EEBD, BA)", "order": 2},
                {"title": "SCBA", "order": 3},
                {"title": "Mantenimiento", "order": 4},
            ]},
            {"title": "T6 — Planes de Lucha contra Incendios", "order": 6, "episodes": [
                {"title": "Plano de control de incendios", "order": 1},
                {"title": "Ejercicios obligatorios", "order": 2},
                {"title": "Fire party organization", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "solas-ch-iii",
        "title": "SOLAS Capítulo III — Dispositivos de Salvamento (LSA)",
        "description": "Requisitos de todos los dispositivos de salvamento: botes, balsas, chalecos, trajes de inmersión, EPIRBs y señales de peligro.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Reglas Generales LSA", "order": 1, "episodes": [
                {"title": "Alcance", "order": 1},
                {"title": "LSA Code", "order": 2},
                {"title": "Aprobación de tipo", "order": 3},
                {"title": "Mantenimiento y registros", "order": 4},
            ]},
            {"title": "T2 — Botes Salvavidas y Pescantes", "order": 2, "episodes": [
                {"title": "Tipos de botes (CDB, FRP)", "order": 1},
                {"title": "Pescantes SOLAS", "order": 2},
                {"title": "Botadura y arriado", "order": 3},
                {"title": "Recuperación", "order": 4},
            ]},
            {"title": "T3 — Balsas Salvavidas", "order": 3, "episodes": [
                {"title": "Inflables vs. rígidas", "order": 1},
                {"title": "Sistemas de suelta hidrostática (HRU)", "order": 2},
                {"title": "Artículos de supervivencia", "order": 3},
            ]},
            {"title": "T4 — Botes de Rescate y Fast Rescue", "order": 4, "episodes": [
                {"title": "Clasificación", "order": 1},
                {"title": "Procedimiento de botadura", "order": 2},
                {"title": "Responsabilidades del equipo", "order": 3},
            ]},
            {"title": "T5 — Equipo Personal de Salvamento", "order": 5, "episodes": [
                {"title": "Aros salvavidas", "order": 1},
                {"title": "Chalecos salvavidas (SOLAS type)", "order": 2},
                {"title": "Trajes de inmersión", "order": 3},
                {"title": "Trajes de protección", "order": 4},
            ]},
            {"title": "T6 — Señales de Peligro y Pirotecnia", "order": 6, "episodes": [
                {"title": "EPIRB", "order": 1},
                {"title": "SART", "order": 2},
                {"title": "Cohetes", "order": 3},
                {"title": "Bengalas de mano", "order": 4},
                {"title": "Activación y responsabilidades", "order": 5},
            ]},
        ],
    },
    {
        "badge_id": "solas-ch-iv",
        "title": "SOLAS Capítulo IV — Radiocomunicaciones / GMDSS",
        "description": "Sistema Global de Socorro y Seguridad Marítima: zonas A1–A4, VHF/DSC, MF/HF, satélite, NAVTEX, EPIRB y SART.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Arquitectura GMDSS", "order": 1, "episodes": [
                {"title": "Zonas marítimas A1–A4", "order": 1},
                {"title": "Equipos requeridos por zona", "order": 2},
                {"title": "Radio log", "order": 3},
            ]},
            {"title": "T2 — VHF y DSC", "order": 2, "episodes": [
                {"title": "Canal 16", "order": 1},
                {"title": "Procedimientos DSC", "order": 2},
                {"title": "Llamadas de socorro, urgencia, seguridad", "order": 3},
            ]},
            {"title": "T3 — MF/HF Radio", "order": 3, "episodes": [
                {"title": "Frecuencias de guardia", "order": 1},
                {"title": "Llamadas de larga distancia", "order": 2},
                {"title": "Mantenimiento de equipo", "order": 3},
            ]},
            {"title": "T4 — Satélite (Inmarsat / Iridium)", "order": 4, "episodes": [
                {"title": "Cobertura global", "order": 1},
                {"title": "Tipos de comunicación", "order": 2},
                {"title": "MSI via satélite", "order": 3},
            ]},
            {"title": "T5 — NAVTEX y MSI", "order": 5, "episodes": [
                {"title": "Zonas NAVTEX", "order": 1},
                {"title": "Mensajes de seguridad marítima", "order": 2},
                {"title": "Interpretación de mensajes", "order": 3},
            ]},
            {"title": "T6 — EPIRB, SART y AIS", "order": 6, "episodes": [
                {"title": "Tipos de EPIRB (406 MHz)", "order": 1},
                {"title": "SART radar", "order": 2},
                {"title": "AIS-SART", "order": 3},
                {"title": "Protocolos de activación", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "solas-ch-v",
        "title": "SOLAS Capítulo V — Seguridad de la Navegación",
        "description": "Obligaciones de navegación segura: planificación de viajes, equipos obligatorios, TSSs, guardia en el puente y coordinación SAR.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Obligaciones de los Contracting Governments", "order": 1, "episodes": [
                {"title": "Servicios meteorológicos", "order": 1},
                {"title": "Ice patrol", "order": 2},
                {"title": "Servicios de tráfico", "order": 3},
                {"title": "SAR", "order": 4},
            ]},
            {"title": "T2 — Planificación del Viaje", "order": 2, "episodes": [
                {"title": "APEM: Appraisal, Planning, Execution, Monitoring", "order": 1},
                {"title": "Waypoints y contingencias", "order": 2},
                {"title": "Pilot books", "order": 3},
            ]},
            {"title": "T3 — Equipos de Navegación Obligatorios", "order": 3, "episodes": [
                {"title": "ECDIS", "order": 1},
                {"title": "AIS", "order": 2},
                {"title": "VDR", "order": 3},
                {"title": "Piloto automático", "order": 4},
                {"title": "Compás magnético vs. giroscópico", "order": 5},
            ]},
            {"title": "T4 — Dispositivos de Separación del Tráfico (TSS)", "order": 4, "episodes": [
                {"title": "Lectura de TSSs en carta", "order": 1},
                {"title": "COLREGS Regla 10", "order": 2},
                {"title": "Áreas de precaución", "order": 3},
            ]},
            {"title": "T5 — Guardia en el Puente", "order": 5, "episodes": [
                {"title": "Reglamento de guardia", "order": 1},
                {"title": "BRM básico", "order": 2},
                {"title": "Lookout duties", "order": 3},
                {"title": "Handover", "order": 4},
            ]},
            {"title": "T6 — SAR y Coordinación de Rescate", "order": 6, "episodes": [
                {"title": "Papel del buque en SAR", "order": 1},
                {"title": "IAMSAR", "order": 2},
                {"title": "Comunicación con MRCC", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "solas-ch-vi",
        "title": "SOLAS Capítulo VI — Transporte de Cargas",
        "description": "Reglas para el transporte seguro de cargas: granos, sólidos a granel (IMSBC), mercancías peligrosas (IMDG) y sujeción de cargas.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Alcance y Documentación", "order": 1, "episodes": [
                {"title": "Qué cubre Ch. VI", "order": 1},
                {"title": "Relación con IMSBC Code", "order": 2},
                {"title": "Documentación de carga", "order": 3},
            ]},
            {"title": "T2 — Granos a Granel", "order": 2, "episodes": [
                {"title": "Reglamento sobre granos (Grain Code)", "order": 1},
                {"title": "Cálculos de heeling moments", "order": 2},
                {"title": "Certificados", "order": 3},
            ]},
            {"title": "T3 — Carga Sólida a Granel (IMSBC)", "order": 3, "episodes": [
                {"title": "Grupos A, B, C", "order": 1},
                {"title": "Fichas individuales de materiales", "order": 2},
                {"title": "Schedule de carga", "order": 3},
            ]},
            {"title": "T4 — Mercancías Peligrosas (IMDG intro)", "order": 4, "episodes": [
                {"title": "Relación SOLAS–IMDG", "order": 1},
                {"title": "Requisitos de declaración", "order": 2},
                {"title": "Responsabilidades del cargador", "order": 3},
            ]},
            {"title": "T5 — Sujeción de Cargas", "order": 5, "episodes": [
                {"title": "CSS Code aplicado", "order": 1},
                {"title": "Lashing plans", "order": 2},
                {"title": "Material de sujeción", "order": 3},
                {"title": "Cálculos de fuerzas", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "marpol-ann-i",
        "title": "MARPOL Anexo I — Prevención de Contaminación por Hidrocarburos",
        "description": "Prevención de contaminación del mar por hidrocarburos: ORB, separadores OWS, slops, transferencias STS e inspecciones PSC.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Introducción a MARPOL y Anexo I", "order": 1, "episodes": [
                {"title": "Los 6 anexos", "order": 1},
                {"title": "Zonas especiales", "order": 2},
                {"title": "Certificado IOPP", "order": 3},
                {"title": "Libro de registro de hidrocarburos", "order": 4},
            ]},
            {"title": "T2 — Libro de Registro de Hidrocarburos (ORB)", "order": 2, "episodes": [
                {"title": "Partes I y II", "order": 1},
                {"title": "Entradas obligatorias", "order": 2},
                {"title": "Firma y responsabilidades", "order": 3},
            ]},
            {"title": "T3 — Separadores Agua-Aceite (OWS)", "order": 3, "episodes": [
                {"title": "Funcionamiento del OWS", "order": 1},
                {"title": "15 ppm", "order": 2},
                {"title": "Sensor de hidrocarburos", "order": 3},
                {"title": "Mantenimiento", "order": 4},
            ]},
            {"title": "T4 — Slops y Gestión de Residuos de Sentinas", "order": 4, "episodes": [
                {"title": "Colección de slops", "order": 1},
                {"title": "Entregas a tierra", "order": 2},
                {"title": "Prohibiciones de descarga", "order": 3},
            ]},
            {"title": "T5 — STS Transfer & MARPOL", "order": 5, "episodes": [
                {"title": "Transferencias buque a buque", "order": 1},
                {"title": "Plan STS", "order": 2},
                {"title": "Notificaciones requeridas", "order": 3},
            ]},
            {"title": "T6 — Control del Estado Rector del Puerto (PSC)", "order": 6, "episodes": [
                {"title": "Qué verifican los inspectores en Anexo I", "order": 1},
                {"title": "Deficiencias comunes", "order": 2},
                {"title": "Consecuencias", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "marpol-ann-ii",
        "title": "MARPOL Anexo II — Sustancias Nocivas Líquidas (NLS)",
        "description": "Control de la contaminación por sustancias nocivas líquidas: categorías X/Y/Z, Cargo Record Book, pre-lavado y descarga.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Clasificación de NLS", "order": 1, "episodes": [
                {"title": "Categorías X, Y, Z y OS", "order": 1},
                {"title": "Evaluación GESAMP", "order": 2},
                {"title": "IBC Code", "order": 3},
            ]},
            {"title": "T2 — Libro de Registro de Carga (CRB)", "order": 2, "episodes": [
                {"title": "Entradas obligatorias", "order": 1},
                {"title": "Operaciones de carga/descarga", "order": 2},
                {"title": "Firma del oficial", "order": 3},
            ]},
            {"title": "T3 — Manejo de Residuos de Carga", "order": 3, "episodes": [
                {"title": "Pre-lavado requerido", "order": 1},
                {"title": "Stripping procedures", "order": 2},
                {"title": "Agua de lavado", "order": 3},
            ]},
            {"title": "T4 — Descarga y Entrega a Tierra", "order": 4, "episodes": [
                {"title": "Requisitos por categoría", "order": 1},
                {"title": "Instalaciones portuarias", "order": 2},
                {"title": "Registro de entregas", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "marpol-ann-v",
        "title": "MARPOL Anexo V — Gestión de Basuras",
        "description": "Prevención de la contaminación por basuras: plan de gestión, Garbage Record Book, prohibiciones de descarga y tratamiento de plásticos.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Revisión de Anexo V (2013)", "order": 1, "episodes": [
                {"title": "Cambios clave vs. versión anterior", "order": 1},
                {"title": "Definición de 'basura'", "order": 2},
                {"title": "Zonas especiales", "order": 3},
            ]},
            {"title": "T2 — Plan de Gestión de Basuras", "order": 2, "episodes": [
                {"title": "Contenido obligatorio", "order": 1},
                {"title": "Responsable a bordo", "order": 2},
                {"title": "Procedimientos de separación", "order": 3},
            ]},
            {"title": "T3 — Libro de Registro de Basuras (GRB)", "order": 3, "episodes": [
                {"title": "Qué registrar", "order": 1},
                {"title": "Incineraciones, descargas, entregas", "order": 2},
                {"title": "Firma", "order": 3},
            ]},
            {"title": "T4 — Prohibiciones y Excepciones", "order": 4, "episodes": [
                {"title": "Qué se puede descargar y dónde", "order": 1},
                {"title": "Plásticos: prohibición total", "order": 2},
                {"title": "Residuos de carga", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "marpol-ann-vi",
        "title": "MARPOL Anexo VI — Contaminación Atmosférica y GHG",
        "description": "Control de emisiones atmosféricas: SOx/ECA, NOx Tier, EEDI/EEXI/CII, gestión de fuel oil y sustancias que agotan el ozono.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — SOx y Zonas ECA", "order": 1, "episodes": [
                {"title": "Límites globales vs. ECA", "order": 1},
                {"title": "Fuel oil de bajo azufre", "order": 2},
                {"title": "Scrubbers: open vs. closed loop", "order": 3},
            ]},
            {"title": "T2 — NOx — Niveles Tier y Código Técnico", "order": 2, "episodes": [
                {"title": "Tier I/II/III", "order": 1},
                {"title": "Cuando aplica cada Tier", "order": 2},
                {"title": "EIAPP Certificate", "order": 3},
            ]},
            {"title": "T3 — Eficiencia Energética (EEDI / EEXI / CII)", "order": 3, "episodes": [
                {"title": "Qué miden", "order": 1},
                {"title": "SEEMP", "order": 2},
                {"title": "Plan de mejora CII", "order": 3},
                {"title": "Calificaciones A–E", "order": 4},
            ]},
            {"title": "T4 — Gestión de Calidad del Fuel Oil", "order": 4, "episodes": [
                {"title": "MARPOL delivered fuel requirements", "order": 1},
                {"title": "BDN", "order": 2},
                {"title": "Muestras MARPOL", "order": 3},
            ]},
            {"title": "T5 — ODS y Sustancias que Agotan el Ozono", "order": 5, "episodes": [
                {"title": "Reglamento 12", "order": 1},
                {"title": "Registro de ODS", "order": 2},
                {"title": "Eliminación controlada", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "stcw-reg-ii",
        "title": "STCW Reglamento II — Departamento de Cubierta",
        "description": "Competencias y certificación del personal de cubierta: ratings, OOW, Chief Mate y Capitán según STCW Capítulo II.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Estructura del Capítulo II", "order": 1, "episodes": [
                {"title": "Regs II/1–II/5", "order": 1},
                {"title": "Niveles de responsabilidad", "order": 2},
                {"title": "Funciones de cubierta", "order": 3},
            ]},
            {"title": "T2 — Rating y Marinero Hábil de Cubierta", "order": 2, "episodes": [
                {"title": "RFPNW (II/4)", "order": 1},
                {"title": "Able Seafarer Deck (II/5)", "order": 2},
                {"title": "Deberes de guardia", "order": 3},
            ]},
            {"title": "T3 — Oficial de Guardia de Navegación (OOW)", "order": 3, "episodes": [
                {"title": "Reg. II/1", "order": 1},
                {"title": "Competencias STCW Code A-II/1", "order": 2},
                {"title": "COLREGS en la práctica", "order": 3},
            ]},
            {"title": "T4 — Primer Oficial (Chief Mate)", "order": 4, "episodes": [
                {"title": "Reg. II/2", "order": 1},
                {"title": "Carga, estabilidad, planificación de viaje", "order": 2},
                {"title": "BRM avanzado", "order": 3},
            ]},
            {"title": "T5 — Capitán (Master)", "order": 5, "episodes": [
                {"title": "Reg. II/2", "order": 1},
                {"title": "Mando y responsabilidad", "order": 2},
                {"title": "ISM Code", "order": 3},
                {"title": "Gestión de emergencias", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "stcw-reg-iii",
        "title": "STCW Reglamento III — Departamento de Máquinas",
        "description": "Competencias y certificación del personal de máquinas: ratings, OOW, 2do Ingeniero, Jefe de Máquinas y ETO según STCW Capítulo III.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Estructura del Capítulo III", "order": 1, "episodes": [
                {"title": "Regs III/1–III/7", "order": 1},
                {"title": "Potencias de propulsión", "order": 2},
                {"title": "Funciones de máquinas", "order": 3},
            ]},
            {"title": "T2 — Rating y Marinero Hábil de Máquinas", "order": 2, "episodes": [
                {"title": "RFPEW (III/4)", "order": 1},
                {"title": "Able Seafarer Engine (III/5)", "order": 2},
                {"title": "Deberes de guardia", "order": 3},
            ]},
            {"title": "T3 — Oficial de Guardia de Máquinas (OOW)", "order": 3, "episodes": [
                {"title": "Reg. III/1", "order": 1},
                {"title": "Sistemas de propulsión", "order": 2},
                {"title": "Vigilancia de guardia", "order": 3},
            ]},
            {"title": "T4 — Segundo Ingeniero y Jefe de Máquinas", "order": 4, "episodes": [
                {"title": "Regs III/2 y III/3", "order": 1},
                {"title": "Gestión del departamento", "order": 2},
                {"title": "Mantenimiento planificado", "order": 3},
            ]},
            {"title": "T5 — Oficial Electrotécnico (ETO) y Rating", "order": 5, "episodes": [
                {"title": "Regs III/6 y III/7", "order": 1},
                {"title": "Sistemas eléctricos", "order": 2},
                {"title": "Automatización", "order": 3},
                {"title": "Seguridad eléctrica", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "stcw-reg-v",
        "title": "STCW Reglamento V — Formación Especial (Buques Especiales)",
        "description": "Formación especial para tanqueros, gaseros, buques de pasaje y aguas polares bajo STCW Capítulo V.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Panorama del Reglamento V", "order": 1, "episodes": [
                {"title": "Reg. V/1-1, V/1-2, V/2, V/3, V/4", "order": 1},
                {"title": "A quién aplica", "order": 2},
                {"title": "Certificados de competencia especial", "order": 3},
            ]},
            {"title": "T2 — Buques Tanque (V/1-1)", "order": 2, "episodes": [
                {"title": "Entrenamiento básico oil/chemical", "order": 1},
                {"title": "Entrenamiento avanzado", "order": 2},
                {"title": "Revalidación", "order": 3},
            ]},
            {"title": "T3 — Buques Gaseros (V/1-2)", "order": 3, "episodes": [
                {"title": "Entrenamiento básico gas", "order": 1},
                {"title": "Entrenamiento avanzado LNG/LPG", "order": 2},
                {"title": "Diferencias con tanqueros", "order": 3},
            ]},
            {"title": "T4 — Buques de Pasaje (V/2)", "order": 4, "episodes": [
                {"title": "Gestión de multitudes", "order": 1},
                {"title": "Gestión de crisis", "order": 2},
                {"title": "Seguridad del pasaje", "order": 3},
            ]},
            {"title": "T5 — Aguas Polares (V/4)", "order": 5, "episodes": [
                {"title": "Polar Code", "order": 1},
                {"title": "Entrenamiento básico y avanzado", "order": 2},
                {"title": "Reglamentación IMO", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "panama-flag",
        "title": "Panama Flag State — Autoridad Marítima de Panamá (AMP)",
        "description": "El registro de Panamá es el más grande del mundo. Esta serie cubre la AMP, dotación mínima, reconocimiento de títulos, PSC y el Canal de Panamá.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — AMP y el Registro de Panamá", "order": 1, "episodes": [
                {"title": "Flota de bandera panameña (la más grande del mundo)", "order": 1},
                {"title": "Estructura de la AMP", "order": 2},
                {"title": "SEGUMAR", "order": 3},
            ]},
            {"title": "T2 — Dotación Mínima y Manning", "order": 2, "episodes": [
                {"title": "Requisitos de tripulación mínima por tipo de buque", "order": 1},
                {"title": "Certificados aceptados", "order": 2},
                {"title": "Proceso de reconocimiento", "order": 3},
            ]},
            {"title": "T3 — Reconocimiento de Títulos Extranjeros", "order": 3, "episodes": [
                {"title": "Endorsement AMP", "order": 1},
                {"title": "Documentos requeridos", "order": 2},
                {"title": "Tiempo de procesamiento", "order": 3},
                {"title": "Centros autorizados", "order": 4},
            ]},
            {"title": "T4 — Inspecciones y Port State Control", "order": 4, "episodes": [
                {"title": "Rol de Panamá en el MOU", "order": 1},
                {"title": "Procedimiento de inspección AMP", "order": 2},
                {"title": "Deficiencias frecuentes", "order": 3},
            ]},
            {"title": "T5 — Canal de Panamá — Consideraciones", "order": 5, "episodes": [
                {"title": "Dimensiones Neopanamax", "order": 1},
                {"title": "Peajes y medición", "order": 2},
                {"title": "Regulaciones de tránsito", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "mlc-titles-1-5",
        "title": "Maritime Labour Convention 2006 — Los 5 Títulos",
        "description": "La MLC 2006 ('Carta Magna' de los derechos del marino) establece condiciones mínimas de trabajo, alojamiento, salud y cumplimiento para toda la gente de mar.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — MLC 2006 — Introducción y Estructura", "order": 1, "episodes": [
                {"title": "Los 4 pilares IMO/OIT", "order": 1},
                {"title": "Regulaciones, Estándares y Guías", "order": 2},
                {"title": "DMLC I y II", "order": 3},
                {"title": "MLC Certificate", "order": 4},
            ]},
            {"title": "T2 — Título 1 — Requisitos Mínimos", "order": 2, "episodes": [
                {"title": "Edad mínima", "order": 1},
                {"title": "Aptitud médica (reg. 1.2)", "order": 2},
                {"title": "Formación y títulos (reg. 1.3)", "order": 3},
                {"title": "Contratación", "order": 4},
            ]},
            {"title": "T3 — Título 2 — Condiciones de Empleo", "order": 3, "episodes": [
                {"title": "Contrato SEA", "order": 1},
                {"title": "Salarios", "order": 2},
                {"title": "Horas de trabajo y descanso", "order": 3},
                {"title": "Vacaciones", "order": 4},
                {"title": "Repatriación", "order": 5},
            ]},
            {"title": "T4 — Título 3 — Alojamiento y Recreo", "order": 4, "episodes": [
                {"title": "Estándares de alojamiento", "order": 1},
                {"title": "Instalaciones de catering", "order": 2},
                {"title": "Medidas de salud y bienestar", "order": 3},
            ]},
            {"title": "T5 — Título 4 — Protección de la Salud", "order": 5, "episodes": [
                {"title": "Asistencia médica a bordo", "order": 1},
                {"title": "Seguro por lesiones", "order": 2},
                {"title": "Bienestar del marino", "order": 3},
                {"title": "Seguridad social", "order": 4},
            ]},
            {"title": "T6 — Título 5 — Cumplimiento y Aplicación", "order": 6, "episodes": [
                {"title": "Responsabilidades del Estado del pabellón", "order": 1},
                {"title": "PSC bajo MLC", "order": 2},
                {"title": "Procedimiento de queja", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "stcw-reg-v3",
        "title": "STCW Reg. V/4 — Aguas Polares (Polar Code)",
        "description": "Formación básica y avanzada para operaciones en aguas polares: navegación en hielo, supervivencia en frío y gestión de emergencias árticas.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — El Polar Code — Introducción", "order": 1, "episodes": [
                {"title": "Entrada en vigor 2017", "order": 1},
                {"title": "Aplicación Ártico y Antártico", "order": 2},
                {"title": "Partes A y B", "order": 3},
            ]},
            {"title": "T2 — Navegación en Hielo", "order": 2, "episodes": [
                {"title": "Tipos de hielo marino", "order": 1},
                {"title": "Lectura de cartas de hielo", "order": 2},
                {"title": "Ruta ártica del noreste", "order": 3},
            ]},
            {"title": "T3 — Entrenamiento Básico — Polar Waters", "order": 3, "episodes": [
                {"title": "Competencias STCW A-V/4-1", "order": 1},
                {"title": "Supervivencia en frío", "order": 2},
                {"title": "Equipo especial", "order": 3},
            ]},
            {"title": "T4 — Entrenamiento Avanzado — Polar Waters", "order": 4, "episodes": [
                {"title": "Competencias STCW A-V/4-2", "order": 1},
                {"title": "Gestión de buque en hielo", "order": 2},
                {"title": "Remolque en hielo", "order": 3},
            ]},
            {"title": "T5 — Gestión de Emergencias en Aguas Polares", "order": 5, "episodes": [
                {"title": "Evacuación en entorno polar", "order": 1},
                {"title": "Búsqueda y rescate ártico", "order": 2},
                {"title": "Comunicaciones en regiones remotas", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "stcw-f-regs",
        "title": "STCW-F — Formación para Gente de Mar en Buques Pesqueros",
        "description": "Convenio STCW-F 1995: certificación de patrón y oficiales de pesca, organización de guardias y seguridad específica en operaciones pesqueras.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Convenio STCW-F 1995", "order": 1, "episodes": [
                {"title": "Historia", "order": 1},
                {"title": "Diferencias con STCW-78", "order": 2},
                {"title": "Estado de ratificaciones", "order": 3},
            ]},
            {"title": "T2 — Certificación para Buques Pesqueros", "order": 2, "episodes": [
                {"title": "Patrón de pesca", "order": 1},
                {"title": "Oficial de pesca", "order": 2},
                {"title": "Maquinista de pesca", "order": 3},
                {"title": "Formación básica", "order": 4},
            ]},
            {"title": "T3 — Guardias en Buques Pesqueros", "order": 3, "episodes": [
                {"title": "Organización de guardias", "order": 1},
                {"title": "Fatiga en pesca", "order": 2},
                {"title": "Condiciones extremas", "order": 3},
            ]},
            {"title": "T4 — Seguridad Específica en Pesca", "order": 4, "episodes": [
                {"title": "Peligros únicos (redes, maquinaria de cubierta)", "order": 1},
                {"title": "Equipo de seguridad", "order": 2},
                {"title": "Hombre al agua", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "mou-psc",
        "title": "Port State Control — MOUs y Control del Estado Rector del Puerto",
        "description": "Cómo funciona el PSC: los principales MOUs, el proceso de inspección, tipos de deficiencias, detenciones y Campañas de Inspección Concentrada.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Qué es el PSC", "order": 1, "episodes": [
                {"title": "Objetivo del PSC", "order": 1},
                {"title": "Convenios que se verifican", "order": 2},
                {"title": "Diferencia con encuestas de bandera", "order": 3},
            ]},
            {"title": "T2 — Los Principales MOUs", "order": 2, "episodes": [
                {"title": "Paris MOU", "order": 1},
                {"title": "Tokyo MOU", "order": 2},
                {"title": "US Coast Guard", "order": 3},
                {"title": "Viña del Mar", "order": 4},
                {"title": "USCG QUALSHIP 21", "order": 5},
            ]},
            {"title": "T3 — El Proceso de Inspección", "order": 3, "episodes": [
                {"title": "Inspección inicial vs. detallada", "order": 1},
                {"title": "Documentación mínima", "order": 2},
                {"title": "Rol del capitán", "order": 3},
            ]},
            {"title": "T4 — Deficiencias y Detenciones", "order": 4, "episodes": [
                {"title": "Tipos de deficiencias", "order": 1},
                {"title": "Criterios para detención", "order": 2},
                {"title": "Cómo levantar una detención", "order": 3},
            ]},
            {"title": "T5 — Campañas de Inspección Concentrada (CIC)", "order": 5, "episodes": [
                {"title": "Qué son los CICs", "order": 1},
                {"title": "Temas anuales recurrentes", "order": 2},
                {"title": "Preparación del buque", "order": 3},
            ]},
        ],
    },

    # ── CATEGORY 3: SKILLS, COMPETENCES & PROFICIENCIES ───────────────────
    {
        "badge_id": "terrestrial-nav",
        "title": "Navegación Terrestre — Técnicas Clásicas de Navegación",
        "description": "Compás, trabajo en carta, líneas de posición, mareas y navegación costera práctica: las técnicas fundamentales que preceden al ECDIS.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Compás y Marcaciones", "order": 1, "episodes": [
                {"title": "Compás magnético vs. giroscópico", "order": 1},
                {"title": "Error de compás", "order": 2},
                {"title": "Toma de marcaciones", "order": 3},
            ]},
            {"title": "T2 — Trabajo en Carta", "order": 2, "episodes": [
                {"title": "Escalas y proyecciones", "order": 1},
                {"title": "Trazar rumbo y marcaciones", "order": 2},
                {"title": "Transferencia de posición", "order": 3},
            ]},
            {"title": "T3 — Líneas de Posición y Fijos", "order": 3, "episodes": [
                {"title": "Fijo por marcaciones cruzadas", "order": 1},
                {"title": "Fijo por sondas", "order": 2},
                {"title": "Curva de igual distancia", "order": 3},
            ]},
            {"title": "T4 — Mareas y Corrientes", "order": 4, "episodes": [
                {"title": "Tablas de mareas", "order": 1},
                {"title": "Corrientes de marea", "order": 2},
                {"title": "Efecto en la navegación", "order": 3},
            ]},
            {"title": "T5 — Navegación Costera Práctica", "order": 5, "episodes": [
                {"title": "Pilotaje en costas", "order": 1},
                {"title": "Pilotaje con libro de faros", "order": 2},
                {"title": "Planificación de aproximaciones", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "ecdis-e-nav",
        "title": "ECDIS y Navegación Electrónica",
        "description": "ECDIS type-approved, ENCs, configuración de alarmas, planificación de rutas, limitaciones del sistema y el concepto e-Navigation de la OMI.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — ECDIS — Tipos y Estándares", "order": 1, "episodes": [
                {"title": "ECDIS type-approved", "order": 1},
                {"title": "RCDS", "order": 2},
                {"title": "Diferencias con plotter", "order": 3},
                {"title": "IHO S-57 / S-63 / S-100", "order": 4},
            ]},
            {"title": "T2 — Datos de Carta y Actualizaciones", "order": 2, "episodes": [
                {"title": "ENCs vs. RNCs", "order": 1},
                {"title": "Ciclo semanal de actualizaciones", "order": 2},
                {"title": "AIO (Admiralty Information Overlay)", "order": 3},
            ]},
            {"title": "T3 — Configuración de Alarmas", "order": 3, "episodes": [
                {"title": "Alarmas obligatorias vs. opcionales", "order": 1},
                {"title": "Anti-grounding", "order": 2},
                {"title": "XTD", "order": 3},
                {"title": "Configuración por zona", "order": 4},
            ]},
            {"title": "T4 — Planificación de Ruta en ECDIS", "order": 4, "episodes": [
                {"title": "Creación de rutas", "order": 1},
                {"title": "Chequeo automático de peligros", "order": 2},
                {"title": "Monitoreo durante el viaje", "order": 3},
            ]},
            {"title": "T5 — Limitaciones del ECDIS", "order": 5, "episodes": [
                {"title": "Error GPS en ECDIS", "order": 1},
                {"title": "Latencia de posición", "order": 2},
                {"title": "Modo fallback con cartas papel", "order": 3},
                {"title": "Casos reales", "order": 4},
            ]},
            {"title": "T6 — e-Navigation — El Futuro", "order": 6, "episodes": [
                {"title": "Concepto e-Nav de la OMI", "order": 1},
                {"title": "VDES", "order": 2},
                {"title": "Automatic Route Exchange", "order": 3},
                {"title": "MCP (Maritime Cloud)", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "radar-arpa",
        "title": "Radar y ARPA — Detección y Anticollisión",
        "description": "Teoría del radar, operación práctica, adquisición de blancos, cálculo de CPA/TCPA, maniobras de anticollisión y limitaciones del ARPA.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Teoría del Radar", "order": 1, "episodes": [
                {"title": "Principio de funcionamiento", "order": 1},
                {"title": "Frecuencias (X-band / S-band)", "order": 2},
                {"title": "Alcance y resolución", "order": 3},
            ]},
            {"title": "T2 — Operación del Radar", "order": 2, "episodes": [
                {"title": "Controles básicos", "order": 1},
                {"title": "Gain, rain, sea clutter", "order": 2},
                {"title": "Headup / Northup / Courseup", "order": 3},
            ]},
            {"title": "T3 — Adquisición y Seguimiento de Blancos", "order": 3, "episodes": [
                {"title": "Adquisición manual vs. automática", "order": 1},
                {"title": "Vectores", "order": 2},
                {"title": "Límites del ARPA", "order": 3},
            ]},
            {"title": "T4 — CPA, TCPA y Maniobra de Anticollisión", "order": 4, "episodes": [
                {"title": "Cálculo de CPA/TCPA", "order": 1},
                {"title": "Maniobras según COLREGS", "order": 2},
                {"title": "Trial manoeuvre", "order": 3},
            ]},
            {"title": "T5 — Limitaciones y Errores del ARPA", "order": 5, "episodes": [
                {"title": "Falsas alarmas", "order": 1},
                {"title": "Pérdida de blanco", "order": 2},
                {"title": "Interferencia", "order": 3},
                {"title": "Falsas eco", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "meteorology",
        "title": "Meteorología Marítima",
        "description": "Sistemas meteorológicos, lectura de cartas sinópticas, ciclones tropicales, niebla y enrutamiento meteorológico para marinos.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Sistemas Meteorológicos", "order": 1, "episodes": [
                {"title": "Alta y baja presión", "order": 1},
                {"title": "Frentes (fríos, cálidos, ocluidos)", "order": 2},
                {"title": "Vientos globales", "order": 3},
            ]},
            {"title": "T2 — Cartas Sinópticas y Pronósticos", "order": 2, "episodes": [
                {"title": "Lectura de isobaras", "order": 1},
                {"title": "Fuentes de pronóstico (NAVTEX, facsímil)", "order": 2},
                {"title": "Códigos METAR/TAF", "order": 3},
            ]},
            {"title": "T3 — Ciclones Tropicales", "order": 3, "episodes": [
                {"title": "Formación", "order": 1},
                {"title": "Estructura", "order": 2},
                {"title": "Reglas de navegación en tifones/huracanes", "order": 3},
                {"title": "Escape routes", "order": 4},
            ]},
            {"title": "T4 — Niebla y Visibilidad Reducida", "order": 4, "episodes": [
                {"title": "Tipos de niebla", "order": 1},
                {"title": "Procedimiento de niebla (COLREGS Reg. 19)", "order": 2},
                {"title": "Señales acústicas", "order": 3},
            ]},
            {"title": "T5 — Enrutamiento Meteorológico", "order": 5, "episodes": [
                {"title": "Meteorólogos navales", "order": 1},
                {"title": "Servicio de enrutamiento", "order": 2},
                {"title": "Optimización de ruta", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "ship-stability",
        "title": "Estabilidad del Buque",
        "description": "Fundamentos de estabilidad: G, B, M, GM, curva GZ, superficies libres, cálculos de carga, estabilidad en avería y uso del loadicator.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Conceptos Básicos", "order": 1, "episodes": [
                {"title": "Centro de gravedad (G)", "order": 1},
                {"title": "Centro de carena (B)", "order": 2},
                {"title": "Metacentro (M)", "order": 3},
                {"title": "Altura metacéntrica (GM)", "order": 4},
            ]},
            {"title": "T2 — Curva de Estabilidad (GZ)", "order": 2, "episodes": [
                {"title": "Cómo se construye", "order": 1},
                {"title": "Criterios IMO", "order": 2},
                {"title": "Righting moment", "order": 3},
                {"title": "Ángulo de inundación", "order": 4},
            ]},
            {"title": "T3 — Efecto de Superficie Libre", "order": 3, "episodes": [
                {"title": "Corrección FSC", "order": 1},
                {"title": "Tanques y escotillas", "order": 2},
                {"title": "Gestión de lastre", "order": 3},
            ]},
            {"title": "T4 — Cálculos de Carga", "order": 4, "episodes": [
                {"title": "Cargar y descargar", "order": 1},
                {"title": "Pandeo y quebranto", "order": 2},
                {"title": "Hogging y sagging", "order": 3},
            ]},
            {"title": "T5 — Estabilidad en Avería", "order": 5, "episodes": [
                {"title": "Flooding sequence", "order": 1},
                {"title": "Cálculo post-avería", "order": 2},
                {"title": "Plan de emergencia de estabilidad", "order": 3},
            ]},
            {"title": "T6 — Instrumentos de Estabilidad", "order": 6, "episodes": [
                {"title": "Software de carga a bordo", "order": 1},
                {"title": "Uso del loadicator", "order": 2},
                {"title": "Interpretación de resultados", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "cargo-handling",
        "title": "Manejo de Carga",
        "description": "Planificación de carga, operaciones a granel, contenedores, carga general, sujeción y documentación: el ciclo completo de la carga a bordo.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Planificación de Carga", "order": 1, "episodes": [
                {"title": "Stowage plan", "order": 1},
                {"title": "Compatibilidad de cargas", "order": 2},
                {"title": "Estabilidad y resistencia longitudinal", "order": 3},
            ]},
            {"title": "T2 — Carga a Granel (Bulk)", "order": 2, "episodes": [
                {"title": "Operaciones típicas", "order": 1},
                {"title": "IMSBC Code application", "order": 2},
                {"title": "Segregación y ventilación", "order": 3},
            ]},
            {"title": "T3 — Contenedores", "order": 3, "episodes": [
                {"title": "Tipos de contenedor", "order": 1},
                {"title": "Pesos verificados (VGM)", "order": 2},
                {"title": "Bay plans", "order": 3},
                {"title": "Lashing en cubierta", "order": 4},
            ]},
            {"title": "T4 — Carga General", "order": 4, "episodes": [
                {"title": "Slinging y lifting", "order": 1},
                {"title": "Documentación", "order": 2},
                {"title": "Responsabilidad por daños", "order": 3},
            ]},
            {"title": "T5 — Sujeción de Carga", "order": 5, "episodes": [
                {"title": "Lashing plans", "order": 1},
                {"title": "Cálculo de fuerzas", "order": 2},
                {"title": "Materiales de amarre", "order": 3},
                {"title": "Inspección", "order": 4},
            ]},
            {"title": "T6 — Documentación de Carga", "order": 6, "episodes": [
                {"title": "Bill of Lading", "order": 1},
                {"title": "Mate's receipt", "order": 2},
                {"title": "Notice of Readiness", "order": 3},
                {"title": "Carta de protesta", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "dangerous-goods",
        "title": "Mercancías Peligrosas — Código IMDG",
        "description": "Las 9 clases del IMDG Code: clasificación, embalaje, marcado, estiba, segregación, documentación y respuesta de emergencia (EmS).",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Estructura del IMDG Code", "order": 1, "episodes": [
                {"title": "9 clases", "order": 1},
                {"title": "Grupos de embalaje", "order": 2},
                {"title": "Números UN", "order": 3},
                {"title": "Lista de mercancías peligrosas", "order": 4},
            ]},
            {"title": "T2 — Clasificación y Evaluación", "order": 2, "episodes": [
                {"title": "Criterios por clase", "order": 1},
                {"title": "Mezclas y soluciones", "order": 2},
                {"title": "Ficha de datos de seguridad (SDS)", "order": 3},
            ]},
            {"title": "T3 — Embalaje y Marcado", "order": 3, "episodes": [
                {"title": "Tipos de embalaje homologados", "order": 1},
                {"title": "Marcas y etiquetas", "order": 2},
                {"title": "Símbolos de peligro", "order": 3},
            ]},
            {"title": "T4 — Estiba y Segregación", "order": 4, "episodes": [
                {"title": "Tablas de segregación", "order": 1},
                {"title": "Requisitos por clase", "order": 2},
                {"title": "Temperatura controlada", "order": 3},
            ]},
            {"title": "T5 — Documentación", "order": 5, "episodes": [
                {"title": "Declaración del cargador", "order": 1},
                {"title": "Manifiesto de peligrosas", "order": 2},
                {"title": "Stowage plan de peligrosas", "order": 3},
            ]},
            {"title": "T6 — Respuesta de Emergencia (EmS)", "order": 6, "episodes": [
                {"title": "Guías EmS", "order": 1},
                {"title": "MFAG (Medical First Aid Guide)", "order": 2},
                {"title": "Acción inicial en caso de accidente", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "fire-fighting",
        "title": "Lucha contra Incendios",
        "description": "Teoría del fuego, sistemas de detección, extintores portátiles, sistemas fijos, operaciones del equipo de incendios y entrenamiento avanzado AFF.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Teoría del Fuego y Prevención", "order": 1, "episodes": [
                {"title": "El tetraedro del fuego", "order": 1},
                {"title": "Clasificación de incendios A/B/C/D/E/F", "order": 2},
                {"title": "Prevención a bordo", "order": 3},
            ]},
            {"title": "T2 — Detección y Alarma", "order": 2, "episodes": [
                {"title": "Tipos de detectores", "order": 1},
                {"title": "Alarmas automáticas", "order": 2},
                {"title": "Panel de control", "order": 3},
                {"title": "Drill de prueba", "order": 4},
            ]},
            {"title": "T3 — Equipos Portátiles", "order": 3, "episodes": [
                {"title": "Extintores por tipo de fuego", "order": 1},
                {"title": "CO2, polvo seco, espuma, agua", "order": 2},
                {"title": "Técnica de uso", "order": 3},
            ]},
            {"title": "T4 — Sistemas Fijos", "order": 4, "episodes": [
                {"title": "CO2 total flooding", "order": 1},
                {"title": "Rociadores (sprinkler)", "order": 2},
                {"title": "Hi-Fog", "order": 3},
                {"title": "Espuma fija en sala de máquinas", "order": 4},
            ]},
            {"title": "T5 — Operaciones del Equipo de Incendios", "order": 5, "episodes": [
                {"title": "Fire party", "order": 1},
                {"title": "Ataque y retirada", "order": 2},
                {"title": "Uso de BA", "order": 3},
                {"title": "Comunicaciones durante incendio", "order": 4},
            ]},
            {"title": "T6 — Entrenamiento Avanzado (AFF)", "order": 6, "episodes": [
                {"title": "Comandante de operaciones de extinción", "order": 1},
                {"title": "Estrategia", "order": 2},
                {"title": "Investigación post-incendio", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "survival-at-sea",
        "title": "Supervivencia en el Mar",
        "description": "Protocolo de abandono, operación de balsas, técnicas de supervivencia en el agua, coordinación SAR y supervivencia en distintos entornos.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Abandonar el Buque", "order": 1, "episodes": [
                {"title": "Protocolo MAYDAY", "order": 1},
                {"title": "Señal de abandono", "order": 2},
                {"title": "Muster stations", "order": 3},
                {"title": "Prioridades", "order": 4},
            ]},
            {"title": "T2 — Operación de Balsas Salvavidas", "order": 2, "episodes": [
                {"title": "Inflado y embarco", "order": 1},
                {"title": "Artículos de emergencia", "order": 2},
                {"title": "Señales de localización", "order": 3},
            ]},
            {"title": "T3 — Técnicas de Supervivencia", "order": 3, "episodes": [
                {"title": "Hipotermia", "order": 1},
                {"title": "Flotabilidad con ropa", "order": 2},
                {"title": "Conservación de energía", "order": 3},
                {"title": "Agua y alimento", "order": 4},
            ]},
            {"title": "T4 — Coordinación SAR", "order": 4, "episodes": [
                {"title": "Señalización visual para aeronaves", "order": 1},
                {"title": "Uso de VHF portátil", "order": 2},
                {"title": "EPIRB y SART activados", "order": 3},
            ]},
            {"title": "T5 — Supervivencia en Diferentes Entornos", "order": 5, "episodes": [
                {"title": "Aguas frías", "order": 1},
                {"title": "Trópicos", "order": 2},
                {"title": "HUET (inmersión en helicóptero)", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "medical-first-aid",
        "title": "Primeros Auxilios Médicos",
        "description": "RCP, control de hemorragias, quemaduras, fracturas, emergencias médicas y uso del botiquín STCW con teleconsulta médica.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Evaluación Primaria y RCP", "order": 1, "episodes": [
                {"title": "DRABC", "order": 1},
                {"title": "Cadena de supervivencia", "order": 2},
                {"title": "RCP adulto, niño, bebé", "order": 3},
                {"title": "DEA/AED", "order": 4},
            ]},
            {"title": "T2 — Heridas y Control de Hemorragias", "order": 2, "episodes": [
                {"title": "Tipos de heridas", "order": 1},
                {"title": "Presión directa", "order": 2},
                {"title": "Torniquetes", "order": 3},
                {"title": "Shock hipovolémico", "order": 4},
            ]},
            {"title": "T3 — Quemaduras y Lesiones Eléctricas", "order": 3, "episodes": [
                {"title": "Clasificación de quemaduras", "order": 1},
                {"title": "Tratamiento inicial", "order": 2},
                {"title": "Quemaduras eléctricas a bordo", "order": 3},
            ]},
            {"title": "T4 — Fracturas y Lesiones Musculoesqueléticas", "order": 4, "episodes": [
                {"title": "Inmovilización", "order": 1},
                {"title": "Luxaciones", "order": 2},
                {"title": "Lesiones de columna", "order": 3},
                {"title": "Camilla de evacuación", "order": 4},
            ]},
            {"title": "T5 — Emergencias Médicas", "order": 5, "episodes": [
                {"title": "Infarto", "order": 1},
                {"title": "ACV", "order": 2},
                {"title": "Inconsciente", "order": 3},
                {"title": "Diabetes", "order": 4},
                {"title": "Convulsiones", "order": 5},
            ]},
            {"title": "T6 — Botiquín y Equipos Médicos a Bordo", "order": 6, "episodes": [
                {"title": "Contenido del botiquín STCW", "order": 1},
                {"title": "Teleconsulta médica", "order": 2},
                {"title": "Preparación para evacuación médica", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "brm",
        "title": "Bridge Resource Management",
        "description": "Factores humanos en el puente: conciencia situacional, comunicación, toma de decisiones, gestión del error y estudios de caso reales.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Factores Humanos en el Puente", "order": 1, "episodes": [
                {"title": "Modelo SHELL", "order": 1},
                {"title": "Error humano", "order": 2},
                {"title": "Tipos de error (skill-based, rule-based, knowledge-based)", "order": 3},
            ]},
            {"title": "T2 — Conciencia Situacional", "order": 2, "episodes": [
                {"title": "Qué es la situational awareness", "order": 1},
                {"title": "Pérdida de SA", "order": 2},
                {"title": "Indicadores de alerta", "order": 3},
            ]},
            {"title": "T3 — Comunicación y Liderazgo", "order": 3, "episodes": [
                {"title": "Briefings efectivos", "order": 1},
                {"title": "Comunicación en bucle cerrado", "order": 2},
                {"title": "Autoridad y asertividad", "order": 3},
            ]},
            {"title": "T4 — Toma de Decisiones", "order": 4, "episodes": [
                {"title": "Modelos de decisión (FOR-DEC)", "order": 1},
                {"title": "Presión del tiempo", "order": 2},
                {"title": "Consecuencias de errores", "order": 3},
            ]},
            {"title": "T5 — Gestión del Error", "order": 5, "episodes": [
                {"title": "Barreras y defensas", "order": 1},
                {"title": "Análisis post-incidente", "order": 2},
                {"title": "Near-miss reporting", "order": 3},
            ]},
            {"title": "T6 — Estudios de Caso BRM", "order": 6, "episodes": [
                {"title": "Accidentes reales causados por fallo de BRM", "order": 1},
                {"title": "Lecciones aprendidas", "order": 2},
            ]},
        ],
    },
    {
        "badge_id": "erm",
        "title": "Engine Room Resource Management",
        "description": "Non-technical skills en máquinas: comunicación de guardia, fatiga, decisiones bajo emergencia y casos reales de MAIB/NTSB.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Non-Technical Skills en Máquinas", "order": 1, "episodes": [
                {"title": "Diferencias ERM vs. BRM", "order": 1},
                {"title": "Entorno de la sala de máquinas", "order": 2},
                {"title": "Factores humanos específicos", "order": 3},
            ]},
            {"title": "T2 — Comunicación y Coordinación del Equipo", "order": 2, "episodes": [
                {"title": "Handover de guardia", "order": 1},
                {"title": "Comunicación puente–máquinas", "order": 2},
                {"title": "Trabajo en equipo", "order": 3},
            ]},
            {"title": "T3 — Gestión de la Fatiga", "order": 3, "episodes": [
                {"title": "Horas de descanso en máquinas", "order": 1},
                {"title": "Efectos de la fatiga en toma de decisiones", "order": 2},
                {"title": "Gestión de riesgo", "order": 3},
            ]},
            {"title": "T4 — Decisiones bajo Emergencia", "order": 4, "episodes": [
                {"title": "Averías repentinas", "order": 1},
                {"title": "Priorización de acciones", "order": 2},
                {"title": "Comunicación de urgencia", "order": 3},
            ]},
            {"title": "T5 — Casos Reales de ERM", "order": 5, "episodes": [
                {"title": "Accidentes por fallo de comunicación en máquinas", "order": 1},
                {"title": "MAIB / NTSB reports", "order": 2},
            ]},
        ],
    },
    {
        "badge_id": "gmdss",
        "title": "GMDSS — Sistema Mundial de Socorro y Seguridad Marítima",
        "description": "Zonas A1–A4, VHF/DSC, MF/HF, satélite (Inmarsat/Iridium), NAVTEX, EPIRB y SART: el sistema de comunicaciones de emergencia marítima.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Arquitectura GMDSS", "order": 1, "episodes": [
                {"title": "Zonas A1–A4", "order": 1},
                {"title": "Redundancia de equipos", "order": 2},
                {"title": "Registro en Libro de Radio", "order": 3},
            ]},
            {"title": "T2 — VHF y DSC", "order": 2, "episodes": [
                {"title": "Canal 16", "order": 1},
                {"title": "DSC (Digital Selective Calling)", "order": 2},
                {"title": "Procedimientos de socorro, urgencia, seguridad", "order": 3},
            ]},
            {"title": "T3 — MF/HF Radio", "order": 3, "episodes": [
                {"title": "Frecuencias de guardia", "order": 1},
                {"title": "Llamadas de larga distancia", "order": 2},
                {"title": "Auto AlARM", "order": 3},
            ]},
            {"title": "T4 — Comunicaciones Satelitales", "order": 4, "episodes": [
                {"title": "Inmarsat-C, -Fleet", "order": 1},
                {"title": "Iridium", "order": 2},
                {"title": "Distress alerting via satélite", "order": 3},
            ]},
            {"title": "T5 — NAVTEX y MSI", "order": 5, "episodes": [
                {"title": "Zonas y frecuencias", "order": 1},
                {"title": "Mensajes de seguridad marítima", "order": 2},
                {"title": "Sintonización e interpretación", "order": 3},
            ]},
            {"title": "T6 — EPIRB, SART y AIS-SART", "order": 6, "episodes": [
                {"title": "Registro de EPIRB", "order": 1},
                {"title": "Pruebas mensuales", "order": 2},
                {"title": "Activación correcta", "order": 3},
                {"title": "SART y AIS-SART", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "leadership-team",
        "title": "Liderazgo y Trabajo en Equipo",
        "description": "Estilos de liderazgo, dinámica de equipos a bordo, resolución de conflictos, mentoría, gestión del estrés y el modelo IMO 1.39.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Estilos de Liderazgo en el Contexto Marítimo", "order": 1, "episodes": [
                {"title": "Autoritario vs. participativo", "order": 1},
                {"title": "Cuándo usar cada estilo", "order": 2},
                {"title": "Liderazgo situacional", "order": 3},
            ]},
            {"title": "T2 — Dinámica de Equipos a Bordo", "order": 2, "episodes": [
                {"title": "Cohesión del equipo", "order": 1},
                {"title": "Comunicación intercultural", "order": 2},
                {"title": "Trabajo en tripulaciones mixtas", "order": 3},
            ]},
            {"title": "T3 — Resolución de Conflictos", "order": 3, "episodes": [
                {"title": "Tipos de conflicto", "order": 1},
                {"title": "Técnicas de mediación", "order": 2},
                {"title": "Escalamiento responsable", "order": 3},
            ]},
            {"title": "T4 — Mentoría y Capacitación de Tripulación", "order": 4, "episodes": [
                {"title": "Onboard training programmes", "order": 1},
                {"title": "Mentoring vs. coaching", "order": 2},
                {"title": "Dar feedback constructivo", "order": 3},
            ]},
            {"title": "T5 — Estrés, Fatiga y Bienestar", "order": 5, "episodes": [
                {"title": "Reconocer señales de estrés", "order": 1},
                {"title": "Intervención temprana", "order": 2},
                {"title": "Recursos de apoyo al marino", "order": 3},
            ]},
            {"title": "T6 — Modelo de Cursos OMI 1.39", "order": 6, "episodes": [
                {"title": "Programa IMO para liderazgo y habilidades gerenciales en marinos", "order": 1},
            ]},
        ],
    },
    {
        "badge_id": "env-stewardship",
        "title": "Gestión Ambiental y Responsabilidad Medioambiental",
        "description": "Contaminación marina, gestión de agua de lastre, biofouling, plásticos y la hoja de ruta de descarbonización hacia IMO 2050.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Contaminación Marina — Panorama", "order": 1, "episodes": [
                {"title": "Tipos de contaminación", "order": 1},
                {"title": "Impacto en ecosistemas", "order": 2},
                {"title": "Convenios internacionales", "order": 3},
            ]},
            {"title": "T2 — Gestión de Agua de Lastre", "order": 2, "episodes": [
                {"title": "Convención BWM 2017", "order": 1},
                {"title": "Sistemas de tratamiento", "order": 2},
                {"title": "Plan de gestión", "order": 3},
                {"title": "D-1 / D-2 standards", "order": 4},
            ]},
            {"title": "T3 — Biofouling y Especies Invasoras", "order": 3, "episodes": [
                {"title": "Anti-fouling systems", "order": 1},
                {"title": "IMO biofouling guidelines", "order": 2},
                {"title": "Inspecciones de casco", "order": 3},
            ]},
            {"title": "T4 — Plásticos y Residuos en el Mar", "order": 4, "episodes": [
                {"title": "MARPOL Anexo V en acción", "order": 1},
                {"title": "Iniciativas de reducción", "order": 2},
                {"title": "Responsabilidad del marino", "order": 3},
            ]},
            {"title": "T5 — Descarbonización y Combustibles del Futuro", "order": 5, "episodes": [
                {"title": "IMO 2050 strategy", "order": 1},
                {"title": "GNL, metanol, amoníaco, H2", "order": 2},
                {"title": "Eficiencia energética en la práctica", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "security-awareness",
        "title": "Concienciación sobre Seguridad Marítima",
        "description": "Código ISPS, reconocimiento de amenazas, responsabilidades del marino, piratería (BMP5) y ciberseguridad a bordo.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Código ISPS — Fundamentos", "order": 1, "episodes": [
                {"title": "Qué es el ISPS", "order": 1},
                {"title": "Niveles de protección (1, 2, 3)", "order": 2},
                {"title": "Plan de protección del buque (SSP)", "order": 3},
            ]},
            {"title": "T2 — Reconocer Amenazas", "order": 2, "episodes": [
                {"title": "Tipos de amenazas", "order": 1},
                {"title": "Indicadores de actividad sospechosa", "order": 2},
                {"title": "Reporting chain", "order": 3},
            ]},
            {"title": "T3 — Responsabilidades del Marino", "order": 3, "episodes": [
                {"title": "Familiarización de seguridad", "order": 1},
                {"title": "Zonas de acceso restringido", "order": 2},
                {"title": "Registro de visitantes", "order": 3},
            ]},
            {"title": "T4 — Piratería y Robo a Mano Armada", "order": 4, "episodes": [
                {"title": "BMP5 (Best Management Practices)", "order": 1},
                {"title": "Áreas de alto riesgo (HRA)", "order": 2},
                {"title": "Citadel concept", "order": 3},
            ]},
            {"title": "T5 — Ciberseguridad para Marinos", "order": 5, "episodes": [
                {"title": "IMO MSC-FAL.1/Circ.3", "order": 1},
                {"title": "Sistemas vulnerables a bordo", "order": 2},
                {"title": "Buenas prácticas cibermarinas", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "dp-operations",
        "title": "Operaciones de Posicionamiento Dinámico (DP)",
        "description": "Sistemas DP: clases DP1/2/3, sensores, redundancia/FMEA, modos operativos, operaciones específicas, incidentes y certificación IMCA/NI.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Concepto y Equipos DP", "order": 1, "episodes": [
                {"title": "Qué es el DP", "order": 1},
                {"title": "Clases DP1/DP2/DP3", "order": 2},
                {"title": "Sensores de posición (GPS, HiPAP, fanbeam)", "order": 3},
            ]},
            {"title": "T2 — Redundancia y FMEA", "order": 2, "episodes": [
                {"title": "Principio de redundancia", "order": 1},
                {"title": "DP FMEA", "order": 2},
                {"title": "Worst case failure design intent (WCDFI)", "order": 3},
            ]},
            {"title": "T3 — Modos Operativos DP", "order": 3, "episodes": [
                {"title": "AUTO, MANUAL, JOYSTICK", "order": 1},
                {"title": "Environmental model", "order": 2},
                {"title": "Thruster allocation", "order": 3},
            ]},
            {"title": "T4 — Operaciones DP Específicas", "order": 4, "episodes": [
                {"title": "DP drilling", "order": 1},
                {"title": "DP pipelaying", "order": 2},
                {"title": "DP crane operations", "order": 3},
                {"title": "DP personnel transfer", "order": 4},
            ]},
            {"title": "T5 — Incidentes DP e Investigaciones", "order": 5, "episodes": [
                {"title": "IMCA incident reports", "order": 1},
                {"title": "Loss of position", "order": 2},
                {"title": "Drive-off vs. drift-off", "order": 3},
                {"title": "Lecciones aprendidas", "order": 4},
            ]},
            {"title": "T6 — Esquema de Competencia DP (IMCA/NI)", "order": 6, "episodes": [
                {"title": "Diferencia IMCA vs. NI schemes", "order": 1},
                {"title": "Logbook", "order": 2},
                {"title": "Certificación DPOOW", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "anchor-handling",
        "title": "Anchor Handling Operations",
        "description": "Equipos y buques AHTS, fases de una operación AH, evaluación de riesgos, comunicación con plataforma y procedimientos de emergencia.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Equipos y Buques AH", "order": 1, "episodes": [
                {"title": "Tipos de anclas y cadenas", "order": 1},
                {"title": "Buques AHTS", "order": 2},
                {"title": "Winches y equipos de popa", "order": 3},
            ]},
            {"title": "T2 — Operaciones de Anchor Handling", "order": 2, "episodes": [
                {"title": "Fases de una operación AH", "order": 1},
                {"title": "Comunicación buque–plataforma", "order": 2},
                {"title": "Gestión de carga en popa", "order": 3},
            ]},
            {"title": "T3 — Evaluación de Riesgos", "order": 3, "episodes": [
                {"title": "Snap-back zones", "order": 1},
                {"title": "Tensión en cables", "order": 2},
                {"title": "Condiciones meteorológicas límite", "order": 3},
            ]},
            {"title": "T4 — Comunicación y Trabajo en Equipo", "order": 4, "episodes": [
                {"title": "Instrucciones del OIM", "order": 1},
                {"title": "Roles a bordo", "order": 2},
                {"title": "Radio procedure durante AH", "order": 3},
            ]},
            {"title": "T5 — Procedimientos de Emergencia", "order": 5, "episodes": [
                {"title": "Línea enredada", "order": 1},
                {"title": "Hombre al agua durante AH", "order": 2},
                {"title": "Pérdida de control del cable", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "huet-heli-surv",
        "title": "HUET y Supervivencia en Helicóptero",
        "description": "Seguridad en helidecks, operaciones de helicóptero, técnica HUET paso a paso, supervivencia tras amerizaje y certificación OPITO.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Seguridad en Helidecks", "order": 1, "episodes": [
                {"title": "Tipos de helideck (offshore/barco)", "order": 1},
                {"title": "Señalización", "order": 2},
                {"title": "Procedimientos de embarco/desembarco", "order": 3},
            ]},
            {"title": "T2 — Operaciones de Helicóptero", "order": 2, "episodes": [
                {"title": "Tipos de helicópteros en offshore", "order": 1},
                {"title": "Comunicación pasajero–piloto", "order": 2},
                {"title": "Equipo de supervivencia personal", "order": 3},
            ]},
            {"title": "T3 — Técnicas de Escape Subacuático (HUET)", "order": 3, "episodes": [
                {"title": "Procedimiento HUET paso a paso", "order": 1},
                {"title": "Bloqueadores HEEDS", "order": 2},
                {"title": "Señales de distress bajo agua", "order": 3},
            ]},
            {"title": "T4 — Supervivencia tras Amerizaje", "order": 4, "episodes": [
                {"title": "Fase de retención", "order": 1},
                {"title": "Orientación invertida", "order": 2},
                {"title": "Uso del chaleco en agua", "order": 3},
                {"title": "Agrupamiento", "order": 4},
            ]},
            {"title": "T5 — Certificación OPITO HUET", "order": 5, "episodes": [
                {"title": "Estructura del curso", "order": 1},
                {"title": "Componentes prácticos y teóricos", "order": 2},
                {"title": "Revalidación cada 4 años", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "fishing-gear-ops",
        "title": "Operaciones con Artes de Pesca",
        "description": "Tipos de artes de pesca, maniobras de calado y virado, winches hidráulicos, mantenimiento de artes y seguridad en cubierta de pesca.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Tipos de Artes de Pesca", "order": 1, "episodes": [
                {"title": "Redes de arrastre", "order": 1},
                {"title": "Palangres", "order": 2},
                {"title": "Redes de cerco", "order": 3},
                {"title": "Trasmallos", "order": 4},
                {"title": "Nasas", "order": 5},
            ]},
            {"title": "T2 — Maniobras de Calado y Virado", "order": 2, "episodes": [
                {"title": "Preparación de redes", "order": 1},
                {"title": "Lanzamiento al agua", "order": 2},
                {"title": "Virado mecánico", "order": 3},
                {"title": "Clasificación de captura", "order": 4},
            ]},
            {"title": "T3 — Winches y Sistemas Hidráulicos", "order": 3, "episodes": [
                {"title": "Funcionamiento del winche de arrastre", "order": 1},
                {"title": "Mantenimiento", "order": 2},
                {"title": "Fallas comunes", "order": 3},
            ]},
            {"title": "T4 — Mantenimiento de Artes", "order": 4, "episodes": [
                {"title": "Reparación de mallas", "order": 1},
                {"title": "Flotadores y lastres", "order": 2},
                {"title": "Cuidado del aparejo", "order": 3},
            ]},
            {"title": "T5 — Seguridad en Cubierta de Pesca", "order": 5, "episodes": [
                {"title": "Riesgos de enredamiento", "order": 1},
                {"title": "Protocolos de seguridad", "order": 2},
                {"title": "EPI específico para pesca", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "catch-handling",
        "title": "Manejo y Procesado de Captura",
        "description": "Calidad del pescado, procesado a bordo, cadena de frío, documentación de captura e higiene sanitaria según normativa europea.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Calidad del Pescado y Preservación", "order": 1, "episodes": [
                {"title": "Proceso de deterioro", "order": 1},
                {"title": "Hielo y refrigeración", "order": 2},
                {"title": "Clasificación de calidad", "order": 3},
            ]},
            {"title": "T2 — Métodos de Procesado a Bordo", "order": 2, "episodes": [
                {"title": "Eviscerado", "order": 1},
                {"title": "Fileteado", "order": 2},
                {"title": "Envasado en atmósfera modificada", "order": 3},
            ]},
            {"title": "T3 — Cadena de Frío y Almacenamiento", "order": 3, "episodes": [
                {"title": "Bodegas frigoríficas", "order": 1},
                {"title": "Control de temperatura", "order": 2},
                {"title": "Registros HACCP", "order": 3},
            ]},
            {"title": "T4 — Documentación de Captura", "order": 4, "episodes": [
                {"title": "Diario de pesca (EU logbook)", "order": 1},
                {"title": "Certificados de capturas", "order": 2},
                {"title": "Trazabilidad", "order": 3},
            ]},
            {"title": "T5 — Higiene y Normativa Sanitaria", "order": 5, "episodes": [
                {"title": "Estándares de higiene a bordo", "order": 1},
                {"title": "EC 853/2004", "order": 2},
                {"title": "Inspecciones sanitarias", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "yacht-seamanship",
        "title": "Seamanship para Yates",
        "description": "Navegación a vela, maniobra del yate, seamanship con mal tiempo, guardias nocturnas y responsabilidades medioambientales bajo LY3.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Principios de Navegación a Vela", "order": 1, "episodes": [
                {"title": "Teoría del viento aparente", "order": 1},
                {"title": "Puntos de vela", "order": 2},
                {"title": "Maniobras básicas (virar, trasluchar)", "order": 3},
            ]},
            {"title": "T2 — Manejo del Yate", "order": 2, "episodes": [
                {"title": "Atracar y desatracar", "order": 1},
                {"title": "Fondeo", "order": 2},
                {"title": "Manejo en condiciones difíciles", "order": 3},
                {"title": "Marcha atrás", "order": 4},
            ]},
            {"title": "T3 — Seamanship con Mal Tiempo", "order": 3, "episodes": [
                {"title": "Reducción de aparejo", "order": 1},
                {"title": "Técnicas en capear", "order": 2},
                {"title": "Surfeo", "order": 3},
                {"title": "Precauciones en travesías", "order": 4},
            ]},
            {"title": "T4 — Navegación Nocturna y Guardias", "order": 4, "episodes": [
                {"title": "Organización de guardias en yates", "order": 1},
                {"title": "Visibilidad reducida", "order": 2},
                {"title": "Luces de navegación", "order": 3},
            ]},
            {"title": "T5 — Medio Marino y Código LY3", "order": 5, "episodes": [
                {"title": "Responsabilidades bajo el Large Yacht Code", "order": 1},
                {"title": "Medioambiente", "order": 2},
                {"title": "Gestión de residuos en yates", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "passenger-safety",
        "title": "Seguridad de Pasajeros a Bordo",
        "description": "Muster y familiarización, gestión de multitudes, evacuación en buques de pasaje, pasajeros vulnerables y comunicación de crisis.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Embarco, Muster y Familiarización", "order": 1, "episodes": [
                {"title": "Ejercicio de abandono obligatorio", "order": 1},
                {"title": "Explicación a pasajeros", "order": 2},
                {"title": "Señalética", "order": 3},
            ]},
            {"title": "T2 — Gestión de Multitudes", "order": 2, "episodes": [
                {"title": "Psicología del pánico", "order": 1},
                {"title": "Técnicas de control", "order": 2},
                {"title": "Rutas de evacuación", "order": 3},
            ]},
            {"title": "T3 — Evacuación y LSA en Buques de Pasaje", "order": 3, "episodes": [
                {"title": "Sistemas de evacuación marinoevac", "order": 1},
                {"title": "Botes inclinados", "order": 2},
                {"title": "Plataformas de embarco", "order": 3},
            ]},
            {"title": "T4 — Pasajeros Vulnerables", "order": 4, "episodes": [
                {"title": "Personas con movilidad reducida", "order": 1},
                {"title": "Niños", "order": 2},
                {"title": "Pasajeros con necesidades especiales", "order": 3},
                {"title": "Procedimientos específicos", "order": 4},
            ]},
            {"title": "T5 — Comunicación de Crisis", "order": 5, "episodes": [
                {"title": "Anuncios en PA", "order": 1},
                {"title": "Idiomas", "order": 2},
                {"title": "Manejo de desinformación", "order": 3},
                {"title": "Comunicación con familia", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "tanker-operations",
        "title": "Operaciones en Buques Tanque",
        "description": "Tipos de tanqueros, operaciones de carga/descarga, sistema de gas inerte (IGS), limpieza de tanques y gestión de seguridad SIRE/CDI.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Tipos de Tanqueros y Rutas", "order": 1, "episodes": [
                {"title": "Crude, product, VLCC, ULCC, Aframax", "order": 1},
                {"title": "Rutas comerciales", "order": 2},
                {"title": "Economía del mercado tanquero", "order": 3},
            ]},
            {"title": "T2 — Operaciones de Carga y Descarga", "order": 2, "episodes": [
                {"title": "Conexión de mangueras", "order": 1},
                {"title": "Tasas de carga", "order": 2},
                {"title": "Control de nivel", "order": 3},
                {"title": "Documentos STS", "order": 4},
            ]},
            {"title": "T3 — Sistemas de Gas Inerte (IGS)", "order": 3, "episodes": [
                {"title": "Por qué se usa el IGS", "order": 1},
                {"title": "Funcionamiento del inertizador", "order": 2},
                {"title": "Purga y gas-freeing", "order": 3},
            ]},
            {"title": "T4 — Limpieza de Tanques y Gas-Freeing", "order": 4, "episodes": [
                {"title": "COW (Crude Oil Washing)", "order": 1},
                {"title": "Water washing", "order": 2},
                {"title": "Entry procedures", "order": 3},
                {"title": "Toxic gas monitoring", "order": 4},
            ]},
            {"title": "T5 — Gestión de Seguridad en Tanqueros", "order": 5, "episodes": [
                {"title": "SIRE/CDI checklist de seguridad", "order": 1},
                {"title": "Precauciones con carga", "order": 2},
                {"title": "Procedimientos de emergencia", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "gas-carrier-ops",
        "title": "Operaciones en Buques Gaseros (LNG/LPG)",
        "description": "Propiedades del gas, sistemas de contención criogénica, operaciones LNG/LPG, gestión del boil-off y procedimientos de emergencia con gas.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Propiedades y Peligros del Gas", "order": 1, "episodes": [
                {"title": "LNG vs. LPG", "order": 1},
                {"title": "Criogenia", "order": 2},
                {"title": "Temperatura de ebullición", "order": 3},
                {"title": "BLEVE", "order": 4},
                {"title": "Vapour cloud", "order": 5},
            ]},
            {"title": "T2 — Sistemas de Contención de Carga", "order": 2, "episodes": [
                {"title": "Tipos de tanques (Moss, membrana)", "order": 1},
                {"title": "Materiales criogénicos", "order": 2},
                {"title": "Inspección de tanques", "order": 3},
            ]},
            {"title": "T3 — Carga y Descarga LNG/LPG", "order": 3, "episodes": [
                {"title": "Cooldown", "order": 1},
                {"title": "Loading arms", "order": 2},
                {"title": "Tasas de carga", "order": 3},
                {"title": "Monitoring de presión/temperatura", "order": 4},
            ]},
            {"title": "T4 — Gestión del Boil-Off", "order": 4, "episodes": [
                {"title": "Gas natural evaporado (BOG)", "order": 1},
                {"title": "Relicuefacción", "order": 2},
                {"title": "Uso como combustible (DFDE)", "order": 3},
            ]},
            {"title": "T5 — Procedimientos de Emergencia", "order": 5, "episodes": [
                {"title": "Fuga de gas", "order": 1},
                {"title": "ESD system", "order": 2},
                {"title": "Escape y mustering", "order": 3},
                {"title": "Acción tras alarma de gas", "order": 4},
            ]},
        ],
    },

    # ── CATEGORY 4: INDUSTRY STANDARDS & PUBLICATIONS ─────────────────────
    {
        "badge_id": "isgott",
        "title": "ISGOTT — International Safety Guide for Oil Tankers & Terminals",
        "description": "Guía de referencia para operaciones seguras entre buques tanque y terminales: interfaz buque-terminal, checklists ISGOTT y respuesta de emergencia.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Qué es ISGOTT y a quién aplica", "order": 1, "episodes": [
                {"title": "Historia del ISGOTT", "order": 1},
                {"title": "Alcance", "order": 2},
                {"title": "OCIMF / ICS / IAPH", "order": 3},
                {"title": "6ª edición", "order": 4},
            ]},
            {"title": "T2 — Interfaz Buque–Terminal", "order": 2, "episodes": [
                {"title": "Carta de acuerdo buque-terminal", "order": 1},
                {"title": "Safety checklist", "order": 2},
                {"title": "Roles de personas de guardia", "order": 3},
            ]},
            {"title": "T3 — Operaciones de Carga Seguras", "order": 3, "episodes": [
                {"title": "Control de presión", "order": 1},
                {"title": "Medición de tanques", "order": 2},
                {"title": "Atmósferas peligrosas", "order": 3},
            ]},
            {"title": "T4 — Checklists de Seguridad ISGOTT", "order": 4, "episodes": [
                {"title": "Pre-arrival", "order": 1},
                {"title": "Pre-transfer", "order": 2},
                {"title": "During transfer", "order": 3},
                {"title": "Departure", "order": 4},
                {"title": "Uso práctico", "order": 5},
            ]},
            {"title": "T5 — Respuesta de Emergencia", "order": 5, "episodes": [
                {"title": "Derrame", "order": 1},
                {"title": "Incendio en terminal", "order": 2},
                {"title": "Emergencias de salud", "order": 3},
                {"title": "Comunicación con terminales", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "ocimf-sire-2",
        "title": "OCIMF SIRE 2.0 — Ship Inspection Report Programme",
        "description": "El nuevo SIRE 2.0 digitaliza la inspección de tanqueros: plataforma OCIMF, tablet del inspector, VPQ y librería de preguntas con scoring system.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — De SIRE 1 a SIRE 2.0", "order": 1, "episodes": [
                {"title": "Qué cambió", "order": 1},
                {"title": "Sistema digital", "order": 2},
                {"title": "Plataforma OCIMF", "order": 3},
                {"title": "Rol del inspector y el buque", "order": 4},
            ]},
            {"title": "T2 — El Proceso de Inspección Digital", "order": 2, "episodes": [
                {"title": "Notificación", "order": 1},
                {"title": "Documentación previa", "order": 2},
                {"title": "Tablet del inspector", "order": 3},
                {"title": "Reporte online", "order": 4},
            ]},
            {"title": "T3 — VPQ — Vessel Particulars Questionnaire", "order": 3, "episodes": [
                {"title": "Actualización del VPQ", "order": 1},
                {"title": "Campos críticos", "order": 2},
                {"title": "Errores comunes", "order": 3},
            ]},
            {"title": "T4 — La Librería de Preguntas", "order": 4, "episodes": [
                {"title": "Estructura por capítulos", "order": 1},
                {"title": "Tipos de observación", "order": 2},
                {"title": "Scoring system", "order": 3},
            ]},
            {"title": "T5 — Preparación para SIRE 2.0", "order": 5, "episodes": [
                {"title": "Plan de preparación", "order": 1},
                {"title": "Rol del capitán", "order": 2},
                {"title": "Deficiencias frecuentes", "order": 3},
                {"title": "Post-inspección", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "ocimf-meg4",
        "title": "OCIMF MEG4 — Mooring Equipment Guidelines (4ª Edición)",
        "description": "Estándares OCIMF para líneas de amarre, winches y operaciones de amarre seguro: fibras HMPE, snap-back zones y casos de incidentes.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — MEG4 Overview", "order": 1, "episodes": [
                {"title": "Qué cambió respecto a MEG3", "order": 1},
                {"title": "Clasificación de amarras", "order": 2},
                {"title": "Tail ropes y MBL", "order": 3},
            ]},
            {"title": "T2 — Estándares de Líneas de Amarre", "order": 2, "episodes": [
                {"title": "Fibras (nylon, poliéster, HMPE)", "order": 1},
                {"title": "Clasificación de fuerza", "order": 2},
                {"title": "Degradación y retiro", "order": 3},
            ]},
            {"title": "T3 — Winches y Maquinillas", "order": 3, "episodes": [
                {"title": "Frenos", "order": 1},
                {"title": "Auto-tensioning", "order": 2},
                {"title": "Mantenimiento de winches", "order": 3},
                {"title": "Load monitoring", "order": 4},
            ]},
            {"title": "T4 — Operaciones de Amarre Seguras", "order": 4, "episodes": [
                {"title": "Snap-back zones", "order": 1},
                {"title": "Tensiones seguras", "order": 2},
                {"title": "Comunicación buque–muelle", "order": 3},
            ]},
            {"title": "T5 — Casos de Incidentes de Amarre", "order": 5, "episodes": [
                {"title": "Parted lines", "order": 1},
                {"title": "OCIMF case studies", "order": 2},
                {"title": "Lecciones y mejoras", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "ocimf-osv-rec",
        "title": "OCIMF OSV Recommendations — Buques de Apoyo Offshore",
        "description": "Recomendaciones OCIMF para OSVs: transferencia offshore, DP en contexto offshore e inspección OCIMF para buques de apoyo.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Las Recomendaciones OSV de OCIMF", "order": 1, "episodes": [
                {"title": "Alcance", "order": 1},
                {"title": "Tipos de OSV cubiertos", "order": 2},
                {"title": "Diferencias con SIRE", "order": 3},
            ]},
            {"title": "T2 — Operaciones de Transferencia Offshore", "order": 2, "episodes": [
                {"title": "Transferencia de personal", "order": 1},
                {"title": "Crane lift operations", "order": 2},
                {"title": "Límites de operación", "order": 3},
            ]},
            {"title": "T3 — DP en Contexto Offshore", "order": 3, "episodes": [
                {"title": "Requisitos DP para OSVs", "order": 1},
                {"title": "DP trials anuales", "order": 2},
                {"title": "Gestión de incidentes", "order": 3},
            ]},
            {"title": "T4 — Inspección OCIMF para OSVs", "order": 4, "episodes": [
                {"title": "Estructura de la inspección", "order": 1},
                {"title": "Aspectos críticos", "order": 2},
                {"title": "Preparación del buque", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "ocimf-tmsa",
        "title": "OCIMF TMSA 3 — Tanker Management & Self Assessment",
        "description": "Herramienta de autoevaluación para gestión de tanqueros: 13 elementos, KPIs, planes de mejora y presentación a OCIMF.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Introducción al TMSA 3", "order": 1, "episodes": [
                {"title": "Para qué sirve", "order": 1},
                {"title": "Relación con SIRE", "order": 2},
                {"title": "Estructura de 13 elementos", "order": 3},
            ]},
            {"title": "T2 — Elementos 1–4: Gestión y Seguridad", "order": 2, "episodes": [
                {"title": "SMS", "order": 1},
                {"title": "Gestión de riesgos", "order": 2},
                {"title": "Liderazgo", "order": 3},
                {"title": "Gestión de contratistas", "order": 4},
            ]},
            {"title": "T3 — Elementos 5–8: Operaciones y Mantenimiento", "order": 3, "episodes": [
                {"title": "Fiabilidad de equipos", "order": 1},
                {"title": "Inspecciones", "order": 2},
                {"title": "Respuesta a emergencias", "order": 3},
                {"title": "Formación", "order": 4},
            ]},
            {"title": "T4 — Elementos 9–12: Marine, Carga, Ambiental, Emergencias", "order": 4, "episodes": [
                {"title": "Navegación segura", "order": 1},
                {"title": "Operaciones de carga", "order": 2},
                {"title": "Medio ambiente", "order": 3},
                {"title": "Planificación de contingencias", "order": 4},
            ]},
            {"title": "T5 — Proceso de Autoevaluación TMSA", "order": 5, "episodes": [
                {"title": "Cómo completar el TMSA", "order": 1},
                {"title": "KPIs", "order": 2},
                {"title": "Planes de mejora", "order": 3},
                {"title": "Presentación a OCIMF", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "cdi-scheme",
        "title": "CDI — Chemical Distribution Institute Inspection Scheme",
        "description": "Esquema de inspección CDI para tanqueros químicos: diferencias con SIRE, proceso de inspección y preparación del buque.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Qué es CDI y Para Qué Sirve", "order": 1, "episodes": [
                {"title": "Vetting de buques tanque químicos", "order": 1},
                {"title": "Diferencias con SIRE", "order": 2},
                {"title": "Compañías que lo requieren", "order": 3},
            ]},
            {"title": "T2 — Estructura de la Inspección CDI", "order": 2, "episodes": [
                {"title": "Fases de la inspección", "order": 1},
                {"title": "Cuestionario de buque", "order": 2},
                {"title": "Áreas de enfoque", "order": 3},
            ]},
            {"title": "T3 — Deficiencias Comunes en CDI", "order": 3, "episodes": [
                {"title": "Problemas recurrentes", "order": 1},
                {"title": "Cómo abordarlos", "order": 2},
                {"title": "Gestión de observaciones", "order": 3},
            ]},
            {"title": "T4 — Preparación para una Inspección CDI", "order": 4, "episodes": [
                {"title": "Documentación clave", "order": 1},
                {"title": "Rol del capitán y officers", "order": 2},
                {"title": "Post-inspección", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "opito-bosiet",
        "title": "OPITO BOSIET — Basic Offshore Safety Induction & Emergency Training",
        "description": "Inducción de seguridad offshore: riesgos de gas/incendio, auto-rescate, supervivencia en el mar y escape subacuático de helicóptero (HUET).",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Introducción al Ambiente Offshore", "order": 1, "episodes": [
                {"title": "Tipos de instalaciones", "order": 1},
                {"title": "Riesgos únicos del offshore", "order": 2},
                {"title": "Normativa de acceso", "order": 3},
            ]},
            {"title": "T2 — Conciencia sobre Fuego y Explosión", "order": 2, "episodes": [
                {"title": "Riesgos de gas", "order": 1},
                {"title": "Ignición", "order": 2},
                {"title": "Procedimientos de alarma", "order": 3},
                {"title": "Uso de EPI", "order": 4},
            ]},
            {"title": "T3 — Auto-Rescate y Evacuación", "order": 3, "episodes": [
                {"title": "Rutas de escape", "order": 1},
                {"title": "Zonas de muster", "order": 2},
                {"title": "Uso de EEBD", "order": 3},
                {"title": "Evacuación por slide", "order": 4},
            ]},
            {"title": "T4 — Supervivencia en el Mar", "order": 4, "episodes": [
                {"title": "Técnicas de entrada al agua", "order": 1},
                {"title": "Trajes de inmersión", "order": 2},
                {"title": "Uso del chaleco", "order": 3},
                {"title": "Agrupamiento", "order": 4},
            ]},
            {"title": "T5 — HUET — Escape de Helicóptero Sumergido", "order": 5, "episodes": [
                {"title": "Procedimiento paso a paso", "order": 1},
                {"title": "Orientación invertida", "order": 2},
                {"title": "HEEDS bottle", "order": 3},
                {"title": "Certificación OPITO", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "opito-huet",
        "title": "OPITO HUET — Helicopter Underwater Escape Training",
        "description": "Técnica de salida de emergencia de helicóptero sumergido, supervivencia post-amerizaje y revalidación OPITO cada 4 años.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Escenarios de Amerizaje de Helicóptero", "order": 1, "episodes": [
                {"title": "Estadísticas", "order": 1},
                {"title": "Tipos de amerizaje", "order": 2},
                {"title": "Por qué el HUET salva vidas", "order": 3},
            ]},
            {"title": "T2 — Técnica de Salida de Emergencia", "order": 2, "episodes": [
                {"title": "Posición de emergencia", "order": 1},
                {"title": "Esperar la estabilización", "order": 2},
                {"title": "Abrir ventana/puerta", "order": 3},
                {"title": "Salida bajo agua", "order": 4},
            ]},
            {"title": "T3 — Supervivencia Post-Amerizaje", "order": 3, "episodes": [
                {"title": "Alejarse del helicóptero", "order": 1},
                {"title": "Inflado del chaleco", "order": 2},
                {"title": "Uso del traje de inmersión", "order": 3},
            ]},
            {"title": "T4 — Certificación y Revalidación OPITO", "order": 4, "episodes": [
                {"title": "Formato del curso (piscina)", "order": 1},
                {"title": "Componentes evaluados", "order": 2},
                {"title": "Revalidación cada 4 años", "order": 3},
                {"title": "Proveedores aprobados", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "dp-operator-ni",
        "title": "DP Operator — Nautical Institute Competence Scheme",
        "description": "Esquema de competencia NI para operadores DP: responsabilidades del DPOOW, manejo de incidentes, logbook y preparación para certificación.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Esquema de Competencia NI DP", "order": 1, "episodes": [
                {"title": "Historia del esquema", "order": 1},
                {"title": "Diferencias IMCA vs. NI", "order": 2},
                {"title": "Rutas de certificación", "order": 3},
            ]},
            {"title": "T2 — DPOOW — Responsabilidades del DP Watch Officer", "order": 2, "episodes": [
                {"title": "Rol a bordo", "order": 1},
                {"title": "Vigilancia del sistema DP", "order": 2},
                {"title": "Condiciones de operación segura", "order": 3},
            ]},
            {"title": "T3 — Manejo de Incidentes DP", "order": 3, "episodes": [
                {"title": "Reconocer pérdida de posición", "order": 1},
                {"title": "Acción inmediata", "order": 2},
                {"title": "Comunicación", "order": 3},
                {"title": "Reporte", "order": 4},
            ]},
            {"title": "T4 — DP Logbook y Portfolio", "order": 4, "episodes": [
                {"title": "Cómo registrar la experiencia", "order": 1},
                {"title": "Horas requeridas", "order": 2},
                {"title": "Tipos de operaciones válidas", "order": 3},
            ]},
            {"title": "T5 — Preparación para Certificación DP", "order": 5, "episodes": [
                {"title": "Examen teórico NI", "order": 1},
                {"title": "Criterios de evaluación práctica", "order": 2},
                {"title": "Proveedores de entrenamiento", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "ics-bridge-guide",
        "title": "ICS Bridge Procedures Guide (BPG)",
        "description": "Guía ICS para procedimientos en el puente: organización, planificación APEM, mejores prácticas de guardia, registros y procedimientos de emergencia.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Organización del Puente", "order": 1, "episodes": [
                {"title": "Manual del puente", "order": 1},
                {"title": "Roles de los oficiales", "order": 2},
                {"title": "Guardia de puente bajo STCW", "order": 3},
            ]},
            {"title": "T2 — Planificación del Viaje (APEM)", "order": 2, "episodes": [
                {"title": "Appraisal", "order": 1},
                {"title": "Planning", "order": 2},
                {"title": "Execution", "order": 3},
                {"title": "Monitoring — metodología paso a paso", "order": 4},
            ]},
            {"title": "T3 — Mejores Prácticas de Guardia", "order": 3, "episodes": [
                {"title": "Transferencia de guardia", "order": 1},
                {"title": "Lookout", "order": 2},
                {"title": "Uso de pilotos automáticos", "order": 3},
                {"title": "Supervisión", "order": 4},
            ]},
            {"title": "T4 — Comunicación y Registros", "order": 4, "episodes": [
                {"title": "Libro de bitácora oficial", "order": 1},
                {"title": "Radiotelefonía VHF", "order": 2},
                {"title": "Comunicación con el piloto", "order": 3},
            ]},
            {"title": "T5 — Procedimientos de Emergencia en el Puente", "order": 5, "episodes": [
                {"title": "Hombre al agua", "order": 1},
                {"title": "Encallamiento", "order": 2},
                {"title": "Colisión", "order": 3},
                {"title": "Incendio", "order": 4},
                {"title": "Roles del oficial de guardia", "order": 5},
            ]},
        ],
    },
    {
        "badge_id": "ics-tanker-guide",
        "title": "ICS Tanker Safety Guide — Guía de Seguridad para Buques Tanque",
        "description": "Guía ICS de seguridad para tanqueros de crudo, químicos y gas: verificaciones pre-operacionales, checklists y aspectos IGC.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Alcance de la Guía", "order": 1, "episodes": [
                {"title": "Distinción oil/chemical/gas", "order": 1},
                {"title": "Relación con ISGOTT y SIGTTO", "order": 2},
                {"title": "Actualización de edición", "order": 3},
            ]},
            {"title": "T2 — Verificaciones Pre-Operacionales", "order": 2, "episodes": [
                {"title": "Safety checklist del buque", "order": 1},
                {"title": "Inspección de equipos", "order": 2},
                {"title": "Comunicación con terminal", "order": 3},
            ]},
            {"title": "T3 — Medición y Documentación de Carga", "order": 3, "episodes": [
                {"title": "Ullage y sounding", "order": 1},
                {"title": "Cálculo de carga", "order": 2},
                {"title": "Bill of Lading y certificados de cantidad/calidad", "order": 3},
            ]},
            {"title": "T4 — Checklists de Seguridad del Tanquero", "order": 4, "episodes": [
                {"title": "Ship/shore checklist", "order": 1},
                {"title": "Autorización pre-transfer", "order": 2},
                {"title": "Verificación de equipos", "order": 3},
            ]},
            {"title": "T5 — Aspectos Específicos de Gas Carrier", "order": 5, "episodes": [
                {"title": "Diferencias con tanqueros líquidos", "order": 1},
                {"title": "Precauciones criogénicas", "order": 2},
                {"title": "IGC Code referencias", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "rightship-ghg",
        "title": "RightShip GHG Rating — Calificación de Eficiencia Carbónica",
        "description": "Escala A–G de RightShip: cómo se calcula, impacto en el flete, acciones de mejora y alineación con combustibles alternativos IMO 2050.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Qué es RightShip y el GHG Rating", "order": 1, "episodes": [
                {"title": "Plataforma de vetting digital", "order": 1},
                {"title": "Origen del GHG Rating", "order": 2},
                {"title": "Escala A–G", "order": 3},
            ]},
            {"title": "T2 — EEXI, CII e Indicadores de Carbono", "order": 2, "episodes": [
                {"title": "Diferencias EEDI/EEXI/CII", "order": 1},
                {"title": "Cómo se calcula la calificación", "order": 2},
                {"title": "Datos AIS utilizados", "order": 3},
            ]},
            {"title": "T3 — Impacto del GHG Rating en el Flete", "order": 3, "episodes": [
                {"title": "Cómo afecta el rating a la contratación", "order": 1},
                {"title": "Empresas que requieren A/B", "order": 2},
                {"title": "Tendencias", "order": 3},
            ]},
            {"title": "T4 — Mejorar la Calificación GHG", "order": 4, "episodes": [
                {"title": "Acciones operacionales (slow steaming, trim optimisation)", "order": 1},
                {"title": "Mejoras técnicas", "order": 2},
            ]},
            {"title": "T5 — Combustibles Alternativos y Net Zero", "order": 5, "episodes": [
                {"title": "GNL, metanol verde, amoníaco", "order": 1},
                {"title": "IMO 2050", "order": 2},
                {"title": "Alineación del buque con CII objetivo", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "imca-dp",
        "title": "IMCA Dynamic Positioning — Guidelines & Standards",
        "description": "Documentos IMCA clave (M 117, M 166, M 190), análisis de incidentes DP, FMEA/pruebas anuales y aplicación en distintos tipos de buque.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Rol de IMCA en la Industria DP", "order": 1, "episodes": [
                {"title": "Historia", "order": 1},
                {"title": "División Marine", "order": 2},
                {"title": "Documentos clave (M 117, M 166, M 190)", "order": 3},
            ]},
            {"title": "T2 — IMCA Incident Reports — Lecciones Aprendidas", "order": 2, "episodes": [
                {"title": "Tipos de incidentes reportados", "order": 1},
                {"title": "Pérdida de posición", "order": 2},
                {"title": "Tendencias anuales", "order": 3},
            ]},
            {"title": "T3 — DP FMEA y Pruebas Anuales", "order": 3, "episodes": [
                {"title": "Qué es un FMEA", "order": 1},
                {"title": "Quién lo realiza", "order": 2},
                {"title": "Annual DP trials", "order": 3},
                {"title": "Tabla de pruebas", "order": 4},
            ]},
            {"title": "T4 — Guías IMCA Clave", "order": 4, "episodes": [
                {"title": "M 117: Operación de buques DP", "order": 1},
                {"title": "M 166: Guidance on failure modes", "order": 2},
                {"title": "M 190: Operational authority", "order": 3},
            ]},
            {"title": "T5 — DP en Diferentes Tipos de Buques", "order": 5, "episodes": [
                {"title": "DP en drilling", "order": 1},
                {"title": "DP en pipelaying", "order": 2},
                {"title": "DP en heavy lift", "order": 3},
                {"title": "DP en buques de pasaje", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "ocimf-ovid",
        "title": "OCIMF OVID — Offshore Vessel Inspection Database",
        "description": "Base de datos de inspección OVID para OSVs: diferencias con SIRE, proceso de inspección, estándares de seguridad y preparación del buque.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Qué es OVID", "order": 1, "episodes": [
                {"title": "Base de datos de inspección", "order": 1},
                {"title": "Diferencias con SIRE", "order": 2},
                {"title": "Para qué lo usan los operadores", "order": 3},
            ]},
            {"title": "T2 — El Proceso de Inspección OVID", "order": 2, "episodes": [
                {"title": "Quién inspecciona", "order": 1},
                {"title": "Cuestionario OVID", "order": 2},
                {"title": "Áreas de enfoque (seguridad, DP, ops)", "order": 3},
            ]},
            {"title": "T3 — Estándares de Seguridad Específicos para OSVs", "order": 3, "episodes": [
                {"title": "Requisitos de cubierta", "order": 1},
                {"title": "Grúas", "order": 2},
                {"title": "Sistemas DP", "order": 3},
                {"title": "Amarres", "order": 4},
            ]},
            {"title": "T4 — Prepararse para una Inspección OVID", "order": 4, "episodes": [
                {"title": "Documentación clave", "order": 1},
                {"title": "Roles a bordo", "order": 2},
                {"title": "Deficiencias típicas", "order": 3},
                {"title": "Plan de acción post-inspección", "order": 4},
            ]},
        ],
    },

    # ── CATEGORY 0: CONVENTIONS (top-level) ───────────────────────────────────
    {
        "badge_id": "solas",
        "title": "SOLAS — Safety of Life at Sea",
        "description": "The cornerstone of maritime safety law. SOLAS sets minimum safety standards for the construction, equipment, and operation of merchant ships. First adopted in 1914 after the Titanic disaster, it is enforced through Flag State Control and Port State Control inspections worldwide.",
        "is_published": False,
        "seasons": [
            {"title": "S1 — Overview & History", "order": 1, "episodes": [
                {"title": "What is SOLAS and Why It Exists", "order": 1},
                {"title": "Structure of the Convention", "order": 2},
                {"title": "How SOLAS is Enforced", "order": 3},
                {"title": "Key Amendments — What Has Changed", "order": 4},
            ]},
            {"title": "S2 — Chapter II: Construction & Fire Safety", "order": 2, "episodes": [
                {"title": "Subdivision and Damage Stability", "order": 1},
                {"title": "Fire Protection Principles", "order": 2},
                {"title": "Fixed Firefighting Systems", "order": 3},
                {"title": "Fire Detection and Alarm Systems", "order": 4},
                {"title": "Fire Drills and Weekly Testing", "order": 5},
            ]},
            {"title": "S3 — Chapter III: Life-Saving Appliances", "order": 3, "episodes": [
                {"title": "Lifeboat Types and Requirements", "order": 1},
                {"title": "Life Rafts, Immersion Suits, and EPIRBs", "order": 2},
                {"title": "GMDSS and Distress Signals", "order": 3},
                {"title": "Muster and Abandon Ship Procedures", "order": 4},
                {"title": "Man Overboard — SOLAS and Best Practice", "order": 5},
            ]},
            {"title": "S4 — Chapter V: Safety of Navigation", "order": 4, "episodes": [
                {"title": "Voyage Planning — The Legal Requirement", "order": 1},
                {"title": "Bridge Equipment Requirements", "order": 2},
                {"title": "AIS — Automatic Identification System", "order": 3},
                {"title": "VDR — Voyage Data Recorder", "order": 4},
            ]},
            {"title": "S5 — Chapter XI: Special Measures", "order": 5, "episodes": [
                {"title": "Port State Control Inspections", "order": 1},
                {"title": "Company Identification Number (CIN)", "order": 2},
                {"title": "Continuous Synopsis Record (CSR)", "order": 3},
                {"title": "ISPS Code Introduction", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "ism-code",
        "title": "ISM Code — International Safety Management",
        "description": "The ISM Code (SOLAS Chapter IX) requires every shipping company and ship to have a certified Safety Management System (SMS). Introduced after the Herald of Free Enterprise and Estonia disasters, it shifted responsibility from the ship to the company. Understanding the ISM Code is mandatory knowledge for all officers.",
        "is_published": False,
        "seasons": [
            {"title": "S1 — The SMS Framework", "order": 1, "episodes": [
                {"title": "What is the ISM Code and Why It Exists", "order": 1},
                {"title": "The 12 Elements of an SMS", "order": 2},
                {"title": "Company vs. Ship Responsibilities", "order": 3},
                {"title": "The Designated Person Ashore (DPA)", "order": 4},
            ]},
            {"title": "S2 — Operational Requirements", "order": 2, "episodes": [
                {"title": "Master's Authority Under ISM", "order": 1},
                {"title": "Checklists, Procedures, and Permits to Work", "order": 2},
                {"title": "Emergency Preparedness", "order": 3},
                {"title": "Reporting Non-Conformities and Near Misses", "order": 4},
                {"title": "Maintenance and Critical Equipment", "order": 5},
            ]},
            {"title": "S3 — Audits & Certification", "order": 3, "episodes": [
                {"title": "Internal Audits — The Self-Check", "order": 1},
                {"title": "External Audits — Classification Society", "order": 2},
                {"title": "PSC and ISM Deficiencies", "order": 3},
                {"title": "Case Studies — When ISM Fails", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "stcw",
        "title": "STCW — Standards of Training, Certification and Watchkeeping",
        "description": "STCW is the international convention that sets minimum qualification standards for seafarers worldwide. Adopted in 1978 and substantially revised in 1995 and 2010 (Manila Amendments), it defines what every officer and rating must know, be able to do, and be certified in before serving on an internationally trading vessel.",
        "is_published": False,
        "seasons": [
            {"title": "S1 — The Convention", "order": 1, "episodes": [
                {"title": "STCW 1978 — Origins and Purpose", "order": 1},
                {"title": "Convention vs. Code — Part A and Part B", "order": 2},
                {"title": "The Manila Amendments 2010", "order": 3},
                {"title": "Flag State, Port State, and STCW", "order": 4},
            ]},
            {"title": "S2 — Basic Safety Training", "order": 2, "episodes": [
                {"title": "Personal Survival Techniques (VI/1-1)", "order": 1},
                {"title": "Fire Prevention and Firefighting (VI/1-2)", "order": 2},
                {"title": "Elementary First Aid (VI/1-3)", "order": 3},
                {"title": "Personal Safety and Social Responsibilities (VI/1-4)", "order": 4},
                {"title": "BST Revalidation — The 5-Year Rule", "order": 5},
            ]},
            {"title": "S3 — Watchkeeping Standards", "order": 3, "episodes": [
                {"title": "Chapter VIII — Watchkeeping Principles", "order": 1},
                {"title": "Minimum Rest Hours", "order": 2},
                {"title": "Fit for Duty", "order": 3},
                {"title": "Handover of the Watch", "order": 4},
            ]},
            {"title": "S4 — Certification, Endorsements & Revalidation", "order": 4, "episodes": [
                {"title": "Certificate of Competency (CoC) vs. Endorsement", "order": 1},
                {"title": "Revalidation — The 5-Year Cycle", "order": 2},
                {"title": "Panama AMP Certificates — Practical Guide", "order": 3},
                {"title": "Certificate Fraud and IMO GISIS Verification", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "marpol",
        "title": "MARPOL — Marine Pollution Convention",
        "description": "MARPOL 73/78 is the principal international convention controlling pollution from ships, covering oil, noxious liquid substances, packaged harmful goods, sewage, garbage, and air emissions across six Annexes.",
        "is_published": False,
        "seasons": [
            {"title": "S1 — Overview & Framework", "order": 1, "episodes": [
                {"title": "What is MARPOL and Why It Exists", "order": 1},
                {"title": "The Six Annexes at a Glance", "order": 2},
                {"title": "Flag State vs. Port State Control under MARPOL", "order": 3},
                {"title": "The MARPOL Special Areas", "order": 4},
            ]},
            {"title": "S2 — Annex I: Oil Pollution", "order": 2, "episodes": [
                {"title": "Oil Record Book Part I", "order": 1},
                {"title": "Oil Record Book Part II", "order": 2},
                {"title": "The 15ppm Rule", "order": 3},
                {"title": "Shipboard Oil Pollution Emergency Plan (SOPEP)", "order": 4},
                {"title": "MARPOL Annex I Amendments", "order": 5},
            ]},
            {"title": "S3 — Annex II: NLS (Noxious Liquid Substances)", "order": 3, "episodes": [
                {"title": "Categories X, Y, Z and OS", "order": 1},
                {"title": "Cargo Record Book (CRB) Requirements", "order": 2},
                {"title": "Pre-Wash and Stripping Procedures", "order": 3},
                {"title": "Discharge Rules and Port Reception", "order": 4},
            ]},
            {"title": "S4 — Annex III: Harmful Substances in Packaged Form", "order": 4, "episodes": [
                {"title": "What Annex III Covers", "order": 1},
                {"title": "IMDG Code Link — Classification and Identification", "order": 2},
                {"title": "Packaging, Marking, Labeling, and Documentation", "order": 3},
                {"title": "Stowage and Quantity Limitations", "order": 4},
            ]},
            {"title": "S5 — Annex IV: Sewage from Ships", "order": 5, "episodes": [
                {"title": "Sewage Treatment Equipment Requirements", "order": 1},
                {"title": "Discharge Standards and Restrictions", "order": 2},
                {"title": "Port Reception Facilities for Sewage", "order": 3},
                {"title": "Record-Keeping and PSC Inspection", "order": 4},
            ]},
            {"title": "S6 — Annex V: Garbage at Sea", "order": 6, "episodes": [
                {"title": "Garbage Management Plan", "order": 1},
                {"title": "What Can and Cannot Be Discharged", "order": 2},
                {"title": "Garbage Record Book Entries", "order": 3},
                {"title": "Placards and Garbage Management in Practice", "order": 4},
            ]},
            {"title": "S7 — Annex VI: Air Pollution", "order": 7, "episodes": [
                {"title": "MARPOL Annex VI Overview", "order": 1},
                {"title": "SOx Emission Control Areas (ECAs)", "order": 2},
                {"title": "NOx Tier Standards", "order": 3},
                {"title": "The Energy Efficiency Framework", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "marpol-ann-iii",
        "title": "MARPOL Anexo III — Sustancias Perjudiciales en Bulto",
        "description": "Control de la contaminación por sustancias perjudiciales transportadas en bulto: clasificación IMDG, embalaje, marcado, documentación, estiba y limitaciones de cantidad.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Alcance del Anexo III", "order": 1, "episodes": [
                {"title": "Qué cubre el Anexo III", "order": 1},
                {"title": "Relación con el Código IMDG", "order": 2},
                {"title": "Definición de sustancia perjudicial en bulto", "order": 3},
            ]},
            {"title": "T2 — Clasificación e Identificación", "order": 2, "episodes": [
                {"title": "Criterios de clasificación MARPOL III", "order": 1},
                {"title": "Números UN y Lista de Mercancías Peligrosas", "order": 2},
                {"title": "Sustancias específicamente listadas en Anexo III", "order": 3},
            ]},
            {"title": "T3 — Embalaje, Marcado y Documentación", "order": 3, "episodes": [
                {"title": "Requisitos de embalaje y envasado", "order": 1},
                {"title": "Marcado y etiquetado MARPOL", "order": 2},
                {"title": "Documentación de carga requerida", "order": 3},
                {"title": "Declaración del cargador", "order": 4},
            ]},
            {"title": "T4 — Estiba y Cumplimiento", "order": 4, "episodes": [
                {"title": "Requisitos de estiba a bordo", "order": 1},
                {"title": "Limitaciones de cantidad", "order": 2},
                {"title": "Excepciones y exenciones", "order": 3},
                {"title": "Inspección PSC bajo Anexo III", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "marpol-ann-iv",
        "title": "MARPOL Anexo IV — Aguas Sucias de los Buques",
        "description": "Prevención de la contaminación por aguas residuales: equipos de tratamiento, normas de descarga, instalaciones portuarias de recepción y registros.",
        "is_published": False,
        "seasons": [
            {"title": "T1 — Marco del Anexo IV", "order": 1, "episodes": [
                {"title": "Qué cubre el Anexo IV", "order": 1},
                {"title": "Buques sujetos al Anexo IV", "order": 2},
                {"title": "Certificado Internacional de Prevención de Contaminación por Aguas Sucias", "order": 3},
            ]},
            {"title": "T2 — Equipos de Tratamiento", "order": 2, "episodes": [
                {"title": "Planta de tratamiento de aguas residuales", "order": 1},
                {"title": "Triturador-desinfectante", "order": 2},
                {"title": "Tanque de retención (holding tank)", "order": 3},
                {"title": "Requisitos de aprobación de tipo", "order": 4},
            ]},
            {"title": "T3 — Normas y Restricciones de Descarga", "order": 3, "episodes": [
                {"title": "Descarga a más de 3 millas náuticas", "order": 1},
                {"title": "Zonas especiales y áreas protegidas", "order": 2},
                {"title": "Condiciones de descarga: velocidad mínima y caudal máximo", "order": 3},
                {"title": "Prohibición absoluta en zonas portuarias", "order": 4},
            ]},
            {"title": "T4 — Instalaciones y Registro", "order": 4, "episodes": [
                {"title": "Instalaciones portuarias de recepción de aguas sucias", "order": 1},
                {"title": "Libro de registro de aguas sucias (si aplica)", "order": 2},
                {"title": "Inspección PSC bajo Anexo IV", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "colregs",
        "title": "COLREGS — Collision Regulations",
        "description": "The International Regulations for Preventing Collisions at Sea (1972) set the rules of the road for every vessel on navigable waters worldwide: look-out, safe speed, risk of collision, give-way obligations, traffic separation, and the full system of navigation lights, shapes, and sound signals.",
        "is_published": False,
        "seasons": [
            {"title": "S1 — Framework & Applicability", "order": 1, "episodes": [
                {"title": "What COLREGS Are and Who They Apply To", "order": 1},
                {"title": "Structure of the Rules", "order": 2},
                {"title": "COLREGS Rule 2 — Responsibility", "order": 3},
            ]},
            {"title": "S2 — Conduct in Any Condition (Rules 4–10)", "order": 2, "episodes": [
                {"title": "Rule 5 — Look-Out", "order": 1},
                {"title": "Rule 6 — Safe Speed", "order": 2},
                {"title": "Rule 7 — Risk of Collision", "order": 3},
                {"title": "Rule 8 — Action to Avoid Collision", "order": 4},
                {"title": "Rule 10 — Traffic Separation Schemes (TSS)", "order": 5},
            ]},
            {"title": "S3 — Sailing, Crossing & Overtaking (Rules 11–18)", "order": 3, "episodes": [
                {"title": "Rules 11–12 — Sailing Vessels", "order": 1},
                {"title": "Rule 13 — Overtaking", "order": 2},
                {"title": "Rules 14–15 — Head-On and Crossing", "order": 3},
                {"title": "Rules 16–17 — Give-Way and Stand-On Obligations", "order": 4},
            ]},
            {"title": "S4 — Lights, Shapes & Sound Signals", "order": 4, "episodes": [
                {"title": "Navigation Lights", "order": 1},
                {"title": "Lights for Special Vessels", "order": 2},
                {"title": "Shapes", "order": 3},
                {"title": "Sound and Light Signals", "order": 4},
            ]},
        ],
    },
    {
        "badge_id": "ll-1966",
        "title": "Load Lines Convention 1966",
        "description": "The International Convention on Load Lines 1966 establishes minimum freeboard requirements for safe operation in different ocean zones and seasons. Rooted in Samuel Plimsoll's campaign against overloaded ships, it assigns each vessel a set of load line marks physically cut into the hull.",
        "is_published": False,
        "seasons": [
            {"title": "S1 — Load Lines: The Concept", "order": 1, "episodes": [
                {"title": "What is a Load Line and Why It Exists", "order": 1},
                {"title": "The Load Line Marks", "order": 2},
                {"title": "The Load Line Certificate", "order": 3},
            ]},
            {"title": "S2 — Freeboard Rules in Practice", "order": 2, "episodes": [
                {"title": "How Freeboard is Calculated", "order": 1},
                {"title": "Zones, Areas, and Seasonal Periods", "order": 2},
                {"title": "Deck Cargo and Special Cases", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "sar-1979",
        "title": "SAR Convention 1979 — Search and Rescue",
        "description": "The International Convention on Maritime Search and Rescue (1979) established a global framework dividing the world's oceans into SAR Regions assigned to coastal States. Every ship master has legal duties under SAR 1979, including the obligation to assist persons in distress.",
        "is_published": False,
        "seasons": [
            {"title": "S1 — SAR Organization", "order": 1, "episodes": [
                {"title": "The SAR Convention Structure", "order": 1},
                {"title": "RCC and MRCC", "order": 2},
                {"title": "SAR Plan and IAMSAR Manual", "order": 3},
            ]},
            {"title": "S2 — SAR Operations for Seafarers", "order": 2, "episodes": [
                {"title": "The Master's Duty to Render Assistance", "order": 1},
                {"title": "Distress Phases", "order": 2},
                {"title": "Search Patterns and Ship Roles", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "tonnage",
        "title": "Tonnage Convention 1969",
        "description": "The International Convention on Tonnage Measurement of Ships 1969 standardized how vessel size is measured. Gross Tonnage and Net Tonnage are volumetric measures that drive port dues, canal fees, SOLAS applicability thresholds, and manning requirements.",
        "is_published": False,
        "seasons": [
            {"title": "S1 — Tonnage Measurement", "order": 1, "episodes": [
                {"title": "GT, NT, and DWT", "order": 1},
                {"title": "The Tonnage Convention 1969", "order": 2},
                {"title": "Practical Implications", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "sua",
        "title": "SUA Convention — Suppression of Unlawful Acts",
        "description": "The Convention for the Suppression of Unlawful Acts Against the Safety of Maritime Navigation (Rome 1988, updated 2005) criminalizes acts of terrorism, seizure, and violence directed at ships. Born from the 1985 Achille Lauro hijacking, SUA works alongside the ISPS Code.",
        "is_published": False,
        "seasons": [
            {"title": "S1 — Maritime Security Law", "order": 1, "episodes": [
                {"title": "What is the SUA Convention", "order": 1},
                {"title": "SUA and the ISPS Code Link", "order": 2},
                {"title": "Piracy vs. SUA", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "fal",
        "title": "FAL Convention — Facilitation of Maritime Traffic",
        "description": "The Convention on Facilitation of International Maritime Traffic (FAL 1965) standardizes forms and procedures for ships entering and leaving ports worldwide. The 2023 amendments mandate Maritime Single Window systems in all member states.",
        "is_published": False,
        "seasons": [
            {"title": "S1 — Facilitation of Maritime Traffic", "order": 1, "episodes": [
                {"title": "What the FAL Convention Does", "order": 1},
                {"title": "FAL Forms", "order": 2},
                {"title": "e-Maritime and Single Window", "order": 3},
            ]},
        ],
    },
    {
        "badge_id": "ilo-188",
        "title": "ILO C188 — Work in Fishing Convention",
        "description": "The ILO Work in Fishing Convention (C188, 2007, in force 2017) is the MLC 2006 equivalent for the fishing sector, establishing minimum standards for employment, wages, hours of work and rest, accommodation, and medical care on fishing vessels over 24 metres.",
        "is_published": False,
        "seasons": [
            {"title": "S1 — Fishers' Work Rights", "order": 1, "episodes": [
                {"title": "What is ILO C188", "order": 1},
                {"title": "Fishing Vessel Agreements", "order": 2},
                {"title": "Hours of Work and Rest", "order": 3},
            ]},
            {"title": "S2 — Accommodation & Medical Care", "order": 2, "episodes": [
                {"title": "Accommodation Standards", "order": 1},
                {"title": "Medical Certificates and On-Board Care", "order": 2},
            ]},
        ],
    },
    {
        "badge_id": "torremolinos",
        "title": "Torremolinos Protocol — Fishing Vessel Safety",
        "description": "The Torremolinos International Convention (1977) and its 1993 Protocol establish construction, stability, machinery, life-saving, and fire safety standards for fishing vessels of 24 metres and over on international voyages — filling the SOLAS gap for fishing fleets.",
        "is_published": False,
        "seasons": [
            {"title": "S1 — Fishing Vessel Safety Convention", "order": 1, "episodes": [
                {"title": "History and Scope", "order": 1},
                {"title": "Construction and Safety Standards", "order": 2},
                {"title": "Life-Saving and Fire Safety", "order": 3},
            ]},
        ],
    },
]
