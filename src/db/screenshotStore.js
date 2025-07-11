import { createStore, get, set } from "idb-keyval";

// create a separate store
const store = createStore("screenshot-db", "screenshots");

export const saveScreenshots = async (images) => {
  await set("all", images, store);
};

export const loadScreenshots = async () => {
  const data = await get("all", store);
  return data || [];
};

export const deleteScreenshot = async (indexToRemove) => {
  const all = (await get("all", store)) || [];
  const sorted = all.sort((a, b) => b.timestamp - a.timestamp);
  sorted.splice(indexToRemove, 1);
  await set("all", sorted, store);
};

export const clearAllScreenshots = async () => {
  await set("all", [], store);
};
