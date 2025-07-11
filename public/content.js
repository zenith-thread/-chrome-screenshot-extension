// Debounce helper
function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Inject highlight style once (but wait for <head>)
function injectHighlightStyle() {
  const style = document.createElement("style");
  style.textContent = `
    .__screenshot-highlight {
      outline: 3px solid red !important;
    }
  `;
  document.head.appendChild(style);
}
function waitForHeadAndInject() {
  if (document.head) injectHighlightStyle();
  else {
    const obs = new MutationObserver(() => {
      if (document.head) {
        obs.disconnect();
        injectHighlightStyle();
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
}
waitForHeadAndInject();

// Utility: compress a PNG dataURL → JPEG dataURL
function compressImage(pngDataUrl, quality = 0.6) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(jpegDataUrl);
    };
    img.src = pngDataUrl;
  });
}

// Core: highlight element, capture, compress, save, then remove highlight
async function highlightAndScreenshot(el) {
  if (!el) return;

  // 1) Highlight
  el.classList.add("__screenshot-highlight");

  // 2) Wait for paint
  await new Promise((r) => setTimeout(r, 50));

  // 3) Capture raw screenshot from background
  chrome.runtime.sendMessage({ type: "capture_tab" }, async (pngDataUrl) => {
    if (!pngDataUrl) {
      el.classList.remove("__screenshot-highlight");
      return;
    }

    // 4) Compress to JPEG
    const compressed = await compressImage(pngDataUrl, 0.6);

    // 5) Send to background to save
    chrome.runtime.sendMessage({
      type: "save_screenshot",
      dataUrl: compressed,
    });

    // 6) Clean up highlight
    setTimeout(() => {
      el.classList.remove("__screenshot-highlight");
    }, 100);
  });
}

// Click — capture phase
document.addEventListener(
  "click",
  (e) => {
    highlightAndScreenshot(e.target);
  },
  true
);

// Input — capture phase, debounced
document.addEventListener(
  "input",
  debounce((e) => {
    highlightAndScreenshot(e.target);
  }, 300),
  true
);

// Keydown — capture phase, debounced
document.addEventListener(
  "keydown",
  debounce((e) => {
    if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete") {
      highlightAndScreenshot(document.activeElement);
    }
  }, 500),
  true
);
