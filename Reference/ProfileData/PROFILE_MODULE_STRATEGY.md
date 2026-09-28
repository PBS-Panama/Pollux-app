# My Profile — Data Strategy & Claude Code Prompt
**Prepared:** 2026-05-24  
**Module:** `IDM/src/routes/MyProfile/MyProfile.js`

---

## Data Files Generated (use these, don't hallucinate data)

All files are already in `IDM/src/common/profileData/` — ready to import.

| File | Contents | Records |
|------|----------|---------|
| `countries_world.json` | All 249 countries (ISO 3166-1), with `iso2`, `iso3`, `name`, `label`, `in_americas` flag | 249 |
| `languages_profile.json` | IMO official languages + Americas languages | 13 |
| `provinces_by_country.json` | ISO 3166-2 first-level subdivisions (provinces/states/regions) for 200 countries | 3,590 |
| `airports_by_country.json` | IATA international airports for 39 countries (Americas + key maritime nations) | 128 |
| `vessel_types.json` | 43 vessel types organized by fleet_category (merchant/offshore/fishing/yacht/national), with STCW special endorsement requirements | 43 |
| `panama_companies.json` | 57 maritime companies operating in Panama — shipping agencies (CMP-verified), terminals, crewing agencies, international lines | 57 |
| `training_centers_panama.json` | 12 AMP-recognized maritime training centers in Panama — public university, private centers, state institute. Fields: id, name, abbreviation, type, resolution, website, courses_count, specialties[] | 12 |

---

## IMO Languages (verified)
Source: IMO Convention Art. 43 — official working languages of the International Maritime Organization.
STCW Reg. I/2 §3: English is the standard working language for international maritime communications.

| Code | English | Spanish |
|------|---------|---------|
| `ar` | Arabic | Árabe |
| `zh` | Chinese (Mandarin) | Chino Mandarín |
| `en` | English | Inglés |
| `fr` | French | Francés |
| `ru` | Russian | Ruso |
| `es` | Spanish | Español |

Plus Americas languages: Portuguese, Dutch, Haitian Creole, Papiamento, Quechua, Guaraní, Aymara.

---

## Airport Field — Design Decision
The `airports_by_country.json` covers 39 countries (all of Americas + Philippines, India, Greece, Croatia, Russia, Ukraine, Nigeria, China, Singapore, UK, Norway).

**For countries NOT in the airports file:** show a free-text `<input>` fallback with placeholder "Enter airport name or IATA code".

---

## Claude Code Prompt

```
Modifica `IDM/src/routes/MyProfile/MyProfile.js` para agregar los siguientes campos nuevos en el panel izquierdo (profile panel), justo debajo del bloque de Age/City/Exp. Todos los datos deben importarse desde archivos JSON estáticos ubicados en `IDM/src/common/profileData/`.

### Archivos de datos disponibles
- `countries_world.json` → array en `.countries[]`, campos: `iso2`, `label` (nombre en inglés)
- `languages_profile.json` → array en `.languages[]`, campos: `code`, `label`, `label_es`
- `provinces_by_country.json` → objeto en `.provinces`, clave = iso2, valor = array de `{code, name, type}`
- `airports_by_country.json` → objeto en `.airports`, clave = iso2, valor = array de `{iata, name, city}`
- `vessel_types.json` → objeto en `.vessel_types`, clave = fleet_category, valor = array de `{id, label, label_es, stcw_special[]}`
- `panama_companies.json` → array en `.companies[]`, campos: `name`, `type`, `country`
- `training_centers_panama.json` → array en `.centers[]`, campos: `id`, `name`, `abbreviation`, `type`, `specialties[]`, `courses_count`

Todos los archivos ya están en `IDM/src/common/profileData/` — no necesitas copiar nada.

### Campos a agregar (en este orden, dentro del panel izquierdo):

---

#### 1. País de residencia
- Label: "País de residencia"
- Control: `<select>` dropdown
- Opciones: todos los países de `countries_world.json`, ordenados alfabéticamente por `label`
- Valor guardado: `iso2` del país (e.g. "PA")
- Estado: siempre habilitado

---

#### 2. Provincia / Estado
- Label: "Provincia / Estado" (o el type del país si está disponible)
- Control: `<select>` dropdown
- Opciones: subdivisiones del país seleccionado en "País de residencia", tomadas de `provinces_by_country.json[selectedCountry]`
- Si el país no tiene datos → mostrar `<input type="text">` con placeholder "Ingresa tu provincia o estado"
- Estado: **deshabilitado** si no se ha elegido "País de residencia". Cuando está deshabilitado, aplicar `opacity: 0.4` y `cursor: not-allowed` al wrapper

---

#### 3. Aeropuerto de referencia
- Label: "Aeropuerto de referencia"
- Control: `<select>` si hay aeropuertos en `airports_by_country.json[selectedCountry]`, sino `<input type="text">`
- Opciones del select: `{iata} — {name} ({city})` para cada aeropuerto del país
- Valor guardado: código IATA (e.g. "PTY")
- Estado: **deshabilitado** hasta que se hayan elegido TANTO "País de residencia" COMO "Provincia / Estado". Si el país no tiene aeropuertos en el JSON, habilitar como texto libre cuando el país esté seleccionado
- Tooltip/hint bajo el campo: "Tu aeropuerto de salida habitual. Las empresas lo usan para calcular costos de movilización." (texto pequeño, color #778899)

---

#### 4. Nacionalidades
- Label: "Nacionalidades"
- Control: sistema de multi-selección — dropdown list + chips/tags
- Opciones: todos los países de `countries_world.json` (misma lista que País de residencia)
- Límite: máximo 3 nacionalidades
- UX: al elegir un país del dropdown, se agrega como chip debajo. Cada chip tiene un botón "×" para eliminar. Si ya hay 3 chips, el dropdown se deshabilita con mensaje "Máximo 3 nacionalidades"
- Valor guardado: array de iso2, e.g. `["PA", "ES", "CO"]`

---

#### 5. Idiomas (upgrade del campo existente)
El campo `languages` actual es un `EditableMetaLinks` de texto libre. **Reemplazarlo** con:
- Label: "Languages / Idiomas"
- Control: mismo sistema de multi-selección con chips (igual que Nacionalidades)
- Opciones: `languages_profile.json` — mostrar `label` en inglés con `label_es` en paréntesis, e.g. "Spanish (Español)"
- Sin límite de selección (el seafarer puede hablar todos los idiomas que quiera)
- Valor guardado: array de códigos, e.g. `["es", "en", "pt"]`
- Los valores existentes en `savedData.languages` (string separado por comas) deben migrar: parsear el string viejo y preseleccionar los idiomas que coincidan por nombre aproximado

---

### Persistencia
Todos los campos nuevos deben incluirse en `saveProfileExtra()` / `loadProfileExtra()` con estas claves:
- `residenceCountry` (string iso2)
- `residenceProvince` (string: código ISO 3166-2 o texto libre)
- `referenceAirport` (string: IATA o texto libre)
- `nationalities` (array de iso2, max 3)
- `spokenLanguages` (array de codes — reemplaza `languages` string)

Mantener `languages` como string vacío en el savedSnapshot para no romper la lógica de `isExtraDirty`.

---

### Lógica de dirty-check
Extender `isExtraDirty` para incluir los 5 campos nuevos. Para arrays, comparar con `JSON.stringify`.

---

### Estilos
Reusar las constantes ya definidas en el archivo: `SEL`, `INP_SM`, `LBL`.  
Para los chips/tags de nacionalidades e idiomas, usar este estilo inline:
```js
const CHIP = {
  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
  padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem',
  background: 'rgba(0,210,211,0.15)', color: '#00d2d3',
  border: '1px solid rgba(0,210,211,0.3)', margin: '2px',
};
```

---

---

#### 6. Vessels (upgrade del campo existente)
El campo `vessels` actual es un `EditableMetaLinks` de texto libre. **Reemplazarlo** con:
- Label: "Vessel Types / Tipos de embarcación"
- Control: sistema de multi-selección con chips (igual que Idiomas y Nacionalidades)
- Opciones: `vessel_types.json` — organizado por categoría (fleet_category). Mostrar un `<optgroup>` por categoría usando el label en español: Merchant Marine, Offshore/MOU, Pesca, Yate/Recreación, Aguas Nacionales.
- Cada opción muestra: `label` (inglés) — `label_es` (español), e.g. "Bulk Carrier — Granelero"
- Sin límite de selección
- Valor guardado: array de ids, e.g. `["bulk_carrier", "oil_tanker_crude"]`
- Migración: el string viejo de `vessels` debe parsearse y descartarse (no hay equivalencia directa, iniciar vacío)

---

#### 7. Companies (upgrade del campo existente)
El campo `companies` actual es un `EditableMetaLinks` de texto libre. **Reemplazarlo** con:
- Label: "Companies / Empresas"
- Control: combo-box (dropdown con búsqueda por texto) + chips, con fallback a texto libre
- Opciones base: `panama_companies.json` — array en `.companies[]`, campo `name`
- UX: el usuario escribe en el campo y se filtra la lista. Si lo que escribió no está en la lista, puede igual agregarlo como chip libre (texto tal cual)
- Sin límite de selección
- Valor guardado: array de strings (nombres de empresa), e.g. `["Boyd Steamship Corp.", "Maersk Line", "Mi Empresa Libre"]`
- Migración: parsear el string viejo de `companies` separado por comas y convertir cada item en un chip

---

#### 8. Training Centers / Centros de Formación
- Label: "Training Centers / Centros de Formación"
- Control: combo-box (dropdown con búsqueda por texto) + chips, con fallback a texto libre
- Opciones base: `training_centers_panama.json` — mostrar `name` completo o `abbreviation` + ` — ` + `name`, e.g. "PMTS — Panama Maritime Training Services, Inc."
- UX: igual que Companies — el usuario escribe para filtrar. Si el centro que escribió no está en la lista, puede agregarlo como chip libre
- Sin límite de selección
- Valor guardado: array de ids (cuando sea de la lista) o strings (texto libre), e.g. `["pmts", "iti", "Mi Centro Propio"]`
- Migración: campo nuevo, iniciar vacío

---

### Persistencia (actualizada)
Todas las claves en `saveProfileExtra()` / `loadProfileExtra()`:
- `residenceCountry` (string iso2)
- `residenceProvince` (string: código ISO 3166-2 o texto libre)
- `referenceAirport` (string: IATA o texto libre)
- `nationalities` (array de iso2, max 3)
- `spokenLanguages` (array de codes — reemplaza `languages` string)
- `vesselTypes` (array de ids — reemplaza `vessels` string)
- `workedCompanies` (array de strings — reemplaza `companies` string)
- `trainingCenters` (array de ids/strings — campo nuevo)

Mantener `languages`, `vessels`, `companies` como strings vacíos en el savedSnapshot para no romper la lógica de `isExtraDirty`.

---

### Lógica de dirty-check
Extender `isExtraDirty` para incluir los 8 campos nuevos. Para arrays, comparar con `JSON.stringify`.

---

### Estilos
Reusar las constantes ya definidas en el archivo: `SEL`, `INP_SM`, `LBL`.  
Para los chips/tags de todos los campos multi-selección, usar este estilo inline:
```js
const CHIP = {
  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
  padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem',
  background: 'rgba(0,210,211,0.15)', color: '#00d2d3',
  border: '1px solid rgba(0,210,211,0.3)', margin: '2px',
};
```

---

### NO tocar
- El bloque AMP Panamá (no modificar)
- El panel derecho de documentos (no modificar)
- La lógica de `handleSave`, `handleDiscard`, el modal de unsaved changes
- Los ActionButtons inferiores
```
