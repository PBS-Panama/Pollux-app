# Leto — STCW Regulation Reference
> **Instructivo para el IDE / compliance engine de Leto**
> Fuente: STCW Convention 1978, as amended 2010 (Manila Amendments)
> Vigente desde: 1 enero 2012 · Implementación completa: 1 enero 2017
> Referencia oficial: IMO STCW Code Part A + ITF Guide for Seafarers (2010 Manila Amendments)

---

## 1. ESTRUCTURA DEL CONVENIO STCW

El Convenio STCW se compone de tres partes:

1. **Los Artículos** — Responsabilidades legales de los países parte.
2. **El Anexo** — Detalles técnicos organizados en Capítulos (Regulations).
3. **El Código STCW** —
   - **Parte A:** Normas obligatorias (tablas de competencia).
   - **Parte B:** Pautas recomendadas (no obligatorias).

### Capítulos del Convenio

| Capítulo | Contenido |
|---|---|
| **Chapter I** | General provisions — certificación, revalidación, control |
| **Chapter II** | Master and deck department |
| **Chapter III** | Engine department |
| **Chapter IV** | Radio communications (GMDSS) |
| **Chapter V** | Special training requirements by ship type |
| **Chapter VI** | Emergency, occupational safety, medical care, survival |
| **Chapter VII** | Alternative certification (integrated ratings) |
| **Chapter VIII** | Watchkeeping |

---

## 2. NIVELES DE RESPONSABILIDAD Y FUNCIONES

STCW clasifica todos los cometidos a bordo en **7 áreas funcionales** a **3 niveles de responsabilidad**:

### Niveles de Responsabilidad

| Nivel | Descripción | Aplica a |
|---|---|---|
| **Management Level** | Nivel de gestión | Senior officers (Master, Chief Mate, Chief Engineer, 2nd Engineer) |
| **Operational Level** | Nivel operacional | Junior officers (OOW Deck, OOW Engine, ETO) |
| **Support Level** | Nivel de apoyo | Ratings forming part of a watch (AB, OS, Oiler, ETR) |

### Áreas Funcionales por Nivel

| Área Funcional | Management | Operational | Support |
|---|---|---|---|
| **Navigation** (Deck) | ✓ | ✓ | ✓ |
| **Cargo handling & stowage** (Deck) | ✓ | — | — |
| **Controlling ship operations & care of persons** (Deck+Engine) | ✓ | ✓ | — |
| **Marine engineering** (Engine) | ✓ | ✓ | ✓ |
| **Maintenance & repair** (Engine) | ✓ | ✓ | — |
| **Electrical, electronics & control engineering** (Engine) | ✓ | ✓ | — |
| **Radio communication** | ✓ (GOC) | ✓ (ROC) | — |

---

## 3. TIPOS DE CERTIFICADO STCW

| Tipo | Código | Descripción |
|---|---|---|
| **Certificate of Competence (CoC)** | C/R | Emitido por la administración. Obligatorio para capitanes, oficiales y operadores radio. Requiere revalidación. |
| **Certificate of Proficiency (CoP)** | D/P | Prueba documental de formación específica (BST, tanquero, barco de pasaje, etc.). |
| **Documentary Evidence** | D/P | Documento (no necesariamente de la administración) que prueba participación en formación a bordo (drills, ejercicios). |
| **Endorsement** | E/R | Refrendo de que el CoC cumple STCW. Emitido junto al certificado o por separado. Revalidación cada 5 años. |
| **Endorsement of Recognition** | E/R | Para marinos que trabajan bajo bandera extranjera. Emitido por la administración del país del barco. |

### Leyenda de columnas en tablas de certificados

| Código | Significado |
|---|---|
| **C/R** | Certificate Required — requiere certificado oficial |
| **D/P** | Documentary Proof — prueba documental suficiente |
| **T/O** | Training Onboard — formación a bordo, sin certificado |
| **E/R** | Endorsement Required — refrendo adicional obligatorio |

---

## 4. CERTIFICADOS UNIVERSALES (TODOS LOS RANGOS)

Estos certificados son **obligatorios para cualquier marino** que tenga responsabilidades de seguridad o prevención de contaminación, independientemente del rango o tipo de barco.

### 4.1 Basic Safety Training (BST) — STCW Reg. VI/1
Vigencia: dentro de los últimos **5 años** (refrendo requerido si ha pasado más de 5 años).

Comprende 4 módulos — todos obligatorios:

| Módulo | Código | Descripción |
|---|---|---|
| **PSSR** — Personal Survival and Safety Responsibilities | VI/1 | Técnicas de supervivencia personal |
| **EFA** — Elementary First Aid | VI/1 | Primeros auxilios elementales |
| **FPFF** — Fire Prevention and Fire Fighting | VI/1 | Prevención y lucha contra incendios básica |
| **PSR** — Personal Safety and Social Responsibilities | VI/1 | Seguridad personal y responsabilidades sociales |

> **Regla de compliance:** Si alguno de los 4 módulos del BST está vencido (+5 años) o falta, el marino **NO puede embarcar**. Bloqueo duro.

### 4.2 Medical Fitness Certificate — STCW Reg. I/9
- Revalidación: cada **2 años** (cada **1 año** si el marino es menor de 18).
- Si vence durante un viaje, el certificado se extiende hasta el siguiente puerto con médico reconocido, máximo **3 meses adicionales**.
- El certificado médico debe estar en el idioma del país emisor **y en inglés**.

> **Regla de compliance:** Médico vencido = no puede embarcar. Si vence dentro de los próximos 30 días = alerta crítica.

### 4.3 Familiarización a bordo (On-joining — no genera certificado)

Obligatoria **cada vez que el marino se une a un nuevo barco**. No genera certificado, pero se registra en el log del barco.

| Tipo | Reg. | Descripción |
|---|---|---|
| **Basic Safety Familiarisation** | VI/1 | Procedimientos de emergencia del barco específico |
| **Ship-Specific Familiarisation** | I/14 | Equipos, procedimientos de guardia y seguridad del barco |
| **Security Familiarisation** | VI/6 | Concienciación sobre protección marítima (ISPS) |

---

## 5. CERTIFICADOS POR RANGO — DEPARTAMENTO DE PUENTE (DECK)

### 5.1 MASTER (Capitán)
**STCW Regulation:** II/2
**Nivel:** Management Level
**Función STCW:** Navigation + Cargo handling + Controlling ship operations

#### Requisitos de certificación:
- **Barcos ≥ 3,000 GT:** 36 meses como OOW (reducible a 24 meses si 12 meses fueron como Chief Mate) + educación aprobada.
- **Barcos 500–3,000 GT:** Mismos requisitos de tiempo de servicio.
- **Barcos < 500 GT:** Edad mínima 20 años + 12 meses como OOW + educación aprobada.

#### Certificados requeridos:

| Certificado | Revalidación | Tipo | Reg. |
|---|---|---|---|
| National CoC + Endorsement | Sí (cada 5 años) | C/R | I/2, II/2 |
| Flag state Endorsement of Recognition | Sí | E/R | I/10 |
| GMDSS GOC (General Operator Certificate) | Sí | C/R | IV/2 |
| Basic Safety Training (BST) — 4 módulos | Dentro de 5 años | D/P | VI/1 |
| Medical First Aid | No | D/P | VI/4 |
| Survival Craft and Rescue Boats | Sí (5 años) | D/P | VI/2 |
| Advanced Fire Fighting | Sí (5 años) | D/P | VI/3 |
| Medical Fitness Certificate | Sí (2 años) | C/R | I/9 |
| Basic Safety Familiarisation | Al embarcar | T/O | VI/1 |
| Ship-Specific Familiarisation | Al embarcar | T/O | I/14 |
| Security Familiarisation | Al embarcar | T/O | VI/6 |

**Competencias adicionales (2010 Manila):** Bridge Resource Management (BRM), Leadership & Management skills.

---

### 5.2 CHIEF MATE (Primer Oficial de Puente)
**STCW Regulation:** II/2
**Nivel:** Management Level

#### Requisitos de certificación:
- **Barcos ≥ 3,000 GT:** 12 meses como OOW en barcos ≥ 500 GT + educación aprobada.
- **Barcos 500–3,000 GT:** Educación aprobada según A-II/2.

#### Certificados requeridos:
Idénticos al Master (ver tabla 5.1).

**Competencias adicionales (2010 Manila):** Bridge Resource Management (BRM), Leadership & Teamwork skills.

---

### 5.3 OFFICER IN CHARGE OF NAVIGATIONAL WATCH — OOW Deck (2nd / 3rd Mate)
**STCW Regulation:** II/1
**Nivel:** Operational Level

#### Requisitos de certificación:
- Edad mínima: **18 años**.
- Seagoing service: 12 meses en programa aprobado (con training record book) **o** 36 meses en departamento de puente.
- 6 meses de watchkeeping bajo supervisión del Master o Chief Mate.
- Competencia en radiocomunicaciones GMDSS.

#### Certificados requeridos:

| Certificado | Revalidación | Tipo | Reg. |
|---|---|---|---|
| National CoC + Endorsement | Sí (5 años) | C/R | I/2, II/1, II/3 |
| Flag state Endorsement of Recognition | Sí | E/R | I/10 |
| GMDSS ROC o GOC | Sí | C/R | IV/2 |
| ARPA / Radar | Sí | D/P | — |
| ECDIS | Sí | D/P | — |
| Basic Safety Training (BST) | Dentro de 5 años | D/P | VI/1 |
| Medical First Aid | No | D/P | VI/4 |
| Survival Craft and Rescue Boats | Sí (5 años) | D/P | VI/2 |
| Advanced Fire Fighting | Sí (5 años) | D/P | VI/3 |
| Medical Fitness Certificate | Sí (2 años) | C/R | I/9 |
| Basic Safety Familiarisation | Al embarcar | T/O | VI/1 |
| Ship-Specific Familiarisation | Al embarcar | T/O | I/14 |
| Security Familiarisation | Al embarcar | T/O | VI/6 |

> **Nota ECDIS:** Desde 2010 todos los oficiales de navegación deben tener conocimiento completo y capacidad de uso de ECDIS. Obligatorio.

---

### 5.4 RATING FORMING PART OF A NAVIGATIONAL WATCH (OS — Ordinary Seaman)
**STCW Regulation:** II/4
**Nivel:** Support Level

#### Requisitos:
- Edad mínima: **16 años**.
- 6 meses de servicio y experiencia aprobados **o** formación especial pre-sea + 2 meses de servicio aprobado.
- Solo aplica en barcos ≥ 500 GT.

#### Certificados requeridos:

| Certificado | Revalidación | Tipo | Reg. |
|---|---|---|---|
| National CoC | No | C/R | I/2, II/4 |
| Basic Safety Training (BST) | Dentro de 5 años | D/P | VI/1 |
| Medical Fitness Certificate | Sí (2 años) | C/R | I/9 |
| Basic Safety Familiarisation | Al embarcar | T/O | VI/1 |
| Ship-Specific Familiarisation | Al embarcar | T/O | I/14 |
| Security Familiarisation | Al embarcar | T/O | VI/6 |

---

### 5.5 ABLE SEAFARER DECK (AB — Able Bodied Seaman)
**STCW Regulation:** II/5
**Nivel:** Support Level (avanzado)

#### Requisitos:
- Edad mínima: **18 años**.
- Debe cumplir requisitos de OS (Rating II/4) primero.
- 18 meses de servicio aprobado en deck department **o** 12 meses + formación aprobada.
- Competencia según tabla A-II/5.

#### Certificados requeridos:

| Certificado | Revalidación | Tipo | Reg. |
|---|---|---|---|
| National CoC (AB) | No | C/R | I/2, II/5 |
| Proficiency in Survival Craft | Sí (5 años) | D/P | VI/2 |
| Basic Safety Training (BST) | Dentro de 5 años | D/P | VI/1 |
| Medical Fitness Certificate | Sí (2 años) | C/R | I/9 |
| Basic Safety Familiarisation | Al embarcar | T/O | VI/1 |
| Ship-Specific Familiarisation | Al embarcar | T/O | I/14 |
| Security Familiarisation | Al embarcar | T/O | VI/6 |

---

### 5.6 GMDSS RADIO OPERATOR
**STCW Regulation:** IV/2
**Niveles:** GOC (Management/Operational — deep sea) / ROC (Operational — coastal)

| Certificado | Área de operación |
|---|---|
| **GOC** — General Operator Certificate | Aguas profundas (más allá de cobertura VHF costera) — Zonas GMDSS A2, A3, A4 |
| **ROC** — Restricted Operator Certificate | Aguas costeras (dentro de cobertura VHF) — Zona GMDSS A1 |

GMDSS es obligatorio en:
- Todos los barcos de pasaje oceánicos (> 12 pasajeros).
- Barcos de carga ≥ 300 GT en viajes internacionales.

---

## 6. CERTIFICADOS POR RANGO — DEPARTAMENTO DE MÁQUINAS (ENGINE)

### 6.1 CHIEF ENGINEER (Jefe de Máquinas)
**STCW Regulation:** III/2, III/3
**Nivel:** Management Level

#### Requisitos de certificación:
- **Barcos ≥ 3,000 kW:** 36 meses como OOW Engine, de los cuales 12 meses como 2nd Engineer + educación aprobada.
- **Barcos 750–3,000 kW:** 24 meses como OOW Engine, de los cuales 12 meses como 2nd Engineer + educación aprobada.

#### Certificados requeridos:

| Certificado | Revalidación | Tipo | Reg. |
|---|---|---|---|
| National CoC + Endorsement | Sí (5 años) | C/R | I/2, III/2, III/3 |
| Flag state Endorsement of Recognition | Sí | E/R | I/10 |
| Basic Safety Training (BST) | Dentro de 5 años | D/P | VI/1 |
| Medical First Aid | No | D/P | VI/4 |
| Survival Craft and Rescue Boats | Sí (5 años) | D/P | VI/2 |
| Advanced Fire Fighting | Sí (5 años) | D/P | VI/3 |
| Medical Fitness Certificate | Sí (2 años) | C/R | I/9 |
| Basic Safety Familiarisation | Al embarcar | T/O | VI/1 |
| Ship-Specific Familiarisation | Al embarcar | T/O | I/14 |
| Security Familiarisation | Al embarcar | T/O | VI/6 |

**Competencias adicionales (2010 Manila):** Engine Resource Management (ERM), Leadership & Management skills, SDSD (Ship's Diesel Engine duties).

---

### 6.2 SECOND ENGINEER (Primer Oficial de Máquinas)
**STCW Regulation:** III/2, III/3
**Nivel:** Management Level

#### Requisitos:
- **Barcos ≥ 3,000 kW:** 12 meses como OOW Engine u oficial de máquinas asistente + educación aprobada.
- **Barcos 750–3,000 kW:** Mismos requisitos.

> Un 2nd Engineer certificado para ≥ 3,000 kW puede servir como Chief Engineer en barcos < 3,000 kW si tiene 12 meses adicionales en posición de responsabilidad.

#### Certificados requeridos:
Idénticos al Chief Engineer (ver tabla 6.1).

**Competencias adicionales (2010 Manila):** Engine Resource Management (ERM), Leadership & Teamwork.

---

### 6.3 OFFICER IN CHARGE OF ENGINEERING WATCH — OOW Engine (3rd / 4th Engineer)
**STCW Regulation:** III/1
**Nivel:** Operational Level

#### Requisitos:
- Edad mínima: **18 años**.
- 12 meses de combined workshop skills training + 6 meses seagoing service en programa aprobado **o** 36 meses total (30 en engine department).
- 6 meses de watchkeeping bajo supervisión del Chief Engineer.
- Documentado en training record book aprobado.

#### Certificados requeridos:

| Certificado | Revalidación | Tipo | Reg. |
|---|---|---|---|
| National CoC + Endorsement | Sí (5 años) | C/R | I/2, III/1 |
| Flag state Endorsement of Recognition | Sí | E/R | I/10 |
| Basic Safety Training (BST) | Dentro de 5 años | D/P | VI/1 |
| Medical First Aid | No | D/P | VI/4 |
| Survival Craft and Rescue Boats | Sí (5 años) | D/P | VI/2 |
| Advanced Fire Fighting | Sí (5 años) | D/P | VI/3 |
| Medical Fitness Certificate | Sí (2 años) | C/R | I/9 |
| Basic Safety Familiarisation | Al embarcar | T/O | VI/1 |
| Ship-Specific Familiarisation | Al embarcar | T/O | I/14 |
| Security Familiarisation | Al embarcar | T/O | VI/6 |

---

### 6.4 ELECTRO-TECHNICAL OFFICER (ETO)
**STCW Regulation:** III/6
**Nivel:** Operational Level
**Barcos aplicables:** ≥ 750 kW propulsion power

#### Requisitos:
- Edad mínima: **18 años**.
- 12 meses combined training + 6 meses seagoing (en programa aprobado) **o** 36 meses (30 en engine department).
- Competencia según tabla A-III/6.

#### Certificados requeridos:

| Certificado | Revalidación | Tipo | Reg. |
|---|---|---|---|
| National CoC | No | C/R | I/2, III/6 |
| Basic Safety Training (BST) | Dentro de 5 años | D/P | VI/1 |
| Medical Fitness Certificate | Sí (2 años) | C/R | I/9 |
| Basic Safety Familiarisation | Al embarcar | T/O | VI/1 |
| Ship-Specific Familiarisation | Al embarcar | T/O | I/14 |
| Security Familiarisation | Al embarcar | T/O | VI/6 |

---

### 6.5 RATING FORMING PART OF AN ENGINEERING WATCH (Oiler / Motorman)
**STCW Regulation:** III/4
**Nivel:** Support Level
**Barcos aplicables:** ≥ 750 kW

#### Requisitos:
- Edad mínima: **16 años**.
- 6 meses de training y experiencia **o** formación pre-sea + 2 meses seagoing aprobado.

#### Certificados requeridos:

| Certificado | Revalidación | Tipo | Reg. |
|---|---|---|---|
| National CoC | No | C/R | I/2, III/4 |
| Basic Safety Training (BST) | Dentro de 5 años | D/P | VI/1 |
| Medical Fitness Certificate | Sí (2 años) | C/R | I/9 |
| Basic Safety Familiarisation | Al embarcar | T/O | VI/1 |
| Ship-Specific Familiarisation | Al embarcar | T/O | I/14 |
| Security Familiarisation | Al embarcar | T/O | VI/6 |

---

### 6.6 ABLE SEAFARER ENGINE (ASE)
**STCW Regulation:** III/5
**Nivel:** Support Level (avanzado)
**Barcos aplicables:** ≥ 500 GT

#### Requisitos:
- Edad mínima: **18 años**.
- Debe cumplir requisitos de Oiler (III/4) primero.
- 12 meses seagoing aprobado en engine department **o** 6 meses + formación aprobada.

#### Certificados requeridos:

| Certificado | Revalidación | Tipo | Reg. |
|---|---|---|---|
| National CoC (ASE) | No | C/R | I/2, III/5 |
| Basic Safety Training (BST) | Dentro de 5 años | D/P | VI/1 |
| Medical Fitness Certificate | Sí (2 años) | C/R | I/9 |
| Basic Safety Familiarisation | Al embarcar | T/O | VI/1 |
| Ship-Specific Familiarisation | Al embarcar | T/O | I/14 |
| Security Familiarisation | Al embarcar | T/O | VI/6 |

---

### 6.7 ELECTRO-TECHNICAL RATING (ETR)
**STCW Regulation:** III/7
**Nivel:** Support Level
**Barcos aplicables:** ≥ 750 kW

#### Requisitos:
- Edad mínima: **18 años**.
- 12 meses de training + experiencia **o** formación aprobada + 6 meses seagoing **o** calificaciones técnicas equivalentes + 3 meses seagoing.
- Documentado en training record book.

#### Certificados requeridos:

| Certificado | Revalidación | Tipo | Reg. |
|---|---|---|---|
| National CoC | No | C/R | I/2, III/7 |
| Basic Safety Training (BST) | Dentro de 5 años | D/P | VI/1 |
| Medical Fitness Certificate | Sí (2 años) | C/R | I/9 |
| Basic Safety Familiarisation | Al embarcar | T/O | VI/1 |
| Ship-Specific Familiarisation | Al embarcar | T/O | I/14 |
| Security Familiarisation | Al embarcar | T/O | VI/6 |

---

### 6.8 COOK / CATERING STAFF
**Aplicable:** Cualquier tipo de barco, cualquier tonelaje

| Certificado | Revalidación | Tipo | Reg. |
|---|---|---|---|
| Ship's Cook Certificate | No (varía por administración) | D/P | — |
| Basic Safety Training (BST) | Dentro de 5 años | D/P | VI/1 |
| Medical Fitness Certificate | Sí (2 años) | C/R | I/9 |
| Basic Safety Familiarisation | Al embarcar | T/O | VI/1 |
| Ship-Specific Familiarisation | Al embarcar | T/O | I/14 |
| Security Familiarisation | Al embarcar | T/O | VI/6 |

---

## 7. CERTIFICADOS ADICIONALES POR FUNCIÓN (CUALQUIER RANGO)

Estos certificados se añaden a los del rango base dependiendo de las funciones asignadas a bordo.

| Función asignada | Certificado requerido | Revalidación | Reg. |
|---|---|---|---|
| Designado con funciones de seguridad o prevención de contaminación | Basic Safety Training (BST) | 5 años | VI/1 |
| En carga de survival craft o rescue boats | Survival Craft & Rescue Boats (SCRB) | 5 años | VI/2 |
| Crew of fast rescue boat | Fast Rescue Boat Certificate | No | VI/2 |
| Designado para control de operaciones de lucha contra incendios | Advanced Fire Fighting | 5 años | VI/3 |
| Designado para proveer atención médica | Medical Care | No | VI/4 |
| Ship Security Officer (SSO) | Ship Security Officer Certificate | No | VI/5 |
| Cualquier tripulante con rol no relacionado a seguridad | Security Awareness Training | No | VI/6 |
| Tripulante con cometidos de protección designados | Seafarer with Designated Security Duties | No | VI/6 |

---

## 8. CERTIFICADOS ADICIONALES POR TIPO DE BARCO — CHAPTER V

### 8.1 Tanqueros de Petróleo y Productos Químicos (Oil & Chemical Tankers)
**STCW Regulation:** V/1-1

| Certificado | Para quién | Revalidación | Nivel |
|---|---|---|---|
| **Basic Training — Oil & Chemical Tanker** | Oficiales con cometidos de carga en tanqueros petróleo/químico | Sí | Operational |
| **Advanced Training — Oil Tanker** | Master, CE, CM, 2nd Eng, y responsables de carga en oil tankers | Sí | Management |
| **Advanced Training — Chemical Tanker** | Master, CE, CM, 2nd Eng, y responsables de carga en chemical tankers | Sí | Management |
| **Basic Training — Ratings, Oil & Chemical** | Ratings con cometidos de carga en tanqueros petróleo/químico | No | Support |

### 8.2 Tanqueros de Gas Licuado (LNG / LPG)
**STCW Regulation:** V/1-2

| Certificado | Para quién | Revalidación | Nivel |
|---|---|---|---|
| **Basic Training — Liquefied Gas Tanker** | Oficiales con cometidos de carga en LNG/LPG | Sí | Operational |
| **Advanced Training — Liquefied Gas Tanker** | Master, CE, CM, 2nd Eng, y responsables de carga en LNG/LPG | Sí | Management |
| **Basic Training — Ratings, Liquefied Gas** | Ratings con cometidos de carga en LNG/LPG | No | Support |

### 8.3 Buques de Pasaje (Passenger Ships)
**STCW Regulation:** V/2

| Certificado | Para quién | Revalidación |
|---|---|---|
| **Crowd Management Training** | Master, oficiales y personal que asiste pasajeros en emergencias | Sí |
| **Safety Training for Passenger Ships** | Personal que provee servicios directos a pasajeros en espacios de pasajeros | No |
| **Passenger Safety, Cargo Safety & Hull Integrity** (solo Ro-Ro) | Master, CM, CE, 2nd Eng, y responsables de embarque/desembarque de pasajeros y carga | Sí |
| **Crisis Management & Human Behaviour** | Master, CM, CE, 2nd Eng, y responsables de seguridad de pasajeros en emergencias | Sí |

### 8.4 Formación Adicional No Obligatoria (STCW Part B)

| Código | Aplica a |
|---|---|
| **B-V/a** | Masters y CM de barcos grandes o con características de maniobra inusuales |
| **B-V/b** | Oficiales y ratings responsables de carga peligrosa en bulk |
| **B-V/c** | Oficiales y ratings responsables de carga peligrosa en paquetes |
| **B-V/d** | Personal en Mobile Offshore Units (MOUs) |
| **B-V/e** | Personal operando sistemas de Dynamic Positioning |
| **B-V/g** | Masters y oficiales operando en aguas polares |

---

## 9. MAPA COMPLETO RANGO → DEPARTAMENTO → NIVEL → REGULACIÓN STCW

```
DECK DEPARTMENT
├── Master                    Management    → II/2
├── Chief Mate                Management    → II/2
├── 2nd Mate (OOW)           Operational   → II/1
├── 3rd Mate (OOW)           Operational   → II/1
├── AB (Able Bodied)         Support       → II/5
├── OS (Ordinary Seaman)     Support       → II/4
└── Deck Cadet               (en formación)

ENGINE DEPARTMENT
├── Chief Engineer            Management    → III/2, III/3
├── 2nd Engineer              Management    → III/2, III/3
├── 3rd Engineer (OOW)       Operational   → III/1
├── 4th Engineer (OOW)       Operational   → III/1
├── ETO (Electro-Tech Off.)  Operational   → III/6
├── Able Seafarer Engine     Support       → III/5
├── Oiler / Motorman         Support       → III/4
├── ETR (Electro-Tech Rat.)  Support       → III/7
└── Engine Cadet             (en formación)

RADIO / GMDSS
└── GMDSS Radio Operator     Operational   → IV/2

CATERING DEPARTMENT
├── Chief Cook               (Reg. nacional + MLC 2006)
├── Cook                     (Reg. nacional + MLC 2006)
└── Steward                  (MLC 2006 Reg. 1.3)
```

---

## 10. REGLAS DE REVALIDACIÓN Y VENCIMIENTO

| Documento | Período de validez | Acción requerida |
|---|---|---|
| Certificate of Competence (CoC) | 5 años | Revalidar con la administración emisora |
| Endorsement | 5 años | Revalidar junto con el CoC |
| Medical Fitness Certificate | 2 años (1 año si < 18 años) | Examen médico con médico reconocido |
| Basic Safety Training (BST) | 5 años | Curso de refrescamiento o drills documentados |
| Survival Craft & Rescue Boats | 5 años | Curso de refrescamiento |
| Advanced Fire Fighting | 5 años | Curso de refrescamiento |
| GMDSS GOC/ROC | 5 años | Revalidar |
| Tanker certificates | 5 años | Revalidar |
| Passenger ship certificates | 5 años | Revalidar |

> **Regla de compliance:** Cualquier certificado que venza en los próximos **30 días** activa alerta amarilla. Si ya venció, activa alerta roja y **bloquea** la visibilidad del marino en búsquedas de empresa.

---

## 11. REGLAS DE COMPLIANCE PARA EL MOTOR DE LETO

Estas reglas definen el comportamiento del sistema. Son **bloqueos duros** o **alertas**.

### 11.1 Estados de Documento

| Estado | Condición | Color UI | Efecto en sistema |
|---|---|---|---|
| **VALID** | Vigente, vence en > 30 días | Verde | Sin restricciones |
| **EXPIRING** | Vence en ≤ 30 días | Amarillo | Alerta al marino y empresa |
| **CRITICAL** | Vence en ≤ 7 días | Naranja | Alerta crítica urgente |
| **EXPIRED** | Fecha de vencimiento pasada | Rojo | Marino no aparece en búsquedas |
| **MISSING** | Requerido por rango pero no subido | Rojo | Marino no aparece en búsquedas |

### 11.2 Reglas de Matching (Empresa busca tripulante para un barco)

Para que un marino aparezca en los resultados de búsqueda de una empresa para un barco específico, **deben cumplirse las 3 condiciones simultáneamente**:

1. **Documentos completos:** El marino tiene TODOS los certificados requeridos para su rango.
2. **Documentos vigentes:** Ningún certificado requerido está vencido NI vence en los próximos 30 días.
3. **Compatibilidad de rango:** El rango del marino es compatible con la posición que la empresa busca cubrir.

> Si falla **cualquiera** de las 3 condiciones → el marino **no aparece** en resultados para ese barco. No hay override.

### 11.3 Certificados Mínimos por Rango para Visibilidad en Búsquedas

El sistema debe verificar este conjunto mínimo antes de mostrar al marino:

| Rango | Certificados mínimos para visibilidad |
|---|---|
| Master / Chief Mate | CoC + GMDSS GOC + BST (4 módulos) + Medical + Advanced Fire Fighting + Survival Craft |
| 2nd / 3rd Mate | CoC + GMDSS ROC o GOC + ECDIS + ARPA + BST + Medical + Survival Craft |
| AB | CoC AB + BST + Medical + Proficiency in Survival Craft |
| OS | CoC OS + BST + Medical |
| Chief Engineer / 2nd Engineer | CoC + BST + Medical + Advanced Fire Fighting + Survival Craft |
| 3rd / 4th Engineer | CoC + BST + Medical + Survival Craft |
| ETO | CoC ETO + BST + Medical |
| Oiler / ASE | CoC + BST + Medical |
| Cook | Ship's Cook Certificate + Medical + BST |

### 11.4 Certificados Adicionales por Tipo de Barco (Matching Extra)

Si la empresa busca tripulación para un barco específico, se añaden estos requisitos al matching:

| Tipo de barco | Certificados adicionales requeridos |
|---|---|
| **Oil Tanker** | Basic Tanker Training (Oil) — para todos los rangos; Advanced Oil Tanker — para Management |
| **Chemical Tanker** | Basic Tanker Training (Chemical); Advanced Chemical Tanker — para Management |
| **LNG / LPG Tanker** | Basic Liquefied Gas Training; Advanced Liquefied Gas — para Management |
| **Passenger Ship (Ro-Ro)** | Crowd Management + Passenger Safety + Hull Integrity + Crisis Management (Management level) |
| **Passenger Ship (otros)** | Crowd Management (Management/Operational) + Safety Training (Support) |
| **Polar waters** | Polar Code training (B-V/g) — recomendado |
| **Dynamic Positioning** | DP training (B-V/e) — según requisito del barco |

### 11.5 Alertas Automáticas Celery (cron diario)

El worker revisa diariamente y genera notificaciones:

| Trigger | Tipo notificación | Destinatario |
|---|---|---|
| Documento vence en 30 días | `document_expiry` — warning | Marino |
| Documento vence en 7 días | `document_expiry` — critical | Marino + Empresa (si tiene contrato activo) |
| Documento vencido | `document_expiry` — expired + bloqueo | Marino + Empresa |
| Médico vence en 30 días | `document_expiry` — warning | Marino |
| CoC vence en 30 días | `document_expiry` — warning | Marino |

---

## 12. RESUMEN RÁPIDO — CERTIFICADOS BST (OBLIGATORIOS PARA TODOS)

```
BST = Basic Safety Training (STCW VI/1)
├── PSSR  — Personal Survival and Safety Responsibilities
├── EFA   — Elementary First Aid
├── FPFF  — Fire Prevention and Fire Fighting
└── PSR   — Personal Safety and Social Responsibilities

+ Medical Fitness (I/9) — cada 2 años
+ Ship-Specific Familiarisation (I/14) — al unirse a cada barco
+ Security Familiarisation (VI/6) — al unirse a cada barco
```

---

## 13. GLOSARIO TÉCNICO STCW

| Término | Definición |
|---|---|
| **STCW** | Standards of Training, Certification and Watchkeeping for Seafarers (1978, amend. 1995, 2010) |
| **IMO** | International Maritime Organization — organismo emisor del STCW |
| **MLC 2006** | Maritime Labour Convention — ley internacional de trabajo marítimo |
| **SOLAS** | Safety of Life at Sea — define dotación mínima y seguridad del barco |
| **MARPOL** | Convenio de prevención de contaminación marina |
| **ISPS Code** | International Ship and Port Facility Security Code |
| **ISM Code** | International Safety Management Code |
| **CoC** | Certificate of Competence — título de competencia |
| **CoP** | Certificate of Proficiency — título de suficiencia |
| **GT** | Gross Tonnage — arqueo bruto del barco |
| **kW** | Kilovatios — potencia de propulsión del barco |
| **GMDSS** | Global Maritime Distress and Safety System |
| **GOC** | General Operator Certificate (GMDSS, deep-sea) |
| **ROC** | Restricted Operator Certificate (GMDSS, coastal) |
| **ECDIS** | Electronic Chart Display and Information System |
| **ARPA** | Automatic Radar Plotting Aid |
| **BST** | Basic Safety Training (STCW VI/1) |
| **BRM** | Bridge Resource Management (Management level — Deck) |
| **ERM** | Engine Resource Management (Management level — Engine) |
| **SSO** | Ship Security Officer |
| **OOW** | Officer in Charge of a Watch (Deck o Engine) |
| **AB** | Able Bodied Seaman / Able Seafarer Deck |
| **OS** | Ordinary Seaman |
| **ASE** | Able Seafarer Engine |
| **ETO** | Electro-Technical Officer |
| **ETR** | Electro-Technical Rating |
| **SCRB** | Survival Craft and Rescue Boats |
| **AFF** | Advanced Fire Fighting |
| **PSC** | Port State Control — inspección portuaria de cumplimiento |
| **Flag State** | País de bandera del barco |
| **Administration** | Gobierno del país de bandera del barco |
| **Endorsement** | Refrendo que certifica que un CoC cumple STCW |
| **Revalidation** | Renovación del certificado antes de su vencimiento |

---

## 14. AMP PANAMÁ — AUTORIDAD MARÍTIMA DE PANAMÁ

### 14.1 Contexto Regulatorio

La **Autoridad Marítima de Panamá (AMP)** es el organismo estatal que regula la gente de mar bajo bandera panameña. Panamá opera el registro de buques más grande del mundo (aprox. 18% de la flota mundial en GT), lo que hace de AMP una de las administraciones de bandera más relevantes a nivel global.

- **Portal oficial de servicios:** https://www.amp.gob.pa/servicios/gente-mar/
- **Marco legal:** Decreto Ley 8 de 1998 + resoluciones AMP + Convenio STCW
- **Relación con STCW:** AMP implementa el STCW como Administration (Flag State). Todo CoC extranjero debe ser refrendado por AMP para ser válido en buques con bandera panameña (Regla I/10).
- **Trámites presenciales:** Dirección General de Gente de Mar, Panamá City.

### 14.2 Formularios y Documentos Principales AMP

| Código | Formulario / Documento | URL |
|---|---|---|
| **F-76** | Solicitud de Documentación Técnica de la Gente de Mar | https://www.amp.gob.pa/wp-content/uploads/2024/08/F-76-Solicitud-de-Documentacion-Tecnica-de-la-Gente-de-Mar.pdf |
| **F-77** | Solicitud de Ascenso para la Gente de Mar | https://www.amp.gob.pa/wp-content/uploads/2024/08/F-77-Solicitud-de-Ascenso-para-la-Gente-de-Mar.pdf |
| **F-84** | Tarifas de los Servicios del Departamento de Titulación | https://www.amp.gob.pa/wp-content/uploads/2023/12/F-84-Tarifas-de-los-servicios-del-Departamento-de-Titulacion.pdf |
| **F-88** | Application for Crew Dispensation Letters | https://www.amp.gob.pa/wp-content/uploads/2025/01/F-88-Application-for-Crew-Dispensation-Letters1.docx |
| **F-89** | Application for Home Country License | https://www.amp.gob.pa/wp-content/uploads/2024/01/F-89-Application-for-Home-Country-License.docx |
| **F-143** | Training Record — Handling, Storage and Preparation of Food | https://www.amp.gob.pa/wp-content/uploads/2025/01/F-143Training-Record-of-Instructions-for-Handling-Storage-and-Preparation-of-Food.pdf |
| **TIT-F-20-V.04** | Requisitos para Ascensos (todos los rangos) | https://www.amp.gob.pa/wp-content/uploads/2024/10/TIT-F-20-V.04.pdf |
| **MMC-202** | Lista de Clubes/Aseguradoras P&I aprobados | https://www.amp.gob.pa/wp-content/uploads/2024/01/MMC-202-List-of-Approved-PI-Clubs-rev-November-2023-new.pdf |
| — | Formato de Práctica de Mar (Cadetes) | https://www.amp.gob.pa/wp-content/uploads/2023/11/FORMATO-DE-PRACTICA-DE-MAR.pdf |
| — | Sea Practice Form (inglés) | https://www.amp.gob.pa/wp-content/uploads/2023/11/SEA-PRACTICE-FORM.pdf |
| — | Requisitos para Duplicado | https://www.amp.gob.pa/wp-content/uploads/2023/08/DUPLICADO.pdf |

---

## 15. AMP — REFRENDO DE RECONOCIMIENTO (REGLA I/10 STCW)

El **Refrendo de Reconocimiento** permite a un marino con CoC extranjero trabajar en buque de bandera panameña. Es emitido por AMP con base en la Regla I/10 del STCW. AMP publica un solo PDF de requisitos para todo el proceso (CoC y CoP por separado).

| Tipo | Descripción | PDF Requisitos AMP |
|---|---|---|
| **CoC — Refrendo de Reconocimiento** | Para Títulos de Competencia (Oficiales Deck y Engine) — Regla I/10 | https://www.amp.gob.pa/wp-content/uploads/2025/06/1REFRENDO-DE-RECONOCIMIENTO-DE-TITULOS-EN-VIRTUD-DE-LA-REGLA-I10-ENDORSEMENT-OF-RECOGNITION-OF-CERTIFICATES-UNDER-REGULATION-I10.pdf |
| **CoP — Refrendo de Reconocimiento** | Para Certificados de Suficiencia (cursos especiales) — Regla I/10 | https://www.amp.gob.pa/wp-content/uploads/2025/06/2REFRENDO-DE-RECONOCIMIENTO-DE-CERTIFICADOS-DE-SUFICIENCIA-I10-ENDORSEMENT-OF-RECOGNITION-OF-CERTIFICATES-OF-PROFICIENCY-I10.pdf |

> **Nota para el motor de Leto:** Cuando `coc_type === 'foreign'`, el marino debe tener ambos documentos vigentes: el Refrendo I/10 de su CoC + los Refrendos I/10 de cualquier CoP especial que aplique al tipo de buque.

---

## 16. AMP — TÍTULOS DE COMPETENCIA (CoC) PANAMEÑOS

### 16.1 CoC Departamento de Cubierta (Deck Officers)

| # | Posición / Rango STCW | PDF Requisitos AMP |
|---|---|---|
| 1 | Oficial Encargado de la Guardia de Navegación — **Regla II/3** (buques pequeños) | https://www.amp.gob.pa/wp-content/uploads/2025/06/1OFICIAL-ENCARGADO-DE-LA-GUARDIA-DE-NAV.-II3-OFFICER-IN-CHARGE-OF-A-NAVIGATIONAL-WATCH-II3.pdf |
| 2 | Oficial Encargado de la Guardia de Navegación — **Regla II/1** (500 GT+) | https://www.amp.gob.pa/wp-content/uploads/2025/06/2OFICIAL-ENCARGADO-DE-LA-GUARDIA-DE-NAVEGACION-II1-OFFICER-IN-CHARGE-OF-A-NAVIGATIONAL-WATCH-II1.pdf |
| 3 | Primer Oficial de Puente — Chief Mate **II/2** | https://www.amp.gob.pa/wp-content/uploads/2025/06/3PRIMER-OFICIAL-DE-PUENTE-II2-CHIEF-MATE-II2.pdf |
| 4 | Capitán — Master **II/3** (buques pequeños) | https://www.amp.gob.pa/wp-content/uploads/2025/06/4CAPITAN-II3-MASTER-II3.pdf |
| 5 | Capitán — Master **II/2** (3000 GT+) | https://www.amp.gob.pa/wp-content/uploads/2025/06/5CAPITAN-II2-MASTER-II2.pdf |
| 6 | Capitán de Remolcador — Tugboat Master **II/2** | https://www.amp.gob.pa/wp-content/uploads/2025/06/6CAPITAN-DE-REMOLCADOR-II2-TUGBOAT-MASTER-II2.pdf |
| 7 | Operador General/Restringido de SMSSM (GMDSS) — **Regla IV/2** | https://www.amp.gob.pa/wp-content/uploads/2025/06/7OPERADOR-GENERAL-RESTRINGIDO-DE-SMSSM-IV2-GMDSS-GENERAL-RESTRICTED-OPERATOR-IV.pdf |
| 8 | Radioelectrónico de Primera/Segunda Clase — **Regla IV/2** | https://www.amp.gob.pa/wp-content/uploads/2025/06/8RADIOELECTRONICO-DE-PRIMERA-SEGUNDA-CLASE-IV2-FIRST-SECOND-CLASS-RADIOELECTRONIC-IV2.pdf |

### 16.2 CoC Departamento de Máquinas (Engine Officers)

| # | Posición / Rango STCW | PDF Requisitos AMP |
|---|---|---|
| 1 | Oficial Encargado de la Guardia en Cámara de Máquinas — **Regla III/1** | https://www.amp.gob.pa/wp-content/uploads/2025/06/1OFICIAL-ENCARGADO-DE-LA-GUARDIA-EN-UNA-CAMARA-DE-MAQUINAS-III1-OFFICER-IN-CHARGE-OF-AN-ENGI.pdf |
| 2 | Primer Oficial de Máquinas — Second Engineer Officer **III/2 ó III/3** | https://www.amp.gob.pa/wp-content/uploads/2025/06/2PRIMER-OFICIAL-DE-MAQUINAS-III2-O-III3-SECOND-ENGINEER-OFFICER-III2-O-III3.pdf |
| 3 | Jefe de Máquinas — Chief Engineer Officer **III/2 ó III/3** | https://www.amp.gob.pa/wp-content/uploads/2025/06/3JEFE-DE-MAQUINAS-III2-O-III3-CHIEF-ENGINEER-OFFICER-III2-OR-III3.pdf |
| 4 | Jefe de Máquinas de Remolcador — Tugboat Chief Engineer **III/2 ó III/3** | https://www.amp.gob.pa/wp-content/uploads/2025/06/4JEFE-DE-MAQUINAS-DE-REMOLCADOR-III2-O-III3-TUGBOAT-CHIEF-ENGINEER-III2-OR-III3.pdf |
| 5 | Oficial Electrotécnico — Electro-Technical Officer (ETO) **Regla III/6** | https://www.amp.gob.pa/wp-content/uploads/2025/06/5OFICIAL-ELECTROTECNICO-III6-ELECTRO-TECHNICAL-OFFICER-III6.pdf |

### 16.3 Subalternos / Ratings (33 posiciones)

Certificados para tripulantes no oficiales bajo bandera panameña. Cubre Cubierta, Máquinas, Servicio, Médico, y Fluvial.

| # | Posición (ES / EN) | STCW Regla | PDF Requisitos AMP |
|---|---|---|---|
| 1 | Cadete de Cubierta / Deck Cadet | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/1CADETE-DE-CUBIERTA-DECK-CADET.pdf |
| 2 | Marino Ordinario / Ordinary Seaman | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/2MARINO-ORDINARIO-ORDINARY-SEAMAN.pdf |
| 3 | Marinero que forme parte de la Guardia de Navegación (Timonel / Able Seaman) | II/4 | https://www.amp.gob.pa/wp-content/uploads/2025/06/3MARINERO-QUE-FORME-PARTE-DE-LA-GUARDIA-DE-NAVEGACION-TIMONEL-II4-RATING-FORMING-PART-OF-A-NAVIGATIONAL-WATCH-ABLE-SEAMAN-II4.pdf |
| 4 | Contramaestre / Bosun | II/4 ó II/5 | https://www.amp.gob.pa/wp-content/uploads/2025/06/4CONTRAMAESTRE-II4-O-CONTRAMAESTRE-II5-BOSUN-II4-OR-BOSUN-II5.pdf |
| 5 | Marinero de Primera de Puente / Able Seafarer Deck | II/5 | https://www.amp.gob.pa/wp-content/uploads/2025/06/5MARINERO-DE-PRIMERA-DE-PUENTE-II5-ABLE-SEAFARER-DECK-II5.pdf |
| 6 | Técnico Marino / Marine Technician | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/6TECNICO-MARINO-MARINE-TECHNICIAN.pdf |
| 7 | Técnico en Refrigeración / Reeferman | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/7TECNICO-EN-REFRIGERACION-REEFERMAN.pdf |
| 8 | Carpintero / Carpenter | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/8CARPINTERO-CARPENTER.pdf |
| 9 | Doctor / Doctor | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/9DOCTOR-DOCTOR.pdf |
| 10 | Enfermero / Nurse | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/10ENFERMERO-NURSE.pdf |
| 11 | Personal Médico / Medical Staff | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/11PERSONAL-MEDICO-MEDICAL-STAFF.pdf |
| 12 | Personal de Hotelería / Hotel Staff | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/12PERSONAL-DE-HOTELERIA-HOTEL-STAFF.pdf |
| 13 | Camarero / Steward | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/13CAMARERO-STEWARD.pdf |
| 14 | Cocinero MLC 2006 / Cook MLC 2006 | MLC Reg. 3.2 | https://www.amp.gob.pa/wp-content/uploads/2025/06/14COCINERO-MLC-2006-COOK-MLC-2006.pdf |
| 15 | Cocinero (menos de 10 tripulantes) / Cook Less than 10 Crewmembers | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/15COCINERO-MENOR-DE-10-TRIPULANTES-COOK-LESS-THAN-10-CREWMEMBERS.pdf |
| 16 | Oficial Fluvial / Fluvial Officer | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/16OFICIAL-FLUVIAL-FLUVIAL-OFFICER.pdf |
| 17 | Primer Oficial Fluvial / First Fluvial Officer | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/17PRIMER-OFICIAL-FLUVIAL-FIRST-FLUVIAL-OFFICER.pdf |
| 18 | Capitán Fluvial / Fluvial Captain | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/18CAPITAN-FLUVIAL-FLUVIAL-CAPTAIN.pdf |
| 19 | Cadete de Máquinas / Engine Cadet | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/19CADETE-DE-MAQUINAS-ENGINE-CADET.pdf |
| 20 | Cadete Electrotécnico / Electro-Technical Cadet | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/20CADETE-ELECTROTECNICO-ELECTRO-TECHNICAL-CADET.pdf |
| 21 | Limpiador / Wiper | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/21LIMPIADOR-WIPER.pdf |
| 22 | Marinero que forme parte de la Guardia en Cámara de Máquinas (Aceitero / Oiler) | III/4 | https://www.amp.gob.pa/wp-content/uploads/2025/06/22MARINERO-QUE-FORME-PARTE-DE-LA-GUARDIA-EN-UNA-CAMARA-DE-MAQUINAS-ACEITERO-III4-RATING-FORMING-PART-OF-AN-ENGINEER.pdf |
| 23 | Maquinista / Motorman | III/4 ó III/5 | https://www.amp.gob.pa/wp-content/uploads/2025/06/23MAQUINISTA-III4-o-MAQUINISTA-III5-MOTORMAN-III4-OR-MOTORMAN-III5.pdf |
| 24 | Marinero de Primera de Máquinas / Able Seafarer Engine | III/5 | https://www.amp.gob.pa/wp-content/uploads/2025/06/24MARINERO-DE-PRIMERA-DE-MAQUINAS-II5-ABLE-SEAFARER-ENGINE-II5.pdf |
| 25 | Marino Electrotécnico / Electro-Technical Rating (ETR) | III/7 | https://www.amp.gob.pa/wp-content/uploads/2025/06/25MARINO-ELECTROTECNICO-III7-ELECTRO-TECHNICAL-RATING-III7.pdf |
| 26 | Soldador / Welder | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/26SOLDADOR-WELDER.pdf |
| 27 | Bombero / Pumpman | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/27BOMBERO-PUMPMAN.pdf |
| 28 | Técnico en Soldadura, Tornería y Plomería / Fitter | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/28TECNICO-EN-SOLDADURA-TORNERIA-Y-PLOMERIA-FITTER.pdf |
| 29 | Mecánico / Mechanic | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/29MECANICO-MECHANIC.pdf |
| 30 | Electricista / Electrician | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/30ELECTRICISTA-ELECTRICIAN.pdf |
| 31 | Conductor de Maquinaria Naval / Conductor of Naval Machinery | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/31CONDUCTOR-DE-MAQUINARIA-NAVAL-CONDUCTOR-OF-NAVAL-MACHINERY.pdf |
| 32 | Conductor de Maquinaria Naval de Primera / First Conductor of Naval Machinery | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/32CONDUCTOR-DE-MAQUINARIA-NAVAL-DE-PRIMERA-FIRST-CONDUCTOR-OF-NAVAL-MACHINERY.pdf |
| 33 | Conductor Superior de Maquinaria Naval / Superior Conductor of Naval Machinery | — | https://www.amp.gob.pa/wp-content/uploads/2025/06/33CONDUCTOR-SUPERIOR-DE-MAQUINARIA-NAVAL-SUPERIOR-CONDUCTOR-OF-NAVAL-MACHINERY.pdf |

### 16.4 Certificados de Suficiencia (CoP) — Bandera Panameña

| Tipo | Descripción | PDF Requisitos AMP |
|---|---|---|
| **Tanquero V/1** | Operaciones de Carga en Buques Tanque (Oil / Chemical / Gas) — Regla V/1 | https://www.amp.gob.pa/wp-content/uploads/2025/06/OPERACIONES-DE-CARGA-EN-BUQUES-TANQUE-V1-TANKER-CARGO-OPERATIONS-V1.pdf |
| **Ratings CoP** | Subalternos (Reglas II/4, II/5, III/4, III/5 y III/7) | https://www.amp.gob.pa/wp-content/uploads/2025/06/SUBALTERNOS-II4-II5-III4-III5-y-III7-RATINGS-II4-II5-III4-III5-III7.pdf |

### 16.5 Certificados de Endoso de Curso

Cursos aprobados por AMP que generan un Endoso de Curso independiente, regulados por la Resolución J.D. No. 026-2022.

| Descripción | PDF Requisitos AMP |
|---|---|
| Certificado de Endoso de Curso (Resolución J.D. No. 026-2022) — aplica a ECDIS, DPO, High Voltage, SDSD, Medical Care, Security Duties, etc. | https://www.amp.gob.pa/wp-content/uploads/2025/06/CERTIFICADO-DE-ENDOSO-DE-CURSO-EN-VIRTUD-DE-LA-RESOLUCION-J.D.-No.-026-2022-CERTIFICATES-OF-COURSE-ENDORSEMENT.pdf |

---

## 17. AMP — ASCENSOS DE RANGO

Cuando un marino con CoC panameño quiere ascender al siguiente nivel, el trámite de Ascenso se hace con el formulario F-77 y el documento de requisitos TIT-F-20-V.04, que aplica para todos los rangos.

| Documento | Código | URL |
|---|---|---|
| Solicitud de Ascenso para la Gente de Mar | F-77 | https://www.amp.gob.pa/wp-content/uploads/2024/08/F-77-Solicitud-de-Ascenso-para-la-Gente-de-Mar.pdf |
| Requisitos Para Ascenso (todos los rangos) | TIT-F-20-V.04 | https://www.amp.gob.pa/wp-content/uploads/2024/10/TIT-F-20-V.04.pdf |

---

## 18. AMP — MOU / MODU (Offshore)

Licencias especiales para operaciones en plataformas y unidades móviles de perforación (MODU) bajo administración panameña.

| # | Posición (ES / EN) | PDF Requisitos AMP |
|---|---|---|
| 1 | Gerente de la Instalación Mar Adentro — Plataforma Fija / OIM Fixed Platform | https://www.amp.gob.pa/wp-content/uploads/2023/07/GERENTE-DE-LA-INSTALACION-MAR-ADENTRO-PLATAFORMA-FIJA-OFFSHORE-INSTALLATION-MANAGER-FIXED-PLATFORM.pdf |
| 2 | Gerente de la Instalación Mar Adentro MODU / OIM MODU | https://www.amp.gob.pa/wp-content/uploads/2023/07/GERENTE-DE-LA-INSTALACION-MAR-ADENTRO-MODU-OFFSHORE-INSTALLATION-MANAGER-MODU.pdf |
| 3 | Gerente de la Instalación Mar Adentro MOU / OIM MOU | https://www.amp.gob.pa/wp-content/uploads/2023/07/GERENTE-DE-LA-INSTALACION-MAR-ADENTRO-MOU-OFFSHORE-INSTALLATION-MANAGER-MOU.pdf |
| 4 | Supervisor de Barzaca MOU / Barge Supervisor MOU | https://www.amp.gob.pa/wp-content/uploads/2023/07/SUPERVISOR-DE-BARZACA-MOU-BARGE-SUPERVISOR-MOU.pdf |
| 5 | Operador de Control de Lastre MOU / Ballast Control Operator MOU | https://www.amp.gob.pa/wp-content/uploads/2023/07/OPERADOR-DE-CONTROL-DE-LASTRE-MOU-BALLAST-CONTROL-OPERADOR-MOU.pdf |
| 6 | Supervisor de Mantenimiento MOU / Maintenance Supervisor MOU | https://www.amp.gob.pa/wp-content/uploads/2023/07/SUPERVISOR-DE-MANTENIMIENTO-MOU-MAINTENANCE-SUPERVISOR-MOU.pdf |
| 7 | Marinero que forme parte de la Guardia de Navegación (Timonel) MOU | https://www.amp.gob.pa/wp-content/uploads/2023/07/MARINERO-QUE-FORME-PARTE-DE-LA-GUARDIA-DE-NAVEGACION-TIMONEL-MOU-RATING-FORMING-PART-OF-A-NAVIGATIONAL-WATCH-ABLE-SEAMAN-MOU.pdf |
| 8 | Marino Ordinario MOU / Ordinary Seaman MOU | https://www.amp.gob.pa/wp-content/uploads/2023/07/MARINO-ORDINARIO-MOU-ORDINARY-SEAMAN-MOU.pdf |
| 9 | Marinero que forme parte de la Guardia en Cámara de Máquinas (Aceitero) MOU | https://www.amp.gob.pa/wp-content/uploads/2023/07/MARINERO-QUE-FORME-PARTE-DE-LA-GUARDIA-EN-UNA-CAMARA-DE-MAQUINAS-ACEITERO-MOU-RATING-FORMING-PART-OF-AN-ENGINEERING-WATVH-OILER-MOU.pdf |
| 10 | Perforador Líder / Toolpusher | https://www.amp.gob.pa/wp-content/uploads/2023/07/PERFORADOR-LIDER-TOOLPUSHER.pdf |
| 11 | Perforador / Driller | https://www.amp.gob.pa/wp-content/uploads/2023/07/PERFORADOR-DRILLER.pdf |
| 12 | Operador de Radio MOU / Radio Operator MOU | https://www.amp.gob.pa/wp-content/uploads/2023/07/OPERADOR-DE-RADIO-MOU-RADIO-OPERATOR-MOU.pdf |
| 13 | Técnico Marino — Plataforma Fija / Marine Technician Fixed Platform | https://www.amp.gob.pa/wp-content/uploads/2023/07/TECNICO-MARINO-PLATAFORMA-FIJA-MARINE-TECHNICIAN-FIXED-PLATFORM.pdf |
| 14 | Técnico Marino MOU / Marine Technician MOU | https://www.amp.gob.pa/wp-content/uploads/2023/07/TECNICO-MARINO-MOU-MARINE-TECHNICIAN-MOU.pdf |

---

## 19. AMP — NAVES DE PLACER / YATES

Licencias para embarcaciones de recreo y yates bajo administración panameña.

| # | Código | Posición | URL |
|---|---|---|---|
| 1 | TIT-F-21-V-02 (1) | Oficial de Yate | https://www.amp.gob.pa/wp-content/uploads/2019/01/1-TIT-F-21-V-02.pdf |
| 2 | TIT-F-21-V-02 (2) | Capitán de Yate — hasta 200 TAB | https://www.amp.gob.pa/wp-content/uploads/2023/12/2-TIT-F-21-V-02.pdf |
| 3 | TIT-F-21-V-02 (3) | Capitán de Yate — hasta 500 TAB | https://www.amp.gob.pa/wp-content/uploads/2023/12/3-TIT-F-21-V-02.pdf |
| 4 | TIT-F-21-V-02 (4) | Capitán de Yate | https://www.amp.gob.pa/wp-content/uploads/2019/01/4-TIT-F-21-V-02.pdf |
| 5 | TIT-F-21-V-02 (5) | Ingeniero de Yate | https://www.amp.gob.pa/wp-content/uploads/2019/01/5-TIT-F-21-V-02.pdf |
| 6 | TIT-F-21-V-02 (6) | Jefe de Máquina de Yate — hasta 750 KW | https://www.amp.gob.pa/wp-content/uploads/2019/01/6-TIT-F-21-V-02.pdf |
| 7 | TIT-F-21-V-02 (7) | Jefe de Máquina de Yate | https://www.amp.gob.pa/wp-content/uploads/2023/12/7-TIT-F-21-V-02.pdf |

---

## 20. AMP — BUQUES DE PESCA

Licencias para embarcaciones pesqueras bajo bandera panameña.

| # | Código | Posición | URL |
|---|---|---|---|
| 1 | TIT-F-22-V-05 (1) | Capitán en Buques Pesqueros | https://www.amp.gob.pa/wp-content/uploads/2023/08/1-TIT-F-22-V-05.pdf |
| 2 | TIT-F-22-V-05 (2) | Oficial en Buques Pesqueros | https://www.amp.gob.pa/wp-content/uploads/2023/08/2-TIT-F-22-V-05.pdf |
| 3 | TIT-F-22-V-05 (3) | Jefe de Máquina en Buques Pesqueros | https://www.amp.gob.pa/wp-content/uploads/2023/08/3-TIT-F-22-V-05.pdf |
| 4 | TIT-F-22-V-05 (4) | Ingeniero en Buques Pesqueros | https://www.amp.gob.pa/wp-content/uploads/2023/08/4-TIT-F-22-V-05.pdf |
| 5 | TIT-F-22-V-05 (5) | Técnico en Buques Pesqueros | https://www.amp.gob.pa/wp-content/uploads/2023/08/5-TIT-F-22-V-05.pdf |
| 6 | TIT-F-22-V-05 (6) | Observador de Pesca | https://www.amp.gob.pa/wp-content/uploads/2023/08/6-TIT-F-22-V-05.pdf |

---

## 21. AMP — LICENCIAS DE AGUAS NACIONALES

Licencias para navegación en aguas nacionales panameñas (coastal, fluvial, pesca costera, recreo). No requieren STCW completo — son regulación doméstica panameña.

| # | Código | Posición | URL |
|---|---|---|---|
| 1 | TIT-AN1 | Marinero | https://www.amp.gob.pa/wp-content/uploads/2019/06/TIT-AN1.pdf |
| 2 | TIT-AN2 | Operador de Lanchas de 2da. Clase (menor de 12 m de eslora) | https://www.amp.gob.pa/wp-content/uploads/2019/06/TIT-AN2.pdf |
| 3 | TIT-AN3 | Operador de Lanchas de 1ra. Clase (transporte carga/pasajeros 12 m a 20 m) | https://www.amp.gob.pa/wp-content/uploads/2019/06/TIT-AN3.pdf |
| 4 | TIT-AN4 | Patrón de Cabotaje hasta 100 TAB | https://www.amp.gob.pa/wp-content/uploads/2019/06/TIT-AN4.pdf |
| 5 | TIT-AN5 | Patrón de Cabotaje hasta 500 TAB | https://www.amp.gob.pa/wp-content/uploads/2019/06/TIT-AN5.pdf |
| 6 | TIT-AN6 | Patrón de Nave de Placer de 3ra. Clase (menor de 8 m de eslora) | https://www.amp.gob.pa/wp-content/uploads/2019/06/TIT-AN6.pdf |
| 7 | TIT-AN7 | Patrón de Nave de Placer de 2da. Clase (de 8 m hasta 20 m de eslora) | https://www.amp.gob.pa/wp-content/uploads/2019/06/TIT-AN7.pdf |
| 8 | TIT-AN8 | Patrón de Nave de Placer de 1ra. Clase (mayor de 20 m de eslora) | https://www.amp.gob.pa/wp-content/uploads/2019/06/TIT-AN8.pdf |
| 9 | TIT-AN9 | Operador de Remolcador hasta 500 TAB (solo para renovación) | https://www.amp.gob.pa/wp-content/uploads/2019/06/TIT-AN9.pdf |
| 10 | TIT-AN10 | Patrón de Pesca de 2da. Clase (hasta 12 metros) | https://www.amp.gob.pa/wp-content/uploads/2019/06/TIT-AN10.pdf |
| 11 | TIT-AN11 | Patrón de Pesca de 1ra. Clase (mayor de 12 m de eslora) | https://www.amp.gob.pa/wp-content/uploads/2019/06/TIT-AN11.pdf |
| 12 | TIT-AN12 | Maquinista hasta 750 KW | https://www.amp.gob.pa/wp-content/uploads/2019/06/TIT-AN12.pdf |
| 13 | TIT-AN13 | Técnico Marino | https://www.amp.gob.pa/wp-content/uploads/2019/06/TIT-AN13.pdf |

---

## 22. AMP — LÓGICA DE COMPLIANCE PARA EL MOTOR LETO

### 22.1 Árbol de Decisión: ¿Qué certificado necesita un marino en buque panameño?

```
¿El marino tiene CoC extranjero?
├── SÍ → Requiere Endoso de Reconocimiento (Regla I/10)
│         Ver Sección 15 (Deck) o Sección 15.2 (Engine)
│         + Todos los CoP de cursos especiales válidos
│
└── NO → ¿Está en formación / es Rating?
          ├── Rating → CoC AMP directo (Sección 16.3)
          └── Oficial → CoC AMP (Sección 16.1 / 16.2)
                        + Documentos STCW universales (Sección 4 de este doc)

¿El buque es tanquero (oil/chemical/LNG)?
└── SÍ → Agregar CoP tanquero correspondiente (Sección 16.3 CoP Tanquero)

¿El buque es offshore?
└── SÍ → Licencia MOU/Offshore (Sección 18) en vez de CoC estándar

¿Es yate/recreo?
└── SÍ → Licencia de Yate (Sección 19)

¿Es pesquero?
└── SÍ → Licencia pesquero (Sección 20)

¿Navega solo en aguas panameñas / cabotaje?
└── SÍ → Licencia Aguas Nacionales (Sección 21)
```

### 22.2 Mapeo Rango → Certificado AMP (Buque de Altura, Bandera Panameña)

| Rango STCW | Tipo Certificado AMP | Sección |
|---|---|---|
| Master (≥ 3000 GT) | CoC AMP o Endoso I/10 | 16.1 / 15.1 |
| Master (500–3000 GT) | CoC AMP o Endoso I/10 | 16.1 / 15.1 |
| Master (< 500 GT) | CoC AMP o Endoso I/10 | 16.1 / 15.1 |
| Chief Mate (≥ 3000 GT) | CoC AMP o Endoso I/10 | 16.1 / 15.1 |
| OOW Navigational (≥ 500 GT) | CoC AMP o Endoso I/10 | 16.1 / 15.1 |
| OOW Navigational (< 500 GT) | CoC AMP o Endoso I/10 | 16.1 / 15.1 |
| Chief Engineer (≥ 3000 kW) | CoC AMP o Endoso I/10 | 16.2 / 15.2 |
| Chief Engineer (750–3000 kW) | CoC AMP o Endoso I/10 | 16.2 / 15.2 |
| Second Engineer (≥ 3000 kW) | CoC AMP o Endoso I/10 | 16.2 / 15.2 |
| Second Engineer (750–3000 kW) | CoC AMP o Endoso I/10 | 16.2 / 15.2 |
| OOW Engineering (≥ 750 kW) | CoC AMP o Endoso I/10 | 16.2 / 15.2 |
| OOW Engineering (< 750 kW) | CoC AMP o Endoso I/10 | 16.2 / 15.2 |
| Able Seafarer Deck (AS-D) | CoC AMP Rating | 16.3 |
| Able Seaman (AB) | CoC AMP Rating | 16.3 |
| Ordinary Seaman (OS) | CoC AMP Rating | 16.3 |
| Bosun | CoC AMP Rating | 16.3 |
| Able Seafarer Engine (AS-E) | CoC AMP Rating | 16.3 |
| Oiler | CoC AMP Rating | 16.3 |
| Chief Cook | CoC AMP Rating | 16.3 |
| Electro-Technical Officer (ETO) | CoC STCW III/6 + Endoso / Offshore | 16.2 / 18 |

### 22.3 Reglas de Validación para el Motor de Matching (Flag: Panama)

Cuando `vessel.flag_state === 'Panama'`, el compliance engine de Leto debe verificar:

1. **Oficiales con CoC extranjero:** Deben tener `Endoso de Reconocimiento AMP` vigente (Regla I/10). Sin endoso → estado `MISSING`, bloqueado para embarque.
2. **Oficiales con CoC panameño:** Deben tener CoC AMP en el rango correcto y GT/kW correctos. Nivel de tonelaje/potencia del buque no puede superar el límite del CoC.
3. **Ratings:** Deben tener CoC AMP de rating correspondiente + BST completo.
4. **Buques tanquero:** Adicional al CoC/Endoso, verificar CoP tanquero (básico o avanzado según posición). Sin CoP tanquero → `MISSING` para tanqueros.
5. **Buques offshore:** Verificar licencia MOU/Offshore específica en vez de CoC estándar.
6. **Cursos especiales (ECDIS, DPO, High Voltage, SDSD, etc.):** Verificar endorsement AMP específico cuando el rol o tipo de buque los requiera.
7. **Fecha de vencimiento:** Endosos AMP tienen vigencia. Aplicar estados `EXPIRING` (< 90 días) y `EXPIRED` de igual manera que CoC STCW (ver Sección 11 de este documento).
8. **Restricciones de tonelaje/potencia:** El `vessel.gross_tonnage` y `vessel.propulsion_kw` deben ser ≤ límite del CoC del marino. Si no → `INVALID_FOR_VESSEL`.

### 22.4 Campos Requeridos en `profiles` (Supabase) para Compliance AMP

Para calcular qué certificados AMP necesita un marino en bandera panameña, el motor necesita los siguientes campos del perfil:

| Campo | Propósito |
|---|---|
| `rank` | Determina la posición STCW base |
| `coc_type` | `'amp'` (CoC panameño) o `'foreign'` (requiere Endoso I/10) |
| `coc_issuing_country` | País que emitió el CoC original (para endoso) |
| `coc_tonnage_limit` | GT o kW máximo autorizado en el CoC |
| `flag_endorsements[]` | Lista de endosos AMP vigentes (con fecha de vencimiento) |
| `cop_tanker_type` | `null` / `'oil'` / `'chemical'` / `'gas'` — nivel básico o avanzado |
| `cop_tanker_level` | `'basic'` / `'advanced'` |
| `special_endorsements[]` | ECDIS, DPO, High Voltage, SDSD, etc. |

---

## 23. GLOSARIO AMP / TÉRMINOS PANAMEÑOS

| Término | Definición |
|---|---|
| **AMP** | Autoridad Marítima de Panamá — Flag State Administration de Panamá |
| **Endoso de Reconocimiento** | Certificado AMP que valida un CoC extranjero para buques panameños (Regla I/10 STCW) |
| **CoC AMP** | Certificate of Competence emitido directamente por AMP (marino con formación panameña o extranjera homologada) |
| **Regla I/10** | Regla STCW que obliga al Flag State a refrendar CoC extranjeros antes del embarque |
| **F-76** | Formulario AMP para solicitud general de documentación técnica |
| **F-77** | Formulario AMP para promoción de rango |
| **F-84** | Formulario AMP con tarifas de servicios marítimos |
| **Gente de Mar** | Término panameño oficial para seafarers — sección de servicios AMP |
| **Cabotaje** | Navegación costera o fluvial dentro de aguas nacionales panameñas |
| **Patrón de Cabotaje** | Capitán para navegación en aguas nacionales panameñas |
| **MOU** | Memorándum of Understanding — acuerdos entre administraciones de bandera |
| **Offshore** | Operaciones en plataformas, instalaciones, o buques de apoyo offshore |
| **IVAN** | Sistema informático AMP para gestión de documentos de gente de mar |
| **Registro de Panamá** | Registro de buques de bandera panameña — el más grande del mundo por GT |

---

*Documento generado: 2026-05-10 · PM: Claude (Cowork) · Fuente: STCW ITF Guide (Manila 2010) + STCW Code Part A*
*Secciones 14–23 incorporadas desde catálogo AMP Panamá (https://www.amp.gob.pa/servicios/gente-mar/) · 2026-05-10*
*Este documento es la referencia de compliance para el motor de matching y alertas de Leto.*
*Ante cualquier duda regulatoria, consultar el texto oficial del Código STCW Parte A (OMI) y la normativa vigente de AMP.*
