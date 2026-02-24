### 🔐 Encryption Process

FileKey first requires the generation of a passkey, stored on either your password manager or security key device, using the app’s domain as the relying party. Once a passkey has been created, it can then pass a static message through WebAuthn (with PRF support) to generate a deterministic random value.

Using this value, FileKey derives a 256-bit encryption key via HKDF. A random salt is used alongside the HKDF to produce a key suitable for AES-GCM encryption. This derived key is then used to encrypt or decrypt a file. A new derived key is generated for each file.

All low-level cryptographic operations use the browser's built-in `SubtleCrypto` API. Every encrypted file includes a unique 16-byte random salt.

---

### 🧠 Share Key Encryption Process (Technical Details)

1. **WebAuthn PRF:** The process starts by generating a PRF (pseudorandom function) output from the user's WebAuthn passkey.
2. **HKDF Generation:** The PRF output is passed into HKDF to generate a seed value.
3. **Deterministic ECDH Key Pair:**  
   Using this seed, FileKey deterministically generates an ECDH (Elliptic Curve Diffie-Hellman) key pair on the P-521 curve.
4. **Key Formatting:**  
   - Private key is encoded in PKCS#8  
   - Public key is encoded in raw format
5. **Key Import:**  
   Both keys are imported into the browser’s `SubtleCrypto` API for cryptographic use.
6. **Shared Secret Derivation:**  
   When encrypting a file for someone else, FileKey derives an AES-GCM key using:
   - Your private ECDH key  
   - The recipient’s public ECDH key  
   - A randomly generated salt
7. **Encryption:**  
   The derived AES-GCM key encrypts the file content.

---

### 🔐 Encrypted Shared File Includes:

- The sender’s **public ECDH key** (so the recipient knows which key to use)
- The **random salt** (used for key derivation)
- The **encrypted file content**

---

### 💡 Why This Matters

This approach eliminates the need to store or transmit the ECDH key pair.  
Users can regenerate the exact same key pair on any device just by authenticating with their passkey — making it resilient to data loss or device compromise.
