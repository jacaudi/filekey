function initChizMenu() {
    var chiz_menu_status = false;
    var chiz_icon_container = document.getElementById("chiz_icon_container");
    var chiz_hidden_click_container = document.getElementById("chiz_hidden_click_container");
    var chiz_menu_container = document.getElementById("chiz_menu_container");
    var chiz_list = document.getElementById("chiz_list");
    var new_svgs = hb.getSvg("chiz_icon", {
        id: "chiz_open_icon"
    });
    new_svgs += hb.getSvg("x_icon", {
        id: "chiz_close_icon"
    });
    chiz_icon_container.innerHTML = new_svgs;
    chiz_icon_container.addEventListener("click", toggleChizMenu);
    chiz_hidden_click_container.addEventListener("click", closeChizMenu);
    document.getElementById("chiz_close_icon").addEventListener("click", closeChizMenu);
    for (var i = 0; i < chiz_list.children.length; i++) {
        if (chiz_list.children[i].classList.contains("no_listen_event") == false)
            chiz_list.children[i].addEventListener("click", displayMenuMessage);
    }
    function toggleChizMenu(set_to) {
        chiz_menu_status = (checkForProperty(set_to)) ? set_to : !chiz_menu_status;
        if (chiz_menu_status) {
            chiz_menu_container.style.display = "block";
            chiz_icon_container.children[0].style.display = "none";
            chiz_icon_container.children[1].style.display = "block";
            chiz_hidden_click_container.style.display = "block";
        } else {
            chiz_menu_container.style.display = "none";
            chiz_icon_container.children[0].style.display = "block";
            chiz_icon_container.children[1].style.display = "none";
            chiz_hidden_click_container.style.display = "none";
        }
    }
    function closeChizMenu(e=null) {
        toggleChizMenu(false);
        if (e != null)
            e.stopPropagation();
    }
    function displayMenuMessage(e) {
        closeChizMenu();
        switch (e.currentTarget.id) {
        case "chiz_clear_all":
            clearAll();
            return;
        case "chiz_get_public_key":
            displayPublicKey();
            return;
        case "chiz_how_it_works":
            modal_h.open({
                title: "How FileKey Works",
                content: `<h3 class=msg_number_heading>General Overview</h3><p>FileKey is a web app that lets you quickly encrypt, decrypt, and share files using passkeys—no accounts, no tracking, no backend servers. Just local, offline security powered by passkeys.</p><p>Here’s how it works:</p><ol class=msg_no_margin_cont><li>Create your FileKey: generate a unique passkey that’s stored securely in your password manager or on your security key (like a YubiKey).</li><li>Drop files to encrypt: simply drag and drop any file into the app. FileKey instantly encrypts it using military-grade encryption (AES-256).</li><li>Drop encrypted files to decrypt: when you need to access your encrypted files, just drop them back into FileKey. With your passkey, they’ll be decrypted almost instantly.</li><li>Share encrypted files securely: need to share a sensitive file? Use the recipient’s Share Key to create a version only they can decrypt.</li></ol><h4 class=no_class_yet>Key Benefits</h4><ul class=msg_no_margin_cont><li>Use passkeys to encrypt files securely and easily</li><li>Works with your existing password manager or hardware security key</li><li>Free and open source</li><li>Your files and encryption keys never leave your device</li><li>Share files securely</li><li>AES-256 encryption ("Military-grade")</li><li>Offline capable</li><li>Can be locally installed (progressive web app)</li><li>Fast, ultra-secure encryption and decryption</li><li>Private by design: No tracking, analytics, or data collection</li></ul><h3 class=msg_number_heading>Encryption Process</h3><p>FileKey first requires the generation of a passkey, that will be stored on either your password manager or security key device, using the app’s domain as the relying party. Once a passkey has been created, it can then pass a static message through WebAuthn which interacts with a PRF in order to generate a deterministic random value.</p><p>Using this deterministic random value, an HKDF with 256 bits of entropy is generated. The HKDF and a random salt is then used to derive a key to be used with AES-GCM. The derived key is then used to encrypt and decrypt the file. A new derived key is used for each additional file.</p><p>All low-level cryptographic functions performed within this process are using the web’s built-in SubtleCrypto interface of the Web Crypto API. All encrypted files use a unique randomly generated salt, composed of a 16 byte hash.</p><h3 class=msg_number_heading>Share Keys</h3><p>Every FileKey user has a unique "Share Key" – a long string of characters that works like a public address. You can find yours in the menu under "Your Share Key."</p><h4 class=no_class_yet>Sharing a File</h4><ol class=msg_no_margin_cont><li>Click the "Share" button next to any file</li><li>Enter the recipient’s Share Key (they’ll need to share this with you first)</li><li>FileKey creates a special encrypted version that only the recipient can unlock</li><li>Save and send the file (ending in ".shared_filekey") to the recipient through any method you prefer – email, messaging, file transfer, etc.</li></ol><h4 class=no_class_yet>Receiving a Shared File</h4><p>When someone sends you a shared file:</p><ol class=msg_no_margin_cont><li>Save the file to your device</li><li>Drag and drop it into FileKey</li><li>Authenticate with your passkey</li><li>FileKey automatically detects it’s a shared file and unlocks it using your unique keys</li></ol><h4 class=no_class_yet>Security Details</h4><ul class=msg_no_margin_cont><li>Your private keys never leave your device</li><li>Each shared file can only be opened by the specific recipient</li><li>The encryption happens entirely on your device – no servers involved</li><li>Files are secured with military-grade encryption (AES-256)</li></ul><p>Share files with confidence, knowing only your intended recipient can access them!</p><h4 class=no_class_yet>Share Key Encryption Process</h4><ol class=msg_no_margin_cont><li>WebAuthn PRF: the process starts by getting a PRF (Pseudorandom Function) output from the user’s WebAuthn passkey.</li><li>HKDF Generation: this PRF output is used to create an HKDF (HMAC-based Key Derivation Function), which serves as a seed.</li><li>Deterministic ECDH Key Pair: using this seed, the app deterministically generates an ECDH (Elliptic Curve Diffie-Hellman) key pair on the P-521 curve.</li><li><span>Key Formatting:</span><ul class=msg_no_margin_cont><li>The private key is encoded in PKCS#8 format</li><li>The public key is encoded in raw format</li></ul></li><li>Import to SubtleCrypto: both keys are imported into the browser’s SubtleCrypto API for cryptographic operations.</li><li><span>Shared Secret Derivation: when sharing a file, the app derives an AES-GCM key using:</span><ul class=msg_no_margin_cont><li>Your private ECDH key</li><li>The recipient’s public ECDH key</li><li>A randomly generated salt</li></ul></li><li>Encryption: the derived AES-GCM key is used to encrypt the file content.</li></ol><p>The resulting encrypted file includes:</p><ul class=msg_no_margin_cont><li>The sender’s public key (so the recipient knows which key was used)</li><li>The random salt (needed for key derivation)</li><li>The encrypted file content</li></ul><p>The major advantage of this approach is that it doesn’t require storing the ECDH key pair anywhere, making it more resistant to extraction from device storage. Users can regenerate the exact same key pair on any device just by authenticating with their passkey.</p><h4 class=no_class_yet>FileKey Requirements</h4><ul class=msg_no_margin_cont><li>A compatible password manager (iCloud, Google, etc) or a hardware security key that supports FIDO2 and PRF (like the YubiKey 5 and Bio Series)</li><li>For hardware security keys, your browser and operating system needs to support WebAuthn and the PRF extension.</li></ul>`
            });
            return;
        case "chiz_contact_us":
            modal_h.open({
                title: "Contact Us",
                content: `<span>For questions or issues, visit our </span><a class=msg_link href=https://github.com/jacaudi/filekey/issues target=_blank>GitHub Issues</a><span> page.</span>`
            });
            return;
        case "chiz_source_code":
            modal_h.open({
                title: "Source Code",
                content: `<span>View the full source code on </span><a class=msg_link href=https://github.com/jacaudi/filekey target=_blank>GitHub</a><span>.</span>`
            });
            return;
        case "chiz_terms":
            modal_h.open({
                title: "Terms of Service",
                content: `<ol><li><h3 class=msg_number_heading>Acceptance of Terms</h3><span>By using FileKey, you agree to these Terms of Service. If you do not agree, please do not use our site or services.</span></li><li><h3 class=msg_number_heading>Intended Use</h3><span>FileKey is designed to help you encrypt and decrypt files locally with your own hardware. You are responsible for using FileKey in compliance with all applicable laws and regulations.</span></li><li><h3 class=msg_number_heading>No Guarantees</h3><span>We provide FileKey "as is", without warranties of any kind. We do not guarantee that FileKey will be error-free, secure, or meet all your needs.</span></li><li><h3 class=msg_number_heading>Your Responsibility</h3><span>You must ensure that your hardware security key and devices remain secure. We are not responsible for lost keys, corrupted files, or unauthorized access resulting from your own actions.</span></li><li><h3 class=msg_number_heading>Liability Limitations</h3><span>To the fullest extent allowed by law, we will not be liable for any direct, indirect, incidental, or consequential damages arising from your use of-or inability to use-FileKey.</span></li><li><h3 class=msg_number_heading>No Third-Party Services</h3><span>FileKey does not rely on external services or third parties. You are solely responsible for managing your keys and files.</span></li><li><h3 class=msg_number_heading>Changes to Terms</h3><span>If we update these Terms of Service, we will post the changes here. Your continued use of FileKey after changes means you accept the updated terms.</span></li><li><h3 class=msg_number_heading>Contact Us</h3><span>If you have questions or concerns, please visit our </span><a class=msg_link href=https://github.com/jacaudi/filekey/issues target=_blank>GitHub Issues</a><span> page.</span><br/><span>By using FileKey, you acknowledge and agree to these Terms of Service.</span></li></ol>`
            });
            return;
        case "chiz_privacy":
            modal_h.open({
                title: "Privacy Policy",
                content: `<h3 class=msg_number_heading>No Data Collection:</h3><span>We do not collect, store, or process any personal information on the website—no names, emails, or accounts. We do not track you, and we do not use analytics.</span><h3 class=msg_number_heading>Local-Only File Handling:</h3><span>All file encryption and decryption happens entirely on your device. We never send your files or keys to our servers. You remain in full control of your data at all times.</span><h3 class=msg_number_heading>Local Storage:</h3><span>We may use local storage on your device to remember your settings or key references. This information never leaves your device.</span><h3 class=msg_number_heading>No Third Parties:</h3><span>We do not share any data with third parties. There are no hidden integrations or external services.</span><h3 class=msg_number_heading>Changes to This Policy:</h3><span>If we make changes, we will update this page. Your continued use of FileKey means you accept the updated terms.</span><h3 class=msg_number_heading>Contact Us:</h3><span>If you have questions or concerns, please visit our </span><a class=msg_link href=https://github.com/jacaudi/filekey/issues target=_blank>GitHub Issues</a><span> page.</span><br/><span>By using FileKey, you agree to this policy.</span>`
            });
            return;
        case "chiz_license":
            modal_h.open({
                title: "License",
                content: `<p>FileKey version 1 is released under the GNU General Public License v3.0 (GPLv3).</p><p>This means that you are free to use, modify, and distribute FileKey under the terms of the GPLv3 license. However, any modifications or derivative works must also be released under the same open-source license.</p><p><span>You can read the </span><a class=msg_link href=https://www.gnu.org/licenses/gpl-3.0.en.html target=_blank>full license text here.</a></p><p>By using FileKey, you agree to the terms of this license. If you contribute to the project, you also acknowledge that your contributions will be made available under GPLv3.</p>`
            });
            return;
        }
    }
}
function displayPublicKey() {
    modal_h.open({
        title: "Your Share Key",
        content: "<p>Authenticating...</p>"
    });
    getDetEcdhPublicKey(function(ret) {
        if (!modal_h.isOpen()) return;
        if (ret == null) {
            modal_h.updateBody("<p>Authentication required to generate share key.</p>");
        } else {
            var pub_hex = bh.bufferToHex(ret);
            var copy_icon = hb.getSvg("copy_icon", { class_string: "copy_icon" });
            var content = `<p>Your share key is a public key that allows others to encrypt data that only you can decrypt:</p><p class=word_broken id=fk_modal_pub_key></p><div class="copy_button no_select" id=fk_modal_copy_btn><span id=fk_modal_copy_svg></span><span id=fk_modal_copy_text>Copy</span></div>`;
            modal_h.updateBody(content, function() {
                document.getElementById("fk_modal_pub_key").textContent = pub_hex;
                document.getElementById("fk_modal_copy_svg").innerHTML = copy_icon;
                document.getElementById("fk_modal_copy_btn").addEventListener("click", function() {
                    copy_to_clipboard(pub_hex, function(res) {
                        if (res) {
                            var t = document.getElementById("fk_modal_copy_text");
                            t.innerText = "Copied!";
                            window.setTimeout(function() { t.innerText = "Copy"; }, 1000);
                        }
                    });
                });
            });
        }
    });
}
function getDetEcdhPublicKey(cb) {
    var msg_param = {
        msg_type: "get_det_public_ecdh"
    };
    ww_h.sendMessageToWorker(msg_param, [], cb);
}
function clearAll() {
    modal_h.close();
    active_share_prompt = null;
    main_inner.innerHTML = "";
    document.getElementById("drop_container").style.display = "none";
    db_h.clearDbStore();
    if (typeof ww_h !== 'undefined' && ww_h !== null) {
        ww_h.sendMessageToWorker({ msg_type: "clear_keys" }, [], function() {});
    }
    initMessage();
}
function genNewPasskey() {
    var prf_obj = {
        key_name: "Filekey",
        username: "default_user"
    };
    webauthn_h.createCredential(prf_obj, function(ret) {
        if (ret === null) {
            var events_obj = {
                clickable_see_requirements: {
                    target: displayRequirements
                },
            };
            htmlWriter(getErrorParams(), "<span>Failed to generate new filekey. Please try again or </span><span class=msg_clickable id=clickable_see_requirements>see requirements.</span>", main_inner, events_obj);
        } else {
            var html_string = "<span>Filekey created. </span><span class=msg_clickable id=clickable_load_seckey_from_gen_pk>Now tap to authenticate</span><span>.</span>";
            var events_obj = {
                clickable_load_seckey_from_gen_pk: {
                    target: loadSecKey
                },
            };
            htmlWriter({
                char_speed: 4
            }, html_string, main_inner, events_obj);
        }
    });
}
function displayRequirements() {
    var html_string = ` <h3 class="msg_number_heading msg_no_margin_cont">💾 FileKey Compatibility Requirements:</h3><ul><li><span>Requires a passkey stored in a password manager or security key that supports PRF (and FIDO2 for hardware keys)</span></li><li><span>Your browser and OS must support WebAuthn+PRF extension</span></li><li><span>Works best on Chrome ≥112, Edge ≥112, and other Chromium-based browsers</span></li></ul><h3 class=msg_number_heading>✅ Supported Platforms:</h3><ul><li><span><strong>macOS</strong><span>: Apple Passwords, 1Password, Yubikey (Safari ≥17 or Chrome ≥112). Note: YubiKeys do not work in Safari</span></span></li><li><span><strong>Windows 11</strong><span>: 1Password, YubiKey (Chrome/Edge ≥112)</span></span></li><li><span><strong>Linux</strong><span>: YubiKey with latest Chrome/Chromium</span></span></li><li><span><strong>iOS</strong><span>: Apple Passwords, 1Password (Safari ≥17 or Chrome ≥112). Note: iOS does not support PRF for Yubikeys at this time</span></span></li><li><span><strong>Android</strong><span>: Google Passwords, 1Password, YubiKey (Chrome ≥112)</span></span></li></ul><h3 class=msg_number_heading>⚠️ Known Limitations:</h3><ul><li><span>❌ Proton Pass and BitWarden don’t yet support PRF correctly → not compatible</span></li><li><span>⚠️ Samsung Pass may work, but doesn’t officially support PRF</span></li><li><span>❌ Windows 10 and earlier do not support PRF</span></li><li><span>✅ Chromium-based browsers (Brave, Vivaldi, Opera) should work</span></li></ul> `;
    htmlWriter({
        char_speed: 16
    }, html_string, main_inner);
}
