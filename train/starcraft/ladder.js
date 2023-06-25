import fs from "fs";
import https from "https";
import ttys from "ttys";

const COMPETITION = 22;
const BOTS = {
  518: "norman",
  605: "nida",
}

const TRACE = false;
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
        if (TRACE) console.log("<<", response.statusCode);
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

    if (TRACE) console.log(">>", method, path);
    if (TRACE) console.log(">>", json);
    request.write(json);
    request.end();
  });
}

async function go() {
  console.log("Reading ladder data...");

  await call("POST", "/api/auth/login/", SECRETS);
  const mapNames = getMapNames((await call("GET", "/api/maps/")).results);
  const competition = await call("GET", "/api/competitions/" + COMPETITION + "/");
  const bots = getBots((await call("GET", "/api/bots/?limit=1000")).results);
  const ranks = getRanks((await call("GET", "/api/competition-participations/?competition=" + COMPETITION)).results);

  for (const id in BOTS) {
    await goBot(competition, mapNames, bots, ranks, Number(id), BOTS[id]);
  }
}

async function goBot(competition, mapNames, bots, ranks, botId, botName) {
  const count = (await call("GET", "/api/matches/?limit=1&bot=" + botId)).count;
  const offset = Math.max(count - LIMIT, 0);
  const matches = await call("GET", "/api/matches/?offset=" + offset + "&limit=" + LIMIT + "&bot=" + botId);
  const matchesList = matches.results.filter(match => (match.round && (match.created.localeCompare(competition.date_opened) > 0)));

  const { stats, maps } = getStats(botId, botName, matchesList);
  const rates = getSuccessRateByDivision(stats, bots, ranks);

  console.log();
  console.log(botName);
  console.log();
  showStats(stats, maps.map(id => mapNames[id]), mapNames, bots, ranks, rates);
  console.log();
}

function getMapNames(list) {
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
  const maps = {};

  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    if (!match.result) continue;

    const opponent = (match.result.bot2_name === botName) ? match.result.bot1_name : match.result.bot2_name;
    if (!stats[opponent]) stats[opponent] = { maps: [], results: [], matches: 0, wins: 0 };
    if (stats[opponent].matches >= 10) continue;

    const data = stats[opponent];

    data.matches++;
    data.maps.push(match.map);
    maps[match.map] = true;

    if (match.result.winner === botId) {
      data.wins++;
      data.results.push(true);
    } else {
      data.results.push(false);
    }
  }

  return {
    stats: stats,
    maps: Object.keys(maps),
  };
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

function showStats(stats, competitionMaps, mapNames, bots, ranks, rates) {
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
      console.log(" ====== Division", division, "====== ", percentageAsText(rates[data.division]), "win rate");
    }

    line(competitionMaps, mapNames, data);
  }
}

function line(competitionMaps, mapNames, data) {
  ttys.stdout.write(cell(data.opponent, 25));

  ttys.stdout.write("  ");
  ttys.stdout.write("\x1b[48;2;" + percentageAsColor(data) + "m");
  ttys.stdout.write(percentageAsText(data));
  ttys.stdout.write("\x1b[0m");

  ttys.stdout.write("  ");
  for (let i = 9; i >= 0; i--) {
    if (i < data.results.length) {
      ttys.stdout.write(data.results[i] ? "\x1b[48;2;0;160;0m": "\x1b[48;2;160;0;0m");
    }
    ttys.stdout.write(" ");
  }
  ttys.stdout.write("\x1b[0m");

  ttys.stdout.write("  ");
  for (const mapName of competitionMaps) {
    for (let i = 0; i < Math.max(data.maps.length, 10); i++) {
      if ((9 - i < data.maps.length) && (mapNames[data.maps[9 - i]] === mapName)) {
        ttys.stdout.write(data.results[9 - i] ? "\x1b[48;2;0;160;0m": "\x1b[48;2;160;0;0m");
      } else {
        ttys.stdout.write("\x1b[0m");
      }
      ttys.stdout.write((i < mapName.length) ? mapName[i] : " ");
    }
    ttys.stdout.write("\x1b[0m");
    ttys.stdout.write("  ");
  }

  ttys.stdout.write("\x1b[0m");
  ttys.stdout.write("\n");
}

function cell(text, size) {
  let line = text;
  if (line.length > size) line = line.substring(0, size);
  for (let i = line.length; i < size; i++) line += " ";
  return line;
}

function percentageAsColor(data) {
  const p = Math.floor(data.wins*160/data.matches);
  return (160 - p) + ";" + p + ";0";
}

function percentageAsText(data) {
  if (data.wins === data.matches) return "100%";
  const p = Math.floor(data.wins*100/data.matches);
  if (p < 10) return "  " + p + "%";
  return " " + p + "%";
}

go();
