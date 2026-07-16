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
4. Build or publish the application image containing this change before the
   maintenance window. The migration helper is included in that same image, so
   Dockge does not need a local source checkout or a separate Docker build.

## Cutover

1. Click Stop for the Dockge stack so its scheduler cannot write while the
   snapshot is taken. Do not remove volumes.
2. Click Update or Deploy in Dockge. The automatic migration service runs
   before ht-manager is allowed to start. It mounts the old data volume
   read-only, copies prod.db into ht-manager-sqlite-backup, checks both SQLite
   files, requires an empty PostgreSQL target, applies the Prisma baseline,
   imports every table with explicit IDs, and verifies rows, checksums, and
   relationships.
3. Watch the migration service log in Dockge. A successful run writes a
   completion marker in the backup volume; later stack updates verify that
   marker and skip importing again. A failed or incomplete run blocks
   ht-manager instead of overwriting the backup or target database.
4. Once ht-manager is healthy, verify authenticated player reads, market
   studies, training, and the price model. Watchtower starts only after the
   health check passes.

## Rollback

Keep both ht-manager-data and ht-manager-sqlite-backup volumes. If the
PostgreSQL app fails verification, stop it and restore the prior SQLite compose
configuration: mount ht-manager-data at /app/server/prisma/data and use the
previous SQLite DATABASE_URL. Do not delete the PostgreSQL database or either
SQLite volume during rollback investigation.
