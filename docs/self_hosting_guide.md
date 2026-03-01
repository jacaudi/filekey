# Self-Hosting FileKey

---

## Prerequisites

- Docker and Docker Compose installed on your host
- A domain pointed at your host (e.g. `filekey.example.com`)
- Nginx Proxy Manager (or similar reverse proxy) with Let's Encrypt configured

---

## Step 1: Pull the Image

Pre-built multi-arch images are published to the GitHub Container Registry on every release:

```bash
docker pull ghcr.io/jacaudi/filekey:latest
```

---

## Step 2: Deploy with Docker Compose

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

FileKey is now running at `http://localhost:8080`.

---

## Step 3: Add a Proxy Host in Nginx Proxy Manager

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

## Step 4: Access the App

```
https://filekey.example.com
```

Or directly without a proxy: `http://<your-server-ip>:8080`
