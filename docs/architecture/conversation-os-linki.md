# Conversation OS + Linki

Arquitectura unificada para automatizar el outreach de LinkedIn hacia posicionamiento como
arquitecto empresarial — análisis, decisión de riesgo y plan de construcción.

_Escrito 2026-10-07._

## Contenido

1. [El objetivo real, en una frase](#1-el-objetivo-real-en-una-frase)
2. [La decisión de riesgo ya tomada](#2-la-decisión-de-riesgo-ya-tomada)
3. [Las tres capas de riesgo y qué hace cada sistema](#3-las-tres-capas-de-riesgo-y-qué-hace-cada-sistema)
4. [Arquitectura: dos sistemas, un flujo](#4-arquitectura-dos-sistemas-un-flujo)
5. [Qué cambia en el modelo de datos](#5-qué-cambia-en-el-modelo-de-datos)
6. [Plan de fases, priorizado por ingreso](#6-plan-de-fases-priorizado-por-acercarte-a-generar-ingreso)
7. [La rutina manual, para no depender del desarrollo](#7-la-rutina-manual--para-que-el-desarrollo-nunca-te-bloquee)
8. [Riesgos abiertos y cómo se vigilan](#8-riesgos-abiertos-y-cómo-se-vigilan)

## 1. El objetivo real, en una frase

No es construir una herramienta de automatización de LinkedIn. Es construir el sistema nervioso
de una estrategia de posicionamiento: **alcance → investigación real → artículos de arquitectura
empresarial → confianza cultivada → oportunidades de negocio que emergen, no se persiguen**.

Eso importa para el diseño porque descarta una tentación obvia: optimizar por volumen de mensajes
enviados. El sistema no mide éxito en conexiones/día — mide éxito en **entrevistas aterrizadas**,
**calidad de las respuestas de investigación** y **relaciones que siguen vivas 6 meses después**.
La automatización existe para liberar tiempo hacia esas tres cosas, no para sustituirlas.

| Capa | Qué da | Qué mide éxito |
|---|---|---|
| 1. Alcance | Pasar las 500+ conexiones, postura, superficie de contactos | Conexiones aceptadas/semana, tasa de aceptación |
| 2. Investigación | Comprensión real de mercado, data, feedback, material para artículos | Entrevistas completadas, calidad de respuestas (quality score) |
| 3. Posicionamiento | Reputación de arquitecto empresarial en los nichos | Artículos publicados, engagement con ellos |
| 4. Oportunidad | Ingreso real | Propuestas enviadas, tasa de conversión, relaciones cultivadas activas |

## 2. La decisión de riesgo ya tomada

> **Decidido.** No existe una vía oficial de LinkedIn para esto — a diferencia de
> Instagram/ManyChat, que opera sobre una API pública sancionada por Meta. Toda automatización de
> connection requests y mensajería en LinkedIn (linki, Expandi, gtm-api, Dux-Soup) opera fuera de
> los ToS. La variable real no es "legítimo vs. ilegítimo" sino **cuánto riesgo se asume y cuánto
> control se tiene sobre ese riesgo**.

Se evaluaron dos vías de automatización real:

- **gtm-api/linkedin-mcp** — descartado. El motor corre en la nube de un tercero no auditable, la
  cifra de marketing "<1% ban en 20.000 usuarios" es autoreportada, sin metodología, sin ventana
  temporal, sin auditoría, y la empresa no tiene huella pública (cero menciones orgánicas en
  Reddit/HN a pesar de la supuesta base de usuarios). Entregarle la sesión de LinkedIn a esa caja
  negra es un riesgo no cuantificado, no un riesgo bajo.
- **[moaljumaa/linki](https://github.com/moaljumaa/linki)** — elegido. Self-hosted, 100%
  auditable, las credenciales nunca salen de la máquina/VPS propia. El mecanismo real de
  reducción de riesgo (fingerprint pinning consistente entre login y runtime, Playwright +
  stealth) es el mismo enfoque de fondo que usa cualquier herramienta cloud-based seria — pero
  aquí se controla y se verifica directamente, en vez de confiar en la palabra de un proveedor
  joven.

LinkedIn no detecta "la herramienta" — detecta **patrones de comportamiento** que se salen de lo
humano: volumen alto, velocidad constante, mensajes idénticos en serie, fingerprint que cambia
entre sesiones. Un perfil que manda 15-20 solicitudes/día con notas variadas, en horario humano,
con un fingerprint estable, es indistinguible de un usuario activo normal. Ese es el espacio
operativo objetivo — no existe la opción de riesgo cero, solo riesgo bajo y gestionado.

## 3. Las tres capas de riesgo y qué hace cada sistema

| Capa | Acciones | Riesgo | Quién lo hace |
|---|---|---|---|
| **1 — Lectura/generación** | Scraping de perfiles, enriquecimiento, generación de mensajes/preguntas/artículos con LLM, análisis de respuestas | Prácticamente nulo | Conversation-os + Apify (ya funciona) + LLM |
| **2 — Acción de bajo volumen** | Connection requests, mensajes de secuencia (inicial, follow-up, pitch), visitas de perfil | Bajo, gestionado | Linki, self-hosted, límites conservadores |
| **3 — Juicio humano** | Decidir cuándo pasar de investigación a propuesta, redactar/aprobar la transición, llamadas, cierre de propuestas | N/A — es trabajo personal | Samuel, siempre, sin excepción |

> **No negociable.** La Capa 3 nunca se automatiza y nunca debería. Es precisamente donde está el
> valor de la estrategia: la transición "smooth" de investigación a propuesta depende de leer la
> conversación real, el tono, el momento. Un sistema que generara automáticamente "¿te
> interesaría una propuesta?" sin que la respuesta de la entrevista se leyera primero destruiría
> exactamente la confianza que se está cultivando.

## 4. Arquitectura: dos sistemas, un flujo

La pregunta de fondo era si fusionar linki dentro del monorepo de conversation-os o mantenerlos
separados. **Separados, comunicándose por API.** Tres razones concretas:

1. **Licencia.** La "Linki Sustainable Use License" prohíbe ofrecer el software como servicio a
   terceros. No afecta en uso propio — pero si algún día conversation-os se convierte en un
   producto ofrecido a otros arquitectos/consultores (coherente con el objetivo de
   posicionamiento), mezclar código de linki dentro del propio repo complica esa puerta.
   Mantenerlo como un servicio externo invocado por API la deja abierta sin esfuerzo adicional.
2. **Stacks incompatibles de raíz.** Linki es Next.js + SQLite de archivo único, pensado para una
   instancia de un solo operador. Conversation-os es NestJS + Postgres, con un modelo de datos
   relacional real (niches, research plans, interactions) que no tiene sentido replicar en
   SQLite. Forzar un solo proceso sería pelear contra ambas arquitecturas.
3. **Separación de responsabilidad real.** Linki sabe ejecutar acciones de browser contra
   LinkedIn de forma segura (su única competencia). Conversation-os sabe la estrategia, el
   pipeline de investigación, los nichos, la generación de contenido. Esa es la línea correcta:
   **linki es el brazo, conversation-os es el cerebro.**

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONVERSATION OS (cerebro)                    │
│   NestJS + Postgres + Redis/Bull — ya existe, se extiende          │
│                                                                     │
│   • Decide QUÉ contacto, QUÉ mensaje, CUÁNDO                      │
│   • Genera mensajes/preguntas/artículos vía LLM                    │
│   • Pipeline de investigación por nicho (ya existe)                 │
│   • Cola de aprobación humana (ya existe, se extiende)             │
│   • Analiza transcripciones de llamadas → detecta oportunidades    │
│   • Orquesta "warm-up" y límites diarios de la cuenta               │
└───────────────────────┬─────────────────────────────────────────┘
                         │  HTTP interno (Docker network),
                         │  nunca expuesto a internet
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                         LINKI (brazo)                              │
│   Next.js + SQLite + Playwright — self-hosted, fork propio          │
│                                                                     │
│   • Ejecuta: connection request, visita, mensaje, secuencia         │
│   • Posee la sesión real de LinkedIn (cookies, fingerprint)         │
│   • Aplica sus propios límites diarios, horario activo              │
│   • Expone su API REST/OAuth propia                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Cómo se hablan, en concreto

| Dirección | Mecanismo | Para qué |
|---|---|---|
| COS → Linki | Llamada a la API REST de linki (su servidor OAuth propio ya existe para esto) | "Envía esta connection request / este mensaje a esta URL de LinkedIn" |
| Linki → COS | Webhook (a construir — un endpoint nuevo en conversation-os) o polling periódico del estado de `runs` | "Esta solicitud fue aceptada", "este mensaje se entregó", "llegó una respuesta inbound" |

Conversation-os sigue siendo la única fuente de verdad sobre el `Person` y su `status`. Linki no
necesita saber nada de nichos, planes de investigación ni artículos — solo ejecuta la acción que
se le pide y reporta el resultado.

### Nota sobre el fork

Se usa un **fork propio** de `moaljumaa/linki` (en vez de solo clonar) para poder mantener
integraciones y evoluciones específicas de este flujo — por ejemplo, el webhook hacia
conversation-os, o ajustes a los límites por defecto. Esto es compatible con la Linki Sustainable
Use License siempre que el uso siga siendo propio: la licencia permite modificar y mantener un
fork, lo que prohíbe es **ofrecerlo como servicio hosted a terceros**. Mientras el fork siga
corriendo solo para esta cuenta, no hay conflicto. Si en el futuro conversation-os se convierte en
producto para otros usuarios, esto hay que revisarlo explícitamente antes de distribuir nada que
dependa del fork.

## 5. Qué cambia en el modelo de datos

El esquema actual de Prisma ya tiene la columna vertebral correcta (`Person`, `Interaction`,
`ResearchPlan/Question/Answer`). Lo que falta, en orden de necesidad:

| Cambio | Por qué |
|---|---|
| `PersonSource.LINKI_IMPORT` y campo `linkiRunId` en `Interaction` | Trazar qué interacción fue ejecutada por linki vs. generada-pero-enviada-a-mano (como hoy) |
| Nuevo modelo `LinkedInAccount` | Hoy el sistema asume una sola cuenta implícita. Se necesitan **límites diarios configurables, horario activo, estado de "warm-up"** — reflejo del lado de linki pero visible en el pipeline propio |
| Nuevo modelo `ResearchCallRecording` (transcripción + resumen + link a `Interaction`) | Las llamadas transcritas por IA deben entrar al sistema y analizarse para detectar oportunidades |
| Nuevo modelo `Opportunity` (persona, señales detectadas, estado: identificada → propuesta enviada → negociación) | Hoy "oportunidad identificada" es solo un `PersonStatus`; el análisis de conversación debe *detectar* oportunidades, no depender de marcado manual primero |
| Nuevo modelo `Article` (nicho, hallazgos fuente = `ResearchAnswer[]`, estado: borrador → revisión → publicado) | Objetivo de mediano-largo plazo explícito — el sistema debe acumular evidencia de investigación y proponer artículos, no solo gestionar contactos |
| `InteractionType.RELATIONSHIP_TOUCH` con cadencia programable por persona | Ya existe el enum, falta el motor que decide cuándo generar ese touch — es el "cultivo de relación" explícito |

> **Principio de diseño que se mantiene.** Todo lo que genera el sistema (mensajes, preguntas,
> propuestas, artículos) sigue pasando por aprobación antes de salir — eso ya es la arquitectura
> actual (`status: PROPOSED → SENT/SENT_EDITED`) y es correcto mantenerlo para absolutamente todo
> lo nuevo, incluyendo artículos y detección de oportunidades. La meta a largo plazo es que la
> edición necesaria tienda a cero por calidad, no que se elimine el punto de aprobación.

## 6. Plan de fases, priorizado por acercarte a generar ingreso

Una sola línea de producción. El orden está pensado para que cada fase sea usable sola y la que
sigue dependa de que la anterior ya esté dando valor real, no de que esté "perfecta".

### Fase 0 — ya existe, ajustar

**Asistente manual + rutina diaria (sin bloquear nada).** Conversation-os ya genera mensajes y
gestiona la cola. Esto corre ya, en paralelo a todo el desarrollo que sigue — ver sección 7. No
se espera al MVP de linki para empezar a investigar y cultivar relaciones.

### Fase 1 — Capa 1, riesgo nulo

**Generación con LLM real (reemplaza las plantillas estáticas).**

- `message-generator.service.ts` pasa de plantillas fijas a prompts con contexto real (perfil,
  nicho, respuestas de investigación acumuladas) — esto es lo que hace que la edición tienda a
  cero con el tiempo.
- Generación de preguntas de entrevista adaptativas: el LLM sugiere la siguiente pregunta
  basándose en lo que ya se cubrió (hoy es una lista fija por nicho).
- Ingesta de transcripción de llamada → resumen + `ResearchAnswer[]` + flags de oportunidad
  detectada. Esto es Capa 1 pura: ningún riesgo de cuenta, solo procesamiento de texto.

**Por qué primero:** mejora inmediatamente la calidad de lo que ya se usa a mano hoy, sin tocar
automatización de LinkedIn ni esperar a resolver nada de infraestructura de riesgo.

### Fase 2 — Puente con linki, volumen bajo y vigilado

**Automatizar connection requests únicamente.**

- Deploy del fork de linki, self-hosted (VPS o local), **aislado en su propia red Docker**, nunca
  expuesto públicamente — mismo principio ya seguido con Postgres/Redis.
- Integración mínima: conversation-os decide la lista diaria de "a quién conectar" (ya tiene ese
  concepto en `getActionQueue`) y la empuja a linki vía su API. **Solo connection requests al
  inicio** — es la acción de menor riesgo relativo y la que más directamente sirve el objetivo #1
  (pasar 500).
- Límites deliberadamente por debajo de lo "tolerable": empezar en ~10-15/día, fingerprint fijo
  desde el día 1, warm-up de 2-3 semanas antes de subir el volumen.
- **Piloto de 2-4 semanas antes de confiar en ello** — mide tasa de aceptación y cualquier warning
  de LinkedIn antes de avanzar a mensajería automatizada.

### Fase 3 — Secuencia de mensajes automatizada

**Solo después de que la Fase 2 demuestre estabilidad.**

- Mensaje inicial + follow-ups (lo que hoy se copia/pega a mano) pasan a enviarse vía linki, con
  el mismo mecanismo de aprobación previa que ya existe — el LLM propone, se aprueba en el
  dashboard de conversation-os, linki ejecuta.

> **Hallazgo técnico (2026-10-07) — leer el código de linki, no solo su README.** La
> sincronización de respuestas de LinkedIn (leer lo que contestan) es un no-op en el repo público:
> `lib/linkedin/runner.ts` lo dice explícitamente en comentario — *"LinkedIn reply detection is a
> premium feature (AI classifier layer) — no-op without `ee/`"*. La bandeja centralizada
> (`pages/api/inbox/`) solo envía/recibe **email** (SMTP/IMAP); no existe un endpoint que responda
> por LinkedIn desde ahí. Lo que sí es funcional y abierto es `lib/linkedin/message.ts` (enviar un
> mensaje nuevo a una conexión de 1er grado) — la pieza que falta es la de *leer* el hilo.
>
> Para tener la conversación completa (ambos lados) en conversation-os sin copiar/pegar, haría
> falta construir esa lectura de inbox nosotros mismos en el fork — mismo patrón de Playwright que
> ya usa `message.ts` para enviar, pero navegando `/messaging/thread/...` y extrayendo los mensajes
> del hilo en vez de escribir uno. Es una pieza de trabajo real, no trivial, y **todavía no está
> priorizada** frente al resto del pipeline — se decide cuando se compare su valor contra las otras
> fases, no antes.

- El pitch de investigación y la transición a propuesta de negocio **se quedan fuera de esta
  automatización** — ver Capa 3, no negociable.

### Fase 4 — Motor de artículos y oportunidades

**Cierra el círculo hacia el posicionamiento e ingreso.**

- Cuando un `ResearchQuestion` acumula suficientes `ResearchAnswer` de calidad (ya existe el
  campo `qualityScore`), el sistema propone un borrador de artículo citando patrones reales
  encontrados — se edita y se publica.
- Detección de oportunidad: análisis de transcripciones/respuestas marca señales (dolor
  mencionado, presupuesto insinuado, timing) y las muestra como `Opportunity` candidata — nunca
  las convierte en propuesta sin revisión previa.
- Motor de cultivo de relación: cadencia de `RELATIONSHIP_TOUCH` por persona, generado y
  propuesto, nunca auto-enviado sin pasar por la cola de aprobación.

## 7. La rutina manual — para que el desarrollo nunca bloquee

Esto corre desde ya, en paralelo a todas las fases anteriores, usando lo que **ya existe y ya
funciona** en conversation-os:

1. **Bloque diario fijo (15-20 min):** abrir `/assistant`, procesar la cola (pitch-ready,
   follow-ups vencidos, sin contactar) — generar, revisar, copiar, pegar en LinkedIn, marcar
   enviado.
2. **Conexiones nuevas, 100% manual mientras no esté la Fase 2:** un bloque de tiempo fijo al día
   buscando por nicho en LinkedIn, enviando 15-20 solicitudes con nota corta. Esto no necesita
   ningún desarrollo — es exactamente lo que hará linki después, solo que se hace manualmente
   por ahora.
3. **Al recibir respuesta, importar** a conversation-os (flujo ya existente) para que entre al
   pipeline de investigación y siga el guion de preguntas por nicho.

El objetivo #1 (pasar 500 conexiones) y el objetivo #2 (aterrizar entrevistas) avanzan con esta
rutina sin esperar una sola línea de código nueva. El desarrollo de las fases 1-4 es lo que
después devuelve ese tiempo, no la condición para empezar.

## 8. Riesgos abiertos y cómo se vigilan

| Riesgo | Mitigación |
|---|---|
| Restricción/ban de la cuenta de LinkedIn al automatizar Capa 2 | Piloto acotado (Fase 2), límites muy por debajo del techo real, fingerprint fijo, warm-up gradual, nunca volumen agresivo — riesgo gestionado, no eliminado |
| Linki expuesto accidentalmente a internet (mismo patrón que la regla de "nunca bind 0.0.0.0" ya establecida) | Red Docker interna, mismo principio que Postgres/Redis en este mismo proyecto |
| Mensajes genéricos en secuencia automatizada (LinkedIn detecta esto como patrón de bot) | Capa 1 (LLM con contexto real) garantiza variación; nunca plantillas idénticas en bucle |
| Transición investigación→propuesta percibida como manipuladora | Queda explícitamente en Capa 3, humana, nunca automatizada — es la salvaguarda de confianza de la estrategia |
| Licencia de linki si algún día se revende conversation-os como producto | Separación de sistemas por API evita mezclar código; el fork se mantiene de uso propio salvo revisión explícita antes de cualquier distribución a terceros |
