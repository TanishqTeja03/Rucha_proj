
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "playVideo") {
        const video = document.querySelector("video");
        if (video) {
            video.play();
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: "Video element not found" });
        }
    }
});
