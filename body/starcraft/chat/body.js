
export default class Chat {

  constructor(node) {
    this.node = node;
  }

  async tock() {
    const client = this.node.get("channel");

    if (client) {
      const message = [];
      for (let i = 0; i < 10; i++) {
        const label = "" + i;
        const letter = this.node.get(label);
        if (letter) {
          message.push(letter);
          this.node.clear(label);
        }
      }

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

      this.actions = [];
    }
  }

}
