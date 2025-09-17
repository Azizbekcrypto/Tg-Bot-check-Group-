import { addChannel, listChannels, clearChannels } from "../services/channel.service.js";
import { addContent, deleteContent, getContents, generateId } from "../services/content.service.js";
import { getUsers } from "../services/user.service.js";

export function registerAdminHandlers(bot, adminId) {
  // Kanal qo‘shish
  bot.onText(/\/add (.+)/, (msg, match) => {
    if (msg.from.id.toString() !== adminId) return;
    const channel = match[1].trim();
    if (!channel.startsWith("@")) return bot.sendMessage(msg.chat.id, "❌ Kanal username @ bilan boshlanishi kerak");

    if (addChannel(channel)) {
      bot.sendMessage(msg.chat.id, `✅ ${channel} qo‘shildi va saqlandi!`);
    } else {
      bot.sendMessage(msg.chat.id, `⚠️ ${channel} allaqachon qo‘shilgan`);
    }
  });

  // Kanal listi
  bot.onText(/\/list/, (msg) => {
    if (msg.from.id.toString() !== adminId) return;
    const channels = listChannels();
    if (channels.length === 0) return bot.sendMessage(msg.chat.id, "📭 Hozircha hech qanday kanal yo‘q");
    bot.sendMessage(msg.chat.id, `📢 Kanallar ro‘yxati:\n${channels.map((c, i) => `${i + 1}. ${c}`).join("\n")}`);
  });

  // Kanallarni Tozalash
  bot.onText(/\/clear/, (msg) => {
    if (msg.from.id.toString() !== adminId) return;
    clearChannels();
    bot.sendMessage(msg.chat.id, "🗑 Barcha kanallar o‘chirildi!");
  });


  // 📄 /contentlist komandasi
  bot.onText(/\/contentlist/, async (msg) => {
    if (msg.from?.id.toString() !== adminId) return;

    const contents = getContents();
    if (contents.length === 0) {
      return bot.sendMessage(msg.chat.id, "📭 Hozircha saqlangan content yo‘q.");
    }

    for (const c of contents) {
      const keyboard = {
        reply_markup: {
          inline_keyboard: [
            [{ text: "❌ O‘chirish", callback_data: `delete_${c.id}` }]
          ]
        }
      };

      if (c.type === "photo") {
        await bot.sendPhoto(msg.chat.id, c.data, { ...keyboard, caption: `🆔 ${c.id}` });
      } else if (c.type === "video") {
        await bot.sendVideo(msg.chat.id, c.data, { ...keyboard, caption: `🆔 ${c.id}` });
      } else if (c.type === "document") {
        await bot.sendDocument(msg.chat.id, c.data, { ...keyboard, caption: `🆔 ${c.id}` });
      }
    }
  });

  // ❌ O‘chirish callback
  bot.on("callback_query", async (query) => {
    if (query.from.id.toString() !== adminId) return;

    const chatId = query.message.chat.id;
    if (query.data.startsWith("delete_")) {
      const id = query.data.replace("delete_", "");
      const removed = deleteContent(id);
      if (removed) {
        await bot.sendMessage(chatId, `🗑 Content o‘chirildi! (ID: ${id})`);
      } else {
        await bot.sendMessage(chatId, `⚠️ Content topilmadi (ID: ${id})`);
      }
    }

    await bot.answerCallbackQuery(query.id); // ✅ tugmani bosganda "loading"ni yo‘qotadi
  });


  let waitingBroadcast = false; // ✅ flag qo‘shamiz 

  // Content qo‘shish
  bot.on("message", (msg) => {
    if (msg.from?.id.toString() !== adminId) return;

    // ❌ Agar hozir broadcast uchun xabar kutilayotgan bo‘lsa, saqlamaymiz
    if (waitingBroadcast) return;

    const newContent = [];

    if (msg.photo) {
      const photo = msg.photo[msg.photo.length - 1].file_id;
      newContent.push({ id: generateId(), type: "photo", data: photo, caption: msg.caption || null });
    }

    if (msg.video) {
      newContent.push({ id: generateId(), type: "video", data: msg.video.file_id, caption: msg.caption || null });
    }

    if (msg.document) {
      newContent.push({ id: generateId(), type: "document", data: msg.document.file_id, caption: msg.caption || null });
    }

    if (msg.text && !msg.text.startsWith("/")) {
      newContent.push({ id: generateId(), type: "text", data: msg.text });
    }

    if (newContent.length > 0) {
      addContent(newContent);
      const savedList = newContent.map(c => `🔹 [${c.type}] ID: ${c.id}`).join("\n");
      bot.sendMessage(msg.chat.id, `✅ Content saqlandi!\n\n${savedList}`);
    }
  });


  // 📢 Admin -> barcha foydalanuvchilarga yuborish
  bot.onText(/\/sendall/, (msg) => {
    if (msg.from?.id.toString() !== adminId) return;

    bot.sendMessage(adminId, "✍️ Yubormoqchi bo‘lgan xabaringizni kiriting...");
    waitingBroadcast = true; // ✅ shu vaqtda content saqlash bloklanadi

    bot.once("message", async (message) => {
      if (message.from?.id.toString() !== adminId) return;

      const users = getUsers().filter(u => u.toString() !== adminId);

      let success = 0, fail = 0;
      for (const userId of users) {
        try {
          await bot.copyMessage(userId, adminId, message.message_id);
          success++;
        } catch {
          fail++;
        }
      }

      bot.sendMessage(adminId, `📢 Yuborildi: ${success} ta\n❌ Xatolik: ${fail} ta`);

      waitingBroadcast = false; // ✅ broadcast tugadi
    });
  });


  // 📊 Statistika komandasi
  // 📊 Statistika komandasi
  bot.onText(/\/stats/, (msg) => {
    if (msg.from?.id.toString() !== adminId) return;

    const users = getUsers();
    const contents = getContents();

    // Umumiy son
    const userCount = users.length;
    const contentCount = contents.length;

    // 🔹 Oxirgi 1 oy ichida qo‘shilgan userlarni sanaymiz
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const monthlyUsers = users.filter(u => new Date(u.joinedAt) >= oneMonthAgo).length;

    const statsMessage = `
📊 <b>Statistika</b>

👥 Umumiy foydalanuvchilar: <b>${userCount}</b>
🗓 Oxirgi 1 oyda qo‘shilgan: <b>${monthlyUsers}</b>
🗂 Saqlangan contentlar: <b>${contentCount}</b>
  `;

    bot.sendMessage(msg.chat.id, statsMessage, { parse_mode: "HTML" });
  });


}
