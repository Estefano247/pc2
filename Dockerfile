# ---- Stage 1: Build frontend ----
FROM node:20-alpine AS builder

ARG VITE_SUPABASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# ---- Stage 2: Serve ----
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/dist frontend/dist
COPY server.js .

EXPOSE 3000

CMD ["node", "server.js"]
