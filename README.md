# FileKey

FileKey is an offline web app that lets you encrypt and share files using passkeys. No accounts, no tracking, no servers — just local security powered by the Web Crypto API.

> **FileKey is open source and privacy-first.** Licensed under GPLv3.

---

## Features

- **Free & Open Source** – Licensed under GPLv3.
- **Accountless by Design** – No logins, no tracking.
- **Passkey-Based Encryption** – Works with your existing password manager or security key.
- **End-to-End Encrypted** – Only you can see your data.
- **Secure Sharing** – Share encrypted files with specific recipients using Share Keys.
- **Offline** – Runs 100% offline in your browser. Installable as a PWA.

---

## Compatibility

Requires a compatible password manager (Apple Passwords, Google Passwords, Windows Hello, etc.) or a FIDO2/PRF hardware security key (e.g. YubiKey 5 or Bio Series).

| Platform | Passkey Providers | Notes |
|----------|-------------------|-------|
| macOS | Apple Passwords, YubiKey, 1Password | Safari ≥ 17 or Chrome ≥ 112. YubiKey won't work in Safari. |
| Windows | 1Password, YubiKey | Edge/Chrome ≥ 112. Requires Windows 11. |
| Linux | YubiKey (via browser) | Latest Chromium-based browser. |
| iOS | Apple Passwords, 1Password | Safari ≥ 17 or Chrome ≥ 112. |
| Android | Google Passwords, 1Password, YubiKey | Chrome ≥ 112. |

> **Notes:** Proton Pass and Bitwarden don't support PRF yet. Windows 10 and below won't work. Samsung Pass has been reported to work despite no official PRF support. Chromium-based browsers (Brave, Vivaldi, Opera) likely work.

---

## Documentation

- [How to use FileKey, sharing, and PWA install](docs/README.md)
- [Encryption technical deep-dive](docs/how-encryption-works.md)
- [Self-hosting guide](docs/self_hosting_guide.md)

---

## Self-Hosting

Pre-built multi-arch images are published to the GitHub Container Registry on every release:

```bash
docker run -p 8080:8080 ghcr.io/jacaudi/filekey:latest
```

See the [self-hosting guide](docs/self_hosting_guide.md) for Nginx Proxy Manager, SSL, and Portainer setup.

---

## Links

> **[filekey.app](https://filekey.app)**
> *(Best in Chrome ≥ 112, Safari ≥ 17, or Edge ≥ 112)*

> Korben's review: [FileKey — chiffrement de fichiers avec des passkeys](https://korben.info/filekey-chiffrement-fichiers-passkeys-local-opensource.html)
