function fk_db_handler(cb) {
    let main_handler;
    var db_obj, db_name, version_number;
    (function init() {
        version_number = 1;
        db_name = "filekey_temp_db";
        db_obj = {
            data_store: {
                name: "data_store",
                params: {
                    keyPath: "file_id"
                }
            },
        };
        main_handler = new database(db_name,[db_obj.data_store],version_number,function(valid) {
            if (!valid)
                setPersistentWarning();
            else {
                main_handler.getPersist(function(result) {
                    if (result)
                        fk_log('debug', 'db', 'persistent storage granted');
                    else
                        setPersistentWarning();
                    cb();
                    clearDbStore();
                });
            }
        }
        );
    }
    )();
    this.clearDbStore = clearDbStore;
    function clearDbStore() {
        main_handler.clearStore(db_obj.data_store.name);
    }
    function setPersistentWarning() {
        fk_log('warn', 'db', 'persistent storage unavailable, bookmark page to resolve');
    }
    this.getStore = getStore;
    function getStore(key, cb) {
        var store = main_handler.getStore(db_obj.data_store.name);
        if (key != null)
            var req = store.get(key);
        else
            var req = store.getAll();
        req.onsuccess = callbackStore;
        req.onerror = function(e) {
            cb(null)
        }
        ;
        function callbackStore(e) {
            cb(e.target.result);
        }
    }
    this.getFileStore = getFileStore;
    function getFileStore(file_id, cb) {
        var store_obj = main_handler.getWriteableStore(db_obj.data_store.name);
        main_handler.getKeyWithStore(store_obj, file_id, cb);
    }
    this.saveNewFile = saveNewFile;
    function saveNewFile(file_id, file_obj, cb) {
        getFileStore(file_id, function(ret) {
            if (ret != null) {
                if (checkForProperty(ret.response)) {
                    ret.response.file_id = file_obj.file_id;
                    ret.response.data = file_obj.data;
                    ret.response.filename = file_obj.filename;
                    ret.response.ts = file_obj.ts;
                    ret.response.file_type = file_obj.file_type;
                    ret.store.put(ret.response);
                    cb();
                } else {
                    var tc = {
                        file_id,
                        data: file_obj.data,
                        filename: file_obj.filename,
                        ts: file_obj.ts,
                        file_type: file_obj.file_type,
                    };
                    ret.store.add(tc);
                    cb();
                }
            } else
                fk_log('warn', 'db', 'failed to save file: ' + file_id);
        });
    }
}
