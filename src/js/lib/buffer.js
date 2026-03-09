function buffer_helper() {
    this.convertBufferType = convertBufferType;
    this.bufferPush = bufferPush;
    this.getBufferTypedArrayConstructor = getBufferTypedArrayConstructor;
    this.bufferToHex = bufferToHex;
    this.hexStringToHexNumber = hexStringToHexNumber;
    this.hexToArrayBuffer = hexToArrayBuffer;
    function convertBufferType(source_buff, output_type) {
        const buffer = new ArrayBuffer(inputBuffer.length);
        var source_buff_type = getBufferTypedArrayConstructor(Object.prototype.toString.call(source_buff));
        const source_buff_view = new source_buff_type(buffer);
        source_buff_view.set(inputBuffer);
        return new output_type(buffer);
    }
    function bufferPush(source_buff, new_values) {
        var source_buff_type = getBufferTypedArrayConstructor(Object.prototype.toString.call(source_buff));
        var new_ab = new source_buff_type(source_buff.length + 1);
        new_ab.set(source_buff, 0);
        new_ab[new_ab.length - 1] = new_values;
        return new_ab;
    }
    function getBufferTypedArrayConstructor(tag) {
        var type_name = tag.substring(8, tag.length - 1);
        var window_global = globalThis;
        var constructor = window_global[type_name];
        if (constructor && typeof constructor === 'function')
            return constructor;
        else
            throw new TypeError("Invalid typed array type tag: " + tag);
    }
    function bufferToHex(buffer) {
        return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, "0")).join("");
    }
    function hexStringToHexNumber(hex_str) {
        if (new RegExp(/0x/i).test(hex_str.substring(0, 2)))
            return hex_str.substring(2);
        else
            return hex_str;
    }
    function hexToArrayBuffer(hex_str, buffer_type=null) {
        hex_str = hexStringToHexNumber(hex_str);
        var ret = [];
        for (var i = 0; i < hex_str.length / 2; i++) {
            var x = i * 2;
            const n = parseInt(hex_str.substr(x, 2), 16);
            ret.push(n);
        }
        if (buffer_type)
            return new buffer_type(ret);
        else
            return new Uint8Array(ret).buffer;
    }
}
