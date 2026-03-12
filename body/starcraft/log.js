import fs from "fs";
import Resources from "./memo/resources.js";

const LOOPS_PER_SECOND = 22.4;
const LOOPS_PER_MINUTE = LOOPS_PER_SECOND * 60;

function clock() {
  const minutes = Math.floor(Resources.loop / LOOPS_PER_MINUTE);
  const seconds = Math.floor(Resources.loop / LOOPS_PER_SECOND) % 60;
  const mm = (minutes >= 10) ? minutes : "0" + minutes;
  const ss = (seconds >= 10) ? seconds : "0" + seconds;

  return `${mm}:${ss}/${Resources.loop}`;
}

const folder = fs.existsSync("logs") ? "logs" : null;

function write(file, ...line) {
  if (folder) {
    fs.appendFileSync(folder + "/" + file, "\r\n" + clock() + " " + line.join(" "));
  }
}

export function info(file, ...line) {
  write(file, ...line);
}

export function error(file, ...line) {
  console.error(clock(), "ERROR:", ...line);

  write(file, "ERROR:", ...line);
}

export function warning(file, ...line) {
  console.error(clock(), "WARNING:", ...line);

  write(file, "WARNING:", ...line);
}
