// src/main.js
import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import config from "./config/index.js";

dotenv.config();

const bot = new TelegramBot(config.TOKEN, { polling: true });
const adminId = config.ADMIN_ID;

// 📂 Fayl nomlari
const channelsFile = "./channels.json";
const contentFile = "./content.json";

// 📥 Fayldan kanallarni o‘qish
function loadChannels() {
    if (fs.existsSync(channelsFile)) {
        return JSON.parse(fs.readFileSync(channelsFile, "utf-8"));
    }
    return [];
}

// 📥 Fayldan content o‘qish
function loadContent() {
    if (fs.existsSync(contentFile)) {
        return JSON.parse(fs.readFileSync(contentFile, "utf-8"));
    }
    return [];
}

// 📤 Faylga saqlash
function saveChannels(channels) {
    fs.writeFileSync(channelsFile, JSON.stringify(channels, null, 2));
}

function saveContent(contents) {
    fs.writeFileSync(contentFile, JSON.stringify(contents, null, 2));
}

// 🔄 Boshlanishida yuklab olish
let channels = loadChannels();
let contents = loadContent();

// 🔹 Admin kanal qo‘shishi
bot.onText(/\/add (.+)/, (msg, match) => {
    if (msg.from.id.toString() !== adminId) return;
    const channel = match[1].trim();
    if (!channel.startsWith("@")) return bot.sendMessage(msg.chat.id, "❌ Kanal username @ bilan boshlanishi kerak");

    if (!channels.includes(channel)) {
        channels.push(channel);
        saveChannels(channels);
        bot.sendMessage(msg.chat.id, `✅ ${channel} qo‘shildi va saqlandi!`);
    } else {
        bot.sendMessage(msg.chat.id, `⚠️ ${channel} allaqachon qo‘shilgan`);
    }
});

// 🔹 Kanallar ro‘yxatini ko‘rish
bot.onText(/\/list/, (msg) => {
    if (msg.from.id.toString() !== adminId) return;
    if (channels.length === 0) return bot.sendMessage(msg.chat.id, "📭 Hozircha hech qanday kanal yo‘q");
    const list = channels.map((c, i) => `${i + 1}. ${c}`).join("\n");
    bot.sendMessage(msg.chat.id, `📢 Kanallar ro‘yxati:\n${list}`);
});

// 🔹 Kanallarni tozalash
bot.onText(/\/clear/, (msg) => {
    if (msg.from.id.toString() !== adminId) return;
    channels = [];
    saveChannels(channels);
    bot.sendMessage(msg.chat.id, "🗑 Barcha kanallar o‘chirildi!");
});

// 🔹 Content qo‘shish avtomatik (file, rasm, video, document yoki text)
bot.on("message", (msg) => {
    if (msg.from?.id.toString() !== adminId) return;

    const newContent = [];

    // Unikal ID yaratish
    const genId = () => crypto.randomUUID();

    // Agar rasm bo‘lsa
    if (msg.photo) {
        const photo = msg.photo[msg.photo.length - 1].file_id;
        newContent.push({ id: genId(), type: "photo", data: photo });
        if (msg.caption) newContent.push({ id: genId(), type: "text", data: msg.caption });
    }

    // Video bo‘lsa
    if (msg.video) {
        newContent.push({ id: genId(), type: "video", data: msg.video.file_id });
        if (msg.caption) newContent.push({ id: genId(), type: "text", data: msg.caption });
    }

    // Document bo‘lsa
    if (msg.document) {
        newContent.push({ id: genId(), type: "document", data: msg.document.file_id });
        if (msg.caption) newContent.push({ id: genId(), type: "text", data: msg.caption });
    }

    // Text bo‘lsa (faqat komandalar bo‘lmasa)
    if (msg.text && !msg.text.startsWith("/")) {
        newContent.push({ id: genId(), type: "text", data: msg.text });
    }

    // Yangi content bo‘lsa saqlaymiz
    if (newContent.length > 0) {
        contents.push(...newContent);
        saveContent(contents);
        bot.sendMessage(msg.chat.id, `✅ Content saqlandi! (${newContent.map(c => `[${c.type}] ${c.id}`).join(", ")})`);
    }
});

// 🔹 Content o‘chirish: /delcontent <ID> yoki hammasi
bot.onText(/\/delcontent(?:\s(.+))?/, (msg, match) => {
    if (msg.from.id.toString() !== adminId) return;

    const id = match[1]?.trim();

    if (!id) {
        // ID berilmagan bo‘lsa → barcha content’larni o‘chirish
        contents = [];
        saveContent(contents);
        return bot.sendMessage(msg.chat.id, "🗑 Barcha content o‘chirildi!");
    }

    const index = contents.findIndex(c => c.id === id);
    if (index === -1) return bot.sendMessage(msg.chat.id, "❌ Noto‘g‘ri ID");

    const removed = contents.splice(index, 1);
    saveContent(contents);
    bot.sendMessage(msg.chat.id, `🗑 Content o‘chirildi: ${removed[0].type}`);
});

// 🔹 Content ko‘rish
bot.onText(/\/contentlist/, (msg) => {
    if (msg.from.id.toString() !== adminId) return;
    if (contents.length === 0) return bot.sendMessage(msg.chat.id, "📭 Content yo‘q");
    const list = contents.map((c) => `🆔 ${c.id} | [${c.type}] ${c.data}`).join("\n\n");
    bot.sendMessage(msg.chat.id, `📄 Saqlangan content:\n\n${list}`);
});

// 🔍 Obuna tekshirish funksiyasi
async function checkSubscription(userId) {
    let unsubscribed = [];
    for (let channel of channels) {
        try {
            const member = await bot.getChatMember(channel, userId);
            if (!["member", "creator", "administrator"].includes(member.status)) {
                unsubscribed.push(channel);
            }
        } catch (err) {
            console.log("❌ Xatolik:", channel, err.description);
            unsubscribed.push(channel);
        }
    }
    return unsubscribed;
}

// 🚀 Start komandasi
bot.onText(/\/start/, async (msg) => {
    if (channels.length === 0) return bot.sendMessage(msg.chat.id, "📭 Hozircha kanal yo‘q");

    const unsubscribed = await checkSubscription(msg.from.id);

    if (unsubscribed.length > 0) {
        const buttons = unsubscribed.map((c) => [{ text: `➕ Obuna bo‘lish`, url: `https://t.me/${c.slice(1)}` }]);
        buttons.push([{ text: "✅ Qo‘shildim", callback_data: "check" }]);

        await bot.sendMessage(msg.chat.id, "❌ Siz barcha kanallarga obuna bo‘lmadingiz!\n\nIltimos, quyidagilarga qo‘shiling:", { reply_markup: { inline_keyboard: buttons } });
    } else {
        await bot.sendMessage(msg.chat.id, "✅ Siz barcha kanallarga obuna bo‘ldingiz!");

        for (let content of contents) {
            switch (content.type) {
                case "text": await bot.sendMessage(msg.chat.id, content.data); break;
                case "photo": await bot.sendPhoto(msg.chat.id, content.data); break;
                case "video": await bot.sendVideo(msg.chat.id, content.data); break;
                case "document": await bot.sendDocument(msg.chat.id, content.data); break;
            }
        }
    }
});

// 🔁 Qayta tekshirish tugmasi
bot.on("callback_query", async (query) => {
    if (query.data === "check") {
        const unsubscribed = await checkSubscription(query.from.id);

        if (unsubscribed.length > 0) {
            const buttons = unsubscribed.map((c) => [{ text: `➕ Obuna bo‘lish`, url: `https://t.me/${c.slice(1)}` }]);
            buttons.push([{ text: "✅ Qo‘shildim", callback_data: "check" }]);

            try {
                await bot.editMessageText("❌ Siz hali ham barcha kanallarga obuna bo‘lmadingiz!\n\nQuyidagilarga qo‘shiling:", {
                    chat_id: query.message.chat.id,
                    message_id: query.message.message_id,
                    reply_markup: { inline_keyboard: buttons },
                });
            } catch (err) {
                await bot.answerCallbackQuery(query.id, {
                    text: "🚫 Siz hali ham barcha kanallarga obuna emassiz!",
                    show_alert: false,
                });
            }
        } else {
            await bot.editMessageText("✅ Rahmat! Siz barcha kanallarga obuna bo‘ldingiz.", {
                chat_id: query.message.chat.id,
                message_id: query.message.message_id,
            });

            for (let content of contents) {
                switch (content.type) {
                    case "text": await bot.sendMessage(query.message.chat.id, content.data); break;
                    case "photo": await bot.sendPhoto(query.message.chat.id, content.data); break;
                    case "video": await bot.sendVideo(query.message.chat.id, content.data); break;
                    case "document": await bot.sendDocument(query.message.chat.id, content.data); break;
                }
            }
        }
    }
});
