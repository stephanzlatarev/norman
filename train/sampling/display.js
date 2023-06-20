import ttys from "ttys";

export default function display(data, cols, rows) {
  const pages = Math.floor(data.length / cols / rows);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (let page = 0; page < pages; page++) {
        cell(data[col + row * rows + page * rows * cols], page);
      }
    }

    ttys.stdout.write("\x1b[0m");
    ttys.stdout.write("|\n");
  }

  for (let col = 0; col < cols; col++) {
    ttys.stdout.write("+");
    for (let page = 1; page < pages; page++) {
      ttys.stdout.write("-");
    }
  }
  ttys.stdout.write("/\n");
}

function cell(value, color) {
  const c = Math.floor(Math.min(value * 256, 255));

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

  ttys.stdout.write("\x1b[48;2;" + rgb.join(";") + "m");
  ttys.stdout.write(" ");
}
