
export default function display(data, cols, rows) {
  const pages = Math.floor(data.length / cols / rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (let page = 0; page < pages; page++) {
        cell(data[col + row * rows + page * rows * cols], page);
      }
    }

    process.stdout.write("\x1b[0m");
    process.stdout.write("|\n");
  }

  for (let col = 0; col < cols; col++) {
    process.stdout.write("+");
    for (let page = 1; page < pages; page++) {
      process.stdout.write("-");
    }
  }
  process.stdout.write("/\n");
}

function cell(value, color) {
  const c = light(value);

  let rgb;
  if (color === 0) {
    rgb = [0, c, 0];
  } else if (color === 1) {
    rgb = [0, 0, c];
  } else if (color === 2) {
    rgb = [c, 0, 0];
  } else if (color === 3) {
    rgb = [c, c, 0];
  } else if (color === 4) {
    rgb = [0, c, c];
  } else if (color === 5) {
    rgb = [c, 0, c];
  } else {
    rgb = [c, c, c];
  }

  process.stdout.write("\x1b[48;2;" + rgb.join(";") + "m");
  process.stdout.write(" ");
}

function light(value) {
  if (value < 0.01) return 0;
  if (value < 0.1) return 80 + Math.floor(value * 400);        // 80 - 120
  return Math.min(255, 120 + Math.floor((value - 0.1) * 150)); // 120 - 256
}
