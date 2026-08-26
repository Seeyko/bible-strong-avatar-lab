# Multi-stage static build for Dokploy.
# Watch path: docker-compose.yml at the repository root.
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY scripts ./scripts
COPY src ./src
COPY public ./public
COPY examples ./examples
COPY index.html tsconfig.json vite.config.ts vitest.config.ts components.json .prettierrc .prettierignore ./
RUN pnpm install --frozen-lockfile && pnpm build

FROM busybox:1.37.0-musl
COPY --from=build /app/dist /www
EXPOSE 80
CMD ["httpd", "-f", "-p", "80", "-h", "/www"]
