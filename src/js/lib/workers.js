function blobWorkersHandler() {
    let worker = null;
    let worker_blob = null;
    this.loadWorkerFromText = loadWorkerFromText;
    function loadWorkerFromText(worker_text, cb) {
        worker_blob = URL.createObjectURL(new Blob([worker_text],{
            type: 'application/javascript'
        }));
        cb(true);
    }
    this.scriptReady = scriptReady;
    function scriptReady() {
        return worker_blob != null;
    }
    this.initWorkers = initWorkers;
    function initWorkers(cb) {
        worker = new Worker(worker_blob);
        worker.onerror = function(e) {
            fk_log('error', 'worker', 'worker error: ' + (e.message || 'unknown'));
        };
        cb();
    }
    this.sendMessageToWorker = sendMessageToWorker;
    function sendMessageToWorker(msg_param, transfer_array, cb) {
        worker.postMessage(msg_param, transfer_array);
        if (cb != null)
            worker.addEventListener("message", handleDeResponse);
        function handleDeResponse(event) {
            worker.removeEventListener("message", handleDeResponse);
            if (cb != null)
                cb(event.data);
        }
    }
}
