import { useEffect, useState } from "react";
import {
  loadScreenshots,
  deleteScreenshot,
  clearAllScreenshots,
} from "../db/screenshotStore";

// react icons
import { FaRegTrashAlt } from "react-icons/fa";
import { FaDownload } from "react-icons/fa6";

const App = () => {
  const [screenshots, setScreenshots] = useState([]);
  const [sortLatestFirst, setSortLatestFirst] = useState(true);

  useEffect(() => {
    loadScreenshots().then((data) => {
      const sorted = [...data].sort((a, b) =>
        sortLatestFirst ? b.timestamp - a.timestamp : a.timestamp - b.timestamp
      );
      setScreenshots(sorted);
    });
  }, [sortLatestFirst]);

  const handleDelete = async (index) => {
    await deleteScreenshot(index, sortLatestFirst);
    const updated = await loadScreenshots();
    setScreenshots(updated);
  };

  const handleDownload = (imageDataUrl) => {
    const link = document.createElement("a");
    link.href = imageDataUrl;
    link.download = `screenshot-${Date.now()}.png`;
    link.click();
  };

  const handleClearAll = async () => {
    await clearAllScreenshots();
    setScreenshots([]);
  };
  return (
    <div className="p-4 overflow-y-auto max-h-[500px] min-w-[400px]">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-white font-semibold text-lg">Screenshots</h1>
        <label className="text-white text-xs flex items-center gap-1 cursor-pointer">
          <input
            type="checkbox"
            checked={sortLatestFirst}
            onChange={() => setSortLatestFirst(!sortLatestFirst)}
          />
          Sort by Latest
        </label>
        <button
          className="text-xs text-red-400 border border-red-400 px-2 py-1 rounded hover:bg-red-500 hover:text-white transition cursor-pointer"
          onClick={handleClearAll}
        >
          Clear All
        </button>
      </div>

      {screenshots.length ? (
        <div className="grid grid-cols-3 gap-3">
          {screenshots.map((item, i) => (
            <div
              key={i}
              className="flex flex-col bg-white/10 p-2 rounded shadow text-white"
            >
              <img
                src={item.dataUrl}
                alt={`screenshot-${i}`}
                className="w-full aspect-square object-cover rounded cursor-pointer hover:opacity-80 transition"
                onClick={() => {
                  chrome.runtime.sendMessage({
                    type: "open_image_tab",
                    image: item.dataUrl,
                  });
                }}
              />
              <span className="text-[10px] mt-1 truncate">
                {new Date(item.timestamp).toLocaleString()}
              </span>
              <div className="flex justify-evenly mt-1 gap-2">
                <button
                  className="text-green-600 hover:text-green-500 cursor-pointer"
                  onClick={() => handleDownload(item.dataUrl)}
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
