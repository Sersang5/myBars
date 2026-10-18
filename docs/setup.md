# MyBars: puesta en marcha

MyBars es una PWA personal (un solo usuario). Necesita tres servicios externos: Google Maps Platform (Places API (New)), Anthropic (Claude) y Supabase (base de datos y login). Se despliega en Vercel.

## 1. Google Cloud (Places API (New))

1. Entra en <https://console.cloud.google.com> y crea un proyecto nuevo (por ejemplo `mybars`).
2. Activa la facturación del proyecto (Places exige una cuenta de facturación; hay crédito mensual gratuito).
3. En *APIs y servicios > Biblioteca* busca **Places API (New)** y actívala. No hace falta la API antigua "Places API".
4. En *APIs y servicios > Credenciales* crea una **clave de API**.
5. Edita la clave y, en *Restricciones de API*, elige **Restringir clave** y marca solo **Places API (New)**.
   (Como la clave solo se usa desde el servidor, no pongas restricción de referente HTTP.)
6. En *Facturación > Presupuestos y alertas* crea un presupuesto mensual (por ejemplo 5 EUR) con alertas al 50 %, 90 % y 100 %.
7. Guarda la clave: será `GOOGLE_MAPS_API_KEY`.

## 2. Anthropic

1. Crea una clave en <https://console.anthropic.com> (*API keys*). Será `ANTHROPIC_API_KEY`.
2. Opcional: el modelo por defecto es `claude-opus-5-5`. Para reducir el coste aproximadamente a la mitad puedes usar
   `ANTHROPIC_MODEL=claude-sonnet-5-5`. Se usa solo en la pestaña Explorar.

## 3. Supabase (proyecto en la nube)

1. Crea un proyecto en <https://supabase.com/dashboard>. Anota la contraseña de la base de datos.
2. Desde la carpeta del repo, enlaza y sube el esquema:

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-del-proyecto>
   npx supabase db push
   ```

   Repite `npx supabase db push` cada vez que el repo traiga migraciones nuevas en `supabase/migrations/`
   (por ejemplo `0002_tag_management.sql`, necesaria para fusionar y limpiar etiquetas).

3. En *Authentication > Sign In / Providers* (o *Settings*) desactiva **Allow new users to sign up**.
4. En *Authentication > Users* pulsa *Add user > Create new user*, escribe tu email y marca *Auto Confirm User*.
   Ese email debe coincidir con `ALLOWED_EMAIL`.
5. En *Authentication > URL Configuration*:
   - **Site URL**: `https://<tu-dominio-vercel>`
   - **Redirect URLs**: añade `https://<tu-dominio-vercel>/auth/callback` (y `http://localhost:3000/auth/callback` para desarrollo).
   - Los despliegues de *Preview* de Vercel tienen otra URL: añade un comodín como `https://*-<proyecto>.vercel.app/**` o usa solo Production.
6. En *Authentication > Email Templates > Magic Link* añade el código numérico junto al enlace. Así puedes entrar
   aunque el enlace se abra en otro navegador (en iPhone, la PWA de la pantalla de inicio y Safari no comparten
   sesión, y el enlace solo funciona en el navegador donde lo pediste). Plantilla recomendada:

   - **Subject**: `Tu acceso a MyBars`
   - **Body**:

     ```html
     <h2>Entra en MyBars</h2>
     <p><a href="{{ .ConfirmationURL }}">Entrar en MyBars</a></p>
     <p>O escribe este código en la pantalla de login: <strong>{{ .Token }}</strong></p>
     <p>Si abriste MyBars desde la pantalla de inicio del móvil, usa el código: el enlace se abre en otro navegador.</p>
     ```

   En la pantalla de login, tras pulsar *Enviar enlace*, aparece el campo *Código del correo*.
7. Ten en cuenta que el SMTP por defecto de Supabase tiene un límite bajo de envíos por hora (unos pocos correos;
   consulta *Authentication > Rate Limits*). Si pides varios enlaces seguidos puede que no llegue ninguno durante
   un rato. Para más margen configura un SMTP propio en *Project Settings > Authentication > SMTP Settings*.
8. En *Project Settings > API* copia la **Project URL** (`NEXT_PUBLIC_SUPABASE_URL`) y la clave **anon** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   Nunca uses la service role key en la aplicación desplegada.

## 4. Vercel

1. En <https://vercel.com/new> importa el repositorio.
2. Antes de desplegar, añade las variables de entorno (Production y Preview):

   | Variable | Valor |
   | --- | --- |
   | `GOOGLE_MAPS_API_KEY` | clave del paso 1 |
   | `ANTHROPIC_API_KEY` | clave del paso 2 |
   | `ANTHROPIC_MODEL` | opcional, p. ej. `claude-sonnet-5-5` |
   | `ALLOWED_EMAIL` | tu email |
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clave anon de Supabase |

   No definas `PLACES_FAKE` en Vercel (solo sirve para los tests y se ignora en producción).
3. Pulsa *Deploy*. Cuando tengas el dominio final, vuelve al paso 3.5 y ajusta Site URL y Redirect URLs.

## 5. Instalar la PWA en el móvil

1. Abre `https://<tu-dominio-vercel>` en el móvil y entra con tu email (recibirás un enlace mágico y un código numérico (6 u 8 dígitos según el proyecto); dentro de la PWA instalada usa el código).
2. iPhone (Safari): *Compartir > Añadir a pantalla de inicio*. Android (Chrome): menú ⋮ > *Instalar aplicación* / *Añadir a pantalla de inicio*.

## 6. Desarrollo local

Requisitos: Node 22, Docker Desktop (en marcha) y este repositorio.

```bash
npm install
npx supabase start          # levanta Supabase local en Docker y aplica las migraciones
cp .env.example .env.local  # rellena claves; usa la URL y anon key que imprime `supabase start`
npm run dev                 # http://localhost:3000
```

- Con `supabase start`, los emails de login se leen en Mailpit: <http://127.0.0.1:54324>.
  La plantilla local del enlace mágico (con el código numérico) está en `supabase/templates/magic_link.html`
  y se configura en `supabase/config.toml`; si cambias cualquiera de los dos, reinicia con `npx supabase stop && npx supabase start`.
- Para trabajar sin gastar cuota de Google, arranca con `PLACES_FAKE=1 npm run dev` (usa los datos de `tests/fixtures/places`).
- Parar Supabase: `npx supabase stop`.

### Tests

Los tests de integración y E2E leen `.env.test` (ignorado por git) con la URL y claves de la Supabase **local**
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `ALLOWED_EMAIL=test@mybars.test`).
Los valores salen de `npx supabase status`.

| Suite | Comando | Requisitos |
| --- | --- | --- |
| Lint | `npm run lint` | |
| Tipos | `npm run typecheck` | |
| Unitarios | `npm test` | |
| Integración (RLS y repositorio) | `npm run test:integration` | `npx supabase start` |
| E2E (Playwright, Places simulado) | `npm run test:e2e` | `npx supabase start`; la primera vez `npx playwright install chromium` |
| Build | `npm run build` | |

El E2E arranca su propio servidor en el puerto 3100 con `PLACES_FAKE=1`, borra y recrea el usuario de prueba y no llama a Google ni a Anthropic.
