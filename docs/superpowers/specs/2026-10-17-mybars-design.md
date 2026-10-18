# MyBars — Diseño

Fecha: 2026-10-17
Estado: aprobado en brainstorming, pendiente de revisión de la spec escrita.

## 1. Objetivo

Aplicación web personal (móvil primero, un único usuario) para:

1. **Mis Bares**: registrar y valorar los bares/restaurantes que visito, con puntuaciones generales, tags puntuables libres (p. ej. "tortilla"), precio, notas e historial de visitas, y consultarlos con buscador, filtros y rankings.
2. **Explorador**: descubrir bares nuevos (o no) mediante prompts en lenguaje natural ("quiero probar las mejores croquetas"), usando IA (Claude) sobre datos y reseñas de Google Maps.

Todo está segmentado por **ciudad** (selector global). El explorador admite además búsqueda **cerca de mí** (GPS).

## 2. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Uso | PWA móvil, un único usuario, datos en la nube |
| Puntuaciones | Estrellas 1–5 con medias estrellas (criterios generales y tags) |
| Visitas | Una ficha editable por bar + historial ligero de visitas (fecha + nota opcional) |
| Precio | Escala € – €€€€ (1–4) |
| Localización | Selector de ciudad global + "cerca de mí" en el explorador |
| Resultados del explorador | Guardar en "Pendientes"; abrir en Google Maps |
| Arquitectura | Next.js + Supabase + Google Places API (New) + Claude (Enfoque A) |
| Reseñas | Places API oficial (máx. 5 reseñas/local), tras interfaz `ReviewSource` ampliable |

## 3. Arquitectura

- **Frontend + backend**: Next.js (App Router, TypeScript), Tailwind CSS, manifiesto PWA (instalable). Desplegado en Vercel.
- **Datos y auth**: Supabase (Postgres). Login por enlace mágico (email). Row Level Security: todas las tablas con `user_id = auth.uid()`.
- **APIs externas** (solo desde rutas de servidor; las claves nunca llegan al cliente):
  - Google Places API (New): Autocomplete, Text Search, Place Details.
  - Anthropic API (por defecto `claude-opus-5-5` con esfuerzo `low`; configurable por `ANTHROPIC_MODEL`, p. ej. `claude-sonnet-5-5` para reducir coste a la mitad). Fallback de rechazo del lado del servidor activado (`fallbacks: "default"`).
- **Configuración**: `.env.local` con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GOOGLE_MAPS_API_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`. Se entrega `.env.example` y `docs/setup.md` con los pasos para obtener cada clave.

### Estructura de módulos

```
app/                    pantallas y rutas API (solo consumen lib/)
  (tabs)/bars           Mis Bares
  (tabs)/pending        Pendientes
  (tabs)/explore        Explorador
  api/places/*          proxy de autocomplete/detalles
  api/explore           pipeline del explorador
lib/
  db/                   cliente Supabase y tipos generados
  places/               cliente Google Places + interfaz ReviewSource
  bars/                 consultas, filtros, ordenaciones y rankings de Mis Bares
  explorer/             pasos del pipeline (interpret, search, filter, enrich, rank)
  cities/               resolución de ciudad desde datos de Google
```

Cada paso de `lib/explorer/` es una función con entradas/salidas tipadas, testeable de forma aislada con dependencias inyectadas (cliente Places, cliente LLM).

## 4. Modelo de datos

Todas las tablas incluyen `user_id uuid` (RLS) y `created_at`.

```
cities      id, name, google_place_id (único por usuario), lat, lng
places      id, google_place_id (único), name, address, city_id, lat, lng,
            google_rating, google_user_rating_count, google_price_level,
            maps_url, photo_ref, details_json, details_fetched_at
my_bars     id, place_id (único por usuario), status ('visited' | 'pending'),
            rating_local, rating_service, rating_food   numeric(2,1) 1–5 nullable
            rating_overall_manual                         numeric(2,1) nullable
            price_level smallint 1–4 nullable,
            notes text, pending_reason text, updated_at
visits      id, my_bar_id, date, note
tags        id, name (único por usuario, normalizado a minúsculas sin espacios extremos)
bar_tags    my_bar_id, tag_id, rating numeric(2,1) 1–5 nullable   PK(my_bar_id, tag_id)
```

Reglas:
- **Nota global** = `rating_overall_manual` si existe; si no, media de los criterios generales no nulos, redondeada a 0,1. Se calcula en TypeScript (`lib/bars/rating.ts`); al ser un único usuario, la lista de una ciudad se carga entera y filtros/orden se aplican en memoria.
- **Pendiente → visitado**: cambia `status`, abre el formulario de valoración y registra una visita con fecha de hoy.
- **Ciudad**: se deriva del componente `locality` de Google al añadir un local; si la ciudad no existe se crea.
- **Tags** globales (no por ciudad). Un tag sin nota es descriptivo ("terraza"); con nota participa en rankings.
- **Gestión de tags**: se pueden renombrar y borrar. Renombrar con el nombre de otro tag existente los **fusiona** (función SQL `merge_tags`, atómica): si un bar tenía ambos, conserva la nota del destino o, si no tenía, la del origen. Los tags que se quedan sin bares se borran solos al editar o eliminar un bar (`delete_unused_tags`).
- **Caché de `places`**: los detalles se consideran válidos 7 días (`details_fetched_at`).

## 5. Pantallas

Navegación: barra superior con selector de ciudad (persistido en el cliente) y pestañas inferiores **Mis Bares · Pendientes · Explorar**.

### 5.1 Mis Bares — lista
- Buscador de texto libre sobre nombre, tags y notas.
- Chips de filtros activos (eliminables).
- Tarjeta: nombre, nota global, precio, zona (barrio/calle corta), 2–3 tags con mejor nota, última visita. Si hay un filtro de tag activo, ese tag se muestra primero.
- **Filtros** (hoja inferior): tags (multi, AND; solo los usados en la ciudad, con nº de bares; enlace "Gestionar etiquetas"), nota global mínima, nota mínima por criterio (local/atención/comida), precio (multi), visitado en los últimos N meses.
- **Orden**: nota global (defecto), nota del tag filtrado (defecto si hay un único tag filtrado), más reciente, más visitado, nombre.
- Estado vacío: invitación a añadir el primer bar o explorar.

### 5.2 Mis Bares — detalle (hoja inferior)
Estrellas por criterio, nota global, todos los tags con nota (tocar un tag abre su ranking: filtro solo por ese tag y orden por su nota), notas, historial de visitas, botón "Registrar visita", "Abrir en Maps", "Editar", "Eliminar" (con confirmación), y datos de Google (nota y nº reseñas) como referencia.

### 5.3 Alta / edición
Botón flotante **+** → autocompletado de Google Places sesgado a la ciudad seleccionada → formulario: estrellas táctiles (medias estrellas), precio €–€€€€, tags (sugerencias de existentes ordenadas por uso e insensibles a acentos, chip "Crear «x»", cada uno con estrellas opcionales; un tag escrito sin confirmar también se guarda), notas. Al crear se registra una visita con fecha de hoy. Si el local ya existe en Mis Bares, se abre su ficha en lugar de duplicar.

### 5.4 Pendientes
Lista de la ciudad seleccionada ordenada por fecha de guardado; tarjeta con nombre, nota de Google, precio, motivo de la sugerencia (`pending_reason`). Acciones: "Ya he ido → valorar", "Abrir en Maps", "Quitar".

### 5.5 Explorar
- Cuadro de texto "¿Qué te apetece?" y sugerencias rápidas (tortilla, café de especialidad, croquetas, vermut).
- Ámbito: **Ciudad** / **Cerca de mí** (radio 1, 2, 5 km).
- Novedad: **Auto** (decide la IA según el prompt, defecto) / **Solo nuevos** / **Incluir los míos**.
- Resultados: tarjetas con nombre, nota y nº de reseñas de Google, precio, distancia, abierto ahora, motivo y cita corta de reseña; insignias "En Mis Bares" / "En Pendientes"; acciones "Guardar en Pendientes" y "Abrir en Maps".

## 6. Pipeline del explorador (`POST /api/explore`)

Entrada: `{ prompt, cityId | { lat, lng, radiusM }, novelty: 'auto'|'new'|'include' }`.

1. **interpret** (Claude, salida estructurada): `{ searchQueries: string[1..3], placeType?, wantsNewOnly: boolean, reviewSignals: string[] }`. Si `novelty` ≠ `auto`, prevalece sobre `wantsNewOnly`.
2. **search** (Places Text Search por cada consulta, sesgo por ciudad o círculo GPS, field mask mínimo): candidatos deduplicados por `google_place_id`, hasta ~40.
3. **filter**: si solo nuevos, excluir locales con `status = 'visited'`; los pendientes se conservan y se marcan.
4. **enrich** (Place Details de los ~12 primeros por relevancia de Google + nº reseñas, usando la caché de `places`): reseñas, resumen editorial, nota, nº reseñas, nivel de precio, abierto ahora, coordenadas.
5. **rank** (Claude, salida estructurada): para cada candidato, `score 0–100`, `reason` (1 frase) y `quote` (fragmento literal corto de una reseña, o nulo). Devuelve el top 5–8. Si el modo incluye los míos, Claude recibe también mis bares de la ciudad con tags y notas y puede recomendarlos (marcados como propios).
6. **respond**: lista de resultados con distancia calculada respecto al GPS o al centro de la ciudad.

La fuente de reseñas se abstrae como `ReviewSource { getReviews(placeId): Review[] }`; la implementación v1 usa Place Details.

### Errores
- Places sin resultados → respuesta vacía con un mensaje fijo que sugiere ampliar el radio o reformular.
- Fallo o timeout de Claude en `rank` → resultados de Places ordenados por nota × log(nº reseñas), sin motivos.
- Fallo de Claude en `interpret` → usar el prompt literal como única consulta.
- GPS denegado → se cambia a ámbito ciudad con aviso.
- Errores de cuota/clave de Google → mensaje claro en la UI, sin reintentos automáticos.

## 7. Pruebas

- **Unitarias (Vitest, TDD)**: cálculo de nota global, filtros y ordenaciones de Mis Bares, normalización de tags, resolución de ciudad, cada paso del pipeline con respuestas grabadas (fixtures) de Places y Claude, y los caminos de error del pipeline.
- **E2E (Playwright)**: alta de un bar (con Places simulado), filtro por tag y ordenación por ese tag, pendiente → visitado.
- **Manual**: búsqueda real en A Coruña con claves reales ("mejor tortilla", "café de especialidad", "cerca de mí").

## 8. Fuera de alcance (v1)

Fotos propias, multiusuario o compartir, importación desde Google Maps, historial de búsquedas, barrios/zonas, modo offline completo, proveedor de reseñas completas (Enfoque B, posible v2 vía `ReviewSource`).
