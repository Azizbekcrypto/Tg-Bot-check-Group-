import { loadFile, saveFile } from "../utils/fileManager.js";

const contentFile = "./content.json";
let contents = loadFile(contentFile);

export function getContents() {
  return contents;
}

export function addContent(newContent) {
  contents.push(...newContent);
  saveFile(contentFile, contents);
}

export function deleteContent(id = null) {
  if (!id) {
    contents = [];
    saveFile(contentFile, contents);
    return { cleared: true };
  }

  const index = contents.findIndex(c => c.id === id);
  if (index === -1) return null;

  const removed = contents.splice(index, 1);
  saveFile(contentFile, contents);
  return removed[0];
}

export function generateId() {
  const contents = getContents();
  let newId;
  do {
    newId = Math.floor(10000 + Math.random() * 90000).toString();
  } while (contents.some(c => c.id === newId));
  return newId;
}

