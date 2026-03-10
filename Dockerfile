# =============================================================
# Stage 1 — Download Inter Variable font
# =============================================================
FROM alpine AS fonts

RUN apk add --no-cache curl unzip && \
    curl -fsSL "https://github.com/rsms/inter/releases/download/v4.0/Inter-4.0.zip" \
         -o /tmp/inter.zip && \
    unzip /tmp/inter.zip -d /tmp/inter && \
    find /tmp/inter -name "InterVariable.ttf" -exec cp {} /inter_variable.ttf \;

# =============================================================
# Stage 2 — Generate app/index.html from source
# =============================================================
FROM node:22-alpine AS js-build

WORKDIR /build
COPY scripts/ scripts/
COPY src/ src/
COPY app/ app/
RUN node scripts/build.js

# =============================================================
# Stage 3 — Compile the Go static-file server with embedded app
# =============================================================
FROM golang:1.26-alpine AS build

WORKDIR /build

COPY server/go.mod ./
RUN go mod download

COPY server/main.go ./
COPY --from=js-build /build/app/ ./app/
COPY --from=fonts /inter_variable.ttf ./app/fonts/inter_variable.ttf

ARG APP_VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w -X main.Version=${APP_VERSION}" \
    -trimpath \
    -o /filekey \
    .

# =============================================================
# Stage 4 — Minimal scratch image with just the binary
# =============================================================
FROM scratch

COPY --from=build /filekey /filekey

EXPOSE 8080

ENTRYPOINT ["/filekey"]
