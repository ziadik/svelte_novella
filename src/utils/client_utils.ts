export  function isAppleClient(){
    if (navigator.platform.substr(0,2) === 'iP') { // iOS устройство

        if (window.webkit && window.webkit.messageHandlers) {
            window.webkit.messageHandlers.messageAppHandler.postMessage("webkit exist, working brothers");
            return true; // WKWebView
        }
        // Дополнительные проверки, если необходимо
    }
    return false;
}