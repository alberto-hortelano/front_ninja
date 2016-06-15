(function(){
    io.connect(ninja_host).on('ninja_reload_style', function(resp){
        var els = document.getElementsByTagName("link");
        var length = els.length;
        for (var i = 0; i < length; i++) {
            var el = els[i];
            if(i > 200) break;
            if (el.href.indexOf(resp.outFile) !== -1) {
                el.setAttribute("href", addQSParm(el.href, "ninja_date", Date.now()));
            }
        }
    });
    function addQSParm(myUrl, name, value) {
        var re = new RegExp("([?&]" + name + "=)[^&]+", "");

        function add(sep) {
            myUrl += sep + name + "=" + encodeURIComponent(value);
        }
        if (myUrl.indexOf("?") === -1) {
            add("?");
        } else {
            if (re.test(myUrl)) {
                myUrl = myUrl.replace(re, "$1" + encodeURIComponent(value));
            } else {
                add("&");
            }
        }
        return myUrl;
    }
})();
/*
function ninja_debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};
function ninja_remove_old(el) {
    setTimeout(function() {
        if(typeof HTMLElement === "object" ? el instanceof HTMLElement : el && typeof el === "object" && el !== null && el.nodeType === 1 && typeof el.nodeName==="string"){
            console.log(el.parentElement);
            el.parentElement.removeChild(el);
        }
    }, 1000);
}
function ninja_addQSParm(myUrl, name, value) {
    var re = new RegExp("([?&]" + name + "=)[^&]+", "");

    function add(sep) {
        myUrl += sep + name + "=" + encodeURIComponent(value);
    }

    function change() {
        myUrl = myUrl.replace(re, "$1" + encodeURIComponent(value));
    }
    if (myUrl.indexOf("?") === -1) {
        add("?");
    } else {
        if (re.test(myUrl)) {
            change();
        } else {
            add("&");
        }
    }
    return myUrl;
}
var ninja_reload_style = ninja_debounce(function(resp) {
    if(resp.error){
        log(resp.error);
    }else{
        var els = document.getElementsByTagName("link");
        var length = els.length;
        for (var i = 0; i < length; i++) {
            var el = els[i];
            if(i > 200) break;
            if (el.href.indexOf(resp.outFile) !== -1) {
                var new_link = document.createElement("link");
                new_link.onload = ninja_remove_old(el);
                new_link.setAttribute("rel", "stylesheet");
                new_link.setAttribute("type", "text/css");
                new_link.setAttribute("href", ninja_addQSParm(el.href, "ninja_date", Date.now()));
                document.getElementsByTagName("head")[0].insertBefore(new_link,el);
            }
        }
    }
}, 1250);
*/