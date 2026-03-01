package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"strings"
)

//go:embed app
var staticFiles embed.FS

// Version is set at build time via -ldflags="-X main.Version=<tag>"
var Version = "dev"

func main() {
	port := flag.Int("port", 8080, "port to listen on")
	flag.Parse()

	if p := os.Getenv("PORT"); p != "" {
		fmt.Sscanf(p, "%d", port)
	}

	appFS, err := fs.Sub(staticFiles, "app")
	if err != nil {
		log.Fatalf("failed to create sub FS: %v", err)
	}

	indexBytes, err := fs.ReadFile(appFS, "index.html")
	if err != nil {
		log.Fatalf("failed to read embedded index.html: %v", err)
	}
	indexContent := strings.Replace(string(indexBytes), "__APP_VERSION__", Version, 1)

	fileServer := http.FileServer(http.FS(appFS))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		w.Header().Set("Content-Security-Policy",
			"default-src 'self'; "+
				"script-src 'self' 'unsafe-inline'; "+
				"style-src 'self' 'unsafe-inline'; "+
				"img-src 'self' data:; "+
				"font-src 'self'; "+
				"connect-src 'self'; "+
				"manifest-src 'self'; "+
				"worker-src 'self' blob:")

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

	addr := fmt.Sprintf(":%d", *port)
	log.Printf("FileKey listening on http://0.0.0.0%s", addr)
	if err := http.ListenAndServe(addr, http.DefaultServeMux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
