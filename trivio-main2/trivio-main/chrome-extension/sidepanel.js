let question_bank = [];
let timestamps = [];

// ✅ Listen for messages from content scripts (pageLogic.js or content.js)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Sidepanel received message:", request);

    const handleMessage = async () => {
        try {
            if (request.type === "getQuestions") {
                console.log("Fetching questions for video:", request.video_url);

                await send_get_question_request(request.video_url);

                timestamps = question_bank.map(q => q.timestamp);
                console.log("Timestamps extracted:", timestamps);

                return { success: true, timestamp: timestamps };
            }

            if (request.type === "displayQuestion") {
                await display_question(request.idx);
                return { success: true };
            }

            return { success: false, error: "Unknown message type" };
        } catch (error) {
            console.error("Error handling message:", error);
            return { success: false, error: error.message };
        }
    };

    Promise.resolve(handleMessage()).then(sendResponse);

    return true;  // Required to keep sendResponse channel open for async work
});

// ✅ Function to fetch questions from Flask
async function send_get_question_request(video_url) {
    const url = "http://127.0.0.1:5000/questions";  // Ensure Flask is running on port 5000

    console.log("Sending request to Flask backend...");
    console.log("Video URL being sent:", video_url);

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "link": video_url,
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        question_bank = data;
        console.log("Questions received from Flask:", question_bank);

        timestamps = question_bank.map(q => q.timestamp);
        console.log("Timestamps extracted:", timestamps);

        return question_bank;
    } catch (error) {
        console.error("Error fetching questions:", error);
        throw error;
    }
}

// ✅ Function to display a question in the side panel
async function display_question(idx) {
    if (!question_bank[idx]) {
        console.warn(`Question at index ${idx} not found.`);
        return;
    }

    console.log("Displaying question at index:", idx);
    console.log("Question data:", question_bank[idx]);

    document.getElementById("question").textContent = question_bank[idx].question;
    populate_options_and_check_answer(idx);
}

// ✅ Populate options and set event listeners for answers
function populate_options_and_check_answer(idx) {
    const options = ['answer-a', 'answer-b', 'answer-c', 'answer-d'];
    const continueButton = document.getElementById('continue');

    if (continueButton.style.display === "block") {
        return;
    }

    continueButton.onclick = null;

    options.forEach((entry, i) => {
        const element = document.getElementById(entry);
        element.style.display = "block";
        element.textContent = question_bank[idx].answers[i];

        element.onclick = () => handleAnswerClick(element, idx, options, continueButton);
    });
}

// ✅ Handle answer click
function handleAnswerClick(element, idx, options, continueButton) {
    if (question_bank[idx].correct_answer === element.textContent) {
        element.style.backgroundColor = "green";
        continueButton.style.display = "block";

        continueButton.onclick = () => resetForNextQuestion(options, continueButton);
    } else {
        element.style.backgroundColor = "red";
    }

    options.forEach(option => {
        if (document.getElementById(option) !== element) {
            document.getElementById(option).style.backgroundColor = null;
        }
    });
}

// ✅ Reset the side panel for the next question
function resetForNextQuestion(options, continueButton) {
    document.getElementById("question").textContent = "Waiting for next question...";
    
    options.forEach(option => {
        const btn = document.getElementById(option);
        btn.style.display = "none";
        btn.style.backgroundColor = null;
    });

    continueButton.style.display = "none";

    playVideo();
}

// ✅ Resume the video after answering the question
function playVideo() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length === 0) {
            console.error("No active tab found");
            return;
        }

        chrome.tabs.sendMessage(tabs[0].id, { type: "playVideo" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending playVideo message:", chrome.runtime.lastError.message);
                return;
            }

            if (response?.success) {
                console.log("Video playback started successfully");
            } else {
                console.error("Failed to play video:", response?.error);
            }
        });
    });
}
