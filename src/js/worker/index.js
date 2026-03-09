// Worker entry point. Build order in scripts/build.js matters:
// this file is concatenated first; ww_encryption_handler, buffer_helper,
// keccak_handler, and determineEcdh are defined in the files that follow.
self.addEventListener("message", handleMessage);
self.addEventListener("unhandledrejection", function(e) {
    fk_log('error', 'uncaught', 'unhandled rejection: ' + String(e.reason));
    self.postMessage(null);
});
let eh=new ww_encryption_handler();
let active_mp_buff=null;
let active_pk_buff=null;
let active_ecdh_priv_key=null;
let active_ecdh_pub_key=null;
let shared_ecdh_pub_key=null;
let secp_h;
let kh=new keccak_handler();
let bh=new buffer_helper();
let active_prf_key=null;
let active_prf_buff=null;
let active_seed=null;
let active_hkdf=null;
let active_det_ecdh_pub_buff=null;
let salt_byte_len=16;
let salt_hex_len=32;
let misc_slice=32;
let det_ecdh_h=new determineEcdh();
function handleMessage(msg_event){
var msg_type=msg_event.data.msg_type;
switch(msg_type){
case "prf_to_key": buffToHkdf(msg_event.data.prf_buff, function(ret){
active_prf_key=ret;
active_prf_buff=msg_event.data.prf_buff;
self.postMessage(null);
}
);
break;
case "set_seed": generateNewSeed(msg_event.data.seed_name, function(seed){
if(seed===null){ self.postMessage(null); return; }
active_seed=seed;
seedToHkdf(seed,function(hkdf){
if(hkdf===null){ self.postMessage(null); return; }
active_hkdf=hkdf;
self.postMessage(null);
genDetEcdh(active_seed);
}
);
}
);
break;
case "get_det_public_ecdh": self.postMessage(active_det_ecdh_pub_buff);
break;
case "gen_seed_pk": var key=active_hkdf;
generateAesFromHkdf(active_hkdf, function(ret){
var salt1=ret.salt;
var aes_key=ret.aes_key;
}
);
break;
case "new_enc": var key=active_hkdf;
var msg_buff=msg_event.data.msg_buff;
generateAesFromHkdf(key, null, function(ret){
if(ret===null){ self.postMessage(null); return; }
var key_salt=ret.salt;
var aes_key=ret.aes_key;
eh.encrypt(aes_key, msg_buff, key_salt, function(encrypted_buff){
if(encrypted_buff===null){ self.postMessage(null); return; }
self.postMessage({
encrypted_buff, salt:key_salt}
, [encrypted_buff,key_salt]);
}
);
}
);
break;
case "new_dec": var key=active_hkdf;
var msg_buff=msg_event.data.msg_buff;
var key_salt=msg_buff.slice(0,salt_byte_len);
generateAesFromHkdf(key, key_salt, function(ret){
if(ret===null){ self.postMessage(null); return; }
var aes_key=ret.aes_key;
eh.noDecodeDecrypt(aes_key, msg_buff.slice(salt_byte_len), key_salt, function(decrypted_buff){
if(decrypted_buff===null) self.postMessage(null);
else self.postMessage({
decrypted_buff}
, [decrypted_buff]);
}
);
}
);
break;
case "set_shared_pub": eh.importEcdhPub(msg_event.data.pub_buff, function(key){
if(key===null){ self.postMessage(null); return; }
shared_ecdh_pub_key=key;
self.postMessage(true);
}
);
break;
case "shared_ecdh_enc": var msg_buff=msg_event.data.msg_buff;
eh.deriveEcdhKey(active_ecdh_priv_key, shared_ecdh_pub_key, function(derived_key){
if(derived_key===null){ self.postMessage(null); return; }
var iv=self.crypto.getRandomValues(new Uint8Array(salt_byte_len));
iv=iv.buffer;
eh.encrypt(derived_key, msg_buff, iv, function(encrypted_buff){
if(encrypted_buff===null){ self.postMessage(null); return; }
var salt=iv;
self.postMessage({
encrypted_buff, salt}
, [encrypted_buff,salt]);
}
);
}
);
break;
case "shared_ecdh_dec": var msg_buff=msg_event.data.msg_buff;
var key_salt=msg_buff.slice(0,salt_byte_len);
msg_buff=msg_buff.slice(salt_byte_len);
eh.importEcdhPub(msg_event.data.pub_buff, function(shared_pub){
if(shared_pub===null){ self.postMessage(null); return; }
eh.deriveEcdhKey(active_ecdh_priv_key, shared_pub, function(derived_key){
if(derived_key===null){ self.postMessage(null); return; }
eh.noDecodeDecrypt(derived_key, msg_buff, key_salt, function(decrypted_buff){
if(decrypted_buff===null) self.postMessage(null);
else self.postMessage({
decrypted_buff}
, [decrypted_buff]);
}
);
}
);
}
);
break;
case "clear_keys":
    active_prf_key = null;
    active_prf_buff = null;
    active_seed = null;
    active_hkdf = null;
    active_ecdh_priv_key = null;
    active_ecdh_pub_key = null;
    shared_ecdh_pub_key = null;
    active_det_ecdh_pub_buff = null;
    active_mp_buff = null;
    active_pk_buff = null;
    fk_log('debug', 'crypto', 'all keys cleared');
    self.postMessage(null);
    break;
}
function genDetEcdh(seed){
var ret1=det_ecdh_h.generateKeyPair(seed);
det_ecdh_h.convertKeys(ret1.privateKey, ret1.publicKey, function(result){
if(!result.privateKey.success){
fk_log('error', 'crypto', 'ECDH key setup failed: ' + result.privateKey.error);
return;
}
if(!result.publicKey.success){
fk_log('error', 'crypto', 'ECDH public key setup failed: ' + result.publicKey.error);
return;
}
active_det_ecdh_pub_buff=result.publicKey.rawBuffer;
active_ecdh_priv_key=result.privateKey.key;
active_ecdh_pub_key=result.publicKey.key;
}
);
}
function buffToHkdf(prf_buff,cb){
self.crypto.subtle.importKey( "raw", prf_buff, {
name: "HKDF" }
, false, ["deriveKey", "deriveBits"] ).then(cb).catch(function(e){
fk_log('error', 'crypto', 'buffToHkdf importKey failed: ' + e.toString());
self.postMessage(null);
});
}
function generateNewSeed(seed_name="", cb){
var sliced_buff=active_prf_buff.slice(0,misc_slice);
let salt=kh.strict_hex_keccak256(bh.bufferToHex(sliced_buff)+seed_name);
let info=new TextEncoder().encode("filekey pk seed: "+salt);
keyToSeed(active_prf_key, bh.hexToArrayBuffer(salt), info, function(seed){
cb(seed);
}
);
}
function seedToHkdf(seed, cb){
buffToHkdf(seed, function(ret){
cb(ret);
}
);
}
function keyToSeed(imported_key, salt, info, cb){
self.crypto.subtle.deriveBits( {
name: "HKDF", hash: "SHA-256", salt: salt, info: info, }
, imported_key, 512 ).then(callbackWithSeed).catch(function(e){
fk_log('error', 'crypto', 'keyToSeed deriveBits failed: ' + e.toString());
cb(null);
});
function callbackWithSeed(seed_buff){
cb(seed_buff);
}
}
function generateAesFromHkdf(hkdf, known_salt=null, cb) {
let salt=(known_salt===null) ? (self.crypto.getRandomValues(new Uint8Array(salt_byte_len))).buffer : known_salt;
var alg={
name: "HKDF", hash: "SHA-256", salt: salt, info: new Uint8Array([]), }
;
var derived_alg={
name: "AES-GCM", length: 256 }
;
self.crypto.subtle.deriveKey( alg, hkdf, derived_alg, false, ["encrypt", "decrypt"] ).then(function(aes_key){
cb({
aes_key, salt}
);
}
).catch(function(e){
fk_log('error', 'crypto', 'generateAesFromHkdf deriveKey failed: ' + e.toString());
cb(null);
});
}
function checkForProperty(prop){
return (prop==="" || prop===null || prop===undefined) ? false : true;
}
}
