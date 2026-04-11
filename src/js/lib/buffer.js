function buffer_helper() {
    this.bufferToHex = bufferToHex;
    this.hexStringToHexNumber = hexStringToHexNumber;
    this.hexToArrayBuffer = hexToArrayBuffer;
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
