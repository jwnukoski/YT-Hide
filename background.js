// Sends message to web.js on page load.
chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {
    // Inject web.js. With a content.js, buttons wouldn't have access to functions.
    chrome.tabs.executeScript(tab.ib, {
        file: 'web.js'
    });

    chrome.tabs.sendMessage(tabId, {msg: "checkvids"}, function(response) {});

    /*if (changeInfo.status == 'complete' && tab.active) {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabId, {msg: "checkvids"}, function(response) {});
        });
    }*/
});