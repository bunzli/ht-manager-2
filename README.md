# HT Manager

## Read-only MCP server

HT Manager exposes a standard MCP server at `/mcp` using Streamable HTTP with
stateless JSON responses. It works with clients that support this transport and
a static bearer token. The protocol uses the
[official TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/server).

The tools read the same saved data as HT Manager:

| Tool | Inputs | Data |
| --- | --- | --- |
| `get_senior_squad` | None | Current tracked senior players, skills, training and position metrics, recent changes |
| `get_senior_player` | `playerId`, optional `historyLimit` | Tracked player's details, skills and training history, changes and match appearances |
| `get_youth_squad` | Optional `includeArchived` (default `false`) | Academy status, players, current and potential skills, recent changes |
| `get_youth_player` | `playerId`, optional `historyLimit` | Active or archived player's details, skill history, changes and match appearances |

Use the squad tools to discover Hattrick player IDs. `historyLimit` defaults to
50 and accepts integers from 1 to 200. Player history collections are newest
first, with a `truncated` flag for each collection. Results include snapshot
timestamps; these are saved data, not live queries to Hattrick. Refresh squads
through HT Manager when needed. Unknown youth skills remain `null`, distinct
from a known skill of zero. Academy status distinguishes `not_synced`,
`no_academy`, and `ready`.

### Enable and connect

1. Generate a token using `openssl rand -hex 32` and set `MCP_ACCESS_TOKEN` in
   the main checkout's `.env` (local development) or Dockge's environment/secret
   configuration (production). An empty token disables `/mcp` with HTTP 404.
2. Set `MCP_ALLOWED_HOSTS` to comma-separated hostnames **without ports**, for
   example `localhost,127.0.0.1,[::1],ht.example.com`. The defaults allow only
   local hosts. Requests are checked against the actual `Host` header; a reverse
   proxy should preserve that header, or its forwarded host must be explicitly
   allowed. The MCP route does not trust `X-Forwarded-Host`.
3. Restart HT Manager. For local development, `npm run dev` prints the API port;
   use `http://127.0.0.1:<api-port>/mcp`. For remote clients, route
   `https://ht.example.com/mcp` to the existing HT Manager server through your
   HTTPS reverse proxy. Provisioning a domain, TLS, or a tunnel is separate.
4. Configure the client's MCP server URL and header:
   `Authorization: Bearer <MCP_ACCESS_TOKEN>`.

For clients with an `mcpServers` configuration supporting remote URLs and headers:

```json
{
  "mcpServers": {
    "ht-manager": {
      "url": "https://ht.example.com/mcp",
      "headers": { "Authorization": "Bearer <your-token>" }
    }
  }
}
```

Configuration syntax varies by client. Clients that only support OAuth login or
local stdio cannot use this initial endpoint directly. A GET to `/mcp` returns
405 after authentication; this is expected for a stateless JSON transport.
Use MCP initialization, tool discovery and calls over POST to verify it.

Browser clients must also have their exact `Origin` in `MCP_ALLOWED_ORIGINS`,
for example `https://client.example.com`. The default is empty. Server clients
that omit `Origin` do not need this setting. Only allowed origins receive CORS
headers, and browser preflight requests expose no data. All actual MCP calls
require authentication. Rotate the token by replacing it and restarting the
server; existing clients must update their configured token.

The endpoint reads only the club configured by `CHPP_TEAM_ID`. It exposes no
refresh or mutation tools and never returns CHPP credentials. The MCP token
protects `/mcp`; retain your existing access controls for the web app and REST API.

Run `npm --prefix server test` for the server suite, including integration tests
that initialize and call this endpoint with the official MCP client.

## Youth Squad

La pestaña **Youth Squad** sigue la academia asociada a `CHPP_TEAM_ID`.
**Refresh youth squad** guarda las habilidades actuales y potenciales, detecta
descubrimientos y mejoras, e importa los partidos juveniles de los últimos 90 días
en la primera actualización. Las siguientes actualizaciones consultan desde la
última sincronización de partidos y reintentan alineaciones pendientes.
El historial de habilidades comienza con la primera consulta; los juveniles que
salen de la academia quedan en **Archived** con su historial completo.

Ejecuta `npm run db:migrate` al actualizar un checkout existente. La imagen de
producción aplica la migración PostgreSQL al arrancar, como las anteriores.

## Desarrollo local y worktrees

Desde la raíz de cualquier checkout o worktree:

```sh
npm run dev
```

El comando instala las dependencias que falten, genera el cliente de Prisma y
arranca la API y Vite. En los siguientes arranques solo reinstala dependencias
si cambia el lockfile o la versión principal de Node.

La API recibe un puerto libre del sistema. Vite empieza en 5173 y busca el
siguiente puerto libre si está ocupado. La terminal muestra ambas direcciones.
El proxy `/api` apunta a la API de esa instancia, incluso cuando se reinicia al
editar código. Ctrl+C detiene los procesos de esa instancia.
La selección de puertos utiliza `lsof` (incluido en macOS; instálalo si falta en Linux).

### Configuración y base de datos compartidas

Conserva `.env` en el checkout principal del repositorio. Todos los worktrees lo
encuentran a través del directorio Git compartido; no necesitas copiarlo.
`DATABASE_URL` debe apuntar a SQLite. Las rutas relativas se resuelven desde
`server/prisma` **del checkout principal**, igual que al ejecutar Prisma allí.
Así, los worktrees leen y modifican la misma base de datos.

Para configurar el proyecto por primera vez, copia `.env.example` a `.env` en
el checkout principal y completa las credenciales CHPP. Después inicializa la DB:

```sh
npm run db:migrate
```

El arranque habitual no ejecuta migraciones. `npm run db:migrate` y
`npm run db:generate` utilizan la misma configuración y DB compartidas.
Puedes elegir otro archivo de configuración con `HT_MANAGER_ENV_FILE` o una
DB SQLite específica con `DATABASE_URL` en el entorno de la terminal.

### Node

El proyecto fija Node 22.23.2 en `.tool-versions` (asdf) y `.nvmrc` (nvm).
Con asdf, `npm run dev` selecciona automáticamente esa versión en el proyecto.
Con nvm, ejecuta `nvm install && nvm use` al configurar la máquina.

Si el comando se inicia con un Node antiguo, el script busca una instalación
compatible (Node 22.13 o superior). Con asdf también puede instalar la versión
fijada si falta. La versión seleccionada se usa para instalar dependencias y
ejecutar las herramientas del proyecto.

Los worktrees futuros deben crearse desde una rama que incluya esta configuración.
Los contenedores conservan sus puertos y variables definidos en Docker Compose.
