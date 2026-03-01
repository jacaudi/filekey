# FileKey — Detailed Documentation

- [How to Use FileKey](#how-to-use-filekey)
- [How the Encryption Works](#how-the-encryption-works)
- [Sharing Files](#sharing-files)
- [Installing as a PWA](#installing-as-a-pwa)
- [Self-Hosting](self_hosting_guide.md)

---

## How to Use FileKey

1. **Create your FileKey**
   Generate a passkey stored in your password manager or security key (iCloud Keychain, YubiKey, etc.). The app's domain is used as the relying party.

2. **Encrypt files**
   Drag and drop any file into FileKey — it's encrypted immediately with AES-256 using a key derived from your passkey.

3. **Decrypt files**
   Drop the encrypted file back in. Your passkey unlocks it locally and securely.

4. **Share privately**
   Encrypt a file for a specific recipient using their Share Key. Only they can open it.

---

## How the Encryption Works

FileKey generates a passkey stored in your password manager or hardware security key. Once created, it passes a static message through WebAuthn, interacting with a PRF to produce a deterministic random value.

That value seeds an HKDF with 256 bits of entropy. Each file encryption derives a fresh AES-GCM key from the HKDF using a new random 16-byte salt. Decryption reconstructs the same key deterministically.

All cryptographic operations use the browser's built-in [SubtleCrypto API](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto). Nothing leaves your device.

> For a full technical breakdown, see [how-encryption-works.md](how-encryption-works.md).

---

## Sharing Files

Every FileKey user has a unique **Share Key** — a public identifier found in the menu under **"Your Share Key."**

### Sending a File

1. Click **Share** next to any encrypted file.
2. Enter the recipient's Share Key.
3. FileKey produces a `.shared_filekey` file encrypted specifically for that recipient. Send it via any channel (email, messaging, file transfer, etc.).

### Receiving a Shared File

1. Open FileKey and authenticate with your passkey.
2. Drag and drop the `.shared_filekey` into FileKey.
3. FileKey detects it's a shared file and decrypts it using your key.

### Security Properties

- Your private keys **never** leave your device.
- Shared files are locked to a specific recipient — no one else can open them.
- All encryption and decryption happen **entirely in your browser**.
- Your Share Key is public — it's safe to share openly.

---

## Installing as a PWA

FileKey works fully offline once installed. If you're concerned about relying on the hosted version, install it locally — it only takes a few seconds.

### Desktop (Mac, Windows, Linux) — Chrome, Edge, or Brave

1. Open FileKey in your browser.
2. Click the install icon in the address bar (a downward arrow with a screen).
3. Click **Install**.

FileKey opens as a standalone app, appears in your Applications list, and works offline.

### iOS (iPhone / iPad) — Safari only

Safari is required — only Safari supports PWAs on iOS.

1. Open FileKey in Safari.
2. Tap the **Share** icon (square with an arrow).
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

FileKey will behave like a native app and works offline once cached.

### Android — Chrome, Edge, Brave, or Samsung Internet

1. Open FileKey in your browser.
2. Tap the **Add to Home Screen** banner, or open the ⋮ menu → **Add to Home Screen**.
3. Tap **Confirm**.

You'll have a standalone FileKey icon that works offline.

---

## Self-Hosting

See the [self-hosting guide](self_hosting_guide.md) for full instructions including Docker, Nginx Proxy Manager, SSL, and Portainer.
