chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.type === "LOGIN_SUCCESS") {
      chrome.storage.local.set({
        authToken: request.token,
        userData: request.user
      }, () => {
        console.log("Session synchronized from web.");
        sendResponse({ success: true });
      });
      return true; 
    }
  }
);