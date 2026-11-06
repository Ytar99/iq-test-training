const M = [[0, 0]];
const Z1 = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 2],
];
const Z2 = [
  [1, 0],
  [0, 1],
  [1, 1],
  [0, 2],
];
const L = [
  [0, 0],
  [1, 0],
  [1, 1],
  [1, 2],
];
const J = [
  [0, 0],
  [1, 0],
  [0, 1],
  [0, 2],
];

function normalize(cells) {
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

function rotations(cells) {
  const seen = new Set();
  const out = [];
  let current = cells;
  for (let i = 0; i < 4; i++) {
    const norm = normalize(current);
    const key = JSON.stringify(norm);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(norm);
    }
    current = current.map(([x, y]) => [y, -x]);
  }
  return out;
}

function solve(pieces) {
  const rots = pieces.map(rotations);
  const solutions = [];
  const board = Array.from({ length: 3 }, () => Array(7).fill(-1));

  function place(index) {
    if (index === pieces.length) {
      solutions.push(board.map((row) => row.slice()));
      return solutions.length < 3;
    }
    for (const rot of rots[index]) {
      const maxX = Math.max(...rot.map((c) => c[0]));
      const maxY = Math.max(...rot.map((c) => c[1]));
      for (let y = 0; y <= 3 - maxY - 1; y++) {
        for (let x = 0; x <= 7 - maxX - 1; x++) {
          let ok = true;
          for (const [cx, cy] of rot) {
            if (board[y + cy][x + cx] !== -1) {
              ok = false;
              break;
            }
          }
          if (!ok) continue;
          for (const [cx, cy] of rot) board[y + cy][x + cx] = index;
          if (!place(index + 1)) return false;
          for (const [cx, cy] of rot) board[y + cy][x + cx] = -1;
        }
      }
    }
    return true;
  }

  place(0);
  return solutions;
}

const cards = [
  [M, Z1, Z1, L, L, J],
  [M, Z2, Z1, L, L, J],
  [M, Z2, Z1, L, J, J],
  [M, Z1, Z2, L, J, J],
];

cards.forEach((card, i) => {
  const solutions = solve(card);
  console.log("card", i + 1, "solutions", solutions.length);
  for (const board of solutions) {
    console.log(board.map((row) => row.join("")).join("\n"));
    console.log("---");
  }
});

const bank = require("C:/Users/ytar9/projects/iq-test-demo/data/spatial.json");
const originals = require("C:/Users/ytar9/projects/iq-test-demo/data/original/demo/spatial.json");
for (const item of [...bank, ...originals]) {
  if (item.type !== "spa-assembly") continue;
  const filled = item.stimulus.scene.filled;
  const cols = item.stimulus.scene.cols;
  const rows = item.stimulus.scene.rows;
  if (filled.length === 21 || (cols === 7 && rows === 3)) {
    console.log("similar", item.id, cols, rows, filled.length);
  }
}
