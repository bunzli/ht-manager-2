#!/bin/sh
set -eu

SOURCE_SQLITE_PATH=/source/prod.db
BACKUP_PATH=/backup/prod.db
MIGRATION_MARKER=/backup/postgres-migration-complete
INITIAL_MIGRATION=20260716000000_init

fail() {
  echo "SQLite-to-PostgreSQL migration aborted: $1" >&2
  exit 1
}

psql_db() {
  psql "$PSQL_DATABASE_URL" -X -v ON_ERROR_STOP=1 -q "$@"
}

tables() {
  cat <<'TABLES'
team_settings|"id","trainingTypeId","updatedAt"
player_details|"id","playerId","fetchedAt","firstName","nickName","lastName","playerNumber","age","ageDays","genderId","arrivalDate","tsi","playerForm","experience","loyalty","motherClubBonus","leadership","salary","isAbroad","agreeability","aggressiveness","honesty","specialty","countryId","nationalTeamId","caps","capsU20","cards","injuryLevel","staminaSkill","keeperSkill","playmakerSkill","scorerSkill","passingSkill","wingerSkill","defenderSkill","setPiecesSkill","leagueGoals","cupGoals","friendliesGoals","careerGoals","careerHattricks","matchesCurrentTeam","goalsCurrentTeam","assistsCurrentTeam","careerAssists","playerCategoryId","transferListed","avatarBackground","avatarLayers","lastMatchDate","lastMatchPositionCode","lastMatchPlayedMinutes"
player_tracking|"id","playerId","lastUpdatedAt","isTracking","positionOverride","latestDetailsId"
player_change|"id","playerId","detectedAt","key","oldValue","newValue"
market_study|"id","name","searchParams","status","createdAt","updatedAt"
custom_chart|"id","marketStudyId","groupBy","filters","createdAt"
transfer_player|"id","playerId","marketStudyId","playerDetailsId","status","askingPrice","highestBid","finalPrice","deadline","buyerTeamId","buyerTeamName","sellerTeamId","sellerTeamName","createdAt","updatedAt"
price_model|"id","coefficients","featureNames","metadata","trainedAt","createdAt"
player_training_week|"id","playerId","weekStart","positionCode","playedMinutes","updatedAt"
TABLES
}

replace_date_column() {
  column=$1
  columns=$2
  printf '%s' "$columns" |
    sed "s|\"$column\"|CASE WHEN typeof(\"$column\") IN ('integer', 'real') THEN strftime('%Y-%m-%d %H:%M:%f', \"$column\" / 1000.0, 'unixepoch') ELSE \"$column\" END AS \"$column\"|g"
}

sqlite_copy_columns() {
  table=$1
  columns=$2

  case "$table" in
    player_details)
      replace_date_column "fetchedAt" "$columns"
      ;;
    player_tracking)
      replace_date_column "lastUpdatedAt" "$columns"
      ;;
    player_training_week)
      columns=$(replace_date_column "weekStart" "$columns")
      replace_date_column "updatedAt" "$columns"
      ;;
    team_settings)
      replace_date_column "updatedAt" "$columns"
      ;;
    custom_chart)
      replace_date_column "createdAt" "$columns"
      ;;
    player_change)
      replace_date_column "detectedAt" "$columns"
      ;;
    market_study|transfer_player)
      columns=$(replace_date_column "createdAt" "$columns")
      replace_date_column "updatedAt" "$columns"
      ;;
    price_model)
      columns=$(replace_date_column "trainedAt" "$columns")
      replace_date_column "createdAt" "$columns"
      ;;
    *)
      printf '%s' "$columns"
      ;;
  esac
}

copy_table() {
  table=$1
  columns=$2
  source_export=/tmp/import-"$table".csv
  select_columns=$(sqlite_copy_columns "$table" "$columns")
  sqlite3 -header -csv "$BACKUP_PATH" "SELECT $select_columns FROM \"$table\" ORDER BY \"id\";" > "$source_export"
  psql_db -c "\\copy \"$table\" ($columns) FROM STDIN WITH (FORMAT csv, HEADER true)" < "$source_export"
}

verify_table() {
  table=$1
  columns=$2
  source_export=/tmp/sqlite-"$table".csv
  target_export=/tmp/postgres-"$table".csv

  select_columns=$(sqlite_copy_columns "$table" "$columns")
  sqlite3 -header -csv "$BACKUP_PATH" "SELECT $select_columns FROM \"$table\" ORDER BY \"id\";" > "$source_export"
  psql_db -c "\\copy (SELECT $columns FROM \"$table\" ORDER BY \"id\") TO STDOUT WITH (FORMAT csv, HEADER true)" > "$target_export"
  node /usr/local/bin/verify-sqlite-postgres-export.mjs "$table" "$source_export" "$target_export"
}

verify_zero() {
  result=$(psql_db -Atc "$1")
  [ "$result" = "0" ] || fail "$2"
}

sequence_tables() {
  cat <<'TABLES'
player_details
player_tracking
player_training_week
player_change
market_study
custom_chart
transfer_player
price_model
TABLES
}

completed_migration_is_valid() {
  application_table_count=$(psql_db -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('team_settings', 'player_details', 'player_tracking', 'player_training_week', 'player_change', 'market_study', 'custom_chart', 'transfer_player', 'price_model');")
  applied_migration_count=$(psql_db -Atc "SELECT count(*) FROM \"_prisma_migrations\" WHERE \"migration_name\" = '$INITIAL_MIGRATION' AND \"finished_at\" IS NOT NULL;")
  [ "$application_table_count" = "9" ] && [ "$applied_migration_count" = "1" ]
}

: "$DATABASE_URL"
PSQL_DATABASE_URL=$(node -e 'const url = new URL(process.env.DATABASE_URL); url.searchParams.delete("schema"); process.stdout.write(url.toString());')
[ -r "$SOURCE_SQLITE_PATH" ] || fail "the read-only source database is missing"

echo "Checking the PostgreSQL connection without changing data."
psql_db -c 'SELECT current_user, current_database();' > /dev/null

target_table_count=$(psql_db -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
[ -e "$MIGRATION_MARKER" ] && {
  completed_migration_is_valid || fail "the completion marker does not match a completed PostgreSQL migration"
  echo "PostgreSQL migration was already verified; skipping the import."
  exit 0
}
[ ! -e "$BACKUP_PATH" ] || fail "a backup already exists; preserve it and use a new backup volume for another attempt"
[ "$target_table_count" = "0" ] || fail "the target database is not empty"

integrity=$(sqlite3 "$SOURCE_SQLITE_PATH" "PRAGMA integrity_check;")
[ "$integrity" = "ok" ] || fail "the source SQLite integrity check failed"

umask 077
sqlite3 "$SOURCE_SQLITE_PATH" ".backup '$BACKUP_PATH'"
backup_hash_before=$(sha256sum "$BACKUP_PATH" | awk '{print $1}')
backup_integrity=$(sqlite3 "$BACKUP_PATH" "PRAGMA integrity_check;")
[ "$backup_integrity" = "ok" ] || fail "the SQLite backup integrity check failed"

echo "Creating the PostgreSQL schema."
npx prisma migrate deploy --schema prisma/postgres/schema.prisma

echo "Copying the SQLite snapshot."
tables | while IFS='|' read -r table columns; do
  copy_table "$table" "$columns"
done

echo "Validating row counts and canonical table checksums."
tables | while IFS='|' read -r table columns; do
  source_count=$(sqlite3 "$BACKUP_PATH" "SELECT count(*) FROM \"$table\";")
  target_count=$(psql_db -Atc "SELECT count(*) FROM \"$table\";")
  [ "$source_count" = "$target_count" ] || fail "$table row count differs after import"
  verify_table "$table" "$columns"
done

verify_zero 'SELECT count(*) FROM "player_tracking" p LEFT JOIN "player_details" d ON d."id" = p."latestDetailsId" WHERE p."latestDetailsId" IS NOT NULL AND d."id" IS NULL;' 'player_tracking has an orphan latestDetailsId'
verify_zero 'SELECT count(*) FROM "custom_chart" c LEFT JOIN "market_study" s ON s."id" = c."marketStudyId" WHERE s."id" IS NULL;' 'custom_chart has an orphan marketStudyId'
verify_zero 'SELECT count(*) FROM "transfer_player" t LEFT JOIN "player_details" d ON d."id" = t."playerDetailsId" WHERE d."id" IS NULL;' 'transfer_player has an orphan playerDetailsId'
verify_zero 'SELECT count(*) FROM "transfer_player" t LEFT JOIN "market_study" s ON s."id" = t."marketStudyId" WHERE t."marketStudyId" IS NOT NULL AND s."id" IS NULL;' 'transfer_player has an orphan marketStudyId'

sequence_tables | while IFS= read -r table; do
  psql_db -c "SELECT setval(pg_get_serial_sequence('$table', 'id'), COALESCE((SELECT MAX(\"id\") FROM \"$table\"), 1), (SELECT MAX(\"id\") IS NOT NULL FROM \"$table\"));" > /dev/null
done

backup_hash_after=$(sha256sum "$BACKUP_PATH" | awk '{print $1}')
[ "$backup_hash_before" = "$backup_hash_after" ] || fail "the SQLite backup changed during import"

marker_tmp=$MIGRATION_MARKER.tmp
printf '%s\n' "$backup_hash_after" > "$marker_tmp"
mv "$marker_tmp" "$MIGRATION_MARKER"

echo "Migration completed. Keep both SQLite volumes intact until production verification is complete."
