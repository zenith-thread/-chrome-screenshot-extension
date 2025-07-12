// App.jsx
import { useEffect, useState, useMemo } from "react";
import {
  loadScreenshots,
  deleteScreenshot,
  clearAllScreenshots,
} from "../db/screenshotStore";

// react icons
import { FaRegTrashAlt } from "react-icons/fa";
import { FaDownload } from "react-icons/fa6";
import { FaFileArchive } from "react-icons/fa";

// for downloading all screenshots in zip
import JSZip from "jszip";
import { saveAs } from "file-saver";

const App = () => {
  const [screenshots, setScreenshots] = useState([]);
  const [sortLatestFirst, setSortLatestFirst] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);

  // Load enabled state from chrome.storage.local
  useEffect(() => {
    chrome.storage.local.get(["enabled"], (res) => {
      setIsEnabled(res.enabled !== false); // default to true
    });
  }, []);

  // Update chrome.storage.local whenever user toggles it
  const toggleEnabled = () => {
    const newState = !isEnabled;
    chrome.storage.local.set({ enabled: newState }, () => {
      setIsEnabled(newState);
    });
  };

  // Load screenshots on mount or when cleared
  useEffect(() => {
    loadScreenshots().then(setScreenshots);
  }, []);

  // Memoized sorted screenshots
  const sortedScreenshots = useMemo(() => {
    return [...screenshots].sort((a, b) =>
      sortLatestFirst ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
    );
  }, [screenshots, sortLatestFirst]);

  const handleDelete = async (index) => {
    await deleteScreenshot(index, sortLatestFirst);
    const updated = await loadScreenshots();
    setScreenshots(updated);
  };

  const handleDownload = (dataUrl, timestamp) => {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `screenshot-${timestamp}.jpg`;
    link.click();
  };

  const handleClearAll = async () => {
    await clearAllScreenshots();
    setScreenshots([]);
  };

  // Create ZIP of all screenshots
  const handleDownloadAll = async () => {
    const zip = new JSZip();
    const folder = zip.folder("screenshots");
    sortedScreenshots.forEach((item) => {
      const base64 = item.dataUrl.split(",")[1];
      folder.file(`screenshot-${item.timestamp}.jpg`, base64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "screenshots.zip");
  };

  return (
    <div className="p-4 overflow-y-auto max-h-[500px] min-w-[400px] text-white">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <label className="text-xs flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sortLatestFirst}
            onChange={() => setSortLatestFirst(!sortLatestFirst)}
          />
          Sort by Latest
        </label>

        <div className="flex items-center gap-2">
          <span className="text-xs">Extension Enabled</span>
          <button
            onClick={toggleEnabled}
            className={`w-10 h-5 rounded-full relative transition-colors duration-300 cursor-pointer ${
              isEnabled ? "bg-green-400" : "bg-gray-400"
            }`}
          >
            <span
              className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow transition-transform duration-300 ${
                isEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <div className="flex justify-between w-full items-center gap-2 mt-4">
          <button
            className="text-xs text-red-400 border border-red-400 px-2 py-1 rounded hover:bg-red-500 hover:text-white transition cursor-pointer"
            onClick={handleClearAll}
          >
            Clear All
          </button>

          <button
            className="text-xs text-green-400 border border-green-400 px-2 py-1 rounded hover:bg-green-500 hover:text-white transition flex items-center gap-1 cursor-pointer"
            onClick={handleDownloadAll}
          >
            <FaFileArchive size={14} /> Download All
          </button>
        </div>
      </div>

      {sortedScreenshots.length ? (
        <div className="grid grid-cols-3 gap-3">
          {sortedScreenshots.map((item, i) => (
            <div
              key={item.timestamp}
              className="flex flex-col bg-white/10 p-2 rounded shadow"
            >
              <img
                src={item.dataUrl}
                alt={`screenshot-${i}`}
                className="w-full aspect-square object-cover rounded cursor-pointer hover:opacity-80 transition"
                onClick={() =>
                  chrome.runtime.sendMessage({
                    type: "open_image_tab",
                    image: item.dataUrl,
                  })
                }
              />
              <span className="text-[10px] mt-1 truncate text-white">
                {new Date(item.timestamp).toLocaleString()}
              </span>
              <div className="flex justify-evenly mt-1 gap-2">
                <button
                  className="text-green-600 hover:text-green-500 cursor-pointer"
                  onClick={() => handleDownload(item.dataUrl, item.timestamp)}
                >
                  <FaDownload size="16px" />
                </button>
                <button
                  className="text-red-600 hover:text-red-500 cursor-pointer"
                  onClick={() => handleDelete(i)}
                >
                  <FaRegTrashAlt size="16px" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white">No screenshots yet.</p>
      )}
    </div>
  );
};

export default App;
