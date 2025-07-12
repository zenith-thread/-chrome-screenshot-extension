// Always listen for changes to the `enabled` setting in `chrome.storage.local`.
// If the extension is enabled or disabled, reload the current page to apply or remove behavior.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && "enabled" in changes) {
    location.reload(); // Reload page on toggle
  }
});

// Retrieve the value of `enabled` from Chrome's local storage.
chrome.storage.local.get(["enabled"], (res) => {
  // If the extension is disabled (enabled === false), stop execution here.
  if (res.enabled === false) return;

  // Constants to control debounce and sampling behavior
  const PROCESS_MULTIPLIER = 1.5;
  const SAMPLE_SIZE = 10;
  let durations = [];

  // Create and reuse a single <canvas> and <img> element to avoid memory allocations.
  // This helps reduce memory pressure and improves performance.
  const _img = new Image();
  const _canvas = document.createElement("canvas");
  const _ctx = _canvas.getContext("2d");

  // Create a single overlay <div> to visually highlight the element being captured.
  // This overlay is reused and only shown during capture.
  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "absolute",
    border: "3px solid red",
    boxSizing: "border-box",
    pointerEvents: "none", // allows clicks to pass through
    zIndex: "2147483647", // ensure it is always on top
    display: "none", // hidden by default
  });
  document.documentElement.appendChild(overlay); // Add it to the document

  // Calculates the moving average of the last few screenshot durations.
  // This helps dynamically adjust debounce delay based on actual system speed.
  function getAverageDuration() {
    if (durations.length === 0) return 200; // default fallback duration
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  // Creates a dynamically debounced version of the provided function.
  // The delay adapts based on how long screenshots typically take.
  function dynamicDebounce(fn) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      const average = getAverageDuration();
      const delay = Math.max(100, average * PROCESS_MULTIPLIER);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  // Wrap the screenshot logic with debounce
  const debouncedFormCapture = dynamicDebounce((element) => {
    highlightAndScreenshot(element);
  });

  // Converts a PNG data URL to a compressed JPEG data URL.
  // Helps reduce file size for screenshots.
  function compressImage(pngDataUrl, quality = 0.6) {
    return new Promise((resolve, reject) => {
      _img.onload = () => {
        _canvas.width = _img.naturalWidth;
        _canvas.height = _img.naturalHeight;
        _ctx.drawImage(_img, 0, 0);
        resolve(_canvas.toDataURL("image/jpeg", quality));
      };
      _img.onerror = reject;
      _img.src = pngDataUrl;
    });
  }

  // Highlights the element with a red box overlay, takes a screenshot,
  // compresses it, and sends it to the background script to be saved.
  async function highlightAndScreenshot(element) {
    if (!element) return;

    const PADDING = 6;
    const rect = element.getBoundingClientRect();

    overlay.style.top = `${rect.top + window.scrollY - PADDING}px`;
    overlay.style.left = `${rect.left + window.scrollX - PADDING}px`;
    overlay.style.width = `${rect.width + PADDING * 2}px`;
    overlay.style.height = `${rect.height + PADDING * 2}px`;
    overlay.style.display = "block"; // Show overlay

    // Ensure DOM is updated before screenshot
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const start = performance.now();
    chrome.runtime.sendMessage({ type: "capture_tab" }, async (pngDataUrl) => {
      try {
        if (pngDataUrl) {
          const compressed = await compressImage(pngDataUrl, 0.6);
          chrome.runtime.sendMessage({
            type: "save_screenshot",
            dataUrl: compressed,
          });
          const duration = performance.now() - start;
          durations.push(duration); // Save for average
          if (durations.length > SAMPLE_SIZE) durations.shift(); // Keep fixed sample size
        }
      } catch (error) {
        console.error("Screenshot or compression failed:", error);
      } finally {
        overlay.style.display = "none"; // Always hide overlay after operation
      }
    });
  }

  // ------------------------------
  // Event Listeners
  // ------------------------------

  // Capture a screenshot when the user clicks a link or any element.
  // If the clicked element is a link, delay navigation until screenshot is taken.
  document.addEventListener(
    "click",
    (event) => {
      const anchor = event.target.closest("a[href]");
      if (anchor) {
        event.preventDefault(); // Prevent default navigation
        highlightAndScreenshot(anchor);
        setTimeout(() => {
          // Respect target="_blank" and modifier keys (Ctrl/Meta)
          if (anchor.target === "_blank" || event.ctrlKey || event.metaKey) {
            window.open(anchor.href, "_blank");
          } else {
            window.location.href = anchor.href;
          }
        }, Math.max(100, getAverageDuration() * PROCESS_MULTIPLIER));
      } else {
        highlightAndScreenshot(event.target);
      }
    },
    true // Use capture phase to catch events early
  );

  // When the user types into inputs or editable elements, take a screenshot.
  // This uses debouncing to avoid frequent captures during rapid typing.
  document.addEventListener(
    "input",
    (event) => {
      const element = event.target;
      const tagName = element.tagName.toLowerCase();
      const type = element.getAttribute("type");
      const isEditable = element.isContentEditable;

      if (
        tagName === "input" ||
        tagName === "textarea" ||
        isEditable ||
        ["text", "email", "search", "password"].includes(type)
      ) {
        debouncedFormCapture(element);
      }
    },
    true
  );
});
