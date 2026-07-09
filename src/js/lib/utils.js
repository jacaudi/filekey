function checkForProperty(prop) {
    return (prop === "" || prop === null || prop === undefined) ? false : true;
}
function sanitizeFilename(file_name) {
    return file_name.replace(/[/\\]/g, '').replace(/\x00/g, '').slice(0, 255);
}
function get_query_strings() {
    const results = {};
    for (const [key, raw] of new URLSearchParams(window.location.search)) {
        if (raw === '')      { results[key] = true;  continue; }
        if (raw === 'null')  { results[key] = null;  continue; }
        if (raw === 'true')  { results[key] = true;  continue; }
        if (raw === 'false') { results[key] = false; continue; }
        const n = parseInt(raw, 10);
        results[key] = (!isNaN(n) && String(n).length === raw.length) ? n : raw;
    }
    return results;
}
