# PostgreSQL cutover record

The production SQLite-to-PostgreSQL migration completed successfully. Normal
deployments now use only PostgreSQL and the standard application image.

## Retained rollback data

Keep the ht-manager-data and ht-manager-sqlite-backup Docker volumes until the
PostgreSQL deployment has been stable for an agreed retention period. They
contain the original production SQLite database and its verified migration
snapshot. Neither volume is mounted by the running application.

## Rollback

If a PostgreSQL recovery requires it, stop the application and restore the
previous SQLite compose configuration from version control, including the
ht-manager-data mount and SQLite DATABASE_URL. Do not delete the PostgreSQL
database or either SQLite volume while investigating a rollback.
