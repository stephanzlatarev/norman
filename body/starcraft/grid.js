
export function findFreePlace(radius, objects) {
  const minX = getMinX(objects);
  const minY = getMinY(objects);
  const sizeX = getSizeX(minX, objects) + radius + radius;
  const sizeY = getSizeY(minY, objects) + radius + radius;
  const startX = minX - radius;
  const startY = minY - radius;

  const grid = [];
  for (let x = 0; x <= sizeX; x++) {
    const line = [];
    for (let y = 0; y <= sizeY; y++) {
      let distance = 0;

      for (const object of objects) {
        distance += getDistance(object, startX + x, startY + y, radius);
      }

      line.push(distance);
    }
    grid.push(line);
  }

  let bestX = 0;
  let bestY = 0;
  let bestScore = Infinity;

  for (let x = 0; x < sizeX; x++) {
    for (let y = 0; y < sizeY; y++) {
      if (grid[x][y] < bestScore) {
        bestScore = grid[x][y];
        bestX = x;
        bestY = y;
      }
    }
  }

//  for (let x = 0; x < sizeX; x++) {
//    let line = "";
//    for (let y = 0; y < sizeY; y++) {
//      if (grid[x][y] === Infinity) {
//        line += "x";
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
    if (object.pos.x < minX) {
      minX = object.pos.x;
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

function getDistance(object, x, y, radius) {
  if ((Math.abs(object.pos.x - x) < object.radius + radius) && (Math.abs(object.pos.y - y) < object.radius + radius)) return Infinity;
  return (object.pos.x - x) * (object.pos.x - x) + (object.pos.y - y) * (object.pos.y - y);
}
