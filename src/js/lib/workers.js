function blobWorkersHandler() {
    let workers = [];
    let worker_pointer = 0;
    let worker_blob = null;
    this.loadWorkerScript = loadWorkerScript;
    function loadWorkerScript(new_worker_url, cb) {
        getWorkerScript(new_worker_url, function(ret_blob, ret_script) {
            if (ret_blob != null) {
                worker_blob = ret_blob;
                cb(true, ret_script);
            } else
                cb(false, null);
        });
    }
    this.loadWorkerFromBlob = loadWorkerFromBlob;
    function loadWorkerFromBlob(new_blob, cb) {
        worker_blob = new_blob;
        buildWorkers(worker_blob);
    }
    this.loadWorkerFromText = loadWorkerFromText;
    function loadWorkerFromText(worker_text, cb) {
        worker_blob = URL.createObjectURL(new Blob([worker_text],{
            type: 'application/javascript'
        }));
        cb(true);
    }
    this.scriptReady = scriptReady;
    function scriptReady() {
        return (worker_blob != null) ? true : false
    }
    this.initWorkers = initWorkers;
    function initWorkers(cb) {
        buildWorkers(worker_blob);
        cb();
    }
    this.sendMessageToWorker = sendMessageToWorker;
    function sendMessageToWorker(msg_param, transfer_array, cb) {
        let temp_pointer = worker_pointer;
        worker_pointer = (worker_pointer + 1 < workers.length) ? worker_pointer + 1 : 0;
        sendArrayBufferToWorker(temp_pointer, msg_param, transfer_array, cb);
    }
    function sendArrayBufferToWorker(worker_pointer, msg_param, transfer_array, cb) {
        workers[worker_pointer].worker.postMessage(msg_param, transfer_array);
        if (cb != null)
            workers[worker_pointer].worker.addEventListener("message", handleDeResponse);
        function handleDeResponse(event) {
            workers[worker_pointer].worker.removeEventListener("message", handleDeResponse);
            var data = event.data;
            if (cb != null)
                cb(data);
        }
    }
    function buildWorkers(worker_blob_obj) {
        const num_workers = 1;
        for (var i = 0; i < num_workers; i++)
            workers.push({
                id: i,
                worker: createWorker_blob(worker_blob_obj),
                in_use: false
            });
        function createWorker_blob(blobURL) {
            const worker = new Worker(blobURL);
            worker.onerror = function(e) {
                fk_log('error', 'worker', 'worker error: ' + (e.message || 'unknown'));
            };
            return worker;
        }
    }
    function getWorkerScript(main_worker_url, cb) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', main_worker_url, true);
        xhr.onreadystatechange = function() {
            var ret;
            if (xhr.readyState === 4 && xhr.status === 200)
                cb(URL.createObjectURL(new Blob([xhr.response],{
                    type: 'application/javascript'
                })), xhr.responseText);
            else if (xhr.readyState === 4)
                cb(null);
        }
        ;
        xhr.send();
    }
}
