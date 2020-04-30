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
    //let titleBlocks = [];
    let channelBlocks = [];
    
    let init = function() {
        console.log("Loading user preferences...");
        setBlock('sync');
    };

    // Add and save a video block to chrome storage, then sync to memory. 
    // Type = 'url', 'title', 'channel'. Val = string. 
    // Use 'sync' to get same data from Chrome storage to memory (although asynchonous)
    // TODO: DRY principle. Asynchronous functions
    let setBlock = function(type, val) {
        switch (type) {
            case 'url':
                chrome.storage.sync.get({ytblockurls: []}, function(data) {
                    const chromeData = data.ytblockurls.ytblockurls;
                    if (!Array.isArray(chromeData))
                        return null;

                    if (val !== '')
                        chromeData.push(val);

                    // Update in memory
                    urlBlocks = [];
                    urlBlocks = [...chromeData];

                    // Update in storage
                    if (val !== '') {
                        chrome.storage.sync.set({ytblockurls: data}, function () {
                            // Update data chrome sync
                            console.log('Added ytblockurls: ' + val);
                        });
                    }
                });
            break;
            case 'channel':
                chrome.storage.sync.get({ytblockchannels: []}, function(data) {
                    const chromeData = data.ytblockchannels;
                    if (!Array.isArray(chromeData))
                        return null;

                    if (val !== '')
                        chromeData.push(val);

                    // Update in memory
                    channelBlocks = [];
                    channelBlocks = [...chromeData];

                    // Update in storage
                    if (val !== '') {
                        chrome.storage.sync.set({ytblockchannels: chromeData}, function () {
                            // Update data in chrome sync
                            console.log('Added ytblockchannels: ' + val);
                        });
                    }
                });
            break;
            case 'sync':
                setBlock('url', '');
                setBlock('channel', '');
            break;
            default:
                console.log('Unknown data type in setBlock: ' + type);
                return null;
            break;
        }
        ytBlock.checkVids(); // check page again
    };

    // Remove a block from user settings
    let delBlock = function(type, val) {
        // TODO
    };

    // Gets blocks in memory, not Chrome storage
    let getMemBlocks = function(type) {
        switch (type) {
            case 'url':
                return urlBlocks;
            break;
            /*case 'title':
                return titleBlocks;
            break;*/
            case 'channel':
                return channelBlocks;
            break;
            default:
                return null;
            break;
        }
    }

    return {
        init,
        getMemBlocks,
        setBlock,
        delBlock
    };
})();

// Rest of YT block functions.
let ytBlock = (function(_user, _ytBlockSettings) {
    const user = _user;
    const ytBlockSettings = _ytBlockSettings;
    let ytVidObjs = [];
    let initialized = false;
    let mutationObserver = null; // checks when new elements load on page

    // Video object
    function Video(_ytVidBlockElement) {  
        this.ytVidBlockElement = _ytVidBlockElement; // all a elements in video block DOM
        this.blockInfo = {
            url: "", // video watch url
            channel: "", // video channel
            //title: "", // video title
            type: "" // Type: 'url', 'title', 'channel'
        };
        this.blocked = false; // if found in block list
        this.hidden = false; // visibility in html
        this.btnHideChannel = null;
        this.btnHideVideo = null;



        // If YT updates, this is the most likely to break:
        // Find watch URL and channel urls, title links
        // Different HTML format and tags on different pages, so select per page
        this.allLinkElements = this.ytVidBlockElement.getElementsByTagName('a'); // All A elements in video block
        const urlAddress = window.location.href;
        if (urlAddress.endsWith('.com/')) {
            // Front page of YT
            try {
                this.blockInfo.url = this.allLinkElements[0].search;
                this.blockInfo.channel = this.allLinkElements[3].text;
                //this.blockInfo.title = this.allLinkElements[2].outerText;
            } catch(err) {}
        } else if (urlAddress.includes('results?search_query=')) {
            // Search page
            try {
                this.blockInfo.url = this.allLinkElements[0].search;
                this.blockInfo.channel = this.allLinkElements[2].text;
                //this.blockInfo.title = this.allLinkElements[1].title;
            } catch (err) {}
        } else if (urlAddress.includes('watch?v=')) {
            // Video page specifics. The related video sidebar
            try {
                this.blockInfo.url = this.allLinkElements[0].search;
                // Contains title, view, channel. Seperate...
                let strArr = this.allLinkElements[1].innerText.split('\n');
                //this.blockInfo.title = strArr[0];
                this.blockInfo.channel = strArr[1]; 
            } catch (err) {}
        } else {
            console.log("YT-Hide doesn't know this page format yet.");
        }
        



        // Check if video block is in a block list located in memory
        this.checkBlocks = function(type) {
            if (!this.blocked) {
                let arr = user.getMemBlocks(type);
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

        // Check if this video is in the block list. Hide if it is.
        this.checkBlocks('url');
        this.checkBlocks('channel');

        // Add hide buttons if not already blocked and hidden
        if (!this.blocked) {
            // Hide channel button
            this.btnHideChannel = document.createElement('button');
            this.ytVidBlockElement.appendChild(this.btnHideChannel);
            this.btnHideChannel.appendChild(document.createTextNode('Hide Channel'));
            this.btnHideChannel.className = "btn-yt-hide";
            this.btnHideChannel.classList.add("yt-hide-channel");
            this.btnHideChannel.addEventListener('click', () => {
                this.hide(true);
                ytBlockUser.setBlock('channel', this.blockInfo.channel);
            });

            // Hide vidoe button
            this.btnHideVideo = document.createElement('button');
            this.ytVidBlockElement.appendChild(this.btnHideVideo);
            this.btnHideVideo.appendChild(document.createTextNode('Hide Video'));
            this.btnHideVideo.className = "btn-yt-hide";
            this.btnHideVideo.classList.add("yt-hide-video");
            this.btnHideVideo.addEventListener('click', () => {
                this.hide(true);
                ytBlockUser.setBlock('url', this.blockInfo.url);
            });
        }

        this.clean = function() {
            // Remove buttons
            if (this.btnHideChannel !== null) {
                this.btnHideChannel.remove();
                this.btnHideChannel = null;
            }
            if (this.btnHideVideo !== null) {
                this.btnHideVideo.remove();
                this.btnHideVideo = null;
            }

            // Reset everything else
            this.ytVidBlockElement = null;
            this.blockInfo = null;
            this.blocked = false;
            this.hidden = false;
            this.btnHideChannel = null;
            this.btnHideVideo = null;
        };
    }

    // Go through all blocks and hide videos. Main function to call to start processing.
    let checkVids = function() {
        if (!initialized) {
            return null;
        }

        // Stop observing DOM changes, we'll be making alot of changes below
        observe(null);

        // Get all major video blocks
        // Different on different yt pages.
        let elToObserve = null;
        const urlAddress = window.location.href;
        if (urlAddress.endsWith('.com/')) {
            // Home page
            populateVidObjs(document.getElementsByTagName(ytBlockSettings.mainFrontPageVideoTag));
            elToObserve = document.getElementById('primary');
        } else if (urlAddress.includes('results?search_query=')) {
            // Search pages
            populateVidObjs(document.getElementsByTagName(ytBlockSettings.mainVideoTag));
            elToObserve = document.getElementById('contents');
        } else if (urlAddress.includes('watch?v=')) {
            // Video page
            // The sidebar doesnt appear to load with the rest of the DOM at regular time.
            // Delayed by background.js
            populateVidObjs(document.getElementsByTagName(ytBlockSettings.mainSideBarVideoTag));
            elToObserve = document.getElementById('related');
        } else {
            console.log("YT-Hide doesn't support this page style yet.");
            return null;
        }

        // Start looking for changes again
        observe(elToObserve);
        
        // Populate video objects. 
        function populateVidObjs(_ytVidBlocks) {
            // Clean
            ytVidObjs.forEach(function(vidObj) {
                vidObj.clean();
            });
            ytVidObjs.splice(0, ytVidObjs.length); // empty array

            // Populate
            for (let i = 0; i < _ytVidBlocks.length; i++) {
                ytVidObjs.push(new Video(_ytVidBlocks[i]));
            }
        }
    };

    // Pass a null parameter to just stop.
    let observe = function(element) {
        if (mutationObserver !== null) {
            mutationObserver.disconnect();
            mutationObserver = null;
        }

        if (element === null) {; 
            return null;
        } else {
            mutationObserver = new MutationObserver(ytBlock.checkVids);
            mutationObserver.observe(element,
                { attributes: false, childList: true, subtree: true }
            );
            return mutationObserver;
        }
    };

    // Initialize
    let init = function() {
        if (!initialized) {
            user.init();
            let webResources = document.createElement('web.js');
            webResources.type = 'text/javascript';
            initialized = true;
            ytBlock.checkVids();
        }
    };

    return {
        init,
        checkVids,
        observe
    };
})(ytBlockUser, ytBlockSettings);
ytBlock.init();




// Receives message from background.js on page load
chrome.runtime.onMessage.addListener(
    function(request) {
      if (request.msg === "checkvids")
        ytBlock.checkVids();
});