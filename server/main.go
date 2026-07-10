package main

import (
	"context"
	"embed"
	"errors"
	"flag"
	"fmt"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"
)

//go:embed all:dist
var staticFiles embed.FS

// Version is set at build time via -ldflags="-X main.Version=<tag>"
var Version = "dev"

const shutdownTimeout = 10 * time.Second

func prepareIndexContent(distFS fs.FS) (string, error) {
	indexBytes, err := fs.ReadFile(distFS, "index.html")
	if err != nil {
		return "", err
	}
	return strings.Replace(string(indexBytes), "__APP_VERSION__", Version, 1), nil
}

func buildHandler(distFS fs.FS, indexContent string) http.Handler {
	fileServer := http.FileServer(http.FS(distFS))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(self), microphone=(), geolocation=()")
		w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		w.Header().Set("Content-Security-Policy",
			"default-src 'self'; "+
				"script-src 'self'; "+
				"style-src 'self' 'unsafe-inline'; "+
				"img-src 'self' data:; "+
				"font-src 'self'; "+
				"connect-src 'self'; "+
				"manifest-src 'self'; "+
				"worker-src 'self'; "+
				"form-action 'none'; "+
				"base-uri 'self'")

		switch r.URL.Path {
		case "/sw.js":
			// Service workers must always be revalidated by the browser
			w.Header().Set("Cache-Control", "no-store")
			w.Header().Set("Service-Worker-Allowed", "/")
		case "/", "/index.html":
			w.Header().Set("Cache-Control", "no-cache")
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.Write([]byte(indexContent))
			return
		case "/manifest.webmanifest":
			w.Header().Set("Cache-Control", "no-cache")
		default:
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		}

		fileServer.ServeHTTP(w, r)
	})
}

func parsePort(flagPort int, env string) (int, error) {
	if env == "" {
		return flagPort, nil
	}
	p, err := strconv.Atoi(env)
	if err != nil {
		return 0, fmt.Errorf("PORT must be an integer, got %q: %w", env, err)
	}
	if p < 1 || p > 65535 {
		return 0, fmt.Errorf("PORT must be in 1..65535, got %d", p)
	}
	return p, nil
}

func newServer(addr string, handler http.Handler) *http.Server {
	return &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
}

func run(ctx context.Context, srv *http.Server) error {
	errCh := make(chan error, 1)
	go func() { errCh <- srv.ListenAndServe() }()
	select {
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()
		return srv.Shutdown(shutdownCtx)
	}
}

func main() {
	portFlag := flag.Int("port", 8080, "port to listen on")
	flag.Parse()

	port, err := parsePort(*portFlag, os.Getenv("PORT"))
	if err != nil {
		slog.Error("invalid PORT", "err", err)
		os.Exit(1)
	}

	distFS, err := fs.Sub(staticFiles, "dist")
	if err != nil {
		slog.Error("failed to create sub FS", "err", err)
		os.Exit(1)
	}

	indexContent, err := prepareIndexContent(distFS)
	if err != nil {
		slog.Error("failed to read embedded index.html", "err", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	srv := newServer(fmt.Sprintf(":%d", port), buildHandler(distFS, indexContent))
	slog.Info("FileKey listening", "addr", "http://0.0.0.0"+srv.Addr, "version", Version)
	if err := run(ctx, srv); err != nil {
		slog.Error("server error", "err", err)
		os.Exit(1)
	}
	slog.Info("server stopped")
}
