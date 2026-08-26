# Multi-stage : Node builds dist/, prod image has no Node.
# Watch path: docker-compose.yml at the repository root.
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

FROM busybox:1.37.0-musl
COPY --from=build /app/dist /www
EXPOSE 80
CMD ["httpd", "-f", "-p", "80", "-h", "/www"]
