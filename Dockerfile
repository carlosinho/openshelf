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
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/.env.example ./.env.example

EXPOSE 3000
VOLUME /app/data

CMD ["bun", "server/index.ts"]
