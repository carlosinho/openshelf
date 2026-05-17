FROM oven/bun:1 AS build
WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 3000
VOLUME /app/data
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "server/index.ts"]
