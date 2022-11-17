
export default function(sensor, motor, size, index) {
  for (let distance = size - 1; distance > 0; distance--) {
    let line = "";
    for (let i = 0; i < size - distance - 1; i++) line += " ";
    line += spot(sensor[index(0, distance, 8)], sensor[index(1, distance, 8)]);
    for (let i = 0; i < distance - 1; i++) line += " ";
    line += spot(sensor[index(0, distance, 1)], sensor[index(1, distance, 1)]);
    for (let i = 0; i < distance - 1; i++) line += " ";
    line += spot(sensor[index(0, distance, 2)], sensor[index(1, distance, 2)]);
    for (let i = 0; i < size - distance - 1; i++) line += " ";
    console.log(line);
  }

  let line = "";
  for (let distance = size - 1; distance > 0; distance--) {
    line += spot(sensor[index(0, distance, 7)], sensor[index(1, distance, 7)]);
  }
  line += center(...motor);
  for (let distance = 1; distance < size; distance++) {
    line += spot(sensor[index(0, distance, 3)], sensor[index(1, distance, 3)]);
  }
  console.log(line);

  for (let distance = 1; distance < size; distance++) {
    let line = "";
    for (let i = 0; i < size - distance - 1; i++) line += " ";
    line += spot(sensor[index(0, distance, 6)], sensor[index(1, distance, 6)]);
    for (let i = 0; i < distance - 1; i++) line += " ";
    line += spot(sensor[index(0, distance, 5)], sensor[index(1, distance, 5)]);
    for (let i = 0; i < distance - 1; i++) line += " ";
    line += spot(sensor[index(0, distance, 4)], sensor[index(1, distance, 4)]);
    for (let i = 0; i < size - distance - 1; i++) line += " ";
    console.log(line);
  }
}

function spot(probes, drones) {
  // · ☺ ☻❶❷❸❹❺❻❼❽❾❿ ☼
  if ((probes < 0) && (drones < 0)) {
    return ".";
  } else if ((probes < 0) && (drones === 0)) {
    return "'";
  } else if ((probes === 0) && (drones < 0)) {
    return "*";
  } else if ((probes > 0) && (drones > 0)) {
    return "☼";
  } else if (probes > 0) {
    return "☻";
  } else if (drones > 0) {
    return "☺";
  }
  return "x";
}

function center(ability, direction) {
  // ˂ ┌ ˄ ┐└ ˅ ┘ ˃ « ╔ A ╗╚ Y ╝ »
  if (ability >= 0.6) {
    return "A╗╗»»╝╝YY╚╚««╔╔A"[Math.floor(direction * 16)];
  } else if (ability >= 0.2) {
    return "˄┐┐˃˃┘┘˅˅└└˂˂┌┌˄"[Math.floor(direction * 16)];
  }

  return "☻";
}
