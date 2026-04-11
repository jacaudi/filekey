function scrollForFirstFile(fc) {
    if (fc === 1)
        scrollToBottom();
}
function getFlatFile(file, cb) {
    var filename = file.name;
    if (checkForProperty(file.size)) {
        readFile(file, retFile);
    } else {
        file.file(new_file => {
            readFile(new_file, retFile);
        }
        );
    }
    function retFile(ret) {
        cb(ret, filename);
    }
}
function readFile(file, inner_cb) {
    const reader = new FileReader();
    reader.onload = function(event) {
        inner_cb(event.target.result);
    }
    ;
    reader.readAsArrayBuffer(file);
}

function setFileImport() {
    const drag_window = document.getElementById('drag_window');
    const file_drag_zone = document.getElementById('file_drag_zone');
    var current_cursor = "";
    let file_array = [];
    let active_border_animation = false;
    setImportButtons();
    initDragContainer();
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    function initDragContainer() {
        document.addEventListener('dragenter', setDragContainer);
        document.addEventListener('drop', droppedFile);
        document.addEventListener('dragover', doNothing);
        drag_window.addEventListener('dragleave', windowDragLeave);
        function setDragContainer(e) {
            preventDefaults(e);
            setCurrentCursor(e, 'none');
            var qq = 22;
            drag_window.style.display = "block";
            file_drag_zone.style.display = "block";
            file_drag_zone.addEventListener("dragenter", enteredFileDragZone);
            file_drag_zone.addEventListener("dragleave", leftFileDragZone);
        }
        function enteredFileDragZone(e) {
            preventDefaults(e);
            setCurrentCursor(e, 'link');
            highlight(e);
        }
        function leftFileDragZone(e) {
            preventDefaults(e);
            unhighlight(e);
        }
        function windowDragLeave(e) {
            if (e.fromElement == null)
                removeDragContainer();
        }
        function removeDragEvents() {
            preventDefaults(e);
            removeDragContainer();
        }
        function doNothing(e) {
            preventDefaults(e);
            setCurrentCursor(e, current_cursor);
            var qq = 22;
        }
        function setCurrentCursor(e, type='copy') {
            current_cursor = type;
            e.dataTransfer.dropEffect = current_cursor;
        }
        function droppedFile(e) {
            preventDefaults(e);
            var qq = 22;
            removeDragContainer();
            unhighlight(e);
            if (e.target === file_drag_zone)
                handleDrop(e);
        }
        function removeDragContainer() {
            var qq = 22;
            drag_window.style.display = "none";
            file_drag_zone.style.display = "none";
        }
        function highlight(e) {
            preventDefaults(e);
            if (active_border_animation === false) {
                fk_log('debug', 'file', 'drag highlight');
                active_border_animation = true;
                drop_border_obj.toggleAnimation(true);
            }
        }
        function unhighlight(e) {
            drop_border_obj.toggleAnimation(false);
            active_border_animation = false;
            fk_log('debug', 'file', 'drag unhighlight');
        }
        function handleDropAnimation(e) {
            preventDefaults(e);
            unhighlight(e);
            handleDrop(e);
        }
    }
    function handleDrop(e) {
        const items = e.dataTransfer.items;
        var items_remaining = items.length;
        for (let i = 0; i < items.length; i++) {
            const item = items[i].webkitGetAsEntry();
            if (item) {
                if (item.isFile) {
                    addFileToList(item);
                    items_remaining--;
                    if (items_remaining <= 0) {
                        setFileArrayList();
                        handleNewFiles();
                        file_array = [];
                    }
                } else if (item.isDirectory) {
                    handleDirectory(item);
                }
            }
        }
    }
    function handleDirectory(dirEntry) {
        const dirReader = dirEntry.createReader();
        dirReader.readEntries( (entries) => {
            for (const entry of entries) {
                if (entry.isFile) {
                    addFileToList(entry);
                } else if (entry.isDirectory) {
                    handleDirectory(entry);
                }
            }
        }
        , (error) => {
            fk_log('error', 'file', 'error reading directory', error);
        }
        );
    }
    function addFileToList(new_file) {
        var qq_add = 22;
        file_array.push(new_file);
    }
    function setFileArrayList() {
        var qq_add = 22;
        current_active_file_array = file_array;
    }
    function setImportButtons() {
        document.getElementById('drop_container').addEventListener('click', function(e) {
            document.getElementById('file_input').click();
        });
        document.getElementById('file_input').addEventListener('change', function(event) {
            const files = event.target.files;
            setFileList(event.target.files);
            handleNewFiles();
        });
        function setFileList(files) {
            current_active_file_array = files;
        }
    }
}
function displayFiles(file_array) {
    for (var i = 0; i < file_array.length; i++)
        std_newUpload(file_array[i].name, ((i === 0) ? true : false));
    scrollToBottom();
}
function scrollToBottom() {
    var main_inner = document.getElementById("main_inner");
    var three_quarters = (document.body.clientHeight * .75);
    if (main_inner.clientHeight >= three_quarters) {
        var sh = document.body.scrollHeight + (document.body.scrollHeight / 10);
        scroll(0, sh);
    }
}
function handleNewFiles() {
    setPrfIfNot(function(ret) {
        if (ret != null) {
            displayFiles(current_active_file_array);
            basedOnFileType(current_active_file_array[0]);
        }
    });
    function basedOnFileType(file_obj) {
        var file_params = getFileParams(file_obj.name);
        switch (file_params.file_type) {
        case "Encrypted File":
            undoStuff();
            break;
        case "Shared File":
            handleSharedFile(file_obj);
            break;
        default:
            doStuff();
        }
    }
}
function sanitizeFilename(file_name) {
    return file_name.replace(/[/\\]/g, '').replace(/\x00/g, '').slice(0, 255);
}
function download_ab(file_name, array_buff) {
    const blob = new Blob([array_buff],{
        type: "application/octet-stream"
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = sanitizeFilename(file_name);
    link.click();
    URL.revokeObjectURL(link.href);
}
function setPrfIfNot(cb) {
    initPrf(function(ret) {
        if (ret)
            cb(ret);
        else {
            var html_string = "<span>Authentication failed. Please try again.</span>";
            htmlWriter(getErrorParams(), html_string, main_inner);
            cb(null);
        }
    });
}
function std_newUpload(filename) {
    var file_params = getFileParams(filename);
    var new_html = hb.html_newFileUpload(file_params);
    var outer_ele = document.createElement("div");
    main_inner.appendChild(outer_ele);
    outer_ele.outerHTML = new_html;
}
function getFileParams(filename) {
    var sliced = filename.slice(-8);
    var file_type, file_icon;
    if (sliced == ".filekey") {
        file_type = "Encrypted File";
        file_icon = hb.getSvg("filekey_logo_icon", {
            class_string: "file_icon"
        });
    } else if (filename.slice(-15) === ".shared_filekey") {
        file_icon = hb.getSvg("file_icon", {
            class_string: "file_icon"
        });
        file_type = "Shared File";
    } else {
        file_icon = hb.getSvg("file_icon", {
            class_string: "file_icon"
        });
        file_type = "File";
    }
    return {
        filename,
        file_type,
        file_icon
    };
}
function std_newDownload(params) {
    var file_params = getFileParams(params.filename);
    params = Object.assign(params, file_params);
    var new_html = hb.html_newDownload(params);
    var outer_ele = document.createElement("div");
    main_inner.appendChild(outer_ele);
    outer_ele.outerHTML = new_html;
}
