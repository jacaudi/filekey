function database(db_name, stores, version_number, cb) {
    let db;
    (function openDatabase() {
        var req = window.indexedDB.open(db_name, version_number);
        req.onsuccess = function(event) {
            fk_log('debug', 'db', 'database opened');
            db = this.result;
            cb(true);
        }
        ;
        req.onerror = function(event) {
            fk_log('error', 'db', 'unable to open database', event.target.message);
            cb(false);
        }
        ;
        req.onblocked = function(event) {
            fk_log('warn', 'db', 'database open blocked', event.target.message);
            cb(false);
        }
        ;
        req.onupgradeneeded = function(event) {
            fk_log('debug', 'db', 'database upgraded');
            db = event.target.result;
            for (var i = 0; i < stores.length; i++)
                db.createObjectStore(stores[i].name, stores[i].params);
        }
        ;
    }
    )();
    this.getPersist = function(cb) {
        navigator.permissions.query({
            name: 'persistent-storage'
        }).then(function(result) {
            if (result.state == 'granted')
                cb(true);
            else if (result.state == 'prompt')
                navigator.storage.persist().then(cb);
            else
                cb(false);
        });
    }
    ;
    this.clearStore = clearStore;
    function clearStore(store_name) {
        securelyDeleteFromStore(this, store_name, function(ret) {
            db.transaction(store_name, 'readwrite').objectStore(store_name).clear();
        });
    }
    this.getWriteableStore = getWriteableStore;
    function getWriteableStore(store_name) {
        return db.transaction(store_name, 'readwrite').objectStore(store_name);
    }
    this.getKeyWithStore = getKeyWithStore;
    function getKeyWithStore(store_obj, keyname, cb) {
        var req = store_obj.get(keyname);
        req.onsuccess = handleSuccess;
        req.onerror = function() {
            cb(null)
        }
        ;
        function handleSuccess(e) {
            cb({
                valid: true,
                response: this.result,
                store: store_obj
            });
        }
    }
    this.getStore = function(store_name) {
        return db.transaction(store_name, 'readonly').objectStore(store_name);
    }
    ;
    function getObjectStore(store_name, mode) {
        return db.transaction(store_name, mode).objectStore(store_name);
    }
    this.getKey = function(store_names, key_name, cb) {
        getKeyFromDB(store_names, key_name, cb);
    }
    ;
    function getKeyFromDB(store_names, keyname, cb) {
        store_names = (typeof store_names === 'string') ? [store_names] : store_names;
        var store = getObjectStore(store_names, 'readwrite');
        var req = store.get(keyname);
        req.onsuccess = handleSuccess;
        req.onerror = function() {
            cb(null)
        }
        ;
        function handleSuccess(e) {
            cb({
                valid: true,
                response: this.result,
                store: store
            });
        }
    }
}

function secureOverwriteBuffer(dataLength, callback) {
    const pattern = new Uint8Array([0xFF, 0x00, 0xFF, 0x00]);
    const overwriteData = new Uint8Array(dataLength);
    for (let i = 0; i < dataLength; i++) {
        overwriteData[i] = pattern[i % pattern.length];
    }
    callback(overwriteData.buffer);
}
function securelyDeleteFromStore(dbHandler, storeNames, callback) {
    if (!Array.isArray(storeNames)) {
        storeNames = [storeNames];
    }
    let completedStores = 0;
    storeNames.forEach(storeName => {
        const store = dbHandler.getStore(storeName);
        const allRecordsRequest = store.getAll();
        allRecordsRequest.onsuccess = function(event) {
            const records = event.target.result;
            let processedRecords = 0;
            if (records.length === 0) {
                const writeableStore = dbHandler.getWriteableStore(storeName);
                writeableStore.clear().onsuccess = function() {
                    completedStores++;
                    if (completedStores === storeNames.length && callback) {
                        callback(true);
                    }
                }
                ;
                return;
            }
            records.forEach(record => {
                const writeableStore = dbHandler.getWriteableStore(storeName);
                const getRequest = writeableStore.get(record.file_id);
                getRequest.onsuccess = function(event) {
                    const recordToOverwrite = event.target.result;
                    if (recordToOverwrite && recordToOverwrite.data) {
                        const dataLength = recordToOverwrite.data.byteLength;
                        secureOverwriteBuffer(dataLength, function(overwriteData) {
                            recordToOverwrite.data = overwriteData;
                            const putRequest = writeableStore.put(recordToOverwrite);
                            putRequest.onsuccess = function() {
                                processedRecords++;
                                if (processedRecords === records.length) {
                                    writeableStore.clear().onsuccess = function() {
                                        completedStores++;
                                        if (completedStores === storeNames.length && callback) {
                                            callback(true);
                                        }
                                    }
                                    ;
                                }
                            }
                            ;
                            putRequest.onerror = function(err) {
                                fk_log('error', 'db', 'error overwriting record', err);
                                processedRecords++;
                                if (processedRecords === records.length) {
                                    writeableStore.clear().onsuccess = function() {
                                        completedStores++;
                                        if (completedStores === storeNames.length && callback) {
                                            callback(false);
                                        }
                                    }
                                    ;
                                }
                            }
                            ;
                        });
                    } else {
                        processedRecords++;
                        if (processedRecords === records.length) {
                            writeableStore.clear().onsuccess = function() {
                                completedStores++;
                                if (completedStores === storeNames.length && callback) {
                                    callback(true);
                                }
                            }
                            ;
                        }
                    }
                }
                ;
            }
            );
        }
        ;
        allRecordsRequest.onerror = function(err) {
            fk_log('error', 'db', 'error fetching records for secure deletion', err);
            completedStores++;
            if (completedStores === storeNames.length && callback) {
                callback(false);
            }
        }
        ;
    }
    );
}
