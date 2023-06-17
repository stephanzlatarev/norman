
export default async function(chat, client) {
  const message = chat.values(10);

  if (message[0]) {
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

    chat.clear(0);
  }
}
