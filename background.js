// Sends message to web.js on page load.
chrome.tabs.onUpdated.addListener( function (tabId, changeInfo, tab) {
    // Inject web.js. With a content.js, buttons wouldn't have access to functions.
    chrome.tabs.executeScript(tab.ib, {
        file: 'web.js'
    });
});