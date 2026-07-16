FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/ ./
RUN npx prisma generate --schema prisma/postgres/schema.prisma
RUN npx tsc

FROM node:20-alpine
RUN apk add --no-cache curl postgresql-client sqlite
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app

COPY --from=server-build /app/server/package.json /app/server/package-lock.json ./server/
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=server-build /app/server/prisma ./server/prisma
COPY scripts/migrate-sqlite-to-postgres.sh /usr/local/bin/migrate-sqlite-to-postgres
COPY scripts/verify-sqlite-postgres-export.mjs /usr/local/bin/verify-sqlite-postgres-export.mjs

COPY --from=client-build /app/client/dist ./client/dist

RUN chmod 0555 /usr/local/bin/migrate-sqlite-to-postgres && chown -R appuser:appgroup /app

WORKDIR /app/server

ENV NODE_ENV=production

USER appuser

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy --schema prisma/postgres/schema.prisma && node dist/index.js"]
