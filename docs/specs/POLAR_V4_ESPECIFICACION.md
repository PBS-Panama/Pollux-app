# Aguas polares — Regla V/4 · especificación cerrada contra la fuente

> 📌 **DOCUMENTO DEL PM — SOLO LECTURA PARA EL DEV.** Para responder o registrar avances:
> `Handover.md`.

**Fecha:** 2026-09-15
**Fuente:** MSC.416(97), texto oficial IMO — https://wwwcdn.imo.org/localresources/en/OurWork/HumanElement/Documents/MSC.416(97).pdf
**Estado:** ✅ **No depende de la compra de la edición 2026.** Esta familia queda resuelta con la resolución gratuita.

---

## 1. Lo que dice la fuente

Leída la MSC.416(97) directamente. Confirmado:

| Punto | Texto de la resolución |
|---|---|
| **Regla añadida** | **V/4** — *«Mandatory minimum requirements for the training and qualifications of masters and deck officers on ships operating in polar waters»* |
| **Básico (V/4.1)** | *«Masters, chief mates and officers in charge of a navigational watch on ships operating in polar waters shall hold a certificate in basic training»* |
| **Avanzado (V/4.3)** | *«Masters and chief mates on ships operating in polar waters shall hold a certificate in advanced training»* |
| **Prerrequisitos del avanzado (V/4.4)** | Certificado básico + **2 meses** de servicio en la mar en aguas polares a nivel de gestión o de guardia + curso avanzado aprobado |
| **Vigencia (I/11.4, nuevo)** | Competencia profesional continuada *«at intervals not exceeding five years»* |
| **Entrada en vigor** | **1 jul 2018** |
| **Transitorio** | Hasta **1 jul 2020** para quien inició servicio antes del 1 jul 2018 (3 meses de servicio operacional o curso equivalente) |
| **Competencias en el Código** | **A-V/4-1** (básico) y **A-V/4-2** (avanzado) |

**Es un ciclo quinquenal que está en el Convenio, no en un curso modelo.** Misma categoría que el refresco de buques de pasaje de la V/2 — obligatorio, no recomendado.

---

## 2. Hueco en el catálogo — CERRADO por el dev de Castor (notas 53 y 61)

`grep -i polar` sobre `app/services/document_requirements.py` daba **cero coincidencias**, mientras
`app/db/learning_seeds.py` tenía una serie formativa completa del Código Polar. Castor enseñaba
formación polar y su motor de cumplimiento no sabía que los certificados polares existían.

### Entradas añadidas en `DOC_METADATA`

```python
"IMO 7.11 — Basic Training for Ships Operating in Polar Waters":    {"level": "critical", "cert_type": "D/P", "validity_years": 5, "source": "stcw_amendment_2016: MSC.416(97) Reg. V/4.1 + Reg. I/11.4 (intervalos no superiores a 5 anos)"},
"IMO 7.12 — Advanced Training for Ships Operating in Polar Waters": {"level": "critical", "cert_type": "D/P", "validity_years": 5, "source": "stcw_amendment_2016: MSC.416(97) Reg. V/4.3 + Reg. I/11.4 (intervalos no superiores a 5 anos)"},
```

`level: "critical"` porque sin el certificado el marino **no puede servir** en ese buque — el mismo
criterio que ya usan las entradas de tanquero (*«required to serve on that vessel type»*).

### Asignación por rango — por `special_endorsements`, no por `vessel_type_id`

El PM había especificado condicionarlo por tipo de buque, igual que la familia de tanqueros. **El
dev verificó ese mecanismo y encontró que no aplica:** aguas polares no es un tipo de casco ni de
carga, es una **zona de operación**, y cualquier `vessel_type_id` puede navegar ahí o no. El
mecanismo correcto es `special_endorsements` (columna real de `Seafarer`, ya usada para
offshore/MOU) — mismo eje que polar: un atributo del marino y su asignación, no del casco.

| Rango | Básico (7.11) | Avanzado (7.12) |
|---|---|---|
| `master` | ✔ | ✔ |
| `chief-officer` | ✔ | ✔ |
| `2nd-officer` · `3rd-officer` (guardia) | ✔ | — |

Ratings y máquinas: la V/4 **no los cubre**. No inventar requisito donde el Convenio no lo pone.

Espejado en `crewDocData.js` de Castor con las cadenas de título **idénticas byte a byte** al
backend — un desajuste ahí haría que frontend y backend no reconozcan el mismo documento, sin error
visible.

---

## 3. Error de cita regulatoria en el contenido formativo — CORREGIDO (migración `0010`)

`learning_seeds.py` etiquetaba la serie polar como **V/3**. Es incorrecto, y además **V/3 es una
regla real sobre algo distinto**: el **Código IGF** (buques que usan gas o combustibles de bajo
punto de inflamación), añadida por la **MSC.396(95)** (2015). Nada que ver con hielo.

El error era **solo de título**: a nivel de episodio el contenido ya citaba correctamente
**A-V/4-1** y **A-V/4-2**. Quien lo escribió tenía la fuente correcta para las competencias y erró
el número de la regla en los encabezados.

| Línea | Antes | Ahora |
|---|---|---|
| 632 | `"Reg. V/1-1, V/1-2, V/2, V/3"` | `"Reg. V/1-1, V/1-2, V/2, V/3, V/4"` — antes **omitía la V/4** |
| 651 | `"T5 — Aguas Polares (V/3)"` | `"T5 — Aguas Polares (V/4)"` |
| 737 | `"STCW Reg. V/3 — Aguas Polares (Polar Code)"` | `"STCW Reg. V/4 — Aguas Polares (Polar Code)"` |

La fila ya vivía sembrada en producción y el gate de `seeds.py` es `_series_count == 0`, así que el
fix de código por sí solo no la habría tocado nunca: hizo falta la migración
`0010_polar_v4_title_fix` con `UPDATE ... WHERE title = <string vieja exacta>` y downgrade
simétrico. `badge_id: "stcw-reg-v3"` quedó **sin tocar a propósito** — es identidad de fila, no
título.

Citar mal una regla en contenido formativo de cumplimiento es el tipo de error que un cliente
naviero detecta y usa para descartar el producto.

---

## 4. 🟡 Hueco derivado, abierto: el Código IGF

Al confirmar que V/3 es el IGF apareció un segundo hueco. `grep -i "igf"` sobre `app/` devuelve
coincidencias **solo en `exam_seeds.py`**, y de otra naturaleza: **tres centros panameños de
formación (UMIP, PMTS, ITI) listan «Código IGF» entre sus especialidades**. El producto ya le dice
al marino panameño dónde tomar el curso IGF, pero no tiene ni el certificado en el catálogo ni
contenido formativo sobre él.

No es urgente como la polar (la flota de gas es más chica que la que cruza aguas polares), pero
queda registrado como familia faltante con base convencional propia: **Regla V/3 + A-V/3,
MSC.396(95)/MSC.397(95), en vigor 1 ene 2017**.

---

## 5. Qué sigue esperando la edición consolidada 2026

Esto **no**: la familia polar está cerrada.

Sí siguen esperando el texto consolidado:

- Las **9 filas que pasan a `None`** y las **4 que cambian de base** del documento de vigencias.
- **A-I/2 enmendada** (MSC.541(107)) — formato de títulos y refrendos incluidas versiones
  electrónicas, antes de cerrar el modelo de documento y el formato de exportación.
- Las tandas de **2021** (MSC.486/487(103)) y **2024** (MSC.560(108)), no localizadas en abierto.

### ⚠️ Sobre los PDF «STCW 2010 Manila» adjuntos al proyecto

**No son el Convenio ni el Código.** Son la guía divulgativa *«STCW: A Guide for Seafarers»* de la
ITF, bajada de Studocu. Y **se contradicen a sí mismos** en las filas que importan: la Parte 3 dice
«Survival craft / Fast rescue boat — Revalidation: **No**», las tablas por rango dicen **«Yes»**, y
el Anexo C dice **«five year refresher»**. Tres respuestas a la misma pregunta en el mismo
documento. **No se usan como fuente para nada**, ni para las filas donde aciertan.
