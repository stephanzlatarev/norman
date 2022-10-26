import starcraft from "@node-sc2/proto";
import game from "./src/game.js";
import log from "./src/log.js";

let running = true;

process.on("SIGTERM", function() {
  log("Stopping...");
  running = false;
});

async function run() {
  const client = starcraft();
  const settings = parseArguments(process.argv);

  await connect(client, settings);
  await play(client, settings);

  let minerals = -1;

  while (running) {
    try {
      log("Client:", client.status);

      const info = await client.gameInfo();
      log("Player info:", JSON.stringify(info.playerInfo));
      log("Game options:", JSON.stringify(info.options));
    } catch (error) {
      log("Error when observing:");
      log(error);
    }

    if (minerals < 0) {
      chat(client, "Good luck!");
      minerals = 0;
    }

    let observation;

    try {
      const data = await client.observation();
      log("Game loop:", data.observation.gameLoop);

      observation = data.observation;
      log("Observation:", JSON.stringify(observation.playerCommon));
    } catch (error) {
      log("Error when observing:");
      log(error);
    }

    if (observation && observation.playerCommon && observation.playerCommon.minerals) {
      minerals = observation.playerCommon.minerals;
      log("Collected minerals:", minerals);
    }

    if (minerals > 300) {
      chat(client, "gg");
      running = false;
    }

    await step(client);
    await sleep(3);
  }

  log("Bye.");
  await client.quit();
}

run().catch(error => log("ERROR:", error.message));

async function sleep(seconds) {
  await new Promise(r => setTimeout(r, seconds * 1000));
}

async function connect(client, settings) {
  try {
    await client.connect({
      host: settings.ladderServer || "localhost",
      port: settings.gamePort || 5000,
    });
  } catch (message) {
    if (message.error.code === "ECONNREFUSED") {
      await game(client);
    } else {
      throw error;
    }
  }
}

async function play(client, settings) {
  const player = {};

  player.race = 3;
  player.options = { raw: true };

  if (settings.ladderServer) {
    let startPort = settings.startPort + 1;

    player.sharedPort = startPort++;
    player.serverPorts = { gamePort: startPort++, basePort: startPort++ };
    player.clientPorts = [
      { gamePort: startPort++, basePort: startPort++ },
      { gamePort: startPort++, basePort: startPort++ },
    ];
  };

  await client.joinGame(player);
}

function chat(client, message) {
  try {
    client.action({ actions: [{ actionChat: { channel: 1, message: message } }] });
  } catch (error) {
    log("Error when sending message to chat:");
    log(error);
  }
}

async function step(client) {
  try {
    const data1 = await client.observation();
    log("Game loop BEFORE:", data1.observation.gameLoop);

    await client.step({ count: 10 });

    const data2 = await client.observation();
    log("Game loop AFTER:", data2.observation.gameLoop);
  } catch (error) {
    log("Error when stepping game:");
    log(error);
  }
}

function parseArguments(list) {
  const settings = {};

  if (list && list.length) {
    for (let i = 0; i < list.length - 1; i++) {
      if (list[i] === "--LadderServer") {
        settings.ladderServer = list[i + 1];
      } else if (list[i] === "--GamePort") {
        settings.gamePort = parseInt(list[i + 1]);
      } else if (list[i] === "--StartPort") {
        settings.startPort = parseInt(list[i + 1]);
      }
    }
  }

  return settings;
}
