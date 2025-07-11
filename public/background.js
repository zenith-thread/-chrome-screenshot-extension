// background.js
importScripts("idb-keyval-iife.min.js");

// Create your IndexedDB store
const store = new idbKeyval.Store("screenshot-db", "screenshots");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1) Capture raw PNG and return to content script
  if (message.type === "capture_tab") {
    chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: "png" },
      (pngDataUrl) => {
        sendResponse(pngDataUrl);
      }
    );
    return true; // Keep the message channel open for sendResponse
  }

  // 2) Save the compressed JPEG from content script
  if (message.type === "save_screenshot") {
    (async () => {
      const existing = (await idbKeyval.get("all", store)) || [];
      const updated = [
        ...existing,
        {
          dataUrl: message.dataUrl,
          timestamp: Date.now(),
        },
      ];
      await idbKeyval.set("all", updated, store);
      console.log("✅ Screenshot saved (compressed)");
    })();
  }

  // 3) Open image in new tab
  if (message.type === "open_image_tab") {
    chrome.tabs.create({ url: message.image });
  }
});
