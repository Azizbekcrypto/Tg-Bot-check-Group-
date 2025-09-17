import TelegramBot from "node-telegram-bot-api";
import dotenv from "dotenv";
import config from "./config/index.js";
import { registerAdminHandlers } from "./handlers/admin.handler.js";
import { registerUserHandlers } from "./handlers/user.handler.js";

dotenv.config();

const bot = new TelegramBot(config.TOKEN, { polling: true });

// Admin va user handlerlarni ulash
registerAdminHandlers(bot, config.ADMIN_ID);
registerUserHandlers(bot);

console.log("🤖 Bot ishga tushdi...")
