# Production SQLite-to-PostgreSQL migration

This runbook migrates the Dockge production SQLite database at
ht-manager-data:/prod.db to the application-specific PostgreSQL database
ht_manager. It intentionally does not delete or modify the old SQLite volume.

## Before the maintenance window

1. In Adminer or the shared-postgres container, create the dedicated role and
   database. Set the password interactively; do not put it in this repository.

   ~~~sql
   CREATE ROLE ht_manager LOGIN;
   CREATE DATABASE ht_manager OWNER ht_manager;
   GRANT USAGE, CREATE ON SCHEMA public TO ht_manager;
   ~~~

2. Put the PostgreSQL connection string in Dockge's secret/environment
   configuration as DATABASE_URL. Its host is shared-postgres, its database is
   ht_manager, and it includes schema=public. Do not publish port 5432.
3. Confirm that the stack is attached to the existing shared_backend network.
   The compose file already declares this external network.
4. From Dockge's Bash action (not the Umbrel host Docker daemon), verify the
   configured connection with a read-only query:

   ~~~sh
   psql "$DATABASE_URL" -c 'SELECT current_user, current_database();'
   ~~~

5. Build or publish the application image containing this change before the
   maintenance window. The migration helper is built from Dockerfile.migration.

## Cutover

1. Pause Watchtower and stop ht-manager so its scheduler cannot write while the
   snapshot is taken. Do not remove volumes.
2. Run the helper explicitly from the same Dockge stack:

   ~~~sh
   docker compose -f docker-compose.prod.yml run --rm --no-deps ht-manager-db-migrate
   ~~~

   It mounts the original data volume read-only, copies prod.db into the
   ht-manager-sqlite-backup volume, checks both SQLite files, requires an empty
   PostgreSQL target, applies the PostgreSQL Prisma baseline, imports every
   table with explicit IDs, and verifies rows, checksums, and relationships.
   It aborts instead of overwriting an existing backup or non-empty target.
3. Start ht-manager with the PostgreSQL compose configuration and verify
   /api/health, authenticated player reads, market studies, training, and the
   price model. Only resume Watchtower after those checks pass.

## Rollback

Keep both ht-manager-data and ht-manager-sqlite-backup volumes. If the
PostgreSQL app fails verification, stop it and restore the prior SQLite compose
configuration: mount ht-manager-data at /app/server/prisma/data and use the
previous SQLite DATABASE_URL. Do not delete the PostgreSQL database or either
SQLite volume during rollback investigation.
