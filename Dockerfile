# PBS Crewing Module
# Node 20 Alpine + pnpm multi-stage build
ARG NODE_VERSION=20-alpine
FROM node:$NODE_VERSION AS base

# Setup pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
RUN apk add --no-cache git

LABEL Description="PBS Crewing Module" Vendor="Dominius" Version="1.0.0"

RUN mkdir -p /app
WORKDIR /app

# Stage 1: Install dependencies & build
FROM base AS app

COPY package.json pnpm-lock.yaml /app/
RUN pnpm i --frozen-lockfile

COPY . /app/
RUN pnpm build

# Stage 2: Production server dependencies
FROM base AS server

RUN pnpm i express@4

# Stage 3: Final image — static server only
FROM base

COPY http_server.js /app/
COPY --from=server /app/node_modules /app/node_modules
COPY --from=app /app/build /app/build

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:8080/ || exit 1

CMD ["node", "http_server.js"]
