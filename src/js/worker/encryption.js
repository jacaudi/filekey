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
).catch(function(e){
fk_log('error', 'crypto', 'encrypt failed: ' + e.toString());
cb(null);
});
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
this.deriveEcdhKey=deriveEcdhKey;
function deriveEcdhKey(privateKey, publicKey, callback) {
self.crypto.subtle.deriveKey( {
name: "ECDH", public: publicKey, }
, privateKey, {
name: "AES-GCM", length: 256, }
, false, ["encrypt", "decrypt"] ).then(callback).catch(function(e){
fk_log('error', 'crypto', 'deriveEcdhKey failed: ' + e.toString());
callback(null);
});
}
this.importEcdhPub=importEcdhPub;
function importEcdhPub(pub_buff, cb){
crypto.subtle.importKey( "raw", pub_buff, {
name: "ECDH", namedCurve: "P-521" }
, false, [] ).then(cb).catch(function(e){
fk_log('error', 'crypto', 'importEcdhPub failed: ' + e.toString());
cb(null);
});
}
}
