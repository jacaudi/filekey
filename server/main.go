package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
)

//go:embed app
var staticFiles embed.FS

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

	fileServer := http.FileServer(http.FS(appFS))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/sw.js":
			// Service workers must always be revalidated by the browser
			w.Header().Set("Cache-Control", "no-store")
			w.Header().Set("Service-Worker-Allowed", "/")
		case "/", "/index.html", "/manifest.json":
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
