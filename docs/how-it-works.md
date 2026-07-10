# How FileKey Works

### General Overview

FileKey is a web app that lets you quickly encrypt, decrypt, and share files using passkeys — no accounts, no tracking, no backend servers. Just local, offline security powered by passkeys.

Here's how it works:

1. **Create your FileKey:** generate a unique passkey that's stored securely in your password manager or on your security key (like a YubiKey).
2. **Drop files to encrypt:** simply drag and drop any file into the app. FileKey instantly encrypts it using military-grade encryption (AES-256).
3. **Drop encrypted files to decrypt:** when you need to access your encrypted files, just drop them back into FileKey. With your passkey, they'll be decrypted almost instantly.
4. **Share encrypted files securely:** need to share a sensitive file? Use the recipient's Share Key to create a version only they can decrypt.

#### Key Benefits

- Use passkeys to encrypt files securely and easily
- Works with your existing password manager or hardware security key
- Free and open source
- Your files and encryption keys never leave your device
- Share files securely
- AES-256 encryption ("Military-grade")
- Offline capable
- Can be locally installed (progressive web app)
- Fast, ultra-secure encryption and decryption
- Private by design: no tracking, analytics, or data collection

### Encryption Process

FileKey first requires the generation of a passkey, that will be stored on either your password manager or security key device, using the app's domain as the relying party. Once a passkey has been created, it can then pass a static message through WebAuthn which interacts with a PRF in order to generate a deterministic random value.

Using this deterministic random value, an HKDF with 256 bits of entropy is generated. The HKDF and a random salt is then used to derive a key to be used with AES-GCM. The derived key is then used to encrypt and decrypt the file. A new derived key is used for each additional file.

All low-level cryptographic functions performed within this process are using the web's built-in SubtleCrypto interface of the Web Crypto API. All encrypted files use a unique randomly generated salt, composed of a 16 byte hash.

### Share Keys

Every FileKey user has a unique "Share Key" — a long string of characters that works like a public address.

#### Sharing a File

1. Click the "Share" button next to any file
2. Enter the recipient's Share Key (they'll need to share this with you first)
3. FileKey creates a special encrypted version that only the recipient can unlock
4. Save and send the file (ending in ".shared_filekey") to the recipient through any method you prefer — email, messaging, file transfer, etc.

#### Receiving a Shared File

When someone sends you a shared file:

1. Save the file to your device
2. Drag and drop it into FileKey
3. Authenticate with your passkey
4. FileKey automatically detects it's a shared file and unlocks it using your unique keys

#### Security Details

- Your private keys never leave your device
- Each shared file can only be opened by the specific recipient
- The encryption happens entirely on your device — no servers involved
- Files are secured with military-grade encryption (AES-256)

Share files with confidence, knowing only your intended recipient can access them!

#### Share Key Encryption Process

1. **WebAuthn PRF:** the process starts by getting a PRF (Pseudorandom Function) output from the user's WebAuthn passkey.
2. **HKDF Generation:** this PRF output is used to create an HKDF (HMAC-based Key Derivation Function), which serves as a seed.
3. **Deterministic ECDH Key Pair:** using this seed, the app deterministically generates an ECDH (Elliptic Curve Diffie-Hellman) key pair on the P-521 curve.
4. **Key Formatting:**
   - The private key is encoded in PKCS#8 format
   - The public key is encoded in raw format
5. **Import to SubtleCrypto:** both keys are imported into the browser's SubtleCrypto API for cryptographic operations.
6. **Shared Secret Derivation:** when sharing a file, the app derives an AES-GCM key using:
   - Your private ECDH key
   - The recipient's public ECDH key
   - A randomly generated salt
7. **Encryption:** the derived AES-GCM key is used to encrypt the file content.

The resulting encrypted file includes:

- The sender's public key (so the recipient knows which key was used)
- The random salt (needed for key derivation)
- The encrypted file content

The major advantage of this approach is that it doesn't require storing the ECDH key pair anywhere, making it more resistant to extraction from device storage. Users can regenerate the exact same key pair on any device just by authenticating with their passkey.

### FileKey Requirements

- A compatible password manager (iCloud, Google, etc) or a hardware security key that supports FIDO2 and PRF (like the YubiKey 5 and Bio Series)
- For hardware security keys, your browser and operating system needs to support WebAuthn and the PRF extension
- Works best on Chrome ≥112, Edge ≥112, and other Chromium-based browsers

#### Supported Platforms

- **macOS:** Apple Passwords, 1Password, YubiKey (Safari ≥17 or Chrome ≥112). Note: YubiKeys do not work in Safari
- **Windows 11:** 1Password, YubiKey (Chrome/Edge ≥112)
- **Linux:** YubiKey with latest Chrome/Chromium
- **iOS:** Apple Passwords, 1Password (Safari ≥17 or Chrome ≥112). Note: iOS does not support PRF for YubiKeys at this time
- **Android:** Google Passwords, 1Password, YubiKey (Chrome ≥112)

#### Known Limitations

- Proton Pass and BitWarden don't yet support PRF correctly → not compatible
- Samsung Pass may work, but doesn't officially support PRF
- Windows 10 and earlier do not support PRF
- Chromium-based browsers (Brave, Vivaldi, Opera) should work
