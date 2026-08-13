# =============================================================
# Stage 1 — Build the web bundle (Vite)
# =============================================================
FROM node:24-alpine AS web-build

WORKDIR /build/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
# docs/ is imported at build time (?raw markdown single-sourcing)
COPY docs/ /build/docs/
COPY web/ ./
RUN npm run build

# =============================================================
# Stage 2 — Compile the Go static-file server with embedded dist
# =============================================================
FROM golang:1.26-alpine AS build

WORKDIR /build

COPY server/go.mod ./
RUN go mod download

COPY server/main.go ./
COPY --from=web-build /build/web/dist/ ./dist/

ARG APP_VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -X main.Version=${APP_VERSION}" \
    -trimpath \
    -o /filekey \
    .

# =============================================================
# Stage 3 — Minimal scratch image with just the binary
# =============================================================
FROM scratch

COPY --from=build /filekey /filekey

EXPOSE 8080

ENTRYPOINT ["/filekey"]
