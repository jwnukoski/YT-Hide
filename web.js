// For defining YT settings that may change in the future. All constant settings.
let ytBlockSettings = (function() {
    const mainFrontPageVideoTag = 'ytd-rich-item-renderer'; // Only used on YT front page
    const mainFrontPageElToObserve = 'primary'; // ID of the element which videos can load in. Watch for DOM changes here. Front page.
    const mainVideoSearchTag = 'ytd-video-renderer'; // used in YT search pages
    const mainVideoSearchElToObserve = 'contents'; // ID of the element which videos can load in. Watch for DOM changes here. Search page.
    const mainSideBarVideoTag = 'ytd-compact-video-renderer'; // used in side bar
    const mainSideBarVideoElToObserve = 'related'; // ID of the element which videos can load in. Watch for DOM changes here. Side bar in main watch page.
    const urlYtSearch = 'results?search_query='; // URL for search page. String searches href with includes.
    const urlYtWatch = 'watch?v='; // URL for video watch page. String searches href with includes.
    
    const cssVideoDisplay = 'block';
    const cssVideoHide = 'none';

    return {
        mainFrontPageVideoTag,
        mainFrontPageElToObserve,
        mainVideoSearchTag,
        mainVideoSearchElToObserve,
        mainSideBarVideoTag,
        mainSideBarVideoElToObserve,
        urlYtSearch,
        urlYtWatch,
        cssVideoDisplay,
        cssVideoHide
    };
})();

// Anything related to user settings. Handles saving and getting settings.
let ytBlockUser = (function() {
    let urlBlocks = [];
    let channelBlocks = [];
    
    let init = function() {
        console.log("Loading YT-Hide user preferences...");
        setBlock('sync');
    };

    // Add and save a video block to chrome storage, then sync to memory. 
    // Type = 'url', 'channel'. Val = string. 
    // Use 'sync' to get same data from Chrome storage to memory (although asynchonous)
    let setBlock = function(type, val) {
        // Pushes the value into the array, cleans array in memory, and returns a copy for chrome storage.
        function pushChromeVal(_chromeData) {
            if (!Array.isArray(_chromeData))
                return null;

            const chromeData = [..._chromeData];

            if (val !== '')
                chromeData.push(val);

            return chromeData;
        }

        // Get and set in chrome storage
        switch (type) {
            case 'url':
                chrome.storage.sync.get({ytblockurls: []}, function(data) {
                    const chromeData = pushChromeVal(data.ytblockurls);

                    // Update in memory
                    urlBlocks = [];
                    urlBlocks = [...chromeData];
                
                    // Update in storage
                    if (val !== '' && chromeData !== null) {
                        chrome.storage.sync.set({ytblockurls: chromeData}, function () {
                            console.log(`Added url block: ${val}`);
                        });
                    }
                });
            break;
            case 'channel':
                chrome.storage.sync.get({ytblockchannels: []}, function(data) {
                    const chromeData = pushChromeVal(data.ytblockchannels);

                    // Update in memory
                    channelBlocks = [];
                    channelBlocks = [...chromeData];

                    // Update in storage
                    if (val !== '' && chromeData !== null) {
                        chrome.storage.sync.set({ytblockchannels: chromeData}, function () {
                            console.log(`Added channel block: ${val}`);
                        });
                    }
                });
            break;
            case 'sync':
                setBlock('url', '');
                setBlock('channel', '');
            break;
            default:
                console.log(`Unknown data type in setBlock: ${type}`);
                return null;
            break;
        }
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
    class Video {
        constructor(_ytVidBlockElement) {
            this.ytVidBlockElement = _ytVidBlockElement; // all a elements in video block DOM
            this.blockInfo = {
                url: "", // video watch url
                channel: "", // video channel
                type: "" // Type: 'url', 'channel'
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
                } catch(err) {}
            } else if (urlAddress.includes(ytBlockSettings.urlYtSearch)) {
                // Search page
                try {
                    this.blockInfo.url = this.allLinkElements[0].search;
                    this.blockInfo.channel = this.allLinkElements[2].text;
                } catch (err) {}
            } else if (urlAddress.includes(ytBlockSettings.urlYtWatch)) {
                // Video page specifics. The related video sidebar
                try {
                    // Contains view, channel. Seperate...
                    this.blockInfo.url = this.allLinkElements[0].search;
                    this.blockInfo.channel = this.allLinkElements[1].innerText.split('\n')[1]; 
                } catch (err) {}
            } else {
                console.log("YT-Hide doesn't know this page format yet.");
            }

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

                // Hide video button
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
        }

        // Check if video block is in a block list located in memory
        checkBlocks(type) {
            if (!this.blocked) {
                const arr = user.getMemBlocks(type);
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
        }

        // Show or hide video block
        hide(condition) {
            if (condition) {
                this.ytVidBlockElement.style.display = ytBlockSettings.cssVideoHide;
                this.hidden = true;
            } else {
                this.ytVidBlockElement.style.display = ytBlockSettings.cssVideoDisplay;
                this.hidden = false;
            }
            return condition;
        }

        clean() {
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
        }
    }

    // Go through all blocks and hide videos. Main function to call to 'rescan' for videos to hide.
    // TODO: Lower amount of times this can run.
    let checkVids = function() {
        console.log('checking vids');
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
            elToObserve = document.getElementById(ytBlockSettings.mainFrontPageElToObserve);
        } else if (urlAddress.includes(ytBlockSettings.urlYtSearch)) {
            // Search pages
            populateVidObjs(document.getElementsByTagName(ytBlockSettings.mainVideoSearchTag));
            elToObserve = document.getElementById(ytBlockSettings.mainVideoSearchElToObserve);
        } else if (urlAddress.includes(ytBlockSettings.urlYtWatch)) {
            // Video page
            // The sidebar doesnt appear to load with the rest of the DOM at regular time.
            // Delayed by background.js
            populateVidObjs(document.getElementsByTagName(ytBlockSettings.mainSideBarVideoTag));
            elToObserve = document.getElementById(ytBlockSettings.mainSideBarVideoElToObserve);
        } else {
            console.log("YT-Hide doesn't support this page style yet.");
            return null;
        }
        
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

        // Start looking for changes again
        observe(elToObserve);
    };

    // Pass a null parameter to just stop.
    let observe = function(element) {
        if (mutationObserver !== null) {
            mutationObserver.disconnect();
            mutationObserver = null;
        }

        if (element === null) {
            return null;
        } else {
            mutationObserver = new MutationObserver(ytBlock.checkVids); // Scan page videos and hide if blocked when DOM change found.
            mutationObserver.observe(element,
                { attributes: true, childList: true, subtree: true }
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
            ytBlock.checkVids(); // initial scan
        }
    };

    return {
        init,
        checkVids,
        observe
    };
})(ytBlockUser, ytBlockSettings);
ytBlock.init();