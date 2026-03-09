function fk_modal_handler() {
    var dialog_ele = document.createElement("dialog");
    dialog_ele.className = "fk_modal";
    dialog_ele.setAttribute("role", "dialog");
    dialog_ele.setAttribute("aria-labelledby", "fk_modal_title");
    var modal_inner = document.createElement("div");
    modal_inner.className = "fk_modal_inner";
    var modal_header = document.createElement("div");
    modal_header.className = "fk_modal_header";
    var modal_title = document.createElement("h2");
    modal_title.className = "fk_modal_title";
    modal_title.id = "fk_modal_title";
    var modal_close = document.createElement("button");
    modal_close.className = "fk_modal_close";
    modal_close.setAttribute("aria-label", "Close");
    modal_close.innerHTML = hb.getSvg("x_icon", {});
    var modal_body = document.createElement("div");
    modal_body.className = "fk_modal_body";
    modal_header.appendChild(modal_title);
    modal_header.appendChild(modal_close);
    modal_inner.appendChild(modal_header);
    modal_inner.appendChild(modal_body);
    dialog_ele.appendChild(modal_inner);
    document.body.appendChild(dialog_ele);
    modal_close.addEventListener("click", close);
    dialog_ele.addEventListener("cancel", function(e) {
        e.preventDefault();
        close();
    });
    dialog_ele.addEventListener("click", function(e) {
        var rect = dialog_ele.getBoundingClientRect();
        if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
            close();
        }
    });
    this.open = function(params) {
        modal_title.textContent = params.title || "";
        modal_body.innerHTML = params.content || "";
        dialog_ele.showModal();
        if (typeof params.onOpen === "function") params.onOpen();
    };
    this.close = close;
    this.updateBody = function(content, cb) {
        modal_body.innerHTML = content || "";
        if (typeof cb === "function") cb();
    };
    this.isOpen = function() {
        return dialog_ele.open;
    };
    function close() {
        dialog_ele.close();
        modal_title.textContent = "";
        modal_body.innerHTML = "";
    }
}
