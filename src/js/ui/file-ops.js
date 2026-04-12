function createDownloadEle(dl_obj) {
    std_newDownload(dl_obj);
    var file_id = "file_id_" + dl_obj.file_id;
    var ele = document.getElementById(file_id);
    ele.addEventListener("click", triggerDownload);
    displayIfShare(file_id);
    function displayIfShare(file_id) {
        document.getElementById(file_id + "_share").addEventListener("click", triggerShare);
    }
    function triggerShare(e) {
        let new_filename = "";
        let id = e.currentTarget.id;
        (function() {
            if (active_share_prompt === null) {
                if (active_send_pub === null) {
                    active_share_prompt = true;
                    setPubkeyPrompt(function() {
                        initNewShare();
                    });
                } else
                    initNewShare();
            } else {
                if (active_send_pub === null)
                    goToExistingSharePrompt();
                else
                    initNewShare();
            }
        }
        )();
        function goToExistingSharePrompt() {
            var pub_key_textarea = document.getElementById("pub_key_textarea");
            scroll(0, (pub_key_textarea.offsetTop - 20));
        }
        function initNewShare() {
            id = id.replace("file_id_", "");
            id = id.replace("_share", "");
            getFileData(id, function(ret) {
                new_filename = ret.filename;
                if (dl_obj.shared_file) {
                    new_filename += ".shared_filekey";
                    handleShare(dl_obj.data);
                } else {
                    new_filename = new_filename.replace(".filekey", ".shared_filekey");
                    preShareDec(ret.data, handleShare);
                }
            });
        }
        function handleShare(ps_data) {
            getDetEcdhPublicKey(function(pub) {
                if (pub == null) {
                    var html_string = "<span>Share Key is unavailable. Your browser could not generate a deterministic key pair.</span>";
                    htmlWriter({char_speed: 8}, html_string, main_inner);
                    scrollToBottom();
                    return;
                }
                shareEnc(ps_data, function(res) {
                    if (res === null) {
                        var html_string = "<span>Failed to encrypt file for sharing. Please try again.</span>";
                        htmlWriter(getErrorParams(), html_string, main_inner);
                        return;
                    }
                    var combined_buff = combineArrayBuffers(res.salt, res.encrypted_buff);
                    combined_buff = combineArrayBuffers(pub, combined_buff);
                    download_ab(new_filename, combined_buff);
                });
            });
        }
    }
    function setPubkeyPrompt(cb) {
        let confirm_pub_key, text_area, edit_pub_key;
        var html_string = "<span>Enter recipient's share key:</span>";
        htmlWriter({
            char_speed: 4
        }, html_string, main_inner, {}, function(ret) {
            setPubTextArea();
        });
        function setPubTextArea() {
            var new_html = hb.html_newTextarea({
                placeholder: "Enter recipient's share key"
            });
            var outer_ele = document.createElement("div");
            main_inner.appendChild(outer_ele);
            outer_ele.outerHTML = new_html;
            text_area = document.getElementById("pub_key_textarea");
            text_area.setAttribute("rows", 1);
            text_area.style.height = (text_area.scrollHeight) + 'px';
            scrollToBottom();
            confirm_pub_key = document.getElementById("confirm_pub_key");
            edit_pub_key = document.getElementById("edit_pub_key");
            confirm_pub_key.addEventListener("click", confirmPubKey);
            text_area.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = (this.scrollHeight) + 'px';
            });
            function confirmPubKey() {
                if (text_area.value.trim() != "") {
                    confirmAndAttachPub(text_area.value.trim(), function(ret) {
                        if (ret != null) {
                            text_area.setAttribute("readonly", true);
                            text_area.style.backgroundColor = "#f4f4f4";
                            singleCb();
                            confirm_pub_key.style.display = "none";
                            confirm_pub_key.removeEventListener("click", confirmPubKey);
                            edit_pub_key.style.display = "flex";
                            edit_pub_key.addEventListener("click", editPubKey);
                        } else
                            invalidPubKey();
                    });
                }
            }
            function singleCb() {
                if (cb != null)
                    cb();
                cb = null;
            }
            function editPubKey() {
                active_send_pub = null;
                confirm_pub_key.style.display = "flex";
                confirm_pub_key.addEventListener("click", confirmPubKey);
                edit_pub_key.style.display = "none";
                edit_pub_key.removeEventListener("click", editPubKey);
                text_area.removeAttribute("readonly");
                text_area.style.backgroundColor = "#fff";
            }
        }
        function invalidPubKey() {
            var html_string = "<span>Invalid share key.</span>";
            htmlWriter({
                char_speed: 8
            }, html_string, main_inner);
            scrollToBottom();
        }
    }
    function triggerDownload(e) {
        var id = e.currentTarget.id;
        id = id.replace("file_id_", "");
        getFileData(id, function(ret) {
            download_ab(ret.filename, ret.data);
        });
    }
    function getFileData(file_id, cb) {
        db_h.getFileStore("f" + file_id, function(ret) {
            if (ret != null && ret.response != null)
                cb(ret.response);
        });
    }
    function preShareDec(file_contents, cb) {
        decMsg(file_contents, function(ret) {
            if (ret === null) {
                var params = getErrorParams();
                var html_string = "<span>Failed to share file. Please try again.</span>";
                htmlWriter(params, html_string, main_inner);
                cb(null);
            } else
                cb(ret.decrypted_buff);
        });
    }
}
let status_count = 0;
function setStatusMsg(encrypted=true) {
    var ret = std_newStatus(encrypted, status_count++);
    scrollToBottom();
    return ret;
}
function std_newStatus(encrypted_status, status_count) {
    var status_msg = (encrypted_status) ? "Encrypting" : "Decrypting";
    var ele_id = "status_" + status_count;
    var new_html = hb.html_newStatus({
        status_msg,
        ele_id
    });
    var outer_ele = document.createElement("div");
    main_inner.appendChild(outer_ele);
    outer_ele.outerHTML = new_html;
    return {
        ele_id,
        ts: performance.now(),
        status_msg
    };
}

function createWebmLink(id, data) {
    const blob = new Blob([data],{
        type: 'video/webm'
    });
    const url = URL.createObjectURL(blob);
    var file_ele = document.getElementById("file_id_" + id + "_blob");
    file_ele.style.display = "block";
    file_ele.addEventListener("click", function() {
        var newTab = window.open(url, '_blank');
    });
}
function newDownloadObj(filename, data, params={
    encrypted_status: true
}, cb) {
    var file_id = genIdConfirmHash(data);
    var new_dl_obj = {
        filename,
        data,
        ts: Date.now(),
        file_id
    };
    new_dl_obj = Object.assign(new_dl_obj, params);
    db_h.saveNewFile("f" + new_dl_obj.file_id, new_dl_obj, function(ret) {
        createDownloadEle(new_dl_obj);
        cb();
    });
}
function checkIfViewableType(filename) {
    var ext_slice = filename.slice(-4);
    if ((ext_slice === "webm" || ext_slice === ".mp4"))
        return true;
    else
        return false;
}
function handleSharedFile(file_obj) {
    var file_array = current_active_file_array;
    if (file_array.length > 0) {
        let fc = 0;
        let encrypt_status = false;
        let status_obj;
        status_obj = setStatusMsg(encrypt_status);
        status_obj.animator = new set3dotStatusAnimation(status_obj);
        (function nextFile(file) {
            getFlatFile(file, function(file_contents, filename) {
                shareDec(file_contents, function(ret) {
                    if (ret === null) {
                        status_obj.animator.clearStatus();
                        var params = getErrorParams();
                        var html_string = "<span>Failed to unlock file with this key. Please try again.</span>";
                        htmlWriter(params, html_string, main_inner);
                    } else {
                        var new_filename = filename.replace(".shared_filekey", "");
                        newDownloadObj(new_filename, ret.decrypted_buff, {
                            encrypt_status,
                            shared_file: true
                        }, function(ret) {
                            scrollForFirstFile(fc);
                            if (fc < file_array.length)
                                nextFile(file_array[fc++]);
                            else
                                status_obj.animator.triggerStatusFinish(status_obj);
                        });
                    }
                });
            });
        }
        )(file_array[fc++]);
    }
}
const FILE_OPS = {
    enc: {
        work: encNewMsg,
        transform: function(ret) { return combineArrayBuffers(ret.salt, ret.encrypted_buff); },
        filename: function(name) { return name + '.filekey'; },
        errorMsg: 'Failed to encrypt file. Please try again.',
        encrypt_status: true,
    },
    dec: {
        work: decMsg,
        transform: function(ret) { return ret.decrypted_buff; },
        filename: function(name) { return name.replace('.filekey', ''); },
        errorMsg: 'Failed to unlock file with this key. Please try again.',
        encrypt_status: false,
    },
};

function processFileBatch(direction) {
    const config = FILE_OPS[direction];
    const file_array = current_active_file_array;
    if (file_array.length === 0) return;
    let fc = 0;
    let status_obj = setStatusMsg(config.encrypt_status);
    status_obj.animator = new set3dotStatusAnimation(status_obj);
    (function nextFile(file) {
        getFlatFile(file, function(file_contents, filename) {
            config.work(file_contents, function(ret) {
                if (ret === null) {
                    status_obj.animator.clearStatus();
                    var html_string = '<span>' + config.errorMsg + '</span>';
                    htmlWriter(getErrorParams(), html_string, main_inner);
                    return;
                }
                var out_buff = config.transform(ret);
                var out_name = config.filename(filename);
                newDownloadObj(out_name, out_buff, {
                    encrypt_status: config.encrypt_status
                }, function(ret) {
                    scrollForFirstFile(fc);
                    if (fc < file_array.length)
                        nextFile(file_array[fc++]);
                    else
                        status_obj.animator.triggerStatusFinish(status_obj);
                });
            });
        });
    })(file_array[fc++]);
}

function undoStuff() { processFileBatch('dec'); }

function doStuff() { processFileBatch('enc'); }
function getWarningParams() {
    return {
        char_speed: 2,
        dp_class_string: "warning_dp",
        failed_filekey_icon: "warning_filekey_icon"
    };
}
function getErrorParams() {
    return {
        char_speed: 4,
        dp_class_string: "failed_dp",
        failed_filekey_icon: "failed_filekey_icon"
    };
}
function set3dotStatusAnimation(status_obj) {
    let active_animation = true;
    let status_ele = document.getElementById(status_obj.ele_id);
    let start_ts = performance.now();
    (function startAnimation() {
        if (active_animation) {
            status_ele.innerText = status_obj.status_msg + get3dotState();
            requestAnimationFrame(startAnimation);
        }
    }
    )();
    function get3dotState() {
        var pn = performance.now();
        var elapsed_time = pn - start_ts;
        elapsed_time = Math.round(elapsed_time / 1000);
        var state = elapsed_time % 3;
        switch (state) {
        case 0:
            return ".";
        case 1:
            return "..";
        default:
            return "...";
        }
    }
    this.clearStatus = clearStatus;
    function clearStatus() {
        active_animation = false;
        status_obj = null;
        status_ele.parentNode.parentNode.remove();
    }
    this.triggerStatusFinish = triggerStatusFinish;
    function triggerStatusFinish() {
        if (status_obj != null) {
            endStatus();
        }
        function endStatus() {
            active_animation = false;
            status_ele.innerText = status_obj.status_msg + "... Done!";
            status_obj = null;
        }
    }
}
