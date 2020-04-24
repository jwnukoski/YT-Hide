// Sends message to content.js on page load.
chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {
    if (changeInfo.status == 'complete' && tab.active) {
        chrome.tabs.executeScript(tab.ib, {
            file: 'web.js'
        });

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabId, {msg: "checkvids"}, function(response) {});
        });
    }
});