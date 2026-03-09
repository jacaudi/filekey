let local_version_number = "__APP_VERSION__";
let ww_h;
let ww_script = null;
let bh = new buffer_helper();
let kh = new keccak_handler();
let last_active_account = null;
let current_active_file_array = [];
let seed_bag = {};
let active_prf = null;
let active_send_pub = null;
let active_share_prompt = null;
let file_as_text = true;
let dl_obj = {};
let hb = new html_builder();
let file_counter = 0;
let misc_msg_counter = 0;
let main_inner;
let drop_border_obj;
let db_h;
let tb_h = new topbar_ns_handler({
    z_index: 2139002000
});
let modal_h = new fk_modal_handler(); // Runs at parse time; requires <body> — works because <script> is inside <body>.
let webauthn_h;
let swc = null;
let aes_auth_tag_byte_len = 16;
window.addEventListener("DOMContentLoaded", domInit);
function domInit() {
    main_inner = document.getElementById("main_inner");
    initWorkers();
    initDB();
    registerBasicSw();
    var domain_id = window.location.hostname;
    var is_ip = /^[\d.]+$/.test(domain_id) || domain_id.includes(':');
    if (domain_id != "localhost" && !is_ip) {
        var parts = domain_id.split('.');
        domain_id = (parts.length > 2) ? parts.slice(-2).join('.') : domain_id;
    }
    webauthn_h = new webauthn_handler({
        name: "Filekey",
        id: domain_id
    });
    initImportOptions();
    initMessage();
    initLogo();
    initDropContainer();
    initChizMenu();
    memTest();
    var font_h = new font_handler();
    font_h.fontLoader(['/fonts/inter_variable.ttf', ], {
        font_display: "block"
    });
    initVersionChecks();
}
function initVersionChecks() {
    setVersionNumber();
}
function initQueryChecks() {
    var temp_qs = get_query_strings(false);
    if (checkForProperty(temp_qs.pub))
        confirmAndAttachPub(temp_qs.pub, function(ret) {});
}
function confirmAndAttachPub(hex_pub, cb) {
    if (hex_pub.length === 266 && /^[0-9a-fA-F]+$/.test(hex_pub)) {
        attachSendAddress(hex_pub, cb);
    } else
        cb(null)
}
function attachSendAddress(hex_pub, cb) {
    active_send_pub = hex_pub;
    var pub_buff = bh.hexToArrayBuffer(hex_pub, Uint8Array).buffer;
    var msg_param = {
        msg_type: "set_shared_pub",
        pub_buff
    };
    ww_h.sendMessageToWorker(msg_param, [pub_buff], function(ret) {
        if (ret) {
            htmlWriter({
                char_speed: 4
            }, "<span>Share key set.</span>", main_inner);
            scrollToBottom();
            cb(ret);
        } else
            cb(null);
    });
}
function setVersionNumber() {
    document.getElementById("version_number_ele").innerText = local_version_number;
}
function sendSwMessage(data, cb) {
    var msg_channel = new MessageChannel();
    if (swc == null) {
        fk_log('warn', 'sw', 'service worker not available');
        return;
    }
    if (swc.state === 'activated') {
        msg_channel.port1.onmessage = cb;
        swc.postMessage(data, [msg_channel.port2]);
    } else if (swc.state === 'redundant' && navigator.serviceWorker.controller.state != 'redundant') {
        swc = navigator.serviceWorker.controller;
        sendSwMessage(data, cb);
    } else
        fk_log('debug', 'sw', 'service worker state', swc.state);
}
function memTest() {
    if (performance.memory) {
        const memoryInfo = performance.memory;
        fk_log('debug', 'init', 'JS Heap used', memoryInfo.usedJSHeapSize);
        fk_log('debug', 'init', 'JS Heap total', memoryInfo.totalJSHeapSize);
        fk_log('debug', 'init', 'JS Heap limit', memoryInfo.jsHeapSizeLimit);
    } else
        fk_log('debug', 'init', 'memory info not available');
}
function initLogo() {
    var logo_bar = document.getElementById("logo_bar");
    var new_html = hb.getSvg("filekey_logo_icon", {
        class_string: "filekey_logo_icon"
    });
    new_html += "<span id=logo_txt>FileKey</span>";
    logo_bar.innerHTML = new_html;
    logo_bar.addEventListener("click", function() {
        window.location.reload();
    });
}
function initMessage() {
    var html_string = ` <strong>Files need protection. FileKey secures them</strong><span>. Works with passkeys. Drop files in. They lock. Drop them again. They unlock. Your data stays on your device, and only you hold the key. Open source and powered by AES-256 encryption.</span> `;
    htmlWriter({
        char_speed: 12
    }, html_string, main_inner, {}, function() {
        var html_string = "<span>To start, </span><span class=msg_clickable id=int_msg_clickable_gen_passkey>generate</span><span> a new filekey or </span><span class=msg_clickable id=clickable_load_seckey>authenticate</span><span> your existing filekey.</span>";
        var events_obj = {
            int_msg_clickable_gen_passkey: {
                target: genNewPasskey
            },
            clickable_load_seckey: {
                target: loadSecKey
            },
        };
        htmlWriter({
            char_speed: 8
        }, html_string, main_inner, events_obj, initQueryChecks);
    });
}
function registerBasicSw() {
    if ('serviceWorker'in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then( (registration) => {
                fk_log('debug', 'sw', 'registered with scope: ' + registration.scope);
                swc = navigator.serviceWorker.controller;
                registration.onupdatefound = () => {
                    const newSW = registration.installing;
                    newSW.onstatechange = () => {
                        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                            updateSwc();
                            sendNewUpdateAlert();
                        }
                        if (newSW.state === 'activated' && navigator.serviceWorker.controller) {
                            updateSwc();
                        }
                    }
                    ;
                }
                ;
            }
            ).catch( (error) => {
                fk_log('error', 'sw', 'registration failed', error);
            }
            );
        }
        );
    }
    function sendNewUpdateAlert() {
        var html_string = "<span>A new version of FileKey is available. Please refresh the page to update.</span>";
        htmlWriter(getWarningParams(), html_string, main_inner);
    }
    function updateSwc() {
        swc = navigator.serviceWorker.controller;
    }
}
function initWorkers() {
    ww_h = new blobWorkersHandler();
    ww_h.loadWorkerFromText(ww_js_script, storeAndWaitForWorker);
}
function initDB() {
    db_h = new fk_db_handler(function(ret) {
        var qq = 22;
    }
    );
}
