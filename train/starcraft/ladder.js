import fs from "fs";
import https from "https";

const COMPETITION = 22;
const BOTS = {
  518: "norman",
  605: "nida",
}

const LIMIT = 1000;
const SECRETS = JSON.parse(fs.readFileSync("./train/starcraft/secrets.json"));
const COOKIES = [];

function call(method, path, data) {
  const json = JSON.stringify(data ? data : "");
  const options = {
    hostname: "aiarena.net",
    port: 443,
    path: path,
    method: method,
    headers: {
      "Cookie": COOKIES.join("; "),
      "Content-Type": "application/json",
      "Content-Length": json.length,
    },
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      response.setEncoding("utf8");
      let body = "";

      response.on("data", (chunk) => {
        body += chunk;
      });

      response.on("end", () => {
        console.log("<<", response.statusCode);
        const cookies = response.headers["set-cookie"];
        if (cookies && cookies.length) for (const cookie of cookies) COOKIES.push(cookie);

        try {
          resolve(JSON.parse(body));
        } catch (error) {
          resolve(undefined);
        }
      });
    });

    request.on("error", (error) => {
      reject(error);
    });

    console.log(">>", method, path);
    console.log(">>", json);
    request.write(json);
    request.end();
  });
}

async function go() {
  console.log("Reading ladder data...");

  await call("POST", "/api/auth/login/", SECRETS);
  const maps = getMaps((await call("GET", "/api/maps/")).results);
  const since = (await call("GET", "/api/competitions/" + COMPETITION + "/")).date_opened;
  const bots = getBots((await call("GET", "/api/bots/?limit=1000")).results);
  const ranks = getRanks((await call("GET", "/api/competition-participations/?competition=" + COMPETITION)).results);

  for (const id in BOTS) {
    await goBot(since, maps, bots, ranks, Number(id), BOTS[id]);
  }
}

async function goBot(since, maps, bots, ranks, botId, botName) {
  const count = (await call("GET", "/api/matches/?limit=1&bot=" + botId)).count;
  const offset = Math.max(count - LIMIT, 0);
  const matches = await call("GET", "/api/matches/?offset=" + offset + "&limit=" + LIMIT + "&bot=" + botId);
  const matchesList = matches.results.filter(match => (match.created.localeCompare(since) > 0))

  const stats = getStats(botId, botName, matchesList);
  const rates = getSuccessRateByDivision(stats, bots, ranks);

  console.log();
  console.log(botName);
  console.log();
  showStats(stats, maps, bots, ranks, rates);
}

function getMaps(list) {
  const maps = {};

  for (const item of list) {
    maps[item.id] = item.name;
  }

  return maps;
}

function getBots(list) {
  const bots = {};

  for (const item of list) {
    bots[item.name] = item.id;
  }

  return bots;
}

function getRanks(list) {
  const bots = {};

  for (const item of list) {
    if (!item.active) continue;
    bots[item.bot] = {
      division: item.division_num,
      elo: item.elo,
    };
  }

  return bots;
}

function getStats(botId, botName, matches) {
  const stats = {};

  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    if (!match.result) continue;

    const opponent = (match.result.bot2_name === botName) ? match.result.bot1_name : match.result.bot2_name;
    if (!stats[opponent]) stats[opponent] = { matches: 0, wins: 0, streak: true, winStreak: 0, lossStreak: 0, streakMaps: [], lossMaps: [] };
    if (stats[opponent].matches >= 10) continue;

    const data = stats[opponent];
    data.matches++;
    if (match.result.winner === botId) {
      data.wins++;
      if (data.streak) {
        if (data.lossStreak === 0) {
          data.winStreak++;
        } else {
          data.streak = false;
        }
      }
    } else {
      if (data.streak) {
        if (data.winStreak === 0) {
          data.lossStreak++;
          if (data.streakMaps.indexOf(match.map) < 0) data.streakMaps.push(match.map);
        } else {
          data.streak = false;
        }
      }
      if ((data.streakMaps.indexOf(match.map) < 0) && (data.lossMaps.indexOf(match.map) < 0)) data.lossMaps.push(match.map);
    }
  }

  return stats;
}

function getSuccessRateByDivision(stats, bots, ranks) {
  const rates = {};

  for (const r in ranks) {
    const rank = ranks[r];
    if (rank && !rates[rank.division]) {
      rates[rank.division] = { wins: 0, matches: 0 };
    }
  }

  for (const opponent in stats) {
    const data = stats[opponent];
    const rank = ranks[bots[opponent]];
    if (!rank) continue;
    rates[rank.division].wins += data.wins;
    rates[rank.division].matches += data.matches;
  }
  return rates;
}

function showStats(stats, maps, bots, ranks, rates) {
  const lines = [];
  for (const opponent in stats) {
    const data = stats[opponent];
    const rank = ranks[bots[opponent]];

    if (!rank) continue;

    const rating = (5 - rank.division) * 10000 + rank.elo;
    lines.push({...data, opponent: opponent, rating: rating, division: rank.division });
  }
  lines.sort((a, b) => b.rating - a.rating);
  let division = -1;
  for (const data of lines) {
    if (data.division !== division) {
      division = data.division;
      console.log(" ====== Division", division, "======", percentage(rates[data.division]), "win rate");
    }

    if (data.wins === data.matches) {
      console.log(cell(data.opponent, 25), "V", (data.matches < 10) ? "\t matches: " + data.matches : "");
    } else {
      const losses = [data.streakMaps.sort().map(id => maps[id]).join(", "), data.lossMaps.sort().map(id => maps[id]).join(", ")].join(" | ");
      console.log(cell(data.opponent, 25), percentage(data),
        "\t", "matches:", (data.matches < 10) ? data.matches : "V",
        "\t", "streak:", Math.max(data.winStreak, data.lossStreak), (data.winStreak > data.lossStreak) ? "wins" : "losses",
        "\t", "loss maps:", losses
      );
    }
  }
}

function cell(text, size) {
  let line = text;
  if (line.length > size) line = line.substring(0, size);
  for (let i = line.length; i < size; i++) line += " ";
  return line;
}

function percentage(data) {
  if (data.wins === data.matches) return "100%";
  const p = Math.floor(data.wins*100/data.matches);
  if (p < 10) return "  " + p + "%";
  return " " + p + "%";
}

go();
