console.log("Content script sending video URL:", window.location.href);

chrome.runtime.sendMessage({
    type: "getQuestions",
    video_url: window.location.href
});
