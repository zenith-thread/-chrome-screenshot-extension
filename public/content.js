let lastProcessTime = 200; // start with a sensible default (200 ms)
const PROCESS_MULTIPLIER = 1.5;

// Debounce helper
function dynamicDebounce(fn) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(
      () => fn.apply(this, args),
      Math.max(100, lastProcessTime * PROCESS_MULTIPLIER)
    );
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

  el.classList.add("__screenshot-highlight");
  await new Promise((r) => setTimeout(r, 50));

  const start = performance.now(); // ← start timer
  chrome.runtime.sendMessage({ type: "capture_tab" }, async (png) => {
    if (!png) {
      el.classList.remove("__screenshot-highlight");
      return;
    }
    const compressed = await compressImage(png, 0.6);
    chrome.runtime.sendMessage({
      type: "save_screenshot",
      dataUrl: compressed,
    });
    const duration = performance.now() - start; // ← measure duration
    lastProcessTime = duration; // ← update global
    console.log(`Process took ${Math.round(duration)}ms`);
    setTimeout(() => el.classList.remove("__screenshot-highlight"), 100);
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

// Debounced input listener (dynamic)
const debouncedInput = dynamicDebounce((e) => {
  const el = e.target;
  highlightAndScreenshot(el);
});
document.addEventListener("input", debouncedInput, true);

// Debounced keydown listener (dynamic)
const debouncedKeydown = dynamicDebounce(() => {
  highlightAndScreenshot(document.activeElement);
});
document.addEventListener(
  "keydown",
  (e) => {
    if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete") {
      debouncedKeydown();
    }
  },
  true
);
