function htmlWriter(params, html_string, print_to_ele, event_obj, cb) {
    var custom_html_array = [];
    var doc = parseHTMLToObjects(html_string);
    doc = doc.childNodes[0];
    var body = doc.childNodes[1];
    var starting_ele = body.childNodes[0];
    params.msg_id = getRandomEleId();
    var new_html = hb.html_newMessage(params);
    var outer_ele = document.createElement("div");
    print_to_ele.appendChild(outer_ele);
    outer_ele.outerHTML = new_html;
    var ele = document.getElementById(params.msg_id);
    (function printNext(current_ele, print_to, inner_cb=null) {
        let at_least_one_printed = false;
        var next_child = current_ele.firstElementChild;
        let next_sib = current_ele.nextElementSibling;
        let new_ele = appendAndReturnNewEle(current_ele, print_to);
        if (next_child == null) {
            if (checkForProperty(new_ele.id) && checkForProperty(event_obj[new_ele.id]))
                addEventToEle(new_ele, event_obj[new_ele.id]);
            std_fillTextBoxAnimation(params, new_ele, current_ele.innerText, custom_html_array, function() {
                if (next_sib == null)
                    innerCbIfYouCan();
                else
                    printNext(next_sib, print_to, inner_cb);
            });
        } else {
            printNext(next_child, new_ele, function() {
                if (next_sib == null)
                    innerCbIfYouCan();
                else
                    printNext(next_sib, print_to, inner_cb);
            });
        }
        function innerCbIfYouCan(ret=null) {
            if (checkForProperty(inner_cb))
                inner_cb(ret);
        }
    }
    )(starting_ele, ele, cb);
    function addEventToEle(ele, event_obj) {
        var action = (checkForProperty(event_obj.action)) ? event_obj.action : "click";
        ele.addEventListener(action, event_obj.target);
    }
    function appendAndReturnNewEle(current_ele, append_to) {
        var new_ele = document.createElement(current_ele.nodeName);
        if (checkForProperty(current_ele.classList))
            new_ele.classList = current_ele.classList;
        if (checkForProperty(current_ele.id))
            new_ele.id = current_ele.id;
        if (checkForProperty(current_ele.href))
            new_ele.href = current_ele.href;
        if (checkForProperty(current_ele.target))
            new_ele.target = current_ele.target;
        if (checkForProperty(current_ele.title))
            new_ele.title = current_ele.title;
        var placeholder = current_ele.getAttribute('placeholder');
        if (placeholder)
            new_ele.setAttribute('placeholder', placeholder);
        append_to.append(new_ele);
        return new_ele;
    }
    function parseHTMLToObjects(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        return doc;
    }
}
function std_fillTextBoxAnimation(params, main_ele, text, custom_html_array, cb) {
    var pointer = 0;
    var max = text.length;
    var custom_ele = null;
    var trailing_space = "";
    (function nextWrite() {
        if (pointer <= max) {
            writeNewChars(nextChars(params.char_speed));
            requestAnimationFrame(nextWrite);
        } else
            cbIfYouCan(true);
    }
    )();
    function writeNewChars(new_chars) {
        main_ele.innerText += trailing_space + new_chars;
        if (new_chars.charAt(new_chars.length - 1) === " ")
            trailing_space = " ";
        else
            trailing_space = "";
    }
    function cbIfYouCan(ret) {
        if (checkForProperty(cb))
            cb(ret);
    }
    function nextChars(num_of_chars=1) {
        var nc = "";
        for (var i = 0; i < num_of_chars; i++)
            nc += text.charAt(pointer++);
        return nc;
    }
}
function html_builder() {
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    this.html_newFileUpload = html_newFileUpload;
    function html_newFileUpload(params={}) {
        return ` <div class=std_upload_outer><div class="std_uploaded set_right"><div class=icon_container> ${params.file_icon} </div><div class=std_file_container><span class=file_title title="${escapeHtml(params.filename)}">${escapeHtml(params.filename)}</span><span class=file_status>${params.file_type}</span></div></div></div> `;
    }
    this.html_newTextarea = html_newTextarea;
    function html_newTextarea(params={}) {
        var placeholder = (checkForProperty(params.placeholder)) ? params.placeholder : "";
        var check_icon = hb.getSvg("check_icon", {
            class_string: "confirm_icon"
        });
        var edit_icon = hb.getSvg("edit_icon", {
            class_string: "edit_icon"
        });
        return ` <div class="pub_key_textarea_cont set_right"><textarea id=pub_key_textarea placeholder='${placeholder}'></textarea><span id=confirm_pub_key class=no_select>${check_icon} <span>Confirm</span></span><span id=edit_pub_key class=no_select>${edit_icon} <span>Edit</span></span></div> `;
    }
    this.html_newMessage = html_newMessage;
    function html_newMessage(params={}) {
        var dp_class_string = (checkForProperty(params.dp_class_string)) ? params.dp_class_string : "std_dp";
        var filekey_icon_class = (checkForProperty(params.failed_filekey_icon)) ? params.failed_filekey_icon : "filekey_icon";
        var filekey_msg_icon = hb.getSvg("filekey_icon", {
            class_string: filekey_icon_class
        });
        return ` <div class=std_outer><div class=std_msg_inner><span class=${dp_class_string}>${filekey_msg_icon}</span><span class=std_msg id=${params.msg_id}></span></div></div> `;
    }
    this.html_newStatus = html_newStatus;
    function html_newStatus(params={}) {
        params.class_string = (checkForProperty(params.class_string)) ? params.class_string : "filekey_icon";
        var filekey_msg_icon = hb.getSvg("filekey_icon", {
            class_string: params.class_string
        });
        return ` <div class=std_status_outer><div class=std_status_inner><span class=std_dp>${filekey_msg_icon}</span><span class=std_status id=${params.ele_id}>${params.status_msg}</span></div></div> `;
    }
    this.html_newDownload = html_newDownload;
    function html_newDownload(params={}) {
        var file_id = "file_id_" + params.file_id;
        return ` <div class=std_dl_outer><div class=std_download><div class=std_inner_flex><div class="icon_container some_background"> ${params.file_icon} </div><div class=std_file_container><span class=file_title title="${escapeHtml(params.filename)}">${escapeHtml(params.filename)}</span><span class=file_status>${params.file_type}</span><div class=download_icon_container><span class=dl_action id=${file_id + "_share"}>${hb.getSvg("share_icon", {
            class_string: "dl_icon slight_vert_padding"
        })} Share</span> &nbsp; <span class=dl_action id=${file_id}>${hb.getSvg("save_icon", {
            class_string: "save_icon"
        })} Save</span></div></div><div class="action_icon_container special_action" id=${file_id + "_blob"}> ${hb.getSvg("dl_icon", {
            class_string: "dl_icon"
        })} </div></div></div></div> `;
    }
    this.html_newShare = html_newShare;
    function html_newShare(params={}) {}
    this.getSvg = getSvg;
    function getSvg(svg_name, params={}) {
        var id = "";
        var class_string = "";
        var tabindex = "";
        if (checkForProperty(params.id))
            id += " id=" + params.id;
        if (checkForProperty(params.class_string))
            class_string += ' class="' + params.class_string + '"';
        if (checkForProperty(params.tabindex)) {
            tabindex += " tabindex=" + params.tabindex;
            if (checkForProperty(params.prevent_tabbed_enter) == false)
                tabindex += ' data-keyevent=default_key_event';
        }
        switch (svg_name) {
        case "filekey_logo_icon":
            return ` <svg viewBox="0 0 22 27"${class_string}${id}${tabindex}><path d="M21.9873 8.81596C21.9827 8.75523 21.9678 8.69679 21.9506 8.63607C21.9334 8.57648 21.9174 8.51919 21.8899 8.46419C21.8807 8.44471 21.8796 8.42409 21.8693 8.40461C19.9924 5.27768 17.349 2.63298 14.2221 0.757408C14.2037 0.74595 14.182 0.74595 14.1625 0.735638C14.1086 0.708138 14.0525 0.692095 13.9929 0.674909C13.931 0.657721 13.8715 0.64168 13.8084 0.638242C13.7878 0.638242 13.7706 0.62793 13.75 0.62793H5.5C2.46693 0.62793 0 3.09492 0 6.12793V20.7946C0 23.8277 2.46699 26.2946 5.5 26.2946H16.5C19.5331 26.2946 22 23.8276 22 20.7946V8.87793C22 8.85616 21.9896 8.83773 21.9873 8.81596ZM19.3748 7.96116H18.3332C16.312 7.96116 14.6666 6.31573 14.6666 4.29449V3.25292C16.4793 4.55459 18.073 6.14839 19.3748 7.96116ZM16.4999 24.4612H5.49992C3.47867 24.4612 1.83325 22.8157 1.83325 20.7945V6.12783C1.83325 4.10658 3.47867 2.46116 5.49992 2.46116H12.8332V4.29449C12.8332 7.32756 15.3002 9.79449 18.3332 9.79449H20.1666V20.7945C20.1666 22.8157 18.5212 24.4612 16.4999 24.4612ZM14.6666 14.5462V12.5444C14.6666 10.5232 13.0212 8.87777 10.9999 8.87777C8.97867 8.87777 7.33325 10.5232 7.33325 12.5444V14.5462C6.26877 14.9266 5.49992 15.9338 5.49992 17.1278V19.8778C5.49992 21.3937 6.73397 22.6278 8.24992 22.6278H13.7499C15.2659 22.6278 16.4999 21.3937 16.4999 19.8778V17.1278C16.4999 15.9338 15.7311 14.9266 14.6666 14.5462ZM9.16658 12.5444C9.16658 11.5338 9.98929 10.7111 10.9999 10.7111C12.0105 10.7111 12.8332 11.5338 12.8332 12.5444V14.3778H9.16658V12.5444ZM14.6666 19.8778C14.6666 20.3831 14.2552 20.7944 13.7499 20.7944H8.24992C7.74459 20.7944 7.33325 20.3831 7.33325 19.8778V17.1278C7.33325 16.6224 7.74459 16.2111 8.24992 16.2111H13.7499C14.2552 16.2111 14.6666 16.6224 14.6666 17.1278V19.8778Z""/></svg> `;
            break;
        case "filekey_icon":
            return ` <svg viewBox="0 0 13 16"${class_string}${id}${tabindex}><path d="M10.4867 6.88902V4.77531C10.4867 2.64104 8.7493 0.903607 6.61503 0.903607C4.48076 0.903607 2.74332 2.64104 2.74332 4.77531V6.88902C1.61932 7.29072 0.807471 8.35423 0.807471 9.61495V12.5187C0.807471 14.1194 2.11053 15.4225 3.71125 15.4225H9.51881C11.1195 15.4225 12.4226 14.1194 12.4226 12.5187V9.61495C12.4226 8.35423 11.6107 7.29072 10.4867 6.88902ZM4.67918 4.77531C4.67918 3.70818 5.5479 2.83946 6.61503 2.83946C7.68217 2.83946 8.55088 3.70818 8.55088 4.77531V6.71117H4.67918V4.77531ZM10.4867 12.5187C10.4867 13.0523 10.0524 13.4867 9.51881 13.4867H3.71125C3.17767 13.4867 2.74332 13.0523 2.74332 12.5187V9.61495C2.74332 9.08137 3.17767 8.64702 3.71125 8.64702H9.51881C10.0524 8.64702 10.4867 9.08137 10.4867 9.61495V12.5187Z"/></svg> `;
            break;
        case "file_icon":
            return ` <svg viewBox="0 0 25 30"${class_string}${id}${tabindex}><path d="M24.9856 9.30458C24.9804 9.23557 24.9634 9.16916 24.9439 9.10015C24.9244 9.03245 24.9061 8.96734 24.8749 8.90484C24.8645 8.88271 24.8632 8.85927 24.8515 8.83714C22.7187 5.2838 19.7148 2.27847 16.1615 0.147133C16.1406 0.134112 16.1159 0.134113 16.0938 0.122395C16.0326 0.0911446 15.9688 0.0729129 15.901 0.0533829C15.8307 0.0338515 15.763 0.0156254 15.6914 0.0117188C15.668 0.0117188 15.6484 0 15.625 0H6.25C2.80333 0 0 2.8034 0 6.25V22.9167C0 26.3633 2.8034 29.1667 6.25 29.1667H18.75C22.1967 29.1667 25 26.3633 25 22.9167V9.375C25 9.35026 24.9882 9.32932 24.9856 9.30458ZM22.0168 8.33321H20.8332C18.5364 8.33321 16.6666 6.46342 16.6666 4.16655V2.98295C18.7265 4.46212 20.5375 6.27325 22.0168 8.33321ZM18.7499 27.0832H6.2499C3.95304 27.0832 2.08324 25.2134 2.08324 22.9165V6.24988C2.08324 3.95301 3.95304 2.08321 6.2499 2.08321H14.5832V4.16655C14.5832 7.61322 17.3866 10.4165 20.8332 10.4165H22.9166V22.9165C22.9166 25.2134 21.0468 27.0832 18.7499 27.0832Z"/><path d="M17.5457 16.1931C17.4066 16.0458 17.2306 15.9722 17.0178 15.9722H7.69971C7.47873 15.9722 7.29457 16.0458 7.14725 16.1931C6.99993 16.3323 6.92627 16.5083 6.92627 16.7211C6.92627 16.9339 6.99993 17.1139 7.14725 17.2612C7.29457 17.4086 7.47873 17.4822 7.69971 17.4822H17.0178C17.2306 17.4822 17.4066 17.4086 17.5457 17.2612C17.693 17.1139 17.7667 16.9339 17.7667 16.7211C17.7667 16.5083 17.693 16.3323 17.5457 16.1931Z"/><path d="M17.5457 20.4777C17.4066 20.3304 17.2306 20.2568 17.0178 20.2568H7.69971C7.47873 20.2568 7.29457 20.3304 7.14725 20.4777C6.99993 20.6251 6.92627 20.8092 6.92627 21.0302C6.92627 21.2348 6.99993 21.4108 7.14725 21.5581C7.29457 21.6972 7.47873 21.7668 7.69971 21.7668H17.0178C17.2306 21.7668 17.4066 21.6972 17.5457 21.5581C17.693 21.4108 17.7667 21.2348 17.7667 21.0302C17.7667 20.8092 17.693 20.6251 17.5457 20.4777Z"/></svg> `;
            break;
        case "plus_icon":
            return ` <svg viewBox="0 0 34 33"${class_string}${id}${tabindex}><path d="M17 32.7086C14.7774 32.7086 12.6917 32.2873 10.7429 31.4446C8.79413 30.6124 7.08238 29.4589 5.60764 27.9842C4.1329 26.5095 2.97417 24.7977 2.13146 22.8489C1.29929 20.9002 0.883203 18.8145 0.883203 16.5918C0.883203 14.3692 1.29929 12.2835 2.13146 10.3347C2.97417 8.38596 4.1329 6.67421 5.60764 5.19947C7.08238 3.7142 8.79413 2.55547 10.7429 1.7233C12.6917 0.891126 14.7774 0.475039 17 0.475039C19.2226 0.475039 21.3083 0.891126 23.2571 1.7233C25.2059 2.55547 26.9176 3.7142 28.3924 5.19947C29.8671 6.67421 31.0206 8.38596 31.8527 10.3347C32.6954 12.2835 33.1168 14.3692 33.1168 16.5918C33.1168 18.8145 32.6954 20.9002 31.8527 22.8489C31.0206 24.7977 29.8671 26.5095 28.3924 27.9842C26.9176 29.4589 25.2059 30.6124 23.2571 31.4446C21.3083 32.2873 19.2226 32.7086 17 32.7086ZM17 30.0225C18.854 30.0225 20.592 29.6749 22.2143 28.9796C23.8365 28.2844 25.2638 27.3206 26.4963 26.0881C27.7287 24.8556 28.6926 23.4283 29.3878 21.8061C30.083 20.1839 30.4307 18.4458 30.4307 16.5918C30.4307 14.7379 30.083 12.9998 29.3878 11.3776C28.6926 9.74483 27.7287 8.31749 26.4963 7.09557C25.2638 5.86311 23.8365 4.89926 22.2143 4.20402C20.592 3.50879 18.854 3.16117 17 3.16117C15.146 3.16117 13.408 3.50879 11.7857 4.20402C10.1635 4.89926 8.73619 5.86311 7.50373 7.09557C6.27127 8.31749 5.30742 9.74483 4.61219 11.3776C3.91695 12.9998 3.56934 14.7379 3.56934 16.5918C3.56934 18.4458 3.91695 20.1839 4.61219 21.8061C5.30742 23.4283 6.27127 24.8556 7.50373 26.0881C8.73619 27.3206 10.1635 28.2844 11.7857 28.9796C13.408 29.6749 15.146 30.0225 17 30.0225ZM9.66844 16.5918C9.66844 16.1915 9.78958 15.8703 10.0319 15.628C10.2847 15.3752 10.6165 15.2488 11.0273 15.2488H15.6727V10.6033C15.6727 10.2031 15.7939 9.8765 16.0362 9.62369C16.2784 9.37088 16.5892 9.24447 16.9684 9.24447C17.3687 9.24447 17.69 9.37088 17.9322 9.62369C18.1851 9.86597 18.3115 10.1925 18.3115 10.6033V15.2488H22.9727C23.373 15.2488 23.6943 15.3752 23.9365 15.628C24.1894 15.8703 24.3158 16.1915 24.3158 16.5918C24.3158 16.9711 24.1894 17.2818 23.9365 17.5241C23.6943 17.7664 23.373 17.8875 22.9727 17.8875H18.3115V22.5487C18.3115 22.949 18.1851 23.2756 17.9322 23.5284C17.69 23.7707 17.3687 23.8918 16.9684 23.8918C16.5892 23.8918 16.2784 23.7707 16.0362 23.5284C15.7939 23.2756 15.6727 22.949 15.6727 22.5487V17.8875H11.0273C10.627 17.8875 10.3005 17.7664 10.0477 17.5241C9.79484 17.2818 9.66844 16.9711 9.66844 16.5918Z"/></svg> `;
            break;
        case "dl_icon":
            return ` <svg viewBox="0 0 21 24"${class_string}${id}${tabindex}><path d="M10.6483 0.210997C10.9654 0.210997 11.2285 0.319102 11.4375 0.535313C11.6537 0.751524 11.7618 1.00737 11.7618 1.30286V12.0377L11.6753 13.6377L12.2159 12.9134L13.6537 11.3783C13.8483 11.1621 14.0933 11.054 14.3888 11.054C14.6482 11.054 14.8753 11.1405 15.0699 11.3134C15.2644 11.4864 15.3617 11.7098 15.3617 11.9837C15.3617 12.2431 15.2608 12.4738 15.059 12.6756L11.5132 16.0917C11.369 16.2358 11.2249 16.3367 11.0808 16.3944C10.9438 16.4448 10.7997 16.4701 10.6483 16.4701C10.5042 16.4701 10.3637 16.4448 10.2267 16.3944C10.0898 16.3367 9.94565 16.2358 9.79431 16.0917L6.24845 12.6756C6.04665 12.4738 5.94575 12.2431 5.94575 11.9837C5.94575 11.7098 6.03944 11.4864 6.22683 11.3134C6.42142 11.1405 6.64844 11.054 6.90789 11.054C7.20338 11.054 7.45202 11.1621 7.65382 11.3783L9.10243 12.9134L9.64296 13.6377L9.54566 12.0377V1.30286C9.54566 1.00737 9.65377 0.751524 9.86998 0.535313C10.0862 0.319102 10.3456 0.210997 10.6483 0.210997ZM4.42146 23.8104C3.2251 23.8104 2.31341 23.5005 1.6864 22.8807C1.06659 22.2609 0.756689 21.36 0.756689 20.1781V9.6486C0.756689 8.45944 1.06659 7.55856 1.6864 6.94597C2.31341 6.32616 3.2251 6.01626 4.42146 6.01626H7.50247V8.4162H4.61605C4.14039 8.4162 3.77644 8.53872 3.52419 8.78376C3.27915 9.02159 3.15663 9.38915 3.15663 9.88644V19.9294C3.15663 20.4267 3.27915 20.7943 3.52419 21.0321C3.77644 21.2771 4.14039 21.3997 4.61605 21.3997H16.6914C17.1599 21.3997 17.5202 21.2771 17.7725 21.0321C18.0247 20.7943 18.1509 20.4267 18.1509 19.9294V9.88644C18.1509 9.38915 18.0247 9.02159 17.7725 8.78376C17.5202 8.53872 17.1599 8.4162 16.6914 8.4162H13.805V6.01626H16.8968C18.0932 6.01626 19.0013 6.32616 19.6211 6.94597C20.2481 7.55856 20.5616 8.45944 20.5616 9.6486V20.1781C20.5616 21.36 20.2481 22.2609 19.6211 22.8807C19.0013 23.5005 18.0932 23.8104 16.8968 23.8104H4.42146Z"/><path d="M10.6483 0.210997C10.9654 0.210997 11.2285 0.319102 11.4375 0.535313C11.6537 0.751524 11.7618 1.00737 11.7618 1.30286V12.0377L11.6753 13.6377L12.2159 12.9134L13.6537 11.3783C13.8483 11.1621 14.0933 11.054 14.3888 11.054C14.6482 11.054 14.8753 11.1405 15.0699 11.3134C15.2644 11.4864 15.3617 11.7098 15.3617 11.9837C15.3617 12.2431 15.2608 12.4738 15.059 12.6756L11.5132 16.0917C11.369 16.2358 11.2249 16.3367 11.0808 16.3944C10.9438 16.4448 10.7997 16.4701 10.6483 16.4701C10.5042 16.4701 10.3637 16.4448 10.2267 16.3944C10.0898 16.3367 9.94565 16.2358 9.79431 16.0917L6.24845 12.6756C6.04665 12.4738 5.94575 12.2431 5.94575 11.9837C5.94575 11.7098 6.03944 11.4864 6.22683 11.3134C6.42142 11.1405 6.64844 11.054 6.90789 11.054C7.20338 11.054 7.45202 11.1621 7.65382 11.3783L9.10243 12.9134L9.64296 13.6377L9.54566 12.0377V1.30286C9.54566 1.00737 9.65377 0.751524 9.86998 0.535313C10.0862 0.319102 10.3456 0.210997 10.6483 0.210997ZM4.42146 23.8104C3.2251 23.8104 2.31341 23.5005 1.6864 22.8807C1.06659 22.2609 0.756689 21.36 0.756689 20.1781V9.6486C0.756689 8.45944 1.06659 7.55856 1.6864 6.94597C2.31341 6.32616 3.2251 6.01626 4.42146 6.01626H7.50247V8.4162H4.61605C4.14039 8.4162 3.77644 8.53872 3.52419 8.78376C3.27915 9.02159 3.15663 9.38915 3.15663 9.88644V19.9294C3.15663 20.4267 3.27915 20.7943 3.52419 21.0321C3.77644 21.2771 4.14039 21.3997 4.61605 21.3997H16.6914C17.1599 21.3997 17.5202 21.2771 17.7725 21.0321C18.0247 20.7943 18.1509 20.4267 18.1509 19.9294V9.88644C18.1509 9.38915 18.0247 9.02159 17.7725 8.78376C17.5202 8.53872 17.1599 8.4162 16.6914 8.4162H13.805V6.01626H16.8968C18.0932 6.01626 19.0013 6.32616 19.6211 6.94597C20.2481 7.55856 20.5616 8.45944 20.5616 9.6486V20.1781C20.5616 21.36 20.2481 22.2609 19.6211 22.8807C19.0013 23.5005 18.0932 23.8104 16.8968 23.8104H4.42146Z"/></svg> `;
            break;
        case "chiz_icon":
            return ` <svg viewBox="0 0 38 37" ${class_string}${id}${tabindex}><rect x="10" y="10.4614" width="18" height="2" rx="1"/><rect x="15.1428" y="17.4614" width="12.8571" height="2" rx="1"/><rect x="19" y="24.4614" width="9" height="2" rx="1"/></svg> `;
            break;
        case "x_icon":
            return ` <svg viewBox="0 0 14 14"${class_string}${id}${tabindex}><path opacity="0.4" d="M1.28125 12.9067C1.15104 12.7765 1.0651 12.6255 1.02344 12.4536C0.981771 12.2817 0.981771 12.1099 1.02344 11.938C1.0651 11.7661 1.14844 11.6177 1.27344 11.4927L5.92969 6.82861L1.27344 2.17236C1.14844 2.05257 1.0651 1.90674 1.02344 1.73486C0.986979 1.55778 0.986979 1.3833 1.02344 1.21143C1.0651 1.03955 1.15104 0.888509 1.28125 0.758301C1.40625 0.628092 1.55469 0.542155 1.72656 0.500488C1.90365 0.458822 2.07812 0.458822 2.25 0.500488C2.42708 0.542155 2.57812 0.625488 2.70312 0.750488L7.35938 5.40674L12.0156 0.750488C12.1406 0.625488 12.2891 0.542155 12.4609 0.500488C12.6328 0.458822 12.8047 0.458822 12.9766 0.500488C13.1484 0.542155 13.2995 0.630697 13.4297 0.766113C13.5599 0.891113 13.6458 1.03955 13.6875 1.21143C13.7344 1.3833 13.7344 1.55518 13.6875 1.72705C13.6458 1.89893 13.5625 2.04736 13.4375 2.17236L8.78906 6.82861L13.4375 11.4927C13.5625 11.6177 13.6458 11.7661 13.6875 11.938C13.7292 12.1099 13.7292 12.2817 13.6875 12.4536C13.6458 12.6255 13.5599 12.7765 13.4297 12.9067C13.2995 13.0369 13.1484 13.1229 12.9766 13.1646C12.8047 13.2062 12.6328 13.2062 12.4609 13.1646C12.2891 13.1229 12.1406 13.0396 12.0156 12.9146L7.35938 8.2583L2.70312 12.9146C2.57812 13.0396 2.42969 13.1229 2.25781 13.1646C2.08594 13.2062 1.91146 13.2062 1.73438 13.1646C1.5625 13.1229 1.41146 13.0369 1.28125 12.9067Z"/></svg> `;
            break;
        case "share_icon":
            return ` <svg viewBox="0 0 15 19"${class_string}${id}${tabindex}><path d="M2.64062 18.3877C1.77604 18.3877 1.11719 18.1637 0.664062 17.7158C0.216146 17.2679-0.0078125 16.6169-0.0078125 15.7627V8.15332C-0.0078125 7.29395 0.216146 6.6429 0.664062 6.2002C1.11719 5.75228 1.77604 5.52832 2.64062 5.52832H4.86719V7.2627H2.78125C2.4375 7.2627 2.17448 7.35124 1.99219 7.52832C1.8151 7.7002 1.72656 7.96582 1.72656 8.3252V15.583C1.72656 15.9424 1.8151 16.208 1.99219 16.3799C2.17448 16.557 2.4375 16.6455 2.78125 16.6455H11.5078C11.8464 16.6455 12.1068 16.557 12.2891 16.3799C12.4714 16.208 12.5625 15.9424 12.5625 15.583V8.3252C12.5625 7.96582 12.4714 7.7002 12.2891 7.52832C12.1068 7.35124 11.8464 7.2627 11.5078 7.2627H9.42188V5.52832H11.6562C12.5208 5.52832 13.1771 5.75228 13.625 6.2002C14.0781 6.6429 14.3047 7.29395 14.3047 8.15332V15.7627C14.3047 16.6169 14.0781 17.2679 13.625 17.7158C13.1771 18.1637 12.5208 18.3877 11.6562 18.3877H2.64062ZM7.14062 11.958C6.92188 11.958 6.73438 11.8799 6.57812 11.7236C6.42188 11.5674 6.34375 11.3851 6.34375 11.1768V3.40332L6.41406 2.25488L6.02344 2.77832L4.97656 3.89551C4.83073 4.04655 4.65104 4.12207 4.4375 4.12207C4.25 4.12207 4.08594 4.05957 3.94531 3.93457C3.8099 3.80957 3.74219 3.64811 3.74219 3.4502C3.74219 3.2627 3.8151 3.09342 3.96094 2.94238L6.52344 0.481445C6.63281 0.377279 6.73698 0.306966 6.83594 0.270508C6.9349 0.228841 7.03646 0.208008 7.14062 0.208008C7.25 0.208008 7.35417 0.228841 7.45312 0.270508C7.55729 0.306966 7.66146 0.377279 7.76562 0.481445L10.3281 2.94238C10.474 3.09342 10.5469 3.2627 10.5469 3.4502C10.5469 3.64811 10.4766 3.80957 10.3359 3.93457C10.1953 4.05957 10.0312 4.12207 9.84375 4.12207C9.63021 4.12207 9.45312 4.04655 9.3125 3.89551L8.27344 2.77832L7.88281 2.25488L7.94531 3.40332V11.1768C7.94531 11.3851 7.86719 11.5674 7.71094 11.7236C7.5599 11.8799 7.36979 11.958 7.14062 11.958Z"/></svg> `;
            break;
        case "copy_icon":
            return ` <svg viewBox="0 0 17 21"${class_string}${id}${tabindex}><path d="M3.85938 5.22363V3.31738C3.85938 2.47363 4.07292 1.83561 4.5 1.40332C4.92708 0.96582 5.5599 0.74707 6.39844 0.74707H9.33594C9.78906 0.74707 10.1927 0.812174 10.5469 0.942383C10.9062 1.06738 11.2318 1.28092 11.5234 1.58301L15.4141 5.54395C15.7214 5.86165 15.9375 6.2002 16.0625 6.55957C16.1875 6.91374 16.25 7.34863 16.25 7.86426V14.0518C16.25 14.8955 16.0339 15.5335 15.6016 15.9658C15.1745 16.3981 14.5443 16.6143 13.7109 16.6143H12.1094V15.083H13.5703C13.9505 15.083 14.2344 14.9867 14.4219 14.7939C14.6146 14.596 14.7109 14.3174 14.7109 13.958V7.48926H11.2734C10.7891 7.48926 10.4219 7.36686 10.1719 7.12207C9.92188 6.87207 9.79688 6.50488 9.79688 6.02051V2.28613H6.52344C6.14844 2.28613 5.86458 2.38249 5.67188 2.5752C5.48438 2.7679 5.39062 3.04655 5.39062 3.41113V5.22363H3.85938ZM11.0781 5.8252C11.0781 5.96061 11.1068 6.05957 11.1641 6.12207C11.2266 6.17936 11.3229 6.20801 11.4531 6.20801H14.3125L11.0781 2.92676V5.8252ZM-0.0078125 18.0596V7.3252C-0.0078125 6.48145 0.205729 5.84342 0.632812 5.41113C1.0599 4.97363 1.69271 4.75488 2.53125 4.75488H5.25C5.72396 4.75488 6.11458 4.80697 6.42188 4.91113C6.73438 5.01009 7.04688 5.22103 7.35938 5.54395L11.5938 9.84082C11.8125 10.0648 11.9792 10.2783 12.0938 10.4814C12.2083 10.6846 12.2839 10.9111 12.3203 11.1611C12.362 11.4059 12.3828 11.7028 12.3828 12.0518V18.0596C12.3828 18.9033 12.1693 19.5413 11.7422 19.9736C11.3151 20.4059 10.6823 20.6221 9.84375 20.6221H2.53125C1.69271 20.6221 1.0599 20.4059 0.632812 19.9736C0.205729 19.5465-0.0078125 18.9085-0.0078125 18.0596ZM1.53125 17.9658C1.53125 18.3304 1.625 18.609 1.8125 18.8018C2 18.9945 2.28125 19.0908 2.65625 19.0908H9.71094C10.0859 19.0908 10.3672 18.9945 10.5547 18.8018C10.7474 18.609 10.8438 18.3304 10.8438 17.9658V12.2314H6.71875C6.16667 12.2314 5.7526 12.096 5.47656 11.8252C5.20052 11.5492 5.0625 11.1299 5.0625 10.5674V6.29395H2.66406C2.28385 6.29395 2 6.3903 1.8125 6.58301C1.625 6.77572 1.53125 7.05176 1.53125 7.41113V17.9658ZM6.875 10.8799H10.6328L6.41406 6.59082V10.4189C6.41406 10.5804 6.45052 10.6976 6.52344 10.7705C6.59635 10.8434 6.71354 10.8799 6.875 10.8799Z"/></svg> `;
            break;
        case "save_icon":
            return ` <svg viewBox="0 0 12 15"${class_string}${id}${tabindex}><path d="M5.98438 0.692383C6.23438 0.692383 6.4375 0.773112 6.59375 0.93457C6.75521 1.09603 6.83594 1.30436 6.83594 1.55957V8.8252L6.76562 10.4658L8.84375 8.17676L10.4531 6.59863C10.526 6.52051 10.6146 6.45801 10.7188 6.41113C10.8281 6.36426 10.9427 6.34082 11.0625 6.34082C11.3021 6.34082 11.5 6.42155 11.6562 6.58301C11.8125 6.74447 11.8906 6.94759 11.8906 7.19238C11.8906 7.30176 11.8672 7.40853 11.8203 7.5127C11.7734 7.61686 11.7031 7.71582 11.6094 7.80957L6.61719 12.7471C6.53385 12.8356 6.4375 12.9059 6.32812 12.958C6.21875 13.0101 6.10417 13.0361 5.98438 13.0361C5.85938 13.0361 5.74219 13.0101 5.63281 12.958C5.52344 12.9059 5.42708 12.8356 5.34375 12.7471L0.351562 7.80957C0.263021 7.71582 0.195312 7.61686 0.148438 7.5127C0.101562 7.40853 0.078125 7.30176 0.078125 7.19238C0.078125 6.94759 0.15625 6.74447 0.3125 6.58301C0.46875 6.42155 0.666667 6.34082 0.90625 6.34082C1.02604 6.34082 1.13802 6.36426 1.24219 6.41113C1.34635 6.45801 1.4375 6.52051 1.51562 6.59863L3.11719 8.17676L5.20312 10.4736L5.125 8.8252V1.55957C5.125 1.30436 5.20312 1.09603 5.35938 0.93457C5.52083 0.773112 5.72917 0.692383 5.98438 0.692383ZM0.8125 13.0127H11.1328C11.3776 13.0127 11.5781 13.0934 11.7344 13.2549C11.8906 13.4163 11.9688 13.6169 11.9688 13.8564C11.9688 14.096 11.8906 14.2965 11.7344 14.458C11.5781 14.6195 11.3776 14.7002 11.1328 14.7002H0.8125C0.578125 14.7002 0.382812 14.6195 0.226562 14.458C0.0703125 14.2965-0.0078125 14.096-0.0078125 13.8564C-0.0078125 13.6169 0.0703125 13.4163 0.226562 13.2549C0.382812 13.0934 0.578125 13.0127 0.8125 13.0127Z"/></svg> `;
            break;
        case "check_icon":
            return ` <svg viewBox="0 0 14 14"${class_string}${id}${tabindex}><path d="M5.28125 13.6611C4.90625 13.6611 4.58594 13.4945 4.32031 13.1611L0.273438 8.09863C0.174479 7.97884 0.101562 7.86165 0.0546875 7.74707C0.0130208 7.63249-0.0078125 7.5153-0.0078125 7.39551C-0.0078125 7.12467 0.0807292 6.90072 0.257812 6.72363C0.440104 6.54655 0.669271 6.45801 0.945312 6.45801C1.26302 6.45801 1.53125 6.60124 1.75 6.8877L5.25 11.3799L12.0312 0.606445C12.151 0.424154 12.2734 0.296549 12.3984 0.223633C12.5234 0.145508 12.6849 0.106445 12.8828 0.106445C13.1536 0.106445 13.375 0.192383 13.5469 0.364258C13.7188 0.530924 13.8047 0.749674 13.8047 1.02051C13.8047 1.12988 13.7865 1.24186 13.75 1.35645C13.7135 1.46582 13.6562 1.58301 13.5781 1.70801L6.23438 13.1533C6.00521 13.4919 5.6875 13.6611 5.28125 13.6611Z"/></svg> `;
            break;
        case "edit_icon":
            return ` <svg viewBox="0 0 23.6475 23.3041"${class_string}${id}${tabindex}><rect height="23.3041" opacity="0" width="23.6475" x="0" y="0"/><path d="M15.5591 4.88935L6.08643 4.88935C5.10986 4.88935 4.56299 5.41669 4.56299 6.43232L4.56299 17.5163C4.56299 18.5319 5.10986 19.0495 6.08643 19.0495L17.2095 19.0495C18.186 19.0495 18.7231 18.5319 18.7231 17.5163L18.7231 8.12957L20.2954 6.55445L20.2954 17.5944C20.2954 19.6159 19.27 20.6218 17.229 20.6218L6.05713 20.6218C4.02588 20.6218 2.99072 19.6159 2.99072 17.5944L2.99072 6.34443C2.99072 4.33271 4.02588 3.31708 6.05713 3.31708L17.1313 3.31708Z"/><path d="M9.61182 14.2936L11.5161 13.4636L20.6372 4.35224L19.2993 3.03388L10.188 12.1452L9.30908 13.9811C9.23096 14.1472 9.42627 14.3718 9.61182 14.2936ZM21.3599 3.63935L22.063 2.91669C22.395 2.56513 22.395 2.09638 22.063 1.77412L21.8384 1.53974C21.5356 1.23701 21.0571 1.27607 20.7349 1.58857L20.022 2.29169Z"/></svg> `;
            break;
        case "moon_icon":
            return ` <svg viewBox="0 0 24 24" fill="currentColor"${class_string}${id}${tabindex}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> `;
            break;
        case "sun_icon":
            return ` <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"${class_string}${id}${tabindex}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> `;
            break;
        }
    }
}

var animated_list = [];
var ex_params = [{
    stroke: {
        color: "#1377f980",
        width: "4px",
        dash_len: 3,
        gap_len: 6,
        dash_inc: 1
    },
    frame_delay: 1,
    initial_offset: 0,
    defs: null,
    default_border: {
        style: "dashed",
        width: "2px",
        color: "#1377f980"
    },
}, ];
function toggleAnimations() {
    for (var i = 0; i < animated_list.length; i++) {
        animated_list[i].toggleAnimation();
    }
}
function destroyAnimations() {
    for (var i = 0; i < animated_list.length; i++) {
        animated_list[i].destroy();
    }
}
function createAnimatedBorder(element, params=null) {
    let svg, main_border, resize_observer, animation_handler, default_border;
    (function init() {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        var offset_width = params.stroke.width;
        var border_offset = ((parseInt((params.stroke.width).slice(0, -2)) / 2) * -1);
        svg.style.width = "calc(100% + " + offset_width + ")";
        svg.style.height = "calc(100% + " + offset_width + ")";
        svg.style.position = "absolute";
        svg.style.left = border_offset + "px";
        svg.style.top = border_offset + "px";
        svg.style.pointerEvents = 'none';
        if (checkForProperty(params.defs)) {
            var defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            defs.innerHTML = params.defs;
            svg.appendChild(defs);
        }
        element.prepend(svg);
        main_border = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        main_border.style.width = "100%";
        main_border.style.height = "100%";
        main_border.style.fill = "none";
        main_border.setAttribute("rx", "10");
        main_border.setAttribute("ry", "10");
        main_border.setAttribute("stroke-linecap", "round");
        initBorder(params.default_border);
        alterBorder(params);
        svg.appendChild(main_border);
        animation_handler = new border_animation_handler(svg,params);
        resize_observer = new ResizeObserver(resizeRect);
        resize_observer.observe(svg);
    }
    )();
    function initBorder(init_border) {
        default_border = init_border;
        setBorderProps(element, init_border);
    }
    function setBorderProps(element, border_changes, svg_display=null) {
        if (svg_display == null)
            requestAnimationFrame(setBorder);
        else if (svg_display == "none")
            requestAnimationFrame(setBorderThenDisplay);
        else
            requestAnimationFrame(setDisplayThenBorder);
        function setDisplayThenBorder() {
            setSvgDisplay();
            setTimeout(setBorder, 1);
        }
        function setBorderThenDisplay() {
            setBorder();
            setTimeout(setSvgDisplay, 1);
        }
        function timeoutThenFrame(callAfter) {
            setTimeout(frameAfterTimeout, 1);
            function frameAfterTimeout() {
                requestAnimationFrame(callAfter);
            }
        }
        function setBorder() {
            if (checkForProperty(border_changes.width))
                element.style.borderWidth = border_changes.width;
            if (checkForProperty(border_changes.style))
                element.style.borderStyle = border_changes.style;
            if (checkForProperty(border_changes.color))
                element.style.borderColor = border_changes.color;
        }
        function setSvgDisplay() {
            if (svg_display != null)
                svg.style.display = svg_display;
        }
    }
    this.destroy = destroy;
    function destroy() {
        resize_observer.disconnect();
        animation_handler.toggleAnimation(false);
        svg.remove();
    }
    this.toggleAnimation = toggleAnimation;
    function toggleAnimation(set_to=null) {
        animation_handler.toggleAnimation(set_to);
        if (set_to) {
            setBorderProps(element, {
                color: "#ffffff00"
            }, "block");
        } else {
            setBorderProps(element, {
                color: default_border.color
            }, "none");
        }
    }
    this.alterBorder = alterBorder;
    function alterBorder(params) {
        main_border.style.stroke = ((checkForProperty(params.stroke.color) ? params.stroke.color : default_settings.stroke.color));
        main_border.style.strokeWidth = ((checkForProperty(params.stroke.width) ? params.stroke.width : default_settings.stroke.width));
        main_border.style.strokeDasharray = (checkForProperty(params.stroke.dash_len)) ? params.stroke.dash_len + " " + params.stroke.gap_len : default_settings.stroke.dash_len + " " + default_settings.stroke.gap_len;
    }
    function resizeRect() {
        main_border.style.width = "0";
        main_border.style.height = "0";
        window.setTimeout(function() {
            main_border.style.width = "100%";
            main_border.style.height = "100%";
        }, 1);
    }
}
function border_animation_handler(svg, animation) {
    var animate, frame_counter, animate_array, current_offset;
    (function() {
        animate = true;
        animate_array = getPaths(svg);
        current_offset = 0;
        frame_counter = 1;
        if (animation.frame_delay > 0)
            requestAnimationFrame(function() {
                currentAnimation(animation, 0)
            });
    }
    )();
    function getPaths(svg) {
        var ret_paths = [];
        for (var i = 0; i < svg.children.length; i++) {
            if (svg.children[i].nodeName == "rect" || svg.children[i].nodeName === "path")
                ret_paths.push(svg.children[i]);
        }
        return ret_paths;
    }
    this.toggleAnimation = toggleAnimation;
    function toggleAnimation(set_to) {
        animate = (set_to != null) ? set_to : !animate;
        if (animate)
            currentAnimation();
    }
    function currentAnimation() {
        (function newFrame() {
            if (animate || animation.frame_delay == 0) {
                if (frame_counter % animation.frame_delay == 0) {
                    current_offset += animation.stroke.dash_inc;
                    for (var i = 0; i < animate_array.length; i++) {
                        animate_array[i].style.strokeDashoffset = current_offset;
                        if (checkForProperty(animation.color_animation)) {
                            animation.color_animation.pointer = (animation.color_animation.pointer + 1 < animation.color_animation.color_array.length) ? animation.color_animation.pointer + 1 : 0;
                            animate_array[i].style.stroke = animation.color_animation.color_array[animation.color_animation.pointer];
                        }
                    }
                    if (current_offset >= 40000000)
                        current_offset = 0;
                }
                frame_counter++;
                requestAnimationFrame(newFrame);
            }
        }
        )();
    }
}

function copy_to_clipboard(text_to_copy, cb=null) {
    navigator.clipboard.writeText(text_to_copy).then( () => {
        if (cb != null)
            cb(true);
    }
    ).catch(err => {
        if (cb != null)
            cb(false, err);
    }
    );
}
function clear_clipboard(cb=null, params={}) {
    let prefix = (params.prefix != null) ? params.prefix : "";
    let suffix = (params.suffix != null) ? params.suffix : "";
    let default_item_clear = (params.item_clear != null) ? params.item_clear : 40;
    (function next(pointer) {
        if (pointer < default_item_clear) {
            navigator.clipboard.writeText(prefix + pointer + suffix).then(function() {
                ++pointer;
                window.setTimeout(function() {
                    next(pointer)
                }, 250);
            });
        } else if (cb != null) {
            cb(true);
            cb = null;
        }
    }
    )(0);
}

function font_handler() {
    var loaded_obj = {};
    var styles = window.document.styleSheets[0];
    this.fontLoader = fontLoader;
    function fontLoader(font_path_list, params={}) {
        params.font_display = checkForProperty(params.font_display) ? params.font_display : "optional";
        if (font_path_list != "" && font_path_list != undefined) {
            font_path_list = (Array.isArray(font_path_list)) ? font_path_list : [font_path_list];
            for (var i = 0; i < font_path_list.length; i++) {
                var font_info = getFontInfo(font_path_list[i]);
                if (loaded_obj[font_info.full_name] == undefined || loaded_obj[font_info.full_name] == null) {
                    loaded_obj[font_info.full_name] = font_info;
                    loadNewFont(font_info, styles, params.font_display);
                }
            }
        }
    }
    function loadNewFont(font_info, styles, font_display) {
        var new_font = ` @font-face{ font-family: '${font_info.name}'; format('${font_info.type} supports variations'); format('${font_info.type}-variations'); src: url("${font_info.path}"); font-weight: 100 900; font-display: ${font_display}; } `;
        styles.insertRule(new_font);
    }
    function getFontInfo(path) {
        var font_info = {
            path: path
        };
        var font_name = path.split("/");
        font_info.full_name = font_name.pop();
        font_name = font_info.full_name.split(".");
        font_info.name = font_name[0];
        font_info.type = font_name[1];
        return font_info;
    }
    function checkForProperty(prop) {
        return (prop === "" || prop === null || prop === undefined) ? false : true;
    }
}

function topbar_ns_handler(settings={}) {
    let topbar_ns_container;
    (function init() {
        topbar_ns_container = document.createElement("div");
        topbar_ns_container.className = "topbar_ns_container";
        document.body.prepend(topbar_ns_container);
    }
    )();
    this.newNotification = newNotification;
    function newNotification(params, cb=null) {
        let notification_cleared = false;
        params.close_on_resolve = (checkForProperty(params.close_on_resolve)) ? params.close_on_resolve : true;
        params.allow_close = (checkForProperty(params.allow_close)) ? params.allow_close : true;
        params.full_bar_target = (checkForProperty(params.full_bar_target)) ? params.full_bar_target : false;
        params.self_remove_ms = (checkForProperty(params.self_remove_ms)) ? params.self_remove_ms : 0;
        let std_notification_bar = document.createElement("div");
        std_notification_bar.className = "std_notification_bar";
        let std_notification_msg = document.createElement("span");
        std_notification_msg.className = "std_notification_msg";
        std_notification_msg.innerHTML = params.msg_html;
        std_notification_bar.prepend(std_notification_msg);
        let std_notfication_close;
        let std_close_container;
        if (params.allow_close) {
            std_close_container = document.createElement("div");
            if (checkForProperty(params.close_icon)) {
                std_notfication_close = document.createElement("svg");
                std_close_container.appendChild(std_notfication_close);
                std_notfication_close.outerHTML = params.close_icon;
            } else {
                std_notfication_close = document.createElement("span");
                std_notfication_close.innerHTML = "x";
                std_notfication_close.className = "std_notfication_close";
                std_close_container.appendChild(std_notfication_close);
            }
            std_notification_bar.appendChild(std_close_container);
        }
        if (checkForProperty(params.svg_icon)) {
            var std_icon_container = document.createElement("div");
            std_icon_container.className = "std_icon_container";
            std_icon_container.innerHTML = params.svg_icon;
            std_notification_bar.prepend(std_icon_container);
        }
        topbar_ns_container.append(std_notification_bar);
        if (checkForProperty(params.custom_bg_color))
            std_notification_bar.style.backgroundColor = params.custom_bg_color;
        if (checkForProperty(params.custom_color))
            std_notification_msg.style.color = params.custom_color;
        var main_target = (params.full_bar_target) ? std_notification_bar : null;
        if (params.full_bar_target)
            std_notification_bar.style.cursor = "pointer";
        setStdListeners();
        if (params.self_remove_ms > 0)
            setRemoveTimer(params.self_remove_ms);
        function setRemoveTimer(remove_timer_ms) {
            var frame_count = 60;
            var wait_increment = remove_timer_ms / frame_count;
            var opacity_increment = 1 / frame_count;
            var starting_opacity = 1;
            (function wait() {
                remove_timer_ms -= wait_increment;
                requestAnimationFrame(handleFrame);
                function handleFrame() {
                    if (!notification_cleared) {
                        std_notification_bar.style.opacity = starting_opacity;
                        starting_opacity -= opacity_increment;
                        if (remove_timer_ms > 0)
                            window.setTimeout(wait, wait_increment);
                        else
                            clearNotfication();
                    }
                }
            }
            )();
        }
        function resolveHandler() {
            if (params.close_on_resolve)
                clearNotfication();
            sendCallback(true);
        }
        function closeNotfication() {
            clearNotfication();
            sendCallback(false);
        }
        function sendCallback(response) {
            if (cb != null)
                cb(response);
        }
        function setStdListeners() {
            if (params.allow_close)
                std_close_container.addEventListener("click", closeNotfication, true);
            if (main_target)
                main_target.addEventListener("click", resolveHandler, false);
        }
        function clearNotfication() {
            if (!notification_cleared) {
                notification_cleared = true;
                if (main_target)
                    main_target.removeEventListener("click", resolveHandler);
                if (params.allow_close)
                    std_close_container.removeEventListener("click", closeNotfication, true);
                std_notification_bar.remove();
            }
        }
        return {
            clear: clearNotfication
        };
    }
    function checkForProperty(prop) {
        return (prop === "" || prop === null || prop === undefined) ? false : true;
    }
}
