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
      outline: 4px solid red !important;
      background-color: rgba(255, 0, 0, 0.12) !important;
    }
  `;
  document.head.appendChild(style);
}

function waitForHeadAndInject() {
  if (document.head) {
    injectHighlightStyle();
  } else {
    const observer = new MutationObserver(() => {
      if (document.head) {
        observer.disconnect();
        injectHighlightStyle();
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
}

waitForHeadAndInject();

function highlightAndScreenshot(el) {
  if (!el) return;

  el.classList.add("__screenshot-highlight");

  // Wait for highlight to visibly render before screenshot
  setTimeout(() => {
    chrome.runtime.sendMessage({ type: "screenshot_request" });

    // Remove highlight AFTER screenshot
    setTimeout(() => {
      el.classList.remove("__screenshot-highlight");
    }, 50);
  }, 50);
}

// Click listener — instant
document.addEventListener("click", (e) => {
  highlightAndScreenshot(e.target);
});

// Debounced input screenshot
const sendScreenshotRequest = debounce((el) => {
  highlightAndScreenshot(el);
}, 300);

// Input listener
document.addEventListener("input", (e) => {
  const el = e.target;
  const tag = el.tagName.toLowerCase();
  const type = el.getAttribute("type");
  const isContentEditable = el.isContentEditable;

  if (
    tag === "input" ||
    tag === "textarea" ||
    isContentEditable ||
    ["text", "email", "search", "password"].includes(type)
  ) {
    sendScreenshotRequest(el);
  }
});
