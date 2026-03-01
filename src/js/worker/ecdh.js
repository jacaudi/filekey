function determineEcdh(){
const P521={
P: BigInt("0x1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"), A: BigInt("0x1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFC"), B: BigInt("0x051953EB9618E1C9A1F929A21A0B68540EEA2DA725B99B315F3B8B489918EF109E156193951EC7E937B1652C0BD3BB1BF073573DF883D2C34F1EF451FD46B503F00"), GX: BigInt("0xC6858E06B70404E9CD9E3ECB662395B4429C648139053FB521F828AF606B4D3DBAA14B5E77EFE75928FE1DC127A2FFA8DE3348B3C1856A429BF97E7E31C2E5BD66"), GY: BigInt("0x11839296A789A3BC0045C8A5FB42C7D1BD998F54449579B446817AFBD17273E662C97EE72995EF42640C550B9013FAD0761353C7086A272C24088BE94769FD16650"), N: BigInt("0x1FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFA51868783BF2F966B7FCC0148F709A5D03BB5C9B8899C47AEBB6FB71E91386409") }
;
function modAdd(a, b, m) {
return ((a % m)+(b % m)) % m;
}
function modSub(a, b, m) {
return ((a % m)-(b % m)+m) % m;
}
function modMul(a, b, m) {
return ((a % m)*(b % m)) % m;
}
function modInv(a, m) {
function egcd(a, b) {
if (a===BigInt(0)) return [b, BigInt(0), BigInt(1)];
const [g, x, y]=egcd(b % a, a);
return [g, y-(b/a)*x, x];
}
const [g, x, _]=egcd(a, m);
if (g !==BigInt(1)) throw new Error("Modular inverse does not exist");
return ((x % m)+m) % m;
}
function isOnCurve(point) {
if (point===null) return true;
const {
x, y }
=point;
const left=modMul(y, y, P521.P);
const x3=modMul(modMul(x, x, P521.P), x, P521.P);
const ax=modMul(P521.A, x, P521.P);
const right=modAdd(modAdd(x3, ax, P521.P), P521.B, P521.P);
return left===right;
}
function pointAdd(P1, P2) {
if (P1===null) return P2;
if (P2===null) return P1;
if (P1.x===P2.x) {
if (P1.y===P2.y) {
return pointDouble(P1);
}
return null;
}
const slope=modMul( modSub(P2.y, P1.y, P521.P), modInv(modSub(P2.x, P1.x, P521.P), P521.P), P521.P );
const x3=modSub(modSub(modMul(slope, slope, P521.P), P1.x, P521.P), P2.x, P521.P);
const y3=modSub(modMul(slope, modSub(P1.x, x3, P521.P), P521.P), P1.y, P521.P);
const result={
x: x3, y: y3 }
;
if (!isOnCurve(result)) throw new Error("Point addition resulted in invalid point");
return result;
}
function pointDouble(P) {
if (P===null) return null;
if (P.y===BigInt(0)) return null;
const slope=modMul( modAdd(modMul(BigInt(3), modMul(P.x, P.x, P521.P), P521.P), P521.A, P521.P), modInv(modMul(BigInt(2), P.y, P521.P), P521.P), P521.P );
const x3=modSub(modMul(slope, slope, P521.P), modMul(BigInt(2), P.x, P521.P), P521.P);
const y3=modSub(modMul(slope, modSub(P.x, x3, P521.P), P521.P), P.y, P521.P);
const result={
x: x3, y: y3 }
;
if (!isOnCurve(result)) throw new Error("Point doubling resulted in invalid point");
return result;
}
function scalarMul(k, P) {
if (k===BigInt(0)) return null;
if (P===null) return null;
let r0=null;
let r1=P;
const bits=k.toString(2).padStart(521, '0');
for (let i=0;
i < bits.length;
i++) {
if (bits[i]==='0') {
r1=pointAdd(r0, r1);
r0=pointDouble(r0);
}
else {
r0=pointAdd(r0, r1);
r1=pointDouble(r1);
}
}
return r0;
}
this.generateKeyPair=generateKeyPair;
function generateKeyPair(seed) {
if (!(seed instanceof ArrayBuffer) || seed.byteLength !==64) {
throw new Error("Seed must be a 64-byte ArrayBuffer");
}
const seedView=new Uint8Array(seed);
let privateKey=BigInt(0);
for (let i=0;
i < seedView.length;
i++) {
privateKey=(privateKey << BigInt(8)) | BigInt(seedView[i]);
}
const mask=(BigInt(1) << BigInt(521))-BigInt(1);
privateKey=privateKey & mask;
privateKey=(privateKey % (P521.N-BigInt(1)))+BigInt(1);
const publicKey=scalarMul(privateKey, {
x: P521.GX, y: P521.GY }
);
if (!isOnCurve(publicKey)) {
throw new Error("Generated public key is not on curve");
}
return {
privateKey, publicKey }
;
}
this.convertKeys=convertKeys;
function convertKeys(privateKey, publicKey, cb) {
function buildPKCS8WithPublicKey(privKeyBytes, pubKeyBytes) {
if(privKeyBytes.length!==66) throw new Error("privKeyBytes must be 66 bytes, got "+privKeyBytes.length);
if(pubKeyBytes.length!==133) throw new Error("pubKeyBytes must be 133 bytes, got "+pubKeyBytes.length);
function calcLen(len) {
if (len < 128) return new Uint8Array([len]);
if (len < 256) return new Uint8Array([0x81, len]);
return new Uint8Array([0x82, (len >> 8) & 0xFF, len & 0xFF]);
}
const ecPublicKeyOid=new Uint8Array([0x06, 0x07, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x02, 0x01]);
const secp521r1Oid=new Uint8Array([0x06, 0x05, 0x2B, 0x81, 0x04, 0x00, 0x23]);
const algoContent=new Uint8Array([...ecPublicKeyOid, ...secp521r1Oid]);
const algoId=new Uint8Array([0x30, ...calcLen(algoContent.length), ...algoContent]);
const privOctet=new Uint8Array([0x04, 0x42, ...privKeyBytes]);
const params0=new Uint8Array([0xA0, 0x07, ...secp521r1Oid]);
const bitStringContent=new Uint8Array([0x00, ...pubKeyBytes]);
const bitString=new Uint8Array([0x03, ...calcLen(bitStringContent.length), ...bitStringContent]);
const params1=new Uint8Array([0xA1, ...calcLen(bitString.length), ...bitString]);
const ecPrivContent=new Uint8Array([0x02, 0x01, 0x01, ...privOctet, ...params0, ...params1]);
const ecPriv=new Uint8Array([0x30, ...calcLen(ecPrivContent.length), ...ecPrivContent]);
const outerOctet=new Uint8Array([0x04, ...calcLen(ecPriv.length), ...ecPriv]);
const outerVersion=new Uint8Array([0x02, 0x01, 0x00]);
const outerContent=new Uint8Array([...outerVersion, ...algoId, ...outerOctet]);
return new Uint8Array([0x30, ...calcLen(outerContent.length), ...outerContent]);
}
function convertToPKCS8(privateKey, publicKey, inner_cb) {
const privKeyBytes=new Uint8Array(66);
let temp=privateKey;
for (let i=privKeyBytes.length-1;
i>=0;
i--) {
privKeyBytes[i]=Number(temp & BigInt(0xFF));
temp=temp >> BigInt(8);
}
const xBytes=new Uint8Array(66);
let tempX=publicKey.x;
for (let i=xBytes.length-1;
i>=0;
i--) {
xBytes[i]=Number(tempX & BigInt(0xFF));
tempX=tempX >> BigInt(8);
}
const yBytes=new Uint8Array(66);
let tempY=publicKey.y;
for (let i=yBytes.length-1;
i>=0;
i--) {
yBytes[i]=Number(tempY & BigInt(0xFF));
tempY=tempY >> BigInt(8);
}
const pubKeyBytes=new Uint8Array(133);
pubKeyBytes[0]=0x04;
pubKeyBytes.set(xBytes, 1);
pubKeyBytes.set(yBytes, 67);
const pkcs8=buildPKCS8WithPublicKey(privKeyBytes, pubKeyBytes);
crypto.subtle.importKey( "pkcs8", pkcs8.buffer, {
name: "ECDH", namedCurve: "P-521" }
, true, ["deriveKey", "deriveBits"] ).then(function(key) {
inner_cb({
success: true, key, pkcs8Buffer: pkcs8.buffer }
);
}
).catch(function(error) {
console.error("PKCS#8 import failed:", error);
inner_cb({
success: false, error: error.message }
);
}
);
}
function convertPublicKeyToRaw(publicKey, inner_cb) {
const xBytes=new Uint8Array(66);
let tempX=publicKey.x;
for (let i=xBytes.length-1;
i >=0;
i--) {
xBytes[i]=Number(tempX & BigInt(0xFF));
tempX=tempX >> BigInt(8);
}
const yBytes=new Uint8Array(66);
let tempY=publicKey.y;
for (let i=yBytes.length-1;
i >=0;
i--) {
yBytes[i]=Number(tempY & BigInt(0xFF));
tempY=tempY >> BigInt(8);
}
const rawPublicKey=new Uint8Array(133);
rawPublicKey[0]=0x04;
rawPublicKey.set(xBytes, 1);
rawPublicKey.set(yBytes, 67);
try {
crypto.subtle.importKey( "raw", rawPublicKey.buffer, {
name: "ECDH", namedCurve: "P-521" }
, true, [] ).then(function(key){
inner_cb({
success: true, key, rawBuffer: rawPublicKey.buffer }
);
}
).catch(function(error){
console.error("Public key raw import failed:", error);
inner_cb({
success: false, error: error.message }
);
}
);
}
catch (error) {
inner_cb({
success: false, error: error.message }
);
}
}
(function init(){
convertToPKCS8(privateKey, publicKey, function(privateResult){
convertPublicKeyToRaw(publicKey, function(publicResult){
cb({
privateKey: privateResult, publicKey: publicResult}
);
}
);
}
);
}
)();
}
}
