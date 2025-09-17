import { loadFile, saveFile } from "../utils/fileManager.js";

const channelsFile = "./channels.json";
let channels = loadFile(channelsFile);

export function getChannels() {
  return channels;
}

export function addChannel(channel) {
  if (!channels.includes(channel)) {
    channels.push(channel);
    saveFile(channelsFile, channels);
    return true;
  }
  return false;
}

export function clearChannels() {
  channels = [];
  saveFile(channelsFile, channels);
}

export function listChannels() {
  return channels;
}
