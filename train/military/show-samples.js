import fs from "fs";

const samples = JSON.parse(fs.readFileSync("./train/military/samples.json"));

function display(placements) {
  for (let y = 0; y < 10; y++) {
    const line = [];

    for (let x = 0; x < 10; x++) {
      line.push(cell(placements[x + y * 10]));
    }

    console.log(line.join(" "));
  }
}

function cell(value) {
  if (value > 0) {
    if (value >= 100) return " ###";

    let cell = "" + Math.floor(value * 10);
    while (cell.length < 4) cell = " " + cell;
    return cell;
  }

  return "    ";
}

function show(index) {
  display(samples.output[index]);
  console.log(" ========== ");
  for (let i = 0; i < 400; i += 100) {
    display(samples.input[index].slice(i, i + 100));
    console.log(" ---------- ");
  }
}

show(Math.floor(Math.random() * samples.input.length));
