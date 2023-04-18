
export default async function(chat, client) {
  const message = [];
  for (let i = 0; i < 10; i++) {
    const label = "" + i;
    const letter = chat.get(label);
    if (letter) {
      message.push(letter);
      chat.clear(label);
    }
  }

  if (message.length) {
    await client.action({
      actions: [
        {
          actionChat: {
            channel: 1,
            message: String.fromCharCode(...message)
          }
        }
      ]
    });
  }
}
