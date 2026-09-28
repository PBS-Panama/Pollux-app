# Stage 1 — Build the React SPA (real auth pages: /login, /register, /dashboard)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2 — Serve: approved static marketing site (site/) at "/", SPA shell
# (renamed app-shell.html) mounted only for /login, /register, /dashboard.
# See nginx.conf and App.tsx's header comment — 2026-09-12 landing restoration.
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
RUN mv /usr/share/nginx/html/index.html /usr/share/nginx/html/app-shell.html
COPY site/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
