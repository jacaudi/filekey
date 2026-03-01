function ww_encryption_handler(){
this.encrypt=encrypt;
function encrypt(key, plaintext, iv, cb, aad=""){
var alg_obj={
name: "AES-GCM", iv}
;
if(aad !="") alg_obj.additionalData=aad;
self.crypto.subtle.encrypt(alg_obj, key, plaintext).then((encrpyted_stuff)=> {
cb(encrpyted_stuff);
}
);
}
this.noDecodeDecrypt=noDecodeDecrypt;
function noDecodeDecrypt(key, ciphertext, iv, cb, aad=""){
var alg_obj={
name: "AES-GCM", iv}
;
if(aad !="") alg_obj.additionalData=aad;
self.crypto.subtle.decrypt(alg_obj, key, ciphertext).then((decrpyted_stuff)=>{
cb(decrpyted_stuff);
}
).catch(function(e){
cb(null) }
);
}
this.hexToArrayBuffer=hexToArrayBuffer;
function hexToArrayBuffer(hex_str, buffer_type=null){
const regex=new RegExp(/0x/i);
if(regex.test(hex_str.substring(0,2))) hex_str=hex_str.substring(2);
var ret=[];
for(var i=0;
i < hex_str.length/2;
i++){
var x=i*2;
const n=parseInt(hex_str.substr(x, 2), 16);
ret.push(n);
}
if(buffer_type) return new buffer_type(ret);
else return ret;
}
this.deriveEcdhKey=deriveEcdhKey;
function deriveEcdhKey(privateKey, publicKey, callback) {
self.crypto.subtle.deriveKey( {
name: "ECDH", public: publicKey, }
, privateKey, {
name: "AES-GCM", length: 256, }
, true, ["encrypt", "decrypt"] ).then(callback);
}
this.importEcdhPub=importEcdhPub;
function importEcdhPub(pub_buff, cb){
crypto.subtle.importKey( "raw", pub_buff, {
name: "ECDH", namedCurve: "P-521" }
, true, [] ).then(cb);
}
}
