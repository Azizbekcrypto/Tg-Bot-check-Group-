import { loadFile, saveFile } from "../utils/fileManager.js";

const userFile = "./users.json";
let users = loadFile(userFile);

// 🔹 Foydalanuvchi qo‘shish
export function addUser(userId) {
  // allaqachon ro‘yxatda bormi?
  if (!users.find(u => u.id === userId)) {
    users.push({
      id: userId,
      joinedAt: new Date().toISOString() // ✅ timestamp qo‘shdik
    });
    saveFile(userFile, users);
  }
}

// 🔹 Foydalanuvchilarni olish
export function getUsers() {
  return users;
}

