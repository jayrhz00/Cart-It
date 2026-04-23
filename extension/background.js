/** Toolbar icon opens the side panel (Chrome 114+). */
function registerPanelClickOpensSide() {
  return chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
}

chrome.runtime.onInstalled.addListener(registerPanelClickOpensSide);
chrome.runtime.onStartup.addListener(registerPanelClickOpensSide);
registerPanelClickOpensSide();

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "CARTIT_TOKEN") {
    const token = typeof message.token === "string" ? message.token : "";
    chrome.storage.local.set({ jwt: token });
  }
});
