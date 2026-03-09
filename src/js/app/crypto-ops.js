function getRandomEleId() {
    return ("misc_msg_" + misc_msg_counter++);
}
function loadSecKey() {
    setPrfIfNot(function(ret) {
        var qq = 22;
    });
}
function shareEnc(data, cb) {
    var msg_buff = data;
    var msg_param = {
        msg_type: "shared_ecdh_enc",
        msg_buff
    };
    ww_h.sendMessageToWorker(msg_param, [msg_buff], function(ret) {
        cb(ret);
    });
}
function shareDec(data, cb) {
    var msg_buff = data;
    var pub_buff = msg_buff.slice(0, 133);
    msg_buff = msg_buff.slice(133);
    var msg_param = {
        msg_type: "shared_ecdh_dec",
        msg_buff,
        pub_buff
    };
    ww_h.sendMessageToWorker(msg_param, [msg_buff, pub_buff], function(ret) {
        cb(ret);
    });
}
function storeAndWaitForWorker(valid, external_script) {
    ww_script = external_script;
    waitForWebWorker(valid);
}
function waitForWebWorker(valid=true) {
    if (valid && ww_h.scriptReady()) {
        ww_h.initWorkers(function() {
            setVersionNumber();
        });
    }
}
function initPrf(cb) {
    if (active_prf)
        cb(true);
    else {
        var prf_obj = getPrfObject(null);
        webauthn_h.webAuthnClick(prf_obj, function(prf_buff, cred) {
            if (prf_buff == null) {
                cb(null);
            } else if (prf_buff.byteLength > 0) {
                prfToWebWorkerKey(prf_buff, function() {
                    genDefaultSeed(cb);
                    active_prf = true;
                    var html_string = "<span>Filekey authenticated. Now drag and drop files to encrypt or decrypt them!</span>";
                    htmlWriter({
                        char_speed: 8
                    }, html_string, main_inner);
                    document.getElementById("drop_container").style.display = "flex";
                    scrollToBottom();
                });
            }
        });
    }
}
function initImportOptions() {
    setFileImport();
}
function initDropContainer() {
    document.getElementsByClassName("dc_icon_container")[0].innerHTML = hb.getSvg("plus_icon", {
        class_string: "plus_icon"
    });
    drop_border_obj = new createAnimatedBorder(document.getElementById("drop_container"),ex_params[0]);
    drop_border_obj.toggleAnimation(false);
}

function genDefaultSeed(cb) {
    let allow_gen = true;
    (function generateAnotherOne(e) {
        if (allow_gen) {
            var suffix = "";
            var new_seed_count = 0;
            allow_gen = false;
            var seed_name = (suffix + "_" + new_seed_count++);
            setNewSeed(seed_name, function() {
                cb(true);
            });
        }
    }
    )();
    function displayButtons() {
        new_seed.style.display = "inline-block";
        clear_all.style.display = "inline-block";
        gen_prf_input.style.display = "inline-block";
    }
}
function combineArrayBuffers(buffer1, buffer2) {
    const combinedBuffer = new ArrayBuffer(buffer1.byteLength + buffer2.byteLength);
    const combinedView = new Uint8Array(combinedBuffer);
    combinedView.set(new Uint8Array(buffer1), 0);
    combinedView.set(new Uint8Array(buffer2), buffer1.byteLength);
    return combinedBuffer;
}
function deselectLastActiveAccount() {
    if (last_active_account != null)
        last_active_account.style.opacity = "1";
}
function prfToWebWorkerKey(prf_buff, cb) {
    var msg_param = {
        msg_type: "prf_to_key",
        prf_buff
    };
    ww_h.sendMessageToWorker(msg_param, [prf_buff], cb);
}
function setNewSeed(seed_name, cb) {
    var msg_param = {
        msg_type: "set_seed",
        seed_name
    };
    ww_h.sendMessageToWorker(msg_param, [], cb);
}
function encNewMsg(msg_data, cb) {
    var msg_buff;
    if (file_as_text)
        msg_buff = msg_data;
    else
        msg_buff = stringToArrayBuffer(msg_data);
    var msg_param = {
        msg_type: "new_enc",
        msg_buff
    };
    ww_h.sendMessageToWorker(msg_param, [msg_buff], cb);
}
function stringToArrayBuffer(str) {
    const buffer = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        buffer[i] = str.charCodeAt(i);
    }
    return buffer.buffer;
}
function leaveItAlone(already_as_needed) {
    return already_as_needed;
}
function decMsg(msg_buff, cb) {
    var msg_param = {
        msg_type: "new_dec",
        msg_buff
    };
    ww_h.sendMessageToWorker(msg_param, [msg_buff], cb);
}
function getPrfObject(id=null) {
    var first_data = "filekey_security_key_wallet_first";
    var second_data = "filekey_security_key_wallet_second";
    return {
        id: (checkForProperty(id)) ? id : null,
        first: bh.hexToArrayBuffer(kh.str_keccak256(first_data), Uint8Array).buffer,
        second: bh.hexToArrayBuffer(kh.str_keccak256(second_data), Uint8Array).buffer,
    };
}

function genIdConfirmHash(file_buff) {
    var confirm_hashes = [];
    var buff_len = file_buff.byteLength;
    var init_log_size = 20;
    var max_hash_chunk = 2 ** init_log_size;
    var max_confirm_length = max_hash_chunk / 2;
    if (buff_len < max_hash_chunk)
        return kh.strict_hex_keccak256(bh.bufferToHex(file_buff));
    else
        return genSpecialConfirmHash(file_buff);
    function genSpecialConfirmHash(file_buff) {
        var confirm_points_array = determineConfirmPoints(buff_len);
        for (var i = 0; i < confirm_points_array.length; i++) {
            var hex_buff = new ArrayBuffer(max_confirm_length);
            var start_point = confirm_points_array[i];
            hex_buff = new Uint8Array(file_buff,start_point,max_confirm_length);
            hex_buff = kh.strict_hex_keccak256(bh.bufferToHex(hex_buff));
            appendToConfirm(hex_buff);
        }
        return computeConfirmStr();
    }
    function computeConfirmStr() {
        var full_hex_str = "";
        for (var i = 0; i < confirm_hashes.length; i++) {
            full_hex_str += confirm_hashes[i];
        }
        full_hex_str = kh.strict_hex_keccak256(full_hex_str);
        return full_hex_str;
    }
    function determineConfirmPoints(buff_len) {
        var ret_points = [];
        ret_points.push(0);
        var last_point_end = ret_points[0] + max_confirm_length;
        var num_points = (floorLog2(buff_len) - (init_log_size - 2));
        var spacer = calcSpacer();
        for (var i = 1; i < (num_points - 1); i++) {
            var new_point = last_point_end + spacer;
            ret_points.push(new_point);
            last_point_end = new_point + max_confirm_length;
        }
        ret_points.push(getEndPoint());
        return ret_points;
        function getEndPoint() {
            return buff_len - max_confirm_length;
        }
        function calcSpacer() {
            var spacer = (num_points * max_confirm_length) / buff_len;
            spacer = (1 - spacer) * buff_len;
            spacer = (spacer / (num_points - 1));
            spacer = Math.floor(spacer);
            return spacer;
        }
    }
    function appendToConfirm(hash_chunk) {
        hash_chunk = hash_chunk.slice(2);
        confirm_hashes.push(hash_chunk)
    }
    function floorLog2(x) {
        return Math.floor(Math.log(x) / Math.log(2));
    }
}
function useBiometricsErrorHandler(error_value) {
    var error_obj;
    switch (error_value) {
    case "no_prf":
        error_obj = {
            msg_html: "Invalid passkey, or unsupported device.",
            full_bar_target: true,
            self_remove_ms: 8000,
            custom_bg_color: "#e93232",
            custom_color: "#fff",
            svg_icon: hb.getSvg("warning_w_border", {
                class_string: "std_icon"
            }),
            close_icon: hb.getSvg("x", {
                class_string: "std_close_icon"
            })
        };
        break;
    case "no_stored_pk":
    default:
        error_obj = {
            msg_html: "No account detected.",
            full_bar_target: true,
            self_remove_ms: 8000,
            custom_bg_color: "#500202",
            custom_color: "#fff",
            svg_icon: hb.getSvg("warning_w_border", {
                class_string: "std_icon"
            }),
            close_icon: hb.getSvg("x", {
                class_string: "std_close_icon"
            })
        };
        break;
    }
}
