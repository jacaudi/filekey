function webauthn_handler(init_params={
    name: "BitNote",
    id: "bitnote.xyz"
}) {
    (function init() {}
    )();
    this.createCredential = createCredential;
    function createCredential(prf_obj, callback) {
        navigator.credentials.create({
            publicKey: {
                rp: {
                    name: init_params.name,
                    id: init_params.id
                },
                user: {
                    id: self.crypto.getRandomValues(new Uint8Array(16)),
                    name: prf_obj.key_name,
                    displayName: prf_obj.username,
                },
                pubKeyCredParams: [{
                    type: 'public-key',
                    alg: -7
                }, {
                    type: "public-key",
                    alg: -8
                }, {
                    type: "public-key",
                    alg: -257
                }],
                timeout: 60000,
                authenticatorSelection: {
                    residentKey: "required",
                },
                extensions: {
                    prf: {}
                },
                challenge: self.crypto.getRandomValues(new Uint8Array(16)).buffer,
            }
        }).then( (c) => {
            var results = c.getClientExtensionResults();
            if (checkForProperty(results.prf) && results.prf.enabled === true)
                callback(c.rawId);
            else
                callback(null);
        }
        ).catch( (error) => {
            var qq = 22;
            callback(null);
        }
        );
    }
    this.getCredential = getCredential;
    function getCredential(prf_obj, callback) {
        var publicKey = {
            timeout: 60000,
            rpId: init_params.id,
            challenge: self.crypto.getRandomValues(new Uint8Array(16)).buffer,
            extensions: {
                prf: {
                    eval: {
                        first: prf_obj.first
                    }
                }
            },
        };
        if (checkForProperty(prf_obj.second))
            publicKey.extensions.prf.eval.second = prf_obj.second;
        if (checkForProperty(prf_obj.id)) {
            publicKey.allowCredentials = [{
                type: "public-key",
                id: prf_obj.id,
            }];
        }
        navigator.credentials.get({
            publicKey
        }).then( (c) => {
            var ext_results = c.getClientExtensionResults();
            if (checkForProperty(ext_results) && checkForProperty(ext_results.prf.results) && checkForProperty(ext_results.prf.results.first) && checkForProperty(ext_results.prf.results.second)) {
                var key_mat = concatArrayBuffers(ext_results.prf.results.first, ext_results.prf.results.second);
                callback(key_mat, c.rawId);
            } else
                callback(null);
        }
        ).catch( (error) => {
            var qq = 22;
            callback(null);
        }
        );
    }
    function concatArrayBuffers(buffer1, buffer2) {
        var tmp = new Uint8Array(buffer1.byteLength + buffer2.byteLength);
        tmp.set(new Uint8Array(buffer1), 0);
        tmp.set(new Uint8Array(buffer2), buffer1.byteLength);
        return tmp.buffer;
    }
    this.webAuthnClick = webAuthnClick;
    function webAuthnClick(prf_obj, bio_cb) {
        getCredential(prf_obj, bio_cb);
        function handleBioLogin(key_mat, raw_id) {
            if (key_mat != null && raw_id != null) {
                getBiometrics(raw_id, handleLogin);
            } else
                bio_cb(null);
            function handleLogin(cred) {
                bio_cb(key_mat, cred);
            }
        }
    }
    function checkForProperty(prop) {
        return (prop === "" || prop === null || prop === undefined) ? false : true;
    }
}
