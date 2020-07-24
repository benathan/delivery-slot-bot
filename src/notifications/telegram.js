/*eslint @typescript-eslint/camelcase: ["error", {properties: "never"}]*/
const telegram = require("telegram-bot-api");
const fs = require('fs');
const mergeImages = require('merge-images');
const { Canvas, Image } = require('canvas');

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

  _sendMessage(api, chatId, msg) {
    api.sendMessage({
      chat_id: chatId,
      text: msg,
      parse_mode: "HTML",
    });
  }

  async sendMessage(msg) {
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
      this._sendMessage(api, chatId, msg);
    });
  }

  async sendScreenshot(screenshot) {
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
          fs.writeFileSync("screenshot.png", screenshot, 'base64');
          api.sendPhoto({
              chat_id: chatId,
              photo: "screenshot.png"
            });
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
      var images=[];
      var x=0;
      var y=0;
      var imgId=0;
      for (const slotDate of slotDates) {
        const msg = this.generateMessage(store, type, slotDate);
        this.sendMessage(msg);

        var imgName='screenshot'+imgId+'.png'
        fs.writeFileSync(imgName, slotDate.screenshot)
        images.push({src: imgName, x: x*1000, y: y*1000});
        x=x+1;
        imgId=imgId+1;
        if (x > 1)
        {
            x=0;
            y=y+1;
        }
      }

      var merged=mergeImages(images, {
              Canvas: Canvas,
              Image: Image,
              width: 2000,
              height: 2000
            }).then(b64 => {
                var base64Data = b64.replace(/^data:image\/png;base64,/, "");

                this.sendScreenshot(base64Data);
            });

    } else {
      this.sendMessage(`no slots`);
    }
  }
}

module.exports = { TelegramNotifier };
