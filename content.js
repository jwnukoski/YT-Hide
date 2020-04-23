// For defining YouTube settings that may change in the future. All constant settings.
let ytBlockSettings = (function() {
    const mainFrontPageVideoTag = 'ytd-rich-item-renderer'; // Only used on youtube front page
    const mainVideoTag = 'ytd-video-renderer'; // used in youtube search pages
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
            ytBlock.checkVids();
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

// Rest of YouTube block functions.
let ytBlock = (function(_user, _ytBlockSettings) {
    const user = _user;
    const ytBlockSettings = _ytBlockSettings;
    let initialized = false;
    let ytVidBlocks = []; // All video blocks on page
    let ytVidObjs = []; // Video object instances

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

        // If YouTube updates, this is the most likely to break:
        // Find watch URL and channel urls
        this.allLinkElements = this.ytVidBlockElement.getElementsByTagName('a'); // All A elements in video block

        // Set video url
        try {
            this.blockInfo.url = this.allLinkElements[0].search; // should be same on most pages
        } catch(err) {
            console.log(err);
        }

        // Set video Title
        try {
            this.blockInfo.title = this.allLinkElements[1].title; // only in search
        } catch(err) {
            console.log(err);
        }

        // Set channel URL
        try {
            this.blockInfo.channel = this.allLinkElements[2].pathname; // only in search
        } catch (err) {
            console.log(err);
        }
       
        // Home page specifics.
        if (this.blockInfo.channel === "/watch") {
            try {
                this.blockInfo.channel = this.allLinkElements[3].pathname;
                this.blockInfo.title = this.allLinkElements[2].title;
            } catch (err) {
                console.log(err);
            }
        }
        
        // Check if block is in a block list located in memory
        this.checkBlocks = function(type) {
            if (!this.blocked) {
                let arr = user.getBlocks(type);
                for (let i = 0; i < arr.length; i++) {
                    if (arr[i] === this.blockInfo[type]) {
                        this.blockInfo.type = type;
                        this.blocked = true;
                        this.hide(true);
                        break;
                    }
                }
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
    }

    // Go through all blocks and hide videos. Main function to call to start processing.
    let checkVids = function() {
        if (!initialized) {
            return null;
        }

        // Grab YouTube video blocks
        // Clean, if not already.
        ytVidBlocks = [];
        ytVidObjs = [];
        // Get all major video blocks
        // Front page
        console.log("Checking if you're on the front page...");
        ytVidBlocks = document.getElementsByTagName(ytBlockSettings.mainFrontPageVideoTag);
        if (ytVidBlocks.length <= 0) {
            // Search Pages
            console.log("Checking if you're on a search page...");
            ytVidBlocks = document.getElementsByTagName(ytBlockSettings.mainVideoTag);
        }
        if (ytVidBlocks.length <= 0) {
            // Side bar
            console.log("Checking if you're on a video page...");
            ytVidBlocks = document.getElementsByTagName(ytBlockSettings.mainSideBarVideoTag);
        }

        // Populate video objects.
        for (let i = 0; i < ytVidBlocks.length; i++) {
            ytVidObjs.push(new Video(ytVidBlocks[i]));
        }
        console.log(ytVidObjs);
    };

    let init = function() {
        console.log("YouTube Hide starting...");
        user.init();
        initialized = true;
        checkVids();
    };

    return {
        init,
        checkVids
    };
})(ytBlockUser, ytBlockSettings);
ytBlock.init();

/*
*   Block examples:
*   ytBlockUser.addBlock('channel', '/channel/UCSJ4gkVC6NrvII8umztf0Ow');
*   ytBlockUser.addBlock('title', 'this is a title');
*   ytBlockUser.addBlock('url', "?v=1TY4wM-J4Xo"); <- only need part after youtube.com/watch
*
*/

// Receives message from background.js on page load
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (request.msg === "checkvids") {
        ytBlock.checkVids();
      }
});