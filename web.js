// For defining YT settings that may change in the future. All constant settings.
let ytBlockSettings = (function() {
    const mainFrontPageVideoTag = 'ytd-rich-item-renderer'; // Only used on YT front page
    const mainVideoTag = 'ytd-video-renderer'; // used in YT search pages
    const mainSideBarVideoTag = 'ytd-compact-video-renderer'; // used in side bar
    const cssVideoDisplay = 'block';
    const cssVideoHide = 'none';

    return {
        mainFrontPageVideoTag,
        mainVideoTag,
        mainSideBarVideoTag,
        cssVideoDisplay,
        cssVideoHide
    };
})();

// Anything related to user settings. Handles saving and getting settings.
let ytBlockUser = (function() {
    let urlBlocks = [];
    let titleBlocks = [];
    let channelBlocks = [];
    
    let init = function() {
        console.log("Loading user preferences...");
        setBlocks('all'); // update blocks from chrome storage to memory
    };

    // Add and save a video block to chrome storage. Type = 'url', 'title', 'channel'. Val = string
    let addBlock = function(type, val) {
        if (type === 'url' || type === 'title' || type === 'channel') {
            let currentSettings = getBlocks(type);
            currentSettings.push(val);

            switch (type) {
                case 'url':
                    chrome.storage.sync.set({ytblockurls: currentSettings}, function () {
                        console.log('Added ytblockurls: ' + val);
                    });
                break;
                case 'title':
                    chrome.storage.sync.set({ytblocktitles: currentSettings}, function () {
                        console.log('Added ytblocktitles: ' + val);
                    });
                break;
                case 'channel':
                    chrome.storage.sync.set({ytblockchannels: currentSettings}, function () {
                        console.log('Added ytblockchannels: ' + val);
                    });
                break;
                default:
                    console.log("Major error in addBlock type.");
                break;
            }
            setBlocks(type); // update blocks in memory
            ytBlock.checkVids(); // check page again
        } else {
            console.log('Unknown block type in ytBlockUser.addBlock: ' + type);
        }
    };

    // Remove a block from user settings
    let delBlock = function(type, val) {
        // TODO
    };

    // blocks in memory, not storage
    let getBlocks = function(type) {
        switch (type) {
            case 'url':
                return urlBlocks;
            break;
            case 'title':
                return titleBlocks;
            break;
            case 'channel':
                return channelBlocks;
            break;
            default:
                return null;
            break;
        }
    }

    // sets blocks in chrome storage
    let setBlocks = function(type) {
        switch (type) {
            case 'url':
                chrome.storage.sync.get({ytblockurls: []}, function(data) {
                   return data.ytblockurls;
                });
            break;
            case 'title':
                chrome.storage.sync.get({ytblocktitles: []}, function(data) {
                    return data.ytblocktitles;
                });
            break;
            case 'channel':
                chrome.storage.sync.get({ytblockchannels: []}, function(data) {
                    return data.ytblockchannels;
                });
            break;
            case 'all':
                setBlocks('url');
                setBlocks('title');
                setBlocks('channel');
            break;
            default:
                return null;
            break;
        }
    };

    return {
        init,
        getBlocks,
        setBlocks,
        addBlock,
        delBlock
    };
})();

// Rest of YT block functions.
let ytBlock = (function(_user, _ytBlockSettings) {
    const user = _user;
    const ytBlockSettings = _ytBlockSettings;
    let initialized = false;
    let ytVidBlocks = []; // All video blocks on page
    let ytVidObjs = []; // Video object instances
    let mutationObserver = null; // checks when new elements load on page
    
    // For related bar, which loads late
    let loadBarPage = "";

    // Video object
    function Video(_ytVidBlockElement) {  
        this.ytVidBlockElement = _ytVidBlockElement;
        this.blockInfo = {
            url: "", // video watch url
            channel: "", // video channel
            title: "", // video title
            type: "" // Type: 'url', 'title', 'channel'
        };
        this.blocked = false; // if found in block list
        this.hidden = false; // visibility in html

        // If YT updates, this is the most likely to break:
        // Find watch URL and channel urls, title links
        this.allLinkElements = this.ytVidBlockElement.getElementsByTagName('a'); // All A elements in video block
        
        // Different HTML format and tags on different pages, so select per page
        if (window.location.href.endsWith('.com/')) {
            // Front page of YT
            try {
                this.blockInfo.url = this.allLinkElements[0].search;
                this.blockInfo.channel = this.allLinkElements[3].text;
                this.blockInfo.title = this.allLinkElements[2].outerText;
            } catch(err) {}
        } else if (window.location.href.includes('results?search_query=')) {
            // Search page
            try {
                this.blockInfo.url = this.allLinkElements[0].search;
                this.blockInfo.channel = this.allLinkElements[2].text;
                this.blockInfo.title = this.allLinkElements[1].title;
            } catch (err) {}
        } else if (window.location.href.includes('watch?v=')) {
            // Video page specifics. The related video sidebar
            try {
                this.blockInfo.url = this.allLinkElements[0].search;
                // Contains title, view, channel. Seperate...
                let strArr = this.allLinkElements[1].innerText.split('\n');
                this.blockInfo.title = strArr[0];
                this.blockInfo.channel = strArr[1]; 
            } catch (err) {}
        } else {
            console.log("YT-Hide doesn't know this page format yet.");
        }
        
        // Check if video block is in a block list located in memory
        this.checkBlocks = function(type) {
            if (!this.blocked) {
                let arr = user.getBlocks(type);
                for (let i = 0; i < arr.length; i++) {
                    if (arr[i] === this.blockInfo[type]) {
                        this.blockInfo.type = type;
                        this.blocked = true;
                        this.hide(true);
                        return true;
                    }
                }
                return false;
            } else {
                return true; // has already been found
            }
        };

        // Show or hide video block
        this.hide = function(condition) {
            if (condition) {
                this.ytVidBlockElement.style.display = ytBlockSettings.cssVideoHide;
                this.hidden = true;
            } else {
                this.ytVidBlockElement.style.display = ytBlockSettings.cssVideoDisplay;
                this.hidden = false;
            }
        };

        // Check if this video is in the block list
        this.checkBlocks('url');
        this.checkBlocks('channel');
        this.checkBlocks('title');

        // Add hide buttons if not blocked
        if (!this.blocked) {
            this.btnHideChannel = document.createElement('button');
            this.ytVidBlockElement.appendChild(this.btnHideChannel);
            this.btnHideChannel.appendChild(document.createTextNode('Hide Channel'));
            // TODO: give button functionality
            this.btnHideChannel.className = "btn-yt-hide";

            this.btnHideVideo = document.createElement('button');
            this.ytVidBlockElement.appendChild(this.btnHideVideo);
            this.btnHideVideo.appendChild(document.createTextNode('Hide Video'));
            // TODO: give button functionality
            this.btnHideVideo.className = "btn-yt-hide";
        }
    }

    // Go through all blocks and hide videos. Main function to call to start processing.
    let checkVids = function() {
        if (!initialized) {
            return null;
        }

        // Grab YT video blocks
        // Clean, if not already.
        ytVidBlocks = [];
        ytVidObjs = [];

        // Reset mutation observer, and look for further changes to page.
        if (mutationObserver !== null) {
            mutationObserver.disconnect();
            mutationObserver = null;
        }

        // Get all major video blocks
        // Different on different yt pages.
        if (window.location.href.endsWith('.com/')) {
            // Home page
            ytVidBlocks = document.getElementsByTagName(ytBlockSettings.mainFrontPageVideoTag);
            mutationObserver = observe(document.getElementById('primary'));
        } else if (window.location.href.includes('results?search_query=')) {
            // Search pages
            ytVidBlocks = document.getElementsByTagName(ytBlockSettings.mainVideoTag);
            mutationObserver = observe(document.getElementById('contents'));
        } else if (window.location.href.includes('watch?v=')) {
            // Video page
            // The sidebar doesnt appear to load with the rest of the DOM at regular time.
            // Delayed by background.js
            ytVidBlocks = document.getElementsByTagName(ytBlockSettings.mainSideBarVideoTag);
            mutationObserver = observe(document.getElementById('related'));
        } else {
            console.log("YT-Hide doesn't support this page style yet.");
            return null;
        }

        // TEMPORARY. Issue with updating too much due to adding the buttons
        // Reset mutation observer, and look for further changes to page.
        if (mutationObserver !== null) {
            mutationObserver.disconnect();
            mutationObserver = null;
        }

        // Populate video objects.
        for (let i = 0; i < ytVidBlocks.length; i++) {
            ytVidObjs.push(new Video(ytVidBlocks[i]));
        }
        
        console.log("Debug: ");
        console.log(ytVidObjs);
    };

    let observe = function(element) {
        mutationObserver = new MutationObserver(ytBlock.checkVids);
        mutationObserver.observe(element,
            { attributes: false, childList: true, subtree: true }
        );
        return mutationObserver;
    };

    let init = function() {
        user.init();
        let webResources = document.createElement('web.js');
        webResources.type = 'text/javascript';

        initialized = true;
    };

    return {
        init,
        checkVids,
        observe
    };
})(ytBlockUser, ytBlockSettings);
ytBlock.init();

/*
*   Block examples:
*   ytBlockUser.addBlock('channel', '/channel/UCSJ4gkVC6NrvII8umztf0Ow');
*   ytBlockUser.addBlock('title', 'this is a title');
*   ytBlockUser.addBlock('url', "?v=1TY4wM-J4Xo"); <- only need part after .com/watch
*
*/


// Receives message from background.js on page load
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.msg === "checkvids") {
        console.log("CALLED");
        ytBlock.checkVids();
      }
});