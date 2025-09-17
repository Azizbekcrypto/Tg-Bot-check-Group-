import config from "../config/index.js";
import { getChannels } from "../services/channel.service.js";
import { getContents } from "../services/content.service.js";
import { addUser } from "../services/user.service.js";
import { checkSubscription } from "../utils/subscription.js";

// // yordamchi: circular-safe stringify   
// safeStringify bu loglarni chqarad
// function safeStringify(obj) {
//   const seen = new WeakSet();
//   return JSON.stringify(obj, (k, v) => {
//     if (typeof v === "object" && v !== null) {
//       if (seen.has(v)) return "[Circular]";
//       seen.add(v);
//     }
//     return v;
//   }, 2);
// }

function isReplyMarkupEqual(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}


export function registerUserHandlers(bot) {


  bot.onText(/\/start/, async (msg) => {
    addUser(msg.chat.id); // ✅ foydalanuvchini ro‘yxatga olish


    const channels = getChannels();
    const firstName = msg.from.first_name || "Foydalanuvchi";
    if (channels.length === 0) return bot.sendMessage(msg.chat.id, "📭 Hozircha kanal yo‘q");

    const unsubscribed = await checkSubscription(bot, msg.from.id, channels);

    if (unsubscribed.length > 0) {
      const buttons = unsubscribed.map((c) => [{ text: `➕ Obuna bo‘lish`, url: `https://t.me/${c.slice(1)}` }]);
      buttons.push([{ text: "✅ Qo‘shildim", callback_data: "check" }]);

      await bot.sendMessage(

        msg.chat.id,
        `👋 <b>Assalomu alaykum, hurmatli ${firstName}!</b>\n\n 🛑 Iltimos, quyidagi kanallarga <i>obuna bo‘ling: </i> `,
        {
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: buttons }
        }
      );
    } else {
      await sendAllContent(bot, msg.chat.id);
    }
  });


  bot.on("callback_query", async (query) => {

    if (query.data !== "check") return;

    const channels = getChannels();
    const unsubscribed = await checkSubscription(bot, query.from.id, channels);

    if (unsubscribed.length > 0) {
      // tugmalar
      const buttons = unsubscribed.map((c) => [{ text: `➕ Obuna bo‘lish`, url: `https://t.me/${c.slice(1)}` }]);
      buttons.push([{ text: "✅ Qo‘shildim", callback_data: "check" }]);
      const newText = "❌ Siz hali ham barcha kanallarga obuna bo‘lmadingiz!\n\nQuyidagilarga qo‘shiling:👇🏻";
      const newReply = { inline_keyboard: buttons };

      // oldingi xabar bilan bir xil ekanligini tekshirish — "message is not modified" xatolikdan qochish uchun
      const oldText = query.message?.text;
      const oldReply = query.message?.reply_markup ?? null;

      if (oldText === newText && isReplyMarkupEqual(oldReply, newReply)) {
        // agar bir xil bo‘lsa, editMessageText chaqirmaymiz — faqat callbackni javoblaymiz
        try {
          await bot.answerCallbackQuery(query.id, { text: "🚫 Siz hali ham barcha kanallarga obuna emassiz!", show_alert: false });
        } catch (err) {
          // if (config.DEBUG) console.error("answerCallbackQuery error:", err?.message || err);
        }
        return;
      }

      try {
        const res = await bot.editMessageText(newText, {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          reply_markup: newReply,
        });
        // if (config.DEBUG) console.log("editMessageText (not-subscribed) response:", safeStringify(res));
      } catch (err) {
        // if (config.DEBUG) console.error("editMessageText error (not-subscribed):", err?.response?.body ? safeStringify(err.response.body) : err?.message || safeStringify(err));

        // fallback: callback bilan xabar berish
        try { await bot.answerCallbackQuery(query.id, { text: "Xatolik yuz berdi. Iltimos qayta urinib ko‘ring.", show_alert: false }); } catch (e) { }
      }

    } else {
      // hamma kanallarga obuna — tabrik xabari va content yuborish
      const newText = "✅ Rahmat! Siz barcha kanallarga obuna bo‘ldingiz.";

      // agar text va reply_markup bir xil bo‘lsa, edit qilish shart emas
      const oldText = query.message?.text;
      if (oldText === newText) {
        try {
          await bot.answerCallbackQuery(query.id, { text: "✅ Allaqachon tasdiqlangan", show_alert: false });
        } catch (err) {
          // if (config.DEBUG) console.error("answerCallbackQuery error:", err?.message || err);
        }
      } else {
        try {
          const res = await bot.editMessageText(newText, {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
          });
          // if (config.DEBUG) console.log("editMessageText (subscribed) response:", safeStringify(res));
        } catch (err) {
          // if (config.DEBUG) console.error("editMessageText error (subscribed):", err?.response?.body ? safeStringify(err.response.body) : err?.message || safeStringify(err));
          try { await bot.answerCallbackQuery(query.id, { text: "Xatolik yuz berdi. Iltimos qayta urinib ko‘ring.", show_alert: false }); } catch (e) { }
        }
      }

      // endi contentlarni yuboramiz
      try {
        await sendAllContent(bot, query.message.chat.id);
      } catch (err) {
        // if (config.DEBUG) console.error("sendAllContent error:", err?.message || safeStringify(err));
      }
    }
  });

}

async function sendAllContent(bot, chatId) {
  const contents = getContents();
  for (let content of contents) {
    switch (content.type) {
      case "text": await bot.sendMessage(chatId, content.data); break;
      case "photo": await bot.sendPhoto(chatId, content.data); break;
      case "video": await bot.sendVideo(chatId, content.data); break;
      case "document": await bot.sendDocument(chatId, content.data); break;
    }
  }
}
