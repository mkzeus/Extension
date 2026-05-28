chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SEARCH_JOBS") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, msg, (response) => {
        sendResponse(response);
      });
    });

    return true; // IMPORTANT async response
  }
});