# YT-Hide
Hide YouTube videos by channel or URL in this browser extension.
Extension is in alpha release, and must be loaded in developer mode. See installation instructions below.

# Installation:
Go to chrome://extensions in your Chrome browser.
Turn on Developer Mode.
Load Unpacked, and select the YT-Hide directory.

# Variable Explanation
To avoid cluttering code with comments, yet provide information in the event of website changes
- mainFrontPageVideoTag = 'ytd-rich-item-renderer': Only used on YT front page
- mainFrontPageElToObserve = 'primary': ID of the element which videos can load in. Watch for DOM changes here. Front page.
- mainVideoSearchTag = 'ytd-video-renderer': used in YT search pages
- mainVideoSearchElToObserve = 'contents': ID of the element which videos can load in. Watch for DOM changes here. Search page.
- mainSideBarVideoTag = 'ytd-compact-video-renderer': used in side bar
- mainSideBarVideoElToObserve = 'related': ID of the element which videos can load in. Watch for DOM changes here. Side bar in main watch page.
- urlYtSearch = 'results?search_query=': URL for search page. String searches href with includes.
- urlYtWatch = 'watch?v=': URL for video watch page. String searches href with includes.