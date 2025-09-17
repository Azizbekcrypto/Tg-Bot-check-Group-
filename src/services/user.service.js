import { loadFile, saveFile } from "../utils/fileManager.js";

const userFile = "./users.json";
let users = loadFile(userFile);

export function addUser(userId) {
  if (!users.includes(userId)) {
    users.push(userId);
    saveFile(userFile, users);
  }
}

export function getUsers() {
  return users;
}
