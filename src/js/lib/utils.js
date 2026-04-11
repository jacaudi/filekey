function checkForProperty(prop) {
    return (prop === "" || prop === null || prop === undefined) ? false : true;
}
function sanitizeFilename(file_name) {
    return file_name.replace(/[/\\]/g, '').replace(/\x00/g, '').slice(0, 255);
}
function getRandomInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function get_query_strings(return_as_array=false) {
    var results = {};
    if (window.location.search != "") {
        var param;
        var searched = window.location.search;
        searched = searched.substring(1);
        searched = searched.split("&");
        if (return_as_array)
            return searched;
        else {
            for (var i = 0; i < searched.length; i++)
                parsePair(results, searched);
        }
    }
    return results;
    function parsePair(results, pair) {
        var value;
        pair = pair[i].split("=");
        if ((typeof pair[1] === "undefined"))
            value = true;
        else {
            switch (pair[1]) {
            case "null":
                value = null;
                break;
            case "false":
                value = false;
                break;
            case "true":
                value = true;
                break;
            default:
                var temp = parseInt(pair[1]);
                if (isNaN(temp))
                    value = pair[1];
                else
                    value = (temp.toString().length == pair[1].length) ? temp : pair[1];
            }
        }
        results[pair[0]] = value;
    }
}
