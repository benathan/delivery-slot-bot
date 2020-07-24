/*eslint @typescript-eslint/camelcase: ["error", {properties: "never"}]*/
const telegram = require("telegram-bot-api");

/** @typedef {import("../index").Store} Store */

class TelegramNotifier {
  constructor(config) {
    this.config = config;
    this.chatIdsCache = {};
  }

  _extractChatIdFromUpdate(update) {
    if (update.channel_post) {
      return update.channel_post.chat.id;
    } else if (update.message) {
      return update.message.chat.id;
    }
  }

  _sendMessage(api, chatId, msg, screenshot) {
    api.sendMessage({
      chat_id: chatId,
      text: msg,
      parse_mode: "HTML",
    });

const fileOptions = {
  // Explicitly specify the file name.
  filename: 'screen.jpeg',
  // Explicitly specify the MIME type.
  contentType: 'image/jpeg',
};

//console.log(screenshot)
    //api.sendPhoto({chatId: chatId, photo: screenshot, options: {}, fileOptions: fileOptions});
  }

  async sendMessage(msg, screenshot) {
    const api = new telegram({ token: this.config.telegram_api_token, polling: true});
    const updates = await api.getUpdates({});
    if (updates && updates.length != 0) {
      const chatIds = updates.map((update) =>
        this._extractChatIdFromUpdate(update)
      );
      chatIds.forEach((chatId) => {
        this.chatIdsCache[chatId] = 1;
      });
    }
    Object.keys(this.chatIdsCache).forEach((chatId) => {
      this._sendMessage(api, chatId, msg, screenshot);
    });
  }

  /**
   * @param {Store} store
   * @param {string} type
   * @param {import("../index").SlotDate} slotDate
   * @return {string}
   */
  generateMessage(store, type, slotDate) {
    return `<b>Delivery slot found!</b>\n${store.name} ${type} slots available between ${slotDate.date}. Check <a href="https://www.tesco.com/groceries/en-GB/slots/delivery">here.</a>`;
  }

  /**
   * @param {Store} store
   * @param {string} type
   * @param {import("../index").SlotDate[]} slotDates
   * @return {Promise<void>}
   */
  async sendNotifications(store, type, slotDates) {
    if (slotDates && slotDates.length != 0) {
      for (const slotDate of slotDates) {
        const msg = this.generateMessage(store, type, slotDate);
        this.sendMessage(msg, slotDate.screenshot);
      }
    } else {
      this.sendMessage(`no slots`);
    }
  }
}

module.exports = { TelegramNotifier };
