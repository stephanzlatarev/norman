
export default function(input, output) {
  for (let y = 7; y > 0; y--) {
    let line = "";
    const distanceOffset = (y - 1) * 8;
    for (let i = 0; i < 7 - y; i++) line += " ";
    line += spot(input[distanceOffset + 8], input[distanceOffset + 8 + 65]);
    for (let i = 0; i < y - 1; i++) line += " ";
    line += spot(input[distanceOffset + 1], input[distanceOffset + 1 + 65]);
    for (let i = 0; i < y - 1; i++) line += " ";
    line += spot(input[distanceOffset + 2], input[distanceOffset + 2 + 65]);
    for (let i = 0; i < 7 - y; i++) line += " ";

    console.log(line);
  }

  let line = "";
  for (let y = 7; y > 0; y--) {
    const distanceOffset = (y - 1) * 8;
    line += spot(input[distanceOffset + 7], input[distanceOffset + 7 + 65]);
  }
  line += center(...output);
  for (let y = 1; y <= 7; y++) {
    const distanceOffset = (y - 1) * 8;
    line += spot(input[distanceOffset + 3], input[distanceOffset + 3 + 65]);
  }
  console.log(line);

  for (let y = 1; y <= 7; y++) {
    let line = "";
    const distanceOffset = (y - 1) * 8;
    for (let i = 0; i < 7 - y; i++) line += " ";
    line += spot(input[distanceOffset + 6], input[distanceOffset + 6 + 65]);
    for (let i = 0; i < y - 1; i++) line += " ";
    line += spot(input[distanceOffset + 5], input[distanceOffset + 5 + 65]);
    for (let i = 0; i < y - 1; i++) line += " ";
    line += spot(input[distanceOffset + 4], input[distanceOffset + 4 + 65]);
    for (let i = 0; i < 7 - y; i++) line += " ";

    console.log(line);
  }
}

function spot(probes, drones) {
  // · ☺ ☻❶❷❸❹❺❻❼❽❾❿ ☼
  if (probes && drones) {
    return "☼";
  } else if (probes) {
    return "☺";
  } else if (drones) {
    return "☻";
  }
  return "·";
}

function center(ability, direction) {
  // ˂ ┌ ˄ ┐└ ˅ ┘ ˃ « ╔ A ╗╚ Y ╝ »
  if (ability >= 0.7) {
    return "A╗╗»»╝╝YY╚╚««╔╔A"[Math.floor(direction * 16)];
  } else if (ability >= 0.3) {
    return "˄┐┐˃˃┘┘˅˅└└˂˂┌┌˄"[Math.floor(direction * 16)];
  }

  return "☺";
}
