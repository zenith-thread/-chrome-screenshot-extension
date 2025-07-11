importScripts("idb-keyval-iife.min.js");

const store = new idbKeyval.Store("screenshot-db", "screenshots");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "screenshot_request") {
    chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: "png" },
      async (dataUrl) => {
        const existing = (await idbKeyval.get("all", store)) || [];
        const updated = [...existing, { dataUrl, timestamp: Date.now() }];
        await idbKeyval.set("all", updated, store);
        console.log("Screenshot saved to indexedDB");
      }
    );
  }
  if (message.type === "open_image_tab") {
    chrome.tabs.create({
      url: message.image,
    });
  }
});
