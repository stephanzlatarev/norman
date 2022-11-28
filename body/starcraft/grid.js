
export function findFreePlace(radius, objects) {
  const MARGIN = 7;
  const minX = getMinX(objects);
  const minY = getMinY(objects);
  const sizeX = getSizeX(minX, objects) + MARGIN * 2;
  const sizeY = getSizeY(minY, objects) + MARGIN * 2;
  const startX = minX - MARGIN;
  const startY = minY - MARGIN;
  const THRESHOLD = (sizeX * sizeX + sizeY * sizeY) * objects.length;

  // Create grid
  const grid = [];
  for (let x = 0; x <= sizeX; x++) {
    const line = [];
    for (let y = 0; y <= sizeY; y++) {
      line.push(0);
    }
    grid.push(line);
  }

  // Add blocks
  for (const object of objects) {
    const x = Math.floor(object.pos.x - startX);
    const y = Math.floor(object.pos.y - startY);

    if (object.radius === 1.125) {
      // Mineral field
      for (let xx = Math.max(0, x - 5); xx <= Math.min(x + 6, sizeX); xx++) {
        for (let yy = Math.max(0, y - 5); yy <= Math.min(y + 5, sizeY); yy++) {
          grid[xx][yy] = THRESHOLD;
        }
      }
    } else {
      // Vespene geyser
      for (let xx = Math.max(0, x - 6); xx <= Math.min(x + 6, sizeX); xx++) {
        for (let yy = Math.max(0, y - 6); yy <= Math.min(y + 6, sizeY); yy++) {
          grid[xx][yy] = THRESHOLD;
        }
      }
    }
  }

  // Add fields
  for (const object of objects) {
    const x = Math.floor(object.pos.x - startX);
    const y = Math.floor(object.pos.y - startY);

    if (object.radius === 1.125) {
      // Mineral field
      grid[x][y] = Infinity;
      grid[x + 1][y] = Infinity;
    } else {
      // Vespene geyser
      for (let xx = x - 1; xx <= x + 1; xx++) {
        for (let yy = y - 1; yy <= y + 1; yy++) {
          grid[xx][yy] = Infinity;
        }
      }
    }
  }

  // Add gradient
  for (const object of objects) {
    const ox = Math.floor(object.pos.x - startX);
    const oy = Math.floor(object.pos.y - startY);

    for (let y = 0; y <= sizeY; y++) {
      for (let x = 0; x <= sizeX; x++) {
        if (grid[x][y] < THRESHOLD) {
          grid[x][y] += (ox - x) * (ox - x) + (oy - y) * (oy - y);
        }
      }
    }
  }

  // Select location
  let bestX = 0;
  let bestY = 0;
  let bestScore = THRESHOLD;

  for (let y = 0; y < sizeY; y++) {
    for (let x = 0; x <= sizeX; x++) {
      if (grid[x][y] < bestScore) {
        bestScore = grid[x][y];
        bestX = x;
        bestY = y;
      }
    }
  }

//  // Show grid
//  for (let y = 0; y <= sizeY; y++) {
//    let line = "";
//    for (let x = 0; x <= sizeX; x++) {
//      if (grid[x][y] === Infinity) {
//        line += "@";
//      } else if (grid[x][y] === THRESHOLD) {
//        line += "x";
//      } else if ((x === bestX) && (y === bestY)) {
//        line += "O";
//      } else {
//        line += "-"
//      }
//    }
//    console.log(line);
//  }
//  console.log();

  return { x: startX + bestX, y: startY + bestY };
}

function getMinX(objects) {
  let minX = 250;

  for (const object of objects) {
    const x = object.pos.x - ((object.radius === 1.125) ? 0.5 : 1);
    if (x < minX) {
      minX = x;
    }
  }

  return minX;
}

function getMinY(objects) {
  let minY = 250;

  for (const object of objects) {
    if (object.pos.y < minY) {
      minY = object.pos.y;
    }
  }

  return minY;
}

function getSizeX(minX, objects) {
  let sizeX = 0;

  for (const object of objects) {
    if (object.pos.x - minX > sizeX) {
      sizeX = object.pos.x - minX;
    }
  }

  return sizeX;
}

function getSizeY(minY, objects) {
  let sizeY = 0;

  for (const object of objects) {
    if (object.pos.y - minY > sizeY) {
      sizeY = object.pos.y - minY;
    }
  }

  return sizeY;
}
