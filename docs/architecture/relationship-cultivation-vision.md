# Conversation OS — visión de cultivo de relaciones

Visión de producto a largo plazo y decisiones de alto nivel para convertir conversation-os en un
sistema de cultivo de relaciones personales y profesionales multi-canal. Este documento es
deliberadamente **solo visión y decisiones** — ningún modelo de datos detallado (entidades,
campos, migraciones de Prisma) se diseña aquí; eso es el trabajo de una sesión aparte, enfocada,
cuando corresponda según el orden de construcción de la sección 7.

_Escrito 2026-10-12._

## Contenido

1. [La idea central, en una frase](#1-la-idea-central-en-una-frase)
2. [Jerarquía de intención](#2-jerarquía-de-intención)
3. [Market y Niche, como dos niveles](#3-market-y-niche-como-dos-niveles)
4. [Group — el otro eje, social en vez de comercial](#4-group--el-otro-eje-social-en-vez-de-comercial)
5. [Un pipeline, muchos modelos de negocio](#5-un-pipeline-muchos-modelos-de-negocio)
6. [Notificaciones acumuladas y resumen en primera persona](#6-notificaciones-acumuladas-y-resumen-en-primera-persona)
7. [Decisión de secuenciación — por qué no generalizar todavía](#7-decisión-de-secuenciación--por-qué-no-generalizar-todavía)
8. [whatsnaŭ — qué resuelve, qué no, qué se absorbe](#8-whatsnaŭ--qué-resuelve-qué-no-qué-se-absorbe)
9. [Sesiones de conversación con el LLM](#9-sesiones-de-conversación-con-el-llm)
10. [La visión a largo plazo: asistente personal autónomo](#10-la-visión-a-largo-plazo-asistente-personal-autónomo)
11. [Integración futura con naŭ](#11-integración-futura-con-naŭ)
12. [Prioridad: lo que acerca a dinero, primero](#12-prioridad-lo-que-acerca-a-dinero-primero)

## 1. La idea central, en una frase

Conversation-os deja de ser "un sistema de outreach de LinkedIn" y se convierte en **un asistente
personal al que se le delega totalmente el cultivo de relaciones** — personales, profesionales y
de negocio, a través de todos los canales donde Samuel tiene actividad (LinkedIn, WhatsApp,
Instagram, y los que se sumen). No es una herramienta que ayuda a redactar mensajes; es la persona
que lleva las relaciones, y que sabe exactamente cuándo debe hacerse a un lado porque Samuel va a
atender personalmente, y cuándo debe retomar.

## 2. Jerarquía de intención

Cada mensaje que el sistema propone está influenciado por capas de intención, de lo general a lo
específico. **No hay fusión calculada entre capas** — cada capa aporta su propio bloque de texto,
y todos los bloques se concatenan directamente en el system prompt del request. La capa más
específica no sustituye a las más generales; se le suma, con más peso.

| Capa | Qué define | Ejemplo |
|---|---|---|
| **Global (Samuel)** | Tono y personalidad base, cambia por temporadas | "Soy directo pero cálido, uso humor seco, evito la formalidad excesiva" |
| **Market** | Estrategia/intención compartida por un mercado completo | "Mercado de servicios profesionales: posicionarme como arquitecto empresarial" |
| **Niche** (dentro de un Market) | Ofertas, ICP, estrategia de investigación específica del nicho | "Abogados: investigar procesos de captación y gestión de casos" |
| **Group** | Intención social/relacional de un círculo (no comercial) | "Amigos: tono íntimo, prioridad en mantener contacto, sin agenda de venta" |
| **Relationship** | Intención específica de esa persona, evoluciona con cada interacción | "Con Ramón: ya mostró interés en X, está en fase de propuesta" |

Cuando una persona pertenece a más de un Niche o Group a la vez (ej. es del nicho "abogados" y del
grupo "amigos"), **ambos bloques de intención entran al prompt**, no se escoge uno ni se fusionan
en una síntesis — el modelo ve ambas intenciones y las pondera naturalmente, igual que lo haría
Samuel mismo sabiendo que esa persona es ambas cosas a la vez.

## 3. Market y Niche, como dos niveles

Se mantienen **ambos conceptos**, en jerarquía: un `Market` contiene varios `Niche`. Ejemplo real:

- **Market: Servicios profesionales de conocimiento** → Niches: Abogados, Recruiters, Tax
  Advisors, Psicólogos, Sexólogos.
- **Market: Negocios locales** → Niches: Floristerías, Hostelería, (otros que se sumen).

Por qué en jerarquía y no como un solo concepto o como dos conceptos independientes:

- Resuelve la herencia de intención con el mismo mecanismo que ya existe para Niche→Relationship:
  la intención/estrategia puede vivir a nivel de Market cuando aplica a todo el mercado por igual,
  y especializarse a nivel de Niche cuando un nicho necesita su propia escalera de ofertas o ICP —
  abogados y recruiters no venden lo mismo aunque ambos sean "servicios profesionales".
- Evita una migración de datos el día que aparezca un segundo nicho dentro de un mercado que hoy
  solo tiene uno (ej. negocios locales hoy solo tiene floristerías; cuando se sume hostelería, el
  contenedor ya existe).
- Es el mismo patrón de "dos niveles, el más específico pesa más" aplicado consistentemente, no
  una entidad con reglas distintas.

## 4. Group — el otro eje, social en vez de comercial

`Group` es paralelo a `Market`/`Niche`, no un sinónimo. Mientras Niche segmenta por **negocio o
investigación**, Group segmenta por **círculo social**: amigos, familia, conocidos de Instagram,
contactos del teléfono. Una persona puede estar en un Niche y un Group a la vez sin conflicto — es
exactamente el caso de uso que motivó esta distinción: un amigo que también es abogado tiene un
trato ligeramente distinto (más íntimo, más frecuente) al de alguien que es solo del nicho
Abogados o solo del grupo Amigos, y ese trato combinado emerge de que ambos bloques de intención
entran al prompt (sección 2), no de una tercera entidad "amigo-abogado" especial.

## 5. Un pipeline, muchos modelos de negocio

El pipeline (import → enriquecimiento → outreach → investigación → propuesta → cultivo) se
diseña **una sola vez, completo**, y cada modelo de negocio activa solo los pasos que le aplican
— no se construye un flujo distinto por modelo. Modelos de negocio identificados hoy:

| Modelo | Fuente de contactos | Pasos que probablemente desactiva |
|---|---|---|
| Profesionales (LinkedIn) | Apify / scraping de perfil | Ninguno — es el caso completo |
| Floristerías | Scraping de Google Maps | Motor de investigación (no aplica) |
| Negocios locales | Google Maps + visita en persona | Motor de investigación |
| Tatuadores | Instagram (anuncios) | Motor de investigación |
| Contactos de teléfono | Import de agenda | Outreach frío (ya son conocidos), enfoque en reactivación |
| Conocidos de Instagram | Import de seguidos/seguidores | Outreach frío, enfoque en reactivación |

**Esto es visión, no diseño todavía** — qué pasos existen exactamente y cómo se activan/desactivan
se decide cuando se construya el segundo modelo de negocio real (ver sección 7), no ahora.

## 6. Notificaciones acumuladas y resumen en primera persona

**Notificaciones acumuladas por relación/nicho/grupo.** Cada relación acumula "lo que pasó desde
la última vez que Samuel la revisó" — nuevas interacciones, respuestas, señales relevantes. Al
entrar a esa relación, se ve la acumulación; al marcarla revisada, se resetea a cero y empieza a
acumular de nuevo. El mismo mecanismo debe funcionar agregado a nivel de Niche o Group completo
(ej. "qué pasó esta semana en Abogados"), no solo persona por persona.

**Resúmenes on-demand en primera persona.** Cuando Samuel pide un informe (de una relación, un
nicho, un grupo), el sistema lo narra como si Samuel mismo lo estuviera diciendo — "estoy hablando
con Ramón sobre X", nunca "tú estás hablando con Ramón sobre X". El asistente es una extensión de
Samuel, no un tercero reportando sobre otro tercero; esto es una decisión real de construcción de
prompt, no solo de tono.

## 7. Decisión de secuenciación — por qué no generalizar todavía

Al revisar whatsnaŭ (sección 8) surgió un patrón real: `Lead.state`
(Cold→Interested→Demo→Nurturing→Clients) y los roles de agente (Closer/Receptionist/Nurturing) son
la misma forma que los motores de conversation-os (Research/Opportunity/Relationship) — un
pipeline de estados con un agente responsable por estado. Haber visto ese patrón dos veces, en dos
sistemas distintos, tienta a construir ya un motor agnóstico de "pipeline + agentes configurable
por Niche/Group".

**Decisión: no construirlo todavía.** La señal de que es prematuro es que la primera pregunta real
que surgió al intentarlo — ¿qué agente/estado manda cuando una persona está en 2+ Niches/Groups a
la vez — no tiene todavía una respuesta observada, solo especulada. Un motor agnóstico diseñado
antes de tener 2-3 pipelines reales corriendo adivina qué varía en vez de observarlo, y generaliza
mal con alta probabilidad — el mismo patrón que ya costó dos bugs reales en este proyecto esta
semana (fecha con fuga de timezone, duplicados por clave sintética) cuando se generalizó antes de
necesitarlo.

**El orden real:**
1. Construir y operar el pipeline concreto de LinkedIn (Niche de servicios profesionales) tal cual
   existe hoy — sin abstracción de "agente configurable", hardcodeado donde haga falta. Es el
   único que acerca a ingreso esta semana.
2. Construir el segundo pipeline real (floristerías, o reactivación de contactos antiguos) cuando
   corresponda por prioridad (sección 12).
3. Solo con 2 casos reales delante, extraer la abstracción de pipeline+agentes — informada por lo
   que de verdad varió entre ambos, no por intuición. Ahí es también cuando se resuelve con un
   caso concreto delante (no en abstracto) qué pasa cuando alguien está en 2+ Niches/Groups.

Esta regla aplica a cualquier sesión futura, propia o de otra persona trabajando en este repo: ver
el mismo patrón dos veces en sistemas distintos es una señal para anotarlo, no para generalizar de
inmediato.

## 8. whatsnaŭ — qué resuelve, qué no, qué se absorbe

Investigado el 2026-10-12 (`apps/whatsnau` en el monorepo `nau`) antes de diseñar nada nuevo, para
no duplicar trabajo ya hecho.

**Qué es realmente:** un CRM y motor de campañas de venta outbound por WhatsApp — importa leads
fríos (scraping, CSV), les manda una secuencia de outreach con `CampaignStage`s con temporizador, y
usa IA para cualificar/cerrar. 177/177 tests pasando, típecheck limpio, evidencia de haber operado
en producción real (aunque sin confirmación de si llegó a enviar mensajes reales a contactos
reales, solo de que la infraestructura corrió).

**Qué NO resuelve** (confirmado leyendo el código, no asumido): ningún concepto de Niche, Group,
intención de relación personal, frecuencia de contacto configurable, o notificación acumulada para
el usuario humano. El campo `ConversationSummary` en su schema parecía la pieza que resolvería
memoria comprimida por conversación — **existe en la base de datos pero no tiene ningún código que
lo use**, es una intención capturada, nunca implementada. El estado `NURTURING` es lo más cercano a
"cultivo", pero sigue siendo nutrición hacia una conversión futura (ej. newsletter semanal), no
relación personal sin fin comercial.

**Qué sí se absorbe — infraestructura de ingeniería, no dominio:**

| Pieza | Por qué vale la pena |
|---|---|
| Patrón Provider (`IWhatsAppProvider` + `ProviderFactory`) | Interfaz común para enviar/recibir — exactamente lo necesario para WhatsApp+LinkedIn+Instagram bajo un panel omnichannel |
| Integración YCloud (`YCloudWhatsAppProvider`) | Completa, testeada, ya resuelve el envío/recepción de WhatsApp sin depender de la verificación de Meta — confirma que esta vía sigue siendo válida hoy |
| "Context Weaver" (`RetrievalService`) | Modelo barato decide qué contexto cargar antes de llamar al modelo caro — aplica directo a decidir cuánto historial/contexto de perfil inyectar por relación |
| Debounce de mensajes en ráfaga (`MessageBufferService`, 15s) | Evita responder a cada mensaje suelto cuando alguien escribe varias líneas seguidas — necesario en cualquier canal conversacional real |
| Circuit breaker + retry + fallback a humano | Resiliencia genérica, no específica de WhatsApp |

**Qué NO se absorbe:** el modelo de datos de `Lead`/`Campaign` (acoplado a funnel de venta), los
roles Closer/Receptionist/Nurturing (son roles de venta), y el servicio completo como unidad — su
propio plan de refactor ya marca la integración con la plataforma naŭ como "deferida, no
prioridad", y su CD está roto (busca el Dockerfile en una ruta que ya no es la real tras la fusión
al monorepo). No hay negocio que fusionar aquí, solo ingeniería que portar cuando corresponda
(probablemente en la fase de canal WhatsApp, no antes).

## 9. Sesiones de conversación con el LLM

Verificado técnicamente el 2026-10-12: sí es posible mantener una sesión de conversación
persistente por relación con la API de OpenAI, sin reinyectar el system prompt completo en cada
mensaje — pero no con la Chat Completions API clásica, sino con la **Responses API** (`store:
true` + `previous_response_id`) o, mejor para este caso, la **Conversations API** (contenedor de
estado explícitamente pensado para "per-user, long-lived" — una sesión por relación es exactamente
ese patrón).

**Matiz real que cambia la implementación:** las respuestas almacenadas en el servidor de OpenAI
expiran a los 30 días salvo que se les asigne metadata explícita — y una relación cultivada dura
meses o años, muy por encima de esa ventana. La sesión de OpenAI es entonces una **optimización de
costo/latencia dentro de una ventana de actividad**, no el almacenamiento de memoria a largo plazo.
La base de datos propia (ya existe como `Interaction`) sigue siendo la única fuente de verdad
permanente; la sesión se usa mientras esté viva y se reconstruye desde la DB cuando expira o
cuando se retoma una relación inactiva por mucho tiempo.

## 10. La visión a largo plazo: asistente personal autónomo

El destino declarado, no para construir ahora sino para que cada decisión de diseño no lo
contradiga:

- **Panel omnichannel real** — Samuel nunca entra a WhatsApp, Instagram o LinkedIn directamente;
  todo se gestiona desde un panel central de conversation-os.
- **Cesión de control sin fricción** — el sistema sabe cuándo Samuel está atendiendo una
  conversación manualmente (para no interrumpir con un mensaje automático a mitad de un
  intercambio) y cuándo retomar la atención automatizada.
- **Memoria y evolución real por relación** — cada interacción (manual o automática, enviada o
  recibida) se registra y hace evolucionar la intención específica de esa relación; nunca debería
  notarse desde fuera qué parte estuvo automatizada.
- **El sistema como maestro de Samuel, no solo como herramienta** — al sugerir mensajes guiados por
  intención/estrategia/tono, Samuel aprende nuevas formas de relacionarse al usarlo, con la meta
  explícita de integrar esos aprendizajes a su propio estilo natural de conversar, más allá del
  sistema.
- **Autohospedaje de LLM a futuro** — para dejar de entregar datos sensibles de conversaciones
  personales a terceros, una vez la capacidad de cómputo propia lo permita.
- **Rol final: "mi PR personal"** — la metáfora que mejor lo describe es un relacionista público
  personal al que se le delega totalmente el cultivo de relaciones, no un asistente que redacta
  borradores para que Samuel decida.

## 11. Integración futura con naŭ

Este sistema se convertirá eventualmente en el módulo de Contactos de naŭ, junto a los módulos
existentes (GTD/Actions, References) y uno futuro de Finanzas. Esto pesa en las decisiones de
stack (NestJS + Postgres ya es consistente con el resto de naŭ — no hay que desalinearlo sin
razón), pero **no es trabajo a ejecutar ahora**: conversation-os sigue siendo su propio repo,
desplegado y operado de forma independiente, hasta que la integración se decida explícitamente.
Cualquier dependencia cross-proyecto real que surja de ese trabajo futuro se anota como una línea
en `engineering_protocols/PLAN.md` cuando corresponda — ese archivo no es el lugar donde vive el
detalle de este proyecto, solo el registro de qué bloquea a qué entre repos distintos.

## 12. Prioridad: lo que acerca a dinero, primero

Criterio explícito para ordenar todo lo anterior en issues reales: **qué acerca más rápido a
generar ingreso**, no qué es más elegante de construir. En orden:

1. **Aplicar la estrategia de investigación a las conexiones nuevas de LinkedIn** — el reloj de
   "tiempo hasta que produzca dinero" ya corre desde que se aceptó cada conexión; cuanto antes
   empiece la investigación, antes madura hacia una propuesta real.
2. **Reactivar contactos antiguos** (los que ya existían antes de esta estrategia) — relación ya
   establecida, menor fricción para reabrir que un contacto frío.
3. **Atender nuevos contactos entrantes de forma sistemática** — mantener el flujo corriendo hacia
   adelante sin que se acumule backlog.
4. Todo lo demás de este documento (Market/Niche/Group como modelo de datos real, pipeline
   agnóstico, segundo modelo de negocio, omnichannel, LLM self-hosted) espera su turno, y entra al
   plan solo cuando el punto 7 (secuenciación) indique que corresponde — no antes, por atractivo
   que sea el diseño.

Por ahora, los puntos 1-3 se ejecutan **manualmente** (ver la rutina ya descrita en
`docs/architecture/conversation-os-linki.md`, sección 7) usando lo que conversation-os ya hace
hoy — generar mensaje, revisar, copiar, marcar enviado — mientras el desarrollo de nuevas
funciones avanza en paralelo sin bloquear ese trabajo.
