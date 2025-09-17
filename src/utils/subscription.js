export async function checkSubscription(bot, userId, channels) {
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
  