# HT Manager

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
