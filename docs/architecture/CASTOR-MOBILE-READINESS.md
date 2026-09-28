# Castor — Ruta a móvil: qué construir hoy para no rehacerlo mañana

> **Decisión:** Castor sale primero como **webapp**. La versión de tienda
> (Android / iOS) viene después. Este documento define las reglas de
> construcción que hacen ese segundo paso barato en vez de una reescritura.
>
> Complementa `CASTOR-ARCHITECTURE.md` · Agosto 2026

---

## 1. Las tres etapas

```
ETAPA 1 · WEBAPP                    ← estamos aquí
          castor-app.com · responsive · mobile-first
          Sin dependencia de tiendas. Sin fricción de review. Iteración diaria.

ETAPA 2 · PWA INSTALABLE
          manifest.json + service worker + shell offline.
          En Android se instala como app real. En iOS, parcialmente.
          Sin distribución = sin obligaciones GPLv2.

ETAPA 3 · APP DE TIENDA
          Wrapper (Capacitor) sobre la misma base web.
          Solo si la Etapa 2 se queda corta — ver §6.
```

**La Etapa 2 puede volver innecesaria a la Etapa 3.** Si la tasa de instalación
de la PWA es buena, el marino ya tiene un ícono en su pantalla y notificaciones,
sin App Store, sin review, sin el problema de licencia. Vale la pena medirlo
antes de comprometer meses a la Etapa 3.

---

## 2. Los tres bloqueadores reales

Ordenados por lo que cuesta arreglarlos tarde.

### 2.1 GPLv2 — el único que puede detener el proyecto

El módulo crewing deriva de Stremio Web (GPLv2). Servirlo por web no obliga a
nada; publicarlo en una tienda **sí es distribución** y obliga a entregar el
código fuente de la interfaz.

| Camino | Qué implica | Costo |
|---|---|---|
| **A · Publicar el fuente de `interfaces/castor`** | El backend queda cerrado: es un programa separado detrás de una frontera de red | Bajo |
| B · Reescribir la interfaz del marino sin ascendencia Stremio | Independencia total de licencia | Alto — meses |

**Inclinación: camino A.** El foso competitivo de Castor no es el código de la
UI: es la base de marinos con historial verificado y la lógica MLC del backend.
Publicar el frontend no regala nada que importe.

> ⚠️ Esto no es asesoría legal. Antes de comprometerse hay que validarlo con un
> abogado de propiedad intelectual, particularmente el argumento de que el
> backend FastAPI es un programa separado.

**Regla de arquitectura que se deriva de esto, y aplica desde hoy:**

```
✅ interfaces/castor/   →  UI, presentación, estado local          [GPLv2]
✅ backend/             →  lógica de negocio, MLC, matching        [propietario]
❌ NUNCA mover reglas de negocio propietarias al frontend
```

Cada regla de negocio que se filtre al frontend es código que quedaría publicado.
Esto ya era convención del proyecto (*"lógica de negocio NUNCA en endpoints,
solo en services/"*) — ahora además tiene consecuencia legal.

### 2.2 El iframe

Hoy el módulo crewing corre dentro de un `<iframe>` bajo el landing
(ver `AUTH-FLOW.md`). En un wrapper nativo eso es un problema:

- Un webview conteniendo un iframe rompe el botón atrás y los deep links.
- Apple rechaza wrappers delgados sin valor nativo; una capa extra de indirección
  empeora esa lectura.
- El puente de identidad por `localStorage` compartido no sobrevive al modelo de
  almacenamiento nativo.

**Regla desde el Sprint 1:** toda funcionalidad nueva del marino se construye
para poder vivir **sin** el iframe. Salir del iframe se planifica como trabajo
explícito antes de la Etapa 3 — no se descubre en el camino.

### 2.3 La identidad en `localStorage`

`apiClient.getUserId()`, `NavMenuContent`, `seafarerStore.js` y
`useDocumentUpload.js` leen `localStorage` directo. En nativo, los tokens van en
Keychain (iOS) o Keystore (Android), no en `localStorage`.

**Regla desde el Sprint 1:** ningún archivo nuevo toca `localStorage`
directamente. Todo pasa por un adaptador:

```js
// leto/common/storage.js  — una sola implementación web hoy
export const authStorage = {
  getToken(),  setToken(t),  clear(),
  getUser(),   setUser(u)
}
```

Un archivo hoy. Veinte archivos y una cacería de bugs si se hace después.

---

## 3. Reglas de construcción — Sprint 1 en adelante

| Regla | Por qué importa para móvil | Costo hoy |
|---|---|---|
| API-first: cero lógica de negocio en el frontend | El wrapper reutiliza la misma API sin cambios | Ninguno — ya es convención |
| Todo `localStorage` detrás de `storage.js` | Swap a almacenamiento seguro sin tocar el resto | 1 archivo |
| Uploads detrás de una interfaz `FileSource` | En nativo es cámara + filesystem, no `<input type="file">` | 1 archivo |
| Notificaciones detrás de `NotificationChannel` | Web Push ≠ FCM ≠ APNs | 1 archivo |
| Nada de `window.top` / `window.parent` fuera de una capa de compatibilidad | En nativo no hay iframe padre | Bajo |
| Mapa de rutas canónico documentado | Universal Links y App Links necesitan URL estables | Documentar |
| Sin APIs solo-navegador en la ruta crítica | El webview restringe varias | Revisión continua |
| Íconos y splash en tamaños de tienda desde ya | Evita rehacer branding bajo presión | Bajo |

### Lo que NO hacemos ahora

Construir "con miras a móvil" se degrada en sobreingeniería si no se acota:

```
❌ NO instalar Capacitor todavía
❌ NO reescribir en React Native
❌ NO abstraer nada que no tenga una segunda implementación concreta a la vista
❌ NO diseñar para casos de uso nativos que nadie ha pedido
```

Los cuatro adaptadores de §3 se justifican porque cada uno es **un archivo** y
cada uno tiene **una segunda implementación conocida**. Nada más califica.

---

## 4. Offline-first: no es una feature de móvil, es del producto

Un marino a bordo tiene satélite intermitente. Si Castor necesita conexión para
mostrarle sus certificados y sus vencimientos, es inútil exactamente cuando más
lo necesita: en una inspección de Port State Control.

Esto hay que resolverlo en la Etapa 1, no en la 3:

```
LECTURA    Cache local de documentos, vencimientos y perfil.
           La app abre y muestra datos aunque no haya red.

ESCRITURA  Cola de operaciones pendientes que se drena al reconectar.
           Subir un certificado desde el barco no puede fallar por señal.

ESTADO     La UI distingue tres cosas, siempre visibles:
           sincronizado · pendiente de subir · desactualizado
```

Es la pieza más cara de este documento y la que más se posterga. También es la
que convierte la Etapa 3 en un envoltorio en vez de un rediseño: una app nativa
sin offline no aporta nada sobre una PWA.

---

## 5. Checklist de la Etapa 2 (PWA)

`interfaces/castor/manifest.json` ya existe. Falta:

- [ ] Service worker con shell offline y estrategia de cache por tipo de recurso
- [ ] Íconos completos (192, 512, maskable) y splash
- [ ] `display: standalone` y `theme_color` coherentes con la marca Castor
- [ ] Prompt de instalación en el momento correcto (después del primer documento
      subido, no en la primera visita)
- [ ] Web Push en Android
- [ ] Probado en conexión degradada, no solo con DevTools offline
- [ ] Métrica de instalaciones instrumentada — es el dato que decide la Etapa 3

---

## 6. Cuándo evaluar la Etapa 3

Por condiciones, no por fecha. Se abre el proyecto de tienda si se cumple alguna:

| Señal | Umbral |
|---|---|
| Tasa de instalación de PWA en iOS baja | Medir en Etapa 2 |
| Se necesita push confiable en iOS | Web Push en iOS sigue siendo limitado |
| Se necesita cámara o biometría nativa en la ruta crítica | Captura de certificados, login biométrico |
| Clientes navieros lo piden explícitamente | Señal comercial directa |

Si ninguna se cumple, la Etapa 3 no se hace. Una app en tienda que no aporta
sobre la PWA es costo de mantenimiento permanente, review de dos plataformas, y
la obligación GPLv2 encima.

---

## 7. Orden de trabajo

```
SPRINT 1   storage.js (adaptador) · sin nuevos accesos directos a localStorage
           Mapa de rutas canónico documentado

SPRINT 2   FileSource + NotificationChannel
           Cache de lectura offline para documentos y vencimientos

SPRINT 3   Cola de escritura offline · indicadores de estado de sync
           Service worker + checklist PWA

ETAPA 2    Lanzar PWA · instrumentar instalaciones · medir 8–12 semanas

DECISIÓN   Revisar §6 con datos reales.
           Si procede: resolver GPLv2 y salir del iframe ANTES de tocar Capacitor.
```

---

*Castor Mobile Readiness v1.0 · PBS · PB Trading Solution · Panamá · 2026*
