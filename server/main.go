package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
)

//go:embed app
var staticFiles embed.FS

// Version is set at build time via -ldflags="-X main.Version=<tag>"
var Version = "dev"

func prepareIndexContent(appFS fs.FS) (string, error) {
	indexBytes, err := fs.ReadFile(appFS, "index.html")
	if err != nil {
		return "", err
	}
	indexContent := strings.Replace(string(indexBytes), "__APP_VERSION__", Version, 1)
	if os.Getenv("FK_DEBUG") == "true" {
		indexContent = strings.ReplaceAll(indexContent, "let FK_DEBUG = false", "let FK_DEBUG = true")
	}
	return indexContent, nil
}

func buildHandler(appFS fs.FS, indexContent string) http.Handler {
	fileServer := http.FileServer(http.FS(appFS))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		w.Header().Set("Content-Security-Policy",
			"default-src 'self'; "+
				"script-src 'self' 'unsafe-inline'; "+
				"style-src 'self' 'unsafe-inline'; "+
				"img-src 'self' data:; "+
				"font-src 'self'; "+
				"connect-src 'self'; "+
				"manifest-src 'self'; "+
				"worker-src 'self' blob:; "+
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
		case "/manifest.json":
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

func main() {
	port := flag.Int("port", 8080, "port to listen on")
	flag.Parse()

	p, err := parsePort(*port, os.Getenv("PORT"))
	if err != nil {
		log.Fatalf("invalid PORT: %v", err)
	}

	appFS, err := fs.Sub(staticFiles, "app")
	if err != nil {
		log.Fatalf("failed to create sub FS: %v", err)
	}

	indexContent, err := prepareIndexContent(appFS)
	if err != nil {
		log.Fatalf("failed to read embedded index.html: %v", err)
	}

	http.Handle("/", buildHandler(appFS, indexContent))

	addr := fmt.Sprintf(":%d", p)
	log.Printf("FileKey listening on http://0.0.0.0%s", addr)
	if err := http.ListenAndServe(addr, http.DefaultServeMux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
