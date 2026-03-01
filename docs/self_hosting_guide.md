# Self-Hosting FileKey

Pre-built multi-arch images (`linux/amd64`, `linux/arm64`) are published to GHCR on every release. No building required.

---

## Prerequisites

- Docker and Docker Compose installed on your host
- A domain pointed at your host (e.g. `filekey.example.com`)
- Nginx Proxy Manager (or similar reverse proxy) with Let's Encrypt configured

---

## Step 1: Deploy with Docker Compose

Create a `docker-compose.yml`:

```yaml
services:
  filekey:
    image: ghcr.io/jacaudi/filekey:latest
    container_name: filekey
    ports:
      - "8080:8080"
    restart: unless-stopped
```

Then start it:

```bash
docker compose up -d
```

FileKey is now running at `http://localhost:8080`. To pin a specific version, replace `latest` with a release tag (e.g. `v0.3.0`).

---

## Step 2: Add a Proxy Host in Nginx Proxy Manager

1. Go to **Proxy Hosts** → **Add Proxy Host**
2. Fill in:

| Field | Value |
|-------|-------|
| Domain Names | `filekey.example.com` |
| Scheme | `http` |
| Forward Hostname / IP | your Docker host IP, or `localhost` if co-located |
| Forward Port | `8080` |
| Block Common Exploits | ✅ Recommended |

3. On the **SSL** tab: enable SSL, Force SSL, HTTP/2, and HSTS. Choose your Let's Encrypt cert.
4. Click **Save**.

---

## Step 3: Access the App

```
https://filekey.example.com
```

Or directly without a proxy: `http://<your-server-ip>:8080`

---

## Portainer

Paste the `docker-compose.yml` above into **Portainer → Stacks → Add Stack** and deploy from there.
