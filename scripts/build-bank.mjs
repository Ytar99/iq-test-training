import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bank = {
  calculation: [],
  vocabulary: [],
  erudition: [],
  spatial: [],
  nonverbal: [],
  verbal: [],
  attention: [],
};
const counts = {};
const optionCount = {
  calculation: 4,
  vocabulary: 5,
  erudition: 5,
  spatial: 4,
  nonverbal: 4,
  verbal: 4,
  attention: 5,
};

function numbersIn(text) {
  return [...text.matchAll(/\d+/g)].map((match) => match[0]);
}

function leakReason(hint, explanation, correctText) {
  const explained = new Set(numbersIn(explanation));
  for (const value of numbersIn(hint)) {
    if (explained.has(value)) return `число ${value}`;
  }
  if (correctText.length >= 3 && hint.toLowerCase().includes(correctText.toLowerCase())) {
    return `ответ "${correctText}"`;
  }
  return null;
}

function add(spec) {
  const number = (counts[spec.type] = (counts[spec.type] ?? 0) + 1);
  const id = `${spec.type}-${String(number).padStart(2, "0")}`;
  const options = spec.options.map((option, index) => {
    const optionId = `${id}-${index + 1}`;
    if (typeof option === "string") return { id: optionId, text: option };
    return { id: optionId, ...option };
  });
  if (options.length !== optionCount[spec.scale]) throw new Error(`${id}: вариантов ${options.length}`);
  const correct = options[spec.correct];
  if (!correct) throw new Error(`${id}: нет верного варианта`);
  const correctText = typeof spec.options[spec.correct] === "string" ? spec.options[spec.correct] : "";
  const leak = leakReason(spec.hint, spec.explanation, correctText);
  if (leak) throw new Error(`${id}: подсказка содержит ${leak}`);
  const keys = options.map((option) => JSON.stringify({ text: option.text ?? "", scene: option.scene ?? null }));
  if (new Set(keys).size !== keys.length) throw new Error(`${id}: повторяется вариант`);
  bank[spec.scale].push({
    id,
    scale: spec.scale,
    type: spec.type,
    difficulty: spec.difficulty,
    ...(spec.topic ? { topic: spec.topic } : {}),
    stimulus: {
      ...(spec.text ? { text: spec.text } : {}),
      ...(spec.scene ? { scene: spec.scene } : {}),
    },
    options,
    correctOptionId: correct.id,
    shuffle: true,
    hint: spec.hint,
    explanation: spec.explanation,
  });
}

function clause(name) {
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

function solved(answer, traps) {
  const values = traps.map((trap) => {
    const value = trap.compute();
    if (value === answer || String(value) === String(answer))
      throw new Error(`ловушка "${trap.name}" совпала с ответом ${answer}`);
    return value;
  });
  if (new Set(values.map(String)).size !== values.length) {
    throw new Error(`ловушки совпали: ${traps.map((trap) => trap.name).join(", ")} -> ${values.join(", ")}`);
  }
  return values;
}

function commitNumeric(spec) {
  if (/\d/.test(spec.hint)) throw new Error(`${spec.type}: цифра в подсказке`);
  const wrongs = solved(spec.answer, spec.traps);
  if (wrongs.some((value) => !Number.isInteger(value))) throw new Error(`${spec.type}: ловушка не целая`);
  const explanation = `${spec.lead} Верный результат: ${spec.answer}. ${spec.traps.map((trap) => `${clause(trap.name)} дает ${trap.compute()}`).join(". ")}.`;
  add({
    scale: spec.scale,
    type: spec.type,
    difficulty: spec.difficulty,
    topic: spec.topic,
    text: spec.text,
    scene: spec.scene,
    options: [String(spec.answer), ...wrongs.map(String)],
    correct: 0,
    hint: spec.hint,
    explanation,
  });
}

function commitChoice(spec) {
  if (/\d/.test(spec.hint)) throw new Error(`${spec.type}: цифра в подсказке`);
  const traps = spec.traps.map(([name, text]) => ({ name, compute: () => text }));
  const wrongs = solved(spec.answer, traps);
  for (const [name] of spec.traps) {
    if (!spec.lead.includes(name) && !name) throw new Error(`${spec.type}: пустое имя ловушки`);
  }
  const explanation = `${spec.lead} ${spec.traps.map(([name, text]) => `${clause(name)}: ${text}`).join(". ")}.`;
  for (const [name] of spec.traps) {
    if (!explanation.toLowerCase().includes(name.toLowerCase()))
      throw new Error(`${spec.type}: разбор не называет ${name}`);
  }
  add({
    scale: spec.scale,
    type: spec.type,
    difficulty: spec.difficulty,
    topic: spec.topic,
    text: spec.text,
    scene: spec.scene,
    options: [spec.answer, ...wrongs],
    correct: 0,
    hint: spec.hint,
    explanation,
  });
}

function mulberry32(seed) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20261031);

function normalize(cells) {
  const minX = Math.min(...cells.map((cell) => cell[0]));
  const minY = Math.min(...cells.map((cell) => cell[1]));
  return cells.map(([x, y]) => [x - minX, y - minY]).sort((left, right) => left[0] - right[0] || left[1] - right[1]);
}

function keyOf(cells) {
  return normalize(cells)
    .map((cell) => cell.join(","))
    .join(";");
}

function rotationsOf(cells) {
  const found = [];
  const seen = new Set();
  let current = normalize(cells);
  for (let turn = 0; turn < 4; turn += 1) {
    const key = keyOf(current);
    if (!seen.has(key)) {
      seen.add(key);
      found.push(current);
    }
    current = normalize(current.map(([x, y]) => [y, -x]));
  }
  return found;
}

function mirrored(cells) {
  return normalize(cells.map(([x, y]) => [-x, y]));
}

function sameShape(left, right) {
  return keyOf(left) === keyOf(right);
}

function isRotation(candidate, source) {
  return rotationsOf(source).some((rotation) => sameShape(rotation, candidate));
}

function grow(size) {
  const cells = [[0, 0]];
  const used = new Set(["0,0"]);
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  let guard = 0;
  while (cells.length < size && guard < 300) {
    guard += 1;
    const base = cells[Math.floor(rng() * cells.length)];
    const direction = directions[Math.floor(rng() * directions.length)];
    const next = [base[0] + direction[0], base[1] + direction[1]];
    const key = next.join(",");
    if (used.has(key)) continue;
    used.add(key);
    cells.push(next);
  }
  return cells.length === size ? normalize(cells) : null;
}

function fullCells(cols, rows) {
  const cells = [];
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) cells.push([x, y]);
  }
  return cells;
}

function placements(piece, cols, rows, allowed) {
  const places = [];
  for (const rotation of rotationsOf(piece)) {
    const maxX = Math.max(...rotation.map((cell) => cell[0]));
    const maxY = Math.max(...rotation.map((cell) => cell[1]));
    for (let offsetX = 0; offsetX <= cols - maxX - 1; offsetX += 1) {
      for (let offsetY = 0; offsetY <= rows - maxY - 1; offsetY += 1) {
        const cells = rotation.map(([x, y]) => [x + offsetX, y + offsetY]);
        if (cells.every(([x, y]) => allowed.has(`${x},${y}`))) places.push(cells);
      }
    }
  }
  return places;
}

function placedTiles(cols, rows, pieces, filled) {
  const allowed = new Set((filled ?? fullCells(cols, rows)).map(([x, y]) => `${x},${y}`));
  const options = pieces.map((piece) => placements(piece, cols, rows, allowed));
  if (options.some((list) => list.length === 0)) return null;
  const chosen = [];
  const walk = (index, used) => {
    if (index === pieces.length) return used.size === allowed.size;
    for (const place of options[index]) {
      if (place.some(([x, y]) => used.has(`${x},${y}`))) continue;
      for (const [x, y] of place) used.add(`${x},${y}`);
      chosen.push(place);
      if (walk(index + 1, used)) return true;
      chosen.pop();
      for (const [x, y] of place) used.delete(`${x},${y}`);
    }
    return false;
  };
  if (!walk(0, new Set())) return null;
  return chosen.map((place) => place.map(([x, y]) => [x, y]));
}

function canTile(cols, rows, pieces, filled) {
  return placedTiles(cols, rows, pieces, filled) != null;
}

function assertTile(label, cols, rows, pieces, expected) {
  const actual = canTile(cols, rows, pieces, fullCells(cols, rows));
  if (actual !== expected) throw new Error(`${label}: ожидалась сборка ${expected}, получено ${actual}`);
}

assertTile(
  "spec correct",
  4,
  2,
  [
    [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [1, 0],
      [2, 0],
      [3, 0],
      [3, 1],
    ],
  ],
  true,
);

function findPieces(cols, rows, sizes) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const pieces = sizes.map((size) => grow(size));
    if (pieces.some((piece) => !piece)) continue;
    if (canTile(cols, rows, pieces, fullCells(cols, rows))) return pieces;
  }
  throw new Error(`не найден силуэт ${cols}x${rows} ${sizes.join("+")}`);
}

function findWrongPieces(cols, rows, sizes, banned) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const pieces = sizes.map((size) => grow(size));
    if (pieces.some((piece) => !piece)) continue;
    const key = pieces
      .map((piece) => keyOf(piece))
      .sort()
      .join("|");
    if (banned.has(key)) continue;
    if (!canTile(cols, rows, pieces, fullCells(cols, rows))) return pieces;
  }
  throw new Error(`не найден неверный набор ${cols}x${rows}`);
}

function pieceCount(pieces) {
  return pieces.reduce((sum, piece) => sum + piece.length, 0);
}

function addAssembly(difficulty, cols, rows, sizes) {
  const filled = fullCells(cols, rows);
  const area = cols * rows;
  const correct = findPieces(cols, rows, sizes);
  const placed = placedTiles(cols, rows, correct, filled);
  if (pieceCount(correct) !== area || !placed) throw new Error("верный набор не собирается");
  const banned = new Set([
    correct
      .map((piece) => keyOf(piece))
      .sort()
      .join("|"),
  ]);
  const wrongs = [];
  while (wrongs.length < 3) {
    const wrong = findWrongPieces(cols, rows, sizes, banned);
    if (pieceCount(wrong) !== area) throw new Error("разная площадь");
    if (canTile(cols, rows, wrong, filled)) throw new Error("неверный набор собирается");
    banned.add(
      wrong
        .map((piece) => keyOf(piece))
        .sort()
        .join("|"),
    );
    wrongs.push(wrong);
  }
  add({
    scale: "spatial",
    type: "spa-assembly",
    difficulty,
    text: "Какой набор закрывает силуэт? Поворот на 90 градусов разрешен.",
    scene: { kind: "cells", cols, rows, filled, pieces: placed },
    options: [correct, ...wrongs].map((pieces) => ({ scene: { kind: "cells", pieces } })),
    correct: 0,
    hint: "Сравните форму частей с силуэтом. Поворот разрешен, отражение нет.",
    explanation:
      "Только один набор закрывает силуэт без наложений и дыр. Площадь у всех наборов одинаковая, но остальные не складываются.",
  });
}

for (const [difficulty, cols, rows, sizes] of [
  ["easy", 3, 2, [3, 3]],
  ["easy", 4, 2, [4, 4]],
  ["easy", 5, 2, [5, 5]],
  ["easy", 3, 3, [4, 5]],
  ["medium", 4, 2, [3, 5]],
  ["medium", 5, 2, [4, 6]],
  ["medium", 4, 3, [6, 6]],
  ["medium", 6, 2, [4, 4, 4]],
  ["hard", 4, 3, [4, 4, 4]],
  ["hard", 5, 3, [5, 5, 5]],
  ["hard", 6, 2, [3, 3, 3, 3]],
  ["hard", 3, 4, [4, 4, 4]],
]) {
  addAssembly(difficulty, cols, rows, sizes);
}

function crossNet(top, left, front, right, back, bottom) {
  return [
    [null, top, null, null],
    [left, front, right, back],
    [null, bottom, null, null],
  ];
}

function addNet(difficulty, top, front, right) {
  const layout = crossNet(top, "blank", front, right, "blank", "blank");
  const cubes = [
    { front, top, right },
    { front: top, top: front, right },
    { front, top: right, right: top },
    { front: right, top, right: front },
  ];
  const keys = cubes.map((cube) => `${cube.front}|${cube.top}|${cube.right}`);
  if (new Set(keys).size !== 4) throw new Error(`кубики совпали ${keys.join(" ")}`);
  add({
    scale: "spatial",
    type: "spa-net",
    difficulty,
    text: "На каком кубике передняя и верхняя грани совпадают с разверткой?",
    scene: { kind: "net", layout },
    options: cubes.map((cube) => ({ scene: { kind: "cube", ...cube } })),
    correct: 0,
    hint: "На кресте верхняя клетка становится верхом кубика, центральная - передом.",
    explanation: "Передняя грань развертки и верхняя сохраняются. Остальные кубики меняют эти знаки местами.",
  });
}

const marks = ["blank", "circle", "triangle", "square", "line"];
const triples = [];
for (const top of marks) {
  for (const front of marks) {
    for (const right of marks) {
      if (new Set([top, front, right]).size === 3) triples.push([top, front, right]);
    }
  }
}
const easyNets = triples.filter((triple) => triple.includes("blank")).slice(0, 4);
const restNets = triples.filter((triple) => !triple.includes("blank"));
for (const triple of easyNets) addNet("easy", ...triple);
for (const triple of restNets.slice(0, 4)) addNet("medium", ...triple);
for (const triple of restNets.slice(4, 8)) addNet("hard", ...triple);

function boundsOf(cells) {
  return {
    cols: Math.max(...cells.map((cell) => cell[0])) + 1,
    rows: Math.max(...cells.map((cell) => cell[1])) + 1,
  };
}

function addTransform(difficulty, mode, sourceCells) {
  const turns = rotationsOf(sourceCells);
  const mirror = mirrored(sourceCells);
  if (mode === "rotate" && isRotation(mirror, sourceCells)) throw new Error("зеркало совпало с поворотом");
  const correct = mode === "rotate" ? turns.find((turn) => !sameShape(turn, sourceCells)) : mirror;
  if (!correct) throw new Error("нет верного преобразования");
  const seen = new Set([keyOf(correct), keyOf(sourceCells), keyOf(mirror)]);
  const wrongs = [];
  if (mode === "rotate") wrongs.push(mirror);
  for (const turn of turns) {
    if (wrongs.length >= 3) break;
    if (seen.has(keyOf(turn)) || sameShape(turn, correct)) continue;
    wrongs.push(turn);
    seen.add(keyOf(turn));
  }
  let guard = 0;
  while (wrongs.length < 3 && guard < 200) {
    guard += 1;
    const extra = grow(sourceCells.length);
    if (!extra || seen.has(keyOf(extra)) || isRotation(extra, sourceCells) || sameShape(extra, mirror)) continue;
    wrongs.push(extra);
    seen.add(keyOf(extra));
  }
  if (wrongs.length < 3) throw new Error("мало неверных преобразований");
  const box = boundsOf(sourceCells);
  add({
    scale: "spatial",
    type: "spa-transform",
    difficulty,
    text:
      mode === "rotate"
        ? "Какая фигура получена поворотом образца?"
        : "Какая фигура является зеркальным отражением образца?",
    scene: { kind: "cells", cols: box.cols, rows: box.rows, filled: sourceCells, mode },
    options: [correct, ...wrongs.slice(0, 3)].map((cells) => {
      const pieceBox = boundsOf(cells);
      return { scene: { kind: "cells", cols: pieceBox.cols, rows: pieceBox.rows, filled: cells } };
    }),
    correct: 0,
    hint:
      mode === "rotate"
        ? "Мысленно поверните образец. Выступ с другой стороны длинной части дает отражение."
        : "Отразите образец. Обычный поворот оставляет выступ с той же стороны.",
    explanation:
      mode === "rotate"
        ? "Верная фигура совпадает с образцом после поворота. Зеркало поворотом не получить."
        : "Верная фигура - отражение образца. Поворот оставляет другую сторону выступа.",
  });
}

const chiral = [
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 3],
  ],
  [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 2],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [2, 1],
    [3, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 2],
  ],
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 2],
  ],
];
const transformPlan = [
  ["easy", "rotate"],
  ["easy", "rotate"],
  ["easy", "mirror"],
  ["medium", "rotate"],
  ["medium", "mirror"],
  ["medium", "rotate"],
  ["hard", "mirror"],
  ["hard", "mirror"],
];
transformPlan.forEach(([difficulty, mode], index) => addTransform(difficulty, mode, chiral[index]));

function swapped(heights, ax, ay, bx, by) {
  const copy = heights.map((row) => [...row]);
  const hold = copy[ay][ax];
  copy[ay][ax] = copy[by][bx];
  copy[by][bx] = hold;
  return copy;
}

function gridKey(heights) {
  return heights.map((row) => row.join(",")).join(";");
}

function addTop(difficulty, heights) {
  const rows = heights.length;
  const cols = heights[0].length;
  const wrongs = [
    swapped(heights, 0, 0, cols - 1, 0),
    swapped(heights, 0, 0, 0, rows - 1),
    swapped(heights, cols - 1, 0, 0, rows - 1),
  ];
  const keys = [heights, ...wrongs].map(gridKey);
  if (new Set(keys).size !== 4) throw new Error(`вид сверху совпал ${gridKey(heights)}`);
  add({
    scale: "spatial",
    type: "spa-top",
    difficulty,
    text: "Какой вид сверху повторяет высоты столбиков?",
    scene: { kind: "stack", heights, view: "iso" },
    options: [heights, ...wrongs].map((grid) => ({ scene: { kind: "stack", heights: grid, view: "top" } })),
    correct: 0,
    hint: "Число в клетке вида сверху - высота столбика в этой же клетке.",
    explanation: "Верная сетка повторяет высоты. Остальные меняют два числа местами.",
  });
}

for (const [difficulty, heights] of [
  [
    "easy",
    [
      [1, 4],
      [2, 5],
    ],
  ],
  [
    "easy",
    [
      [2, 6],
      [5, 1],
    ],
  ],
  [
    "easy",
    [
      [3, 1],
      [6, 2],
    ],
  ],
  [
    "medium",
    [
      [2, 5, 1],
      [4, 1, 6],
    ],
  ],
  [
    "medium",
    [
      [1, 4, 6],
      [5, 2, 3],
    ],
  ],
  [
    "hard",
    [
      [1, 4, 2],
      [5, 2, 6],
      [3, 6, 1],
    ],
  ],
  [
    "hard",
    [
      [4, 1, 5],
      [2, 6, 3],
      [6, 3, 2],
    ],
  ],
  [
    "hard",
    [
      [2, 5, 4],
      [6, 1, 3],
      [1, 4, 6],
    ],
  ],
]) {
  addTop(difficulty, heights);
}

function addCubes(difficulty, heights) {
  const flat = heights.flat();
  const answer = flat.reduce((sum, value) => sum + value, 0);
  const max = Math.max(...flat);
  const near = heights[heights.length - 1].reduce((sum, value) => sum + value, 0);
  const stacks = flat.filter((value) => value > 0).length;
  commitNumeric({
    scale: "spatial",
    type: "spa-cubes",
    difficulty,
    text: "Сколько кубиков в постройке, если считать и закрытые спереди?",
    scene: { kind: "stack", heights, view: "iso" },
    answer,
    hint: "Сложите высоты всех столбиков, в том числе тех, что закрыты спереди.",
    lead: "Число кубиков равно сумме всех высот.",
    traps: [
      { name: "забыт самый высокий столбик", compute: () => answer - max },
      { name: "сложен только ближний ряд", compute: () => near },
      { name: "посчитаны столбики, а не кубики", compute: () => stacks },
    ],
  });
}

for (const [difficulty, heights] of [
  [
    "easy",
    [
      [5, 2],
      [3, 2],
    ],
  ],
  [
    "easy",
    [
      [4, 1],
      [2, 6],
    ],
  ],
  [
    "medium",
    [
      [3, 1, 4],
      [2, 5, 2],
    ],
  ],
  [
    "medium",
    [
      [2, 4, 1],
      [5, 2, 3],
    ],
  ],
  [
    "medium",
    [
      [4, 2, 3],
      [1, 6, 2],
    ],
  ],
  [
    "hard",
    [
      [2, 4, 1],
      [3, 1, 5],
      [2, 3, 6],
    ],
  ],
  [
    "hard",
    [
      [5, 1, 2],
      [1, 4, 2],
      [3, 2, 6],
    ],
  ],
  [
    "hard",
    [
      [1, 3, 4],
      [6, 2, 1],
      [2, 5, 3],
    ],
  ],
]) {
  addCubes(difficulty, heights);
}

function el(shape, x, y, size, dir) {
  const element = { shape, x, y, size };
  if (dir) element.dir = dir;
  return element;
}

function card(elements) {
  return { elements };
}

function one(shape, x, y, size, dir) {
  return card([el(shape, x, y, size, dir)]);
}

function dotCard(count, size) {
  const spots = [
    [0.5, 0.5],
    [0.3, 0.3],
    [0.7, 0.32],
    [0.32, 0.7],
    [0.7, 0.7],
  ];
  return card(spots.slice(0, count).map(([x, y]) => el("dot", x, y, size)));
}

function cardKey(value) {
  return JSON.stringify(value);
}

function addMatrix(difficulty, cells, answer, wrongs, hint, explanation) {
  const filled = cells.flat().filter(Boolean);
  if (difficulty === "easy" && new Set(filled.map(cardKey)).size < 2)
    throw new Error("легкая матрица из одинаковых клеток");
  const options = [answer, ...wrongs];
  if (new Set(options.map(cardKey)).size !== options.length) throw new Error("матрица: повтор карточки");
  add({
    scale: "nonverbal",
    type: "non-matrix",
    difficulty,
    text: "Какая карточка стоит в пустой клетке?",
    scene: { kind: "matrix", cells },
    options: options.map((item) => ({ scene: { kind: "card", elements: item.elements } })),
    correct: 0,
    hint,
    explanation,
  });
}

function ruleScore(value, rules) {
  return rules.reduce((sum, rule) => sum + (rule(value) ? 1 : 0), 0);
}

function addHardMatrix(cells, answer, onlyOne, others, rules, hint, explanation) {
  if (ruleScore(answer, rules) !== rules.length) throw new Error("ответ матрицы выполняет не все правила");
  if (ruleScore(onlyOne, rules) !== 1) throw new Error("ловушка одного правила выполняет не ровно одно");
  for (const other of others) {
    if (ruleScore(other, rules) === rules.length) throw new Error("лишний вариант выполняет все правила");
  }
  addMatrix("hard", cells, answer, [onlyOne, ...others], hint, explanation);
}

function shapeOf(shape, size, x = 0.5, y = 0.5) {
  return one(shape, x, y, size, shape === "triangle" ? "up" : undefined);
}

const easyShapes = ["circle", "square", "triangle"];
addMatrix(
  "easy",
  [0, 1, 2].map((row) =>
    row < 2 ? [dotCard(1, 0.14), dotCard(2, 0.14), dotCard(3, 0.14)] : [dotCard(1, 0.14), dotCard(2, 0.14), null],
  ),
  dotCard(3, 0.14),
  [dotCard(2, 0.14), dotCard(1, 0.14), dotCard(4, 0.14)],
  "Число точек растет слева направо и в каждой строке одинаково.",
  "В правом столбце три точки. Две точки повторяют средний столбец, одна - левый, четыре перескакивают правило.",
);
addMatrix(
  "easy",
  [0, 1, 2].map((row) =>
    row < 2
      ? [shapeOf("circle", 0.16), shapeOf("circle", 0.3), shapeOf("circle", 0.46)]
      : [shapeOf("circle", 0.16), shapeOf("circle", 0.3), null],
  ),
  shapeOf("circle", 0.46),
  [shapeOf("circle", 0.3), shapeOf("circle", 0.16), shapeOf("square", 0.46)],
  "Круг крупнеет слева направо, форма не меняется.",
  "Справа круг самого большого размера. Средний и мелкий круг останавливают рост, квадрат меняет форму.",
);
addMatrix(
  "easy",
  [0, 1, 2].map((row) =>
    row < 2
      ? easyShapes.map((shape) => shapeOf(shape, 0.28))
      : [shapeOf("circle", 0.28), shapeOf("square", 0.28), null],
  ),
  shapeOf("triangle", 0.28),
  [shapeOf("square", 0.28), shapeOf("circle", 0.28), shapeOf("diamond", 0.28)],
  "Форма меняется по столбцам и повторяется в строках.",
  "Правый столбец держит треугольник. Квадрат и круг взяты из других столбцов, ромб в ряду не встречается.",
);
addMatrix(
  "easy",
  [0.22, 0.5, 0.78].map((y, row) =>
    row < 2
      ? [shapeOf("square", 0.2, 0.5, y), shapeOf("square", 0.2, 0.5, y), shapeOf("square", 0.2, 0.5, y)]
      : [shapeOf("square", 0.2, 0.5, y), shapeOf("square", 0.2, 0.5, y), null],
  ),
  shapeOf("square", 0.2, 0.5, 0.78),
  [shapeOf("square", 0.2, 0.5, 0.5), shapeOf("square", 0.2, 0.5, 0.22), shapeOf("circle", 0.2, 0.5, 0.78)],
  "Квадрат опускается от строки к строке.",
  "В нижней строке квадрат стоит низко. Варианты из верхних строк или с кругом правило не закрывают.",
);

function fillMatrix(at) {
  return [0, 1, 2].map((row) => [0, 1, 2].map((column) => (row === 2 && column === 2 ? null : at(row, column))));
}

addMatrix(
  "medium",
  fillMatrix((row, column) => dotCard(column + 1, [0.12, 0.18, 0.26][row])),
  dotCard(3, 0.26),
  [dotCard(3, 0.12), dotCard(1, 0.26), dotCard(2, 0.18)],
  "Вправо точек больше, вниз они крупнее.",
  "Нужны три крупные точки. Три мелкие выполняют только счет, одна крупная - только размер.",
);
addMatrix(
  "medium",
  fillMatrix((row, column) => shapeOf(["circle", "square", "triangle"][column], [0.16, 0.28, 0.42][row])),
  shapeOf("triangle", 0.42),
  [shapeOf("triangle", 0.16), shapeOf("circle", 0.42), shapeOf("square", 0.28)],
  "Вправо меняется форма, вниз растет размер.",
  "Нужен крупный треугольник. Мелкий треугольник держит только форму, крупный круг - только размер.",
);
addMatrix(
  "medium",
  fillMatrix((row, column) => shapeOf(["circle", "square", "diamond"][row], 0.24, [0.25, 0.5, 0.75][column], 0.5)),
  shapeOf("diamond", 0.24, 0.75, 0.5),
  [shapeOf("diamond", 0.24, 0.25, 0.5), shapeOf("circle", 0.24, 0.75, 0.5), shapeOf("square", 0.24, 0.5, 0.5)],
  "Вниз меняется форма, вправо фигура сдвигается.",
  "Нужен ромб справа. Ромб слева держит только форму, круг справа - только положение.",
);
addMatrix(
  "medium",
  fillMatrix((row, column) => dotCard(row + 1, [0.12, 0.2, 0.3][column])),
  dotCard(3, 0.3),
  [dotCard(3, 0.12), dotCard(1, 0.3), dotCard(2, 0.2)],
  "Вниз точек больше, вправо они крупнее.",
  "Нужны три крупные точки. Три мелкие выполняют только счет, одна крупная - только размер.",
);

const hardNote = "Один из неверных вариантов выполняет только одно из двух правил.";
addHardMatrix(
  fillMatrix((row, column) => dotCard(column + 1, [0.12, 0.2, 0.3][row])),
  dotCard(3, 0.3),
  dotCard(3, 0.12),
  [dotCard(1, 0.3), dotCard(2, 0.2)],
  [(value) => value.elements.length === 3, (value) => value.elements[0].size === 0.3],
  "Вправо точек больше, вниз они крупнее.",
  `Нужны три точки размера нижней строки. ${hardNote}`,
);
addHardMatrix(
  fillMatrix((row, column) => shapeOf(["circle", "square", "triangle"][column], [0.16, 0.3, 0.44][row])),
  shapeOf("triangle", 0.44),
  shapeOf("triangle", 0.16),
  [shapeOf("circle", 0.44), shapeOf("square", 0.3)],
  [(value) => value.elements[0].shape === "triangle", (value) => value.elements[0].size === 0.44],
  "Вправо меняется форма, вниз растет размер.",
  `Нужен крупный треугольник. ${hardNote}`,
);
addHardMatrix(
  fillMatrix((row, column) => shapeOf(["circle", "square", "triangle"][row], [0.16, 0.3, 0.44][column])),
  shapeOf("triangle", 0.44),
  shapeOf("triangle", 0.16),
  [shapeOf("circle", 0.44), shapeOf("square", 0.3)],
  [(value) => value.elements[0].shape === "triangle", (value) => value.elements[0].size === 0.44],
  "Вниз меняется форма, вправо растет размер.",
  `Нужен крупный треугольник нижней строки. ${hardNote}`,
);
function shiftedDots(count, y) {
  return card(Array.from({ length: count }, (_, index) => el("dot", 0.28 + index * 0.22, y, 0.12)));
}

addHardMatrix(
  fillMatrix((row, column) => shapeOf(["circle", "square", "triangle"][row], 0.26, [0.25, 0.5, 0.75][column], 0.5)),
  shapeOf("triangle", 0.26, 0.75, 0.5),
  shapeOf("triangle", 0.26, 0.25, 0.5),
  [shapeOf("circle", 0.26, 0.75, 0.5), shapeOf("square", 0.26, 0.5, 0.5)],
  [(value) => value.elements[0].shape === "triangle", (value) => value.elements[0].x === 0.75],
  "Вниз меняется форма, вправо фигура сдвигается.",
  `Нужен треугольник справа. ${hardNote}`,
);
addHardMatrix(
  fillMatrix((row, column) => shiftedDots(column + 1, [0.25, 0.5, 0.75][row])),
  shiftedDots(3, 0.75),
  shiftedDots(3, 0.25),
  [shiftedDots(1, 0.75), shiftedDots(2, 0.5)],
  [(value) => value.elements.length === 3, (value) => value.elements[0].y === 0.75],
  "Вправо точек больше, вниз ряд опускается.",
  `Нужны три точки в нижнем положении. ${hardNote}`,
);
addHardMatrix(
  fillMatrix((row, column) => dotCard(row + 1, [0.14, 0.24, 0.36][column])),
  dotCard(3, 0.36),
  dotCard(3, 0.14),
  [dotCard(1, 0.36), dotCard(2, 0.24)],
  [(value) => value.elements.length === 3, (value) => value.elements[0].size === 0.36],
  "Вниз точек больше, вправо они крупнее.",
  `Нужны три крупные точки. ${hardNote}`,
);
addHardMatrix(
  fillMatrix((row, column) => shapeOf(["diamond", "circle", "square"][column], [0.18, 0.32, 0.46][row])),
  shapeOf("square", 0.46),
  shapeOf("square", 0.18),
  [shapeOf("diamond", 0.46), shapeOf("circle", 0.32)],
  [(value) => value.elements[0].shape === "square", (value) => value.elements[0].size === 0.46],
  "Вправо меняется форма, вниз растет размер.",
  `Нужен крупный квадрат. ${hardNote}`,
);
addHardMatrix(
  fillMatrix((row, column) => shapeOf(["line", "circle", "diamond"][row], 0.3, 0.5, [0.25, 0.5, 0.75][column])),
  shapeOf("diamond", 0.3, 0.5, 0.75),
  shapeOf("diamond", 0.3, 0.5, 0.25),
  [shapeOf("line", 0.3, 0.5, 0.75), shapeOf("circle", 0.3, 0.5, 0.5)],
  [(value) => value.elements[0].shape === "diamond", (value) => value.elements[0].y === 0.75],
  "Вниз меняется форма, вправо фигура опускается.",
  `Нужен ромб внизу. ${hardNote}`,
);

function addOdd(difficulty, cards, hint, explanation) {
  if (
    difficulty !== "easy" &&
    cards.every((item) => item.elements.length === 1 && item.elements[0].shape === "triangle")
  ) {
    throw new Error("лишняя фигура свелась к направлению треугольника");
  }
  add({
    scale: "nonverbal",
    type: "non-odd",
    difficulty,
    text: "Какая карточка устроена иначе?",
    scene: { kind: "group", cards },
    options: cards.map((item) => ({ scene: { kind: "card", elements: item.elements } })),
    correct: cards.length - 1,
    hint,
    explanation,
  });
}

addOdd(
  "easy",
  [
    shapeOf("square", 0.3, 0.4, 0.48),
    shapeOf("square", 0.28, 0.55, 0.5),
    shapeOf("square", 0.32, 0.62, 0.45),
    shapeOf("circle", 0.3, 0.5, 0.5),
  ],
  "Три карточки держат одну форму.",
  "Лишняя карточка меняет форму: круг вместо квадрата.",
);
addOdd(
  "easy",
  [
    dotCard(2, 0.14),
    card([el("dot", 0.3, 0.55, 0.14), el("dot", 0.7, 0.35, 0.14)]),
    card([el("dot", 0.25, 0.3, 0.14), el("dot", 0.6, 0.62, 0.14)]),
    dotCard(3, 0.14),
  ],
  "Сравните число точек.",
  "На трех карточках по две точки, на одной три.",
);
addOdd(
  "easy",
  [
    shapeOf("circle", 0.22, 0.3, 0.4),
    shapeOf("circle", 0.24, 0.55, 0.62),
    shapeOf("circle", 0.2, 0.7, 0.35),
    shapeOf("diamond", 0.24, 0.5, 0.5),
  ],
  "Три карточки держат круг.",
  "Лишняя карточка - ромб.",
);
addOdd(
  "medium",
  [
    shapeOf("circle", 0.22, 0.5, 0.28),
    shapeOf("square", 0.22, 0.5, 0.24),
    shapeOf("diamond", 0.22, 0.5, 0.3),
    shapeOf("triangle", 0.22, 0.5, 0.72),
  ],
  "Смотрите на половину рамки, формы разные нарочно.",
  "Три элемента в верхней половине, один в нижней.",
);
addOdd(
  "medium",
  [
    shapeOf("circle", 0.4, 0.5, 0.5),
    shapeOf("square", 0.42, 0.5, 0.5),
    shapeOf("line", 0.38, 0.5, 0.5),
    shapeOf("diamond", 0.16, 0.5, 0.5),
  ],
  "Сравните размер, а не форму.",
  "Три фигуры крупные, одна мелкая.",
);
addOdd(
  "medium",
  [
    dotCard(3, 0.12),
    card([el("dot", 0.2, 0.2, 0.1), el("dot", 0.5, 0.5, 0.1), el("dot", 0.8, 0.7, 0.1)]),
    card([el("square", 0.3, 0.4, 0.12), el("square", 0.55, 0.6, 0.12), el("square", 0.75, 0.3, 0.12)]),
    card([el("dot", 0.4, 0.4, 0.12), el("dot", 0.65, 0.6, 0.12)]),
  ],
  "Считайте элементы, их форма здесь отвлекает.",
  "У трех карточек по три элемента, у одной два.",
);
addOdd(
  "hard",
  [
    shapeOf("circle", 0.28, 0.5, 0.3),
    shapeOf("square", 0.3, 0.5, 0.28),
    shapeOf("diamond", 0.26, 0.5, 0.32),
    shapeOf("triangle", 0.72, 0.5, 0.28),
  ],
  "Общий признак - левая половина рамки.",
  "Три фигуры слева, одна справа.",
);
addOdd(
  "hard",
  [
    card([el("circle", 0.35, 0.5, 0.16), el("dot", 0.7, 0.3, 0.1)]),
    card([el("square", 0.32, 0.5, 0.16), el("dot", 0.72, 0.28, 0.1)]),
    card([el("diamond", 0.3, 0.5, 0.16), el("dot", 0.68, 0.32, 0.1)]),
    shapeOf("triangle", 0.32, 0.5, 0.2),
  ],
  "Рядом с фигурой есть точка.",
  "У трех карточек есть точка, у одной ее нет.",
);

function addSequence(difficulty, steps, answer, wrongs, hint, explanation) {
  const shapes = [...steps, answer].map((item) => item.elements.map((element) => element.shape).join(","));
  if (difficulty !== "easy" && shapes.join("|").includes("circle,square,circle,square")) {
    throw new Error("ряд чередует круг и квадрат");
  }
  add({
    scale: "nonverbal",
    type: "non-sequence",
    difficulty,
    text: "Какая карточка продолжает ряд?",
    scene: { kind: "sequence", steps },
    options: [answer, ...wrongs].map((item) => ({ scene: { kind: "card", elements: item.elements } })),
    correct: 0,
    hint,
    explanation,
  });
}

addSequence(
  "easy",
  [dotCard(1, 0.14), dotCard(2, 0.14), dotCard(3, 0.14)],
  dotCard(4, 0.14),
  [dotCard(3, 0.14), dotCard(5, 0.14), dotCard(2, 0.14)],
  "Каждый шаг добавляет одну точку.",
  "После трех точек идут четыре. Три повторяют прошлый шаг, пять перескакивают.",
);
addSequence(
  "easy",
  [shapeOf("circle", 0.18, 0.22, 0.5), shapeOf("circle", 0.18, 0.48, 0.5), shapeOf("circle", 0.18, 0.7, 0.5)],
  shapeOf("circle", 0.18, 0.86, 0.5),
  [shapeOf("circle", 0.18, 0.22, 0.5), shapeOf("square", 0.18, 0.86, 0.5), shapeOf("circle", 0.18, 0.5, 0.5)],
  "Круг сдвигается вправо.",
  "Следующий круг правее предыдущего. Остальные возвращают его или меняют форму.",
);
addSequence(
  "easy",
  [shapeOf("square", 0.16, 0.5, 0.5), shapeOf("square", 0.28, 0.5, 0.5), shapeOf("square", 0.4, 0.5, 0.5)],
  shapeOf("square", 0.52, 0.5, 0.5),
  [shapeOf("square", 0.4, 0.5, 0.5), shapeOf("square", 0.16, 0.5, 0.5), shapeOf("circle", 0.52, 0.5, 0.5)],
  "Квадрат растет на каждом шаге.",
  "Нужен следующий по размеру квадрат. Повтор и уменьшение обрывают рост.",
);
addSequence(
  "medium",
  [shapeOf("circle", 0.24), shapeOf("square", 0.24), shapeOf("triangle", 0.24)],
  shapeOf("diamond", 0.24),
  [shapeOf("circle", 0.24), shapeOf("square", 0.24), shapeOf("line", 0.24)],
  "Формы идут по одной и не чередуются через шаг.",
  "После круга, квадрата и треугольника идет ромб. Повтор начала ряд не продолжает.",
);
addSequence(
  "medium",
  [shapeOf("circle", 0.16, 0.25, 0.5), shapeOf("circle", 0.28, 0.45, 0.5), shapeOf("circle", 0.4, 0.62, 0.5)],
  shapeOf("circle", 0.52, 0.8, 0.5),
  [shapeOf("circle", 0.16, 0.8, 0.5), shapeOf("circle", 0.52, 0.25, 0.5), shapeOf("square", 0.52, 0.8, 0.5)],
  "Круг одновременно растет и сдвигается вправо.",
  "Нужны оба изменения. Рост без сдвига и сдвиг без роста выполняют только одно.",
);
addSequence(
  "medium",
  [dotCard(1, 0.12), dotCard(2, 0.18), dotCard(3, 0.24)],
  dotCard(4, 0.3),
  [dotCard(4, 0.12), dotCard(3, 0.3), dotCard(2, 0.24)],
  "Точек больше и они крупнее.",
  "Следующая карточка - четыре более крупные точки. Число без размера или размер без нового числа обрывают ряд.",
);
addSequence(
  "hard",
  [shapeOf("circle", 0.2, 0.3, 0.3), shapeOf("square", 0.28, 0.5, 0.5), shapeOf("triangle", 0.36, 0.7, 0.7)],
  shapeOf("diamond", 0.44, 0.86, 0.28),
  [shapeOf("diamond", 0.2, 0.3, 0.3), shapeOf("circle", 0.44, 0.86, 0.28), shapeOf("triangle", 0.44, 0.86, 0.28)],
  "Форма, размер и сдвиг вправо меняются вместе.",
  "Нужен более крупный ромб правее. Повтор размера или прежняя форма выполняют не все изменения.",
);
addSequence(
  "hard",
  [shiftedDots(1, 0.25), shiftedDots(2, 0.45), shiftedDots(3, 0.65)],
  shiftedDots(4, 0.8),
  [shiftedDots(3, 0.8), shiftedDots(4, 0.25), shiftedDots(2, 0.65)],
  "Точек больше, и ряд опускается.",
  "Нужны четыре точки ниже предыдущих. Прежнее число или прежняя высота обрывают одно из правил.",
);

function addAnalogy(difficulty, left, right, given, answer, wrongs, hint, explanation) {
  add({
    scale: "nonverbal",
    type: "non-analogy",
    difficulty,
    text: "Первая карточка относится ко второй, как третья к какой?",
    scene: { kind: "analogy", pair: [left, right], given },
    options: [answer, ...wrongs].map((item) => ({ scene: { kind: "card", elements: item.elements } })),
    correct: 0,
    hint,
    explanation,
  });
}

addAnalogy(
  "easy",
  dotCard(1, 0.14),
  dotCard(2, 0.14),
  shapeOf("square", 0.2, 0.35, 0.5),
  card([el("square", 0.32, 0.5, 0.18), el("square", 0.68, 0.5, 0.18)]),
  [shapeOf("square", 0.2, 0.5, 0.5), dotCard(2, 0.14), shapeOf("circle", 0.2)],
  "Число фигур удваивается, форма сохраняется.",
  "Один квадрат относится к двум квадратам. Один квадрат и две точки отношение не переносят.",
);
addAnalogy(
  "easy",
  shapeOf("circle", 0.18),
  shapeOf("circle", 0.4),
  shapeOf("square", 0.18),
  shapeOf("square", 0.4),
  [shapeOf("square", 0.18), shapeOf("circle", 0.4), shapeOf("diamond", 0.4)],
  "Фигура становится крупнее и не меняет форму.",
  "Мелкий квадрат относится к крупному квадрату. Крупный круг меняет форму.",
);
addAnalogy(
  "easy",
  shapeOf("triangle", 0.26, 0.5, 0.28),
  shapeOf("triangle", 0.26, 0.5, 0.72),
  shapeOf("line", 0.4, 0.5, 0.3),
  shapeOf("line", 0.4, 0.5, 0.72),
  [shapeOf("line", 0.4, 0.5, 0.3), shapeOf("triangle", 0.26, 0.5, 0.72), shapeOf("square", 0.2, 0.5, 0.72)],
  "Элемент переходит в нижнюю половину.",
  "Линия сверху относится к линии снизу. Повтор верхней линии отношение не выполняет.",
);
addAnalogy(
  "medium",
  shapeOf("circle", 0.2, 0.3, 0.5),
  card([el("circle", 0.7, 0.5, 0.2), el("dot", 0.3, 0.28, 0.1)]),
  shapeOf("square", 0.2, 0.3, 0.5),
  card([el("square", 0.7, 0.5, 0.2), el("dot", 0.3, 0.28, 0.1)]),
  [
    shapeOf("square", 0.2, 0.7, 0.5),
    card([el("circle", 0.7, 0.5, 0.2), el("dot", 0.3, 0.28, 0.1)]),
    shapeOf("square", 0.2, 0.3, 0.5),
  ],
  "Фигура сдвигается вправо, и слева появляется точка.",
  "Нужны оба изменения. Сдвиг без точки или точка у круга выполняют только одно.",
);
addAnalogy(
  "medium",
  dotCard(2, 0.12),
  dotCard(2, 0.22),
  shapeOf("diamond", 0.16),
  shapeOf("diamond", 0.34),
  [shapeOf("diamond", 0.16), dotCard(2, 0.22), shapeOf("circle", 0.34)],
  "Фигура крупнеет и сохраняет форму.",
  "Мелкий ромб относится к крупному ромбу.",
);
addAnalogy(
  "medium",
  shapeOf("square", 0.2, 0.28, 0.5),
  shapeOf("circle", 0.2, 0.72, 0.5),
  shapeOf("diamond", 0.2, 0.28, 0.5),
  shapeOf("triangle", 0.2, 0.72, 0.5),
  [shapeOf("diamond", 0.2, 0.72, 0.5), shapeOf("square", 0.2, 0.72, 0.5), shapeOf("triangle", 0.2, 0.28, 0.5)],
  "Фигура меняется на следующую в ряду форм и уходит вправо.",
  "Ромб слева относится к треугольнику справа. Сдвиг без смены формы выполняет только часть.",
);
addAnalogy(
  "hard",
  shiftedDots(1, 0.3),
  shiftedDots(3, 0.7),
  shapeOf("square", 0.16, 0.3, 0.3),
  card([el("square", 0.3, 0.7, 0.16), el("square", 0.55, 0.7, 0.16), el("square", 0.8, 0.7, 0.16)]),
  [
    shapeOf("square", 0.16, 0.7, 0.7),
    shiftedDots(3, 0.7),
    card([el("circle", 0.3, 0.7, 0.16), el("circle", 0.55, 0.7, 0.16), el("circle", 0.8, 0.7, 0.16)]),
  ],
  "Число утраивается, и фигура опускается.",
  "Один квадрат относится к трем квадратам внизу. Сдвиг без утроения или три круга теряют форму.",
);
addAnalogy(
  "hard",
  shapeOf("circle", 0.16, 0.28, 0.3),
  card([el("circle", 0.72, 0.7, 0.32), el("dot", 0.28, 0.28, 0.08)]),
  shapeOf("diamond", 0.16, 0.28, 0.3),
  card([el("diamond", 0.72, 0.7, 0.32), el("dot", 0.28, 0.28, 0.08)]),
  [
    shapeOf("diamond", 0.32, 0.72, 0.7),
    card([el("circle", 0.72, 0.7, 0.32), el("dot", 0.28, 0.28, 0.08)]),
    shapeOf("diamond", 0.16, 0.28, 0.3),
  ],
  "Фигура растет, уходит вправо и вниз, слева сверху появляется точка.",
  "Нужны все три изменения. Крупный ромб без точки выполняет не все.",
);

function addGroup(difficulty, samples, answer, wrongs, hint, explanation) {
  add({
    scale: "nonverbal",
    type: "non-group",
    difficulty,
    text: "Какая карточка подходит к группе?",
    scene: { kind: "group", cards: samples },
    options: [answer, ...wrongs].map((item) => ({ scene: { kind: "card", elements: item.elements } })),
    correct: 0,
    hint,
    explanation,
  });
}

addGroup(
  "easy",
  [shapeOf("circle", 0.2, 0.5, 0.28), shapeOf("square", 0.2, 0.5, 0.24), shapeOf("diamond", 0.2, 0.5, 0.3)],
  shapeOf("triangle", 0.2, 0.5, 0.26),
  [shapeOf("triangle", 0.2, 0.5, 0.74), shapeOf("circle", 0.42), dotCard(2, 0.12)],
  "Общий признак - верхняя половина рамки.",
  "У карточек группы элемент сверху. Верный вариант тоже сверху, нижний треугольник и пара точек - нет.",
);
addGroup(
  "easy",
  [
    dotCard(2, 0.12),
    card([el("dot", 0.25, 0.4, 0.12), el("dot", 0.7, 0.6, 0.12)]),
    card([el("dot", 0.4, 0.25, 0.12), el("dot", 0.62, 0.7, 0.12)]),
  ],
  dotCard(2, 0.16),
  [dotCard(1, 0.16), dotCard(3, 0.16), dotCard(4, 0.16)],
  "В группе по две точки.",
  "Верный вариант тоже из двух точек. Другое число в группу не входит.",
);
addGroup(
  "easy",
  [shapeOf("square", 0.34), shapeOf("circle", 0.36), shapeOf("line", 0.32, 0.5, 0.5)],
  shapeOf("diamond", 0.38),
  [shapeOf("diamond", 0.16), shapeOf("circle", 0.16), dotCard(3, 0.1)],
  "Фигуры в группе крупные.",
  "Верный ромб тоже крупный. Мелкая фигура в группу не входит.",
);
addGroup(
  "medium",
  [shapeOf("circle", 0.28, 0.5, 0.3), shapeOf("square", 0.3, 0.5, 0.28), shapeOf("diamond", 0.26, 0.5, 0.32)],
  shapeOf("triangle", 0.28, 0.5, 0.3),
  [shapeOf("triangle", 0.72, 0.5, 0.3), shapeOf("circle", 0.4, 0.5, 0.5), dotCard(2, 0.12)],
  "Один элемент стоит слева.",
  "Верный треугольник тоже слева. Справа и пара точек держат другой признак.",
);
addGroup(
  "medium",
  [
    card([el("square", 0.5, 0.5, 0.2), el("dot", 0.75, 0.25, 0.08)]),
    card([el("circle", 0.5, 0.5, 0.2), el("dot", 0.78, 0.28, 0.08)]),
    card([el("diamond", 0.5, 0.5, 0.2), el("dot", 0.72, 0.22, 0.08)]),
  ],
  card([el("triangle", 0.5, 0.5, 0.2, "up"), el("dot", 0.76, 0.26, 0.08)]),
  [shapeOf("triangle", 0.2), card([el("dot", 0.76, 0.26, 0.08)]), shapeOf("circle", 0.4)],
  "Рядом с крупной фигурой есть точка.",
  "Верный треугольник тоже с точкой. Фигура без точки в группу не входит.",
);
addGroup(
  "medium",
  [shiftedDots(2, 0.3), shiftedDots(2, 0.28), card([el("dot", 0.4, 0.32, 0.12), el("dot", 0.62, 0.3, 0.12)])],
  shiftedDots(2, 0.34),
  [shiftedDots(2, 0.72), shiftedDots(3, 0.3), shiftedDots(1, 0.3)],
  "Две точки стоят в верхней половине.",
  "Верный вариант тоже. Нижняя пара и другое число точек выпадают.",
);
addGroup(
  "hard",
  [shapeOf("circle", 0.18, 0.3, 0.72), shapeOf("square", 0.2, 0.32, 0.7), shapeOf("diamond", 0.16, 0.28, 0.74)],
  shapeOf("triangle", 0.18, 0.3, 0.7),
  [shapeOf("triangle", 0.4, 0.3, 0.3), shapeOf("circle", 0.18, 0.7, 0.72), dotCard(2, 0.1)],
  "Мелкая фигура стоит слева и низко.",
  "Верный треугольник мелкий, слева и низко. Крупный, верхний или пара точек теряют признак.",
);
addGroup(
  "hard",
  [
    card([el("line", 0.5, 0.35, 0.4), el("dot", 0.5, 0.7, 0.1)]),
    card([el("line", 0.5, 0.32, 0.36), el("dot", 0.5, 0.68, 0.1)]),
    card([el("line", 0.5, 0.38, 0.42), el("dot", 0.5, 0.72, 0.1)]),
  ],
  card([el("line", 0.5, 0.3, 0.34), el("dot", 0.5, 0.66, 0.1)]),
  [shapeOf("line", 0.4, 0.5, 0.35), dotCard(1, 0.1), card([el("circle", 0.5, 0.35, 0.2), el("dot", 0.5, 0.7, 0.1)])],
  "Сверху черта, под ней точка.",
  "Верный вариант повторяет оба элемента. Черта без точки или точка без черты в группу не входят.",
);

function story(difficulty, text, answer, traps) {
  commitNumeric({
    scale: "calculation",
    type: "calc-story",
    difficulty,
    text,
    answer,
    traps,
    hint: "Доведите названные действия до конца и не включайте данное, которого нет в вопросе.",
    lead: "Счет доведен до вопроса.",
  });
}

for (const [a, b] of [
  [18, 16],
  [24, 15],
  [17, 14],
  [19, 13],
]) {
  if (a < 13 || b < 13) throw new Error("легкое произведение из таблицы умножения");
  const answer = a * b;
  story("easy", `В партии ${a} ящиков по ${b} кг. Какова масса партии?`, answer, [
    { name: "сумма вместо произведения", compute: () => a + b },
    { name: "множитель на единицу меньше", compute: () => a * (b - 1) },
    { name: "к произведению прибавлен второй множитель", compute: () => answer + b },
  ]);
}
for (const [whole, divisor] of [
  [476, 14],
  [638, 22],
]) {
  const answer = whole / divisor;
  story(
    "easy",
    `Партию из ${whole} кг разложили поровну в ${divisor} ящиков. Сколько килограммов в одном ящике?`,
    answer,
    [
      { name: "вычитание вместо деления", compute: () => whole - divisor },
      { name: "сумма вместо деления", compute: () => whole + divisor },
      { name: "в ответ попал делитель", compute: () => divisor },
    ],
  );
}
for (const [hours, output, ask] of [
  [6, 84, 15],
  [8, 96, 13],
  [7, 91, 12],
  [9, 108, 14],
  [5, 85, 12],
]) {
  const rate = output / hours;
  const answer = rate * ask;
  story(
    "medium",
    `За ${hours} часов цех делает ${output} деталей. Сколько деталей он сделает за ${ask} часов при той же скорости?`,
    answer,
    [
      { name: "сумма выпуска и новых часов", compute: () => output + ask },
      { name: "остановка на скорости за час", compute: () => rate },
      { name: "произведение часов без выпуска", compute: () => hours * ask },
    ],
  );
}
for (const [h1, v1, h2, v2] of [
  [4, 65, 3, 48],
  [5, 36, 4, 27],
  [3, 48, 6, 25],
  [2, 85, 5, 32],
]) {
  const first = h1 * v1;
  const answer = first + h2 * v2;
  story(
    "hard",
    `Поезд шел ${h1} ч со скоростью ${v1} км/ч и еще ${h2} ч со скоростью ${v2} км/ч. Какой путь он прошел?`,
    answer,
    [
      { name: "учтен только первый участок", compute: () => first },
      { name: "оба участка посчитаны с первой скоростью", compute: () => (h1 + h2) * v1 },
      { name: "вторая скорость прибавлена к первому участку", compute: () => first + v2 },
    ],
  );
}
{
  const price = 640;
  const percent = 15;
  const extra = 28;
  const discount = (price * percent) / 100;
  const answer = price - discount;
  story(
    "hard",
    `Пальто стоило ${price} рублей. Скидка ${percent} процентов. Доставка ${extra} рублей в цену пальто не входит. Сколько стоит пальто?`,
    answer,
    [
      { name: "вычли доставку вместо скидки", compute: () => price - extra },
      { name: "вычли проценты как рубли", compute: () => price - percent },
      { name: "вычли и скидку, и лишнюю доставку", compute: () => answer - extra },
    ],
  );
}

function constantSeries(start, step) {
  const shown = [0, 1, 2, 3].map((index) => start + index * step);
  const last = shown[3];
  const answer = last + step;
  commitNumeric({
    scale: "calculation",
    type: "calc-series",
    difficulty: "easy",
    text: `${shown.join(", ")}, ?`,
    answer,
    hint: "Найдите постоянную разность и примените ее к последнему числу.",
    lead: "Шаг ряда постоянен.",
    traps: [
      { name: "шаг на единицу меньше", compute: () => last + step - 1 },
      { name: "удвоенный последний шаг", compute: () => last + step * 2 },
      { name: "возврат на один шаг", compute: () => last - step },
    ],
  });
}
for (const [start, step] of [
  [28, 13],
  [47, 17],
  [36, 19],
  [52, 11],
  [41, 23],
  [63, 16],
]) {
  constantSeries(start, step);
}

function altSeries(start, short, long) {
  const shown = [start];
  for (const step of [short, long, short]) shown.push(shown.at(-1) + step);
  const last = shown.at(-1);
  const answer = last + long;
  commitNumeric({
    scale: "calculation",
    type: "calc-series",
    difficulty: "medium",
    text: `${shown.join(", ")}, ?`,
    answer,
    hint: "Шаги чередуются. Следующий не равен предыдущему.",
    lead: "Короткий и длинный шаги чередуются.",
    traps: [
      { name: "повтор предыдущего шага", compute: () => last + short },
      { name: "сумма обоих шагов", compute: () => last + short + long },
      { name: "нужный шаг на единицу меньше", compute: () => last + long - 1 },
    ],
  });
}
for (const pair of [
  [20, 4, 11],
  [35, 6, 15],
  [18, 5, 12],
  [44, 7, 16],
  [27, 8, 19],
]) {
  altSeries(...pair);
}

function growingSeries(start, first, grow) {
  let value = start;
  const shown = [value];
  const diffs = [first, first + grow, first + 2 * grow];
  for (const diff of diffs) {
    value += diff;
    shown.push(value);
  }
  const next = first + 3 * grow;
  const answer = value + next;
  commitNumeric({
    scale: "calculation",
    type: "calc-series",
    difficulty: "hard",
    text: `${shown.join(", ")}, ?`,
    answer,
    hint: "Разность сама растет на одно и то же число.",
    lead: "Каждая следующая разность больше предыдущей.",
    traps: [
      { name: "повтор последнего шага", compute: () => value + diffs[2] },
      { name: "постоянный первый шаг", compute: () => value + first },
      { name: "шаг вырос на два лишних приращения", compute: () => value + next + grow },
    ],
  });
}
for (const triple of [
  [8, 3, 3],
  [15, 4, 2],
  [12, 5, 3],
  [21, 2, 4],
  [9, 6, 2],
]) {
  growingSeries(...triple);
}

function addDiffChart(difficulty, labels, values, left, right, kind) {
  const answer = values[left] - values[right];
  const listed = labels.map((label, index) => `${label} ${values[index]}`).join(", ");
  const question = `На сколько ${labels[left]} больше, чем ${labels[right]}?`;
  const scene =
    kind === "table"
      ? {
          kind: "table",
          headers: ["период", "значение"],
          rows: labels.map((label, index) => [label, String(values[index])]),
        }
      : { kind: "chart", variant: "bar", labels, values };
  commitNumeric({
    scale: "calculation",
    type: "calc-chart",
    difficulty,
    text: kind === "table" ? question : `Столбики: ${listed}. ${question}`,
    scene,
    answer,
    hint: "Вычтите один названный столбец из другого.",
    lead: "Взята разность двух названных значений.",
    traps: [
      { name: "взят столбец без вычитания", compute: () => values[left] },
      { name: "взят второй столбец", compute: () => values[right] },
      { name: "сумма вместо разности", compute: () => values[left] + values[right] },
    ],
  });
  if (values.includes(answer)) throw new Error(`ответ совпал со столбцом ${labels}`);
}
const diffCharts = [
  ["easy", ["март", "апрель", "май", "июнь"], [28, 46, 19, 33], 1, 2, "bar"],
  ["easy", ["I", "II", "III", "IV"], [22, 51, 17, 39], 1, 0, "bar"],
  ["easy", ["север", "юг", "запад", "восток"], [34, 58, 21, 40], 1, 3, "table"],
  ["easy", ["цех А", "цех Б", "цех В", "цех Г"], [27, 63, 18, 44], 1, 2, "bar"],
  ["easy", ["утром", "днем", "вечером", "ночью"], [16, 49, 31, 12], 1, 2, "table"],
  ["easy", ["смена 1", "смена 2", "смена 3", "смена 4"], [25, 54, 37, 14], 1, 3, "bar"],
];
for (const row of diffCharts) addDiffChart(...row);

function addOverSum(difficulty, labels, values, main, first, second) {
  const part = values[first] + values[second];
  const answer = values[main] - part;
  commitNumeric({
    scale: "calculation",
    type: "calc-chart",
    difficulty,
    text: `Столбики: ${labels.map((label, index) => `${label} ${values[index]}`).join(", ")}. На сколько ${labels[main]} больше суммы ${labels[first]} и ${labels[second]}?`,
    scene: { kind: "chart", variant: "bar", labels, values },
    answer,
    hint: "Сначала сложите два меньших столбца, затем сравните с названным.",
    lead: "Из большого столбца вычтена сумма двух других.",
    traps: [
      { name: "взят столбец без вычитания", compute: () => values[main] },
      { name: "остановка на сумме двух столбцов", compute: () => part },
      { name: "сумма трех столбцов", compute: () => values[main] + part },
    ],
  });
}
for (const row of [
  ["medium", ["пн", "вт", "ср", "чт"], [48, 13, 15, 9], 0, 1, 2],
  ["medium", ["янв", "фев", "мар", "апр"], [70, 18, 22, 11], 0, 1, 2],
  ["medium", ["А", "Б", "В", "Г"], [55, 12, 16, 8], 0, 1, 2],
  ["medium", ["север", "юг", "запад", "восток"], [64, 17, 19, 10], 0, 1, 3],
  ["medium", ["утро", "день", "вечер", "ночь"], [59, 14, 21, 7], 0, 1, 2],
]) {
  addOverSum(...row);
}

function addHardChart(labels, values, priceIndex, percent, extraIndex) {
  const price = values[priceIndex];
  const extra = values[extraIndex];
  const discount = (price * percent) / 100;
  const answer = price - discount;
  commitNumeric({
    scale: "calculation",
    type: "calc-chart",
    difficulty: "hard",
    text: `${clause(labels[priceIndex])} показывает цену. Скидка ${percent} процентов. ${clause(labels[extraIndex])} в цену не входит. Какова цена после скидки?`,
    scene: {
      kind: "table",
      headers: ["показатель", "значение"],
      rows: labels.map((label, index) => [label, String(values[index])]),
    },
    answer,
    hint: "Возьмите цену, снимите названный процент и не трогайте лишний столбец.",
    lead: "Скидка снята с цены, лишний столбец не вошел.",
    traps: [
      { name: "вычли лишний столбец вместо скидки", compute: () => price - extra },
      { name: "вычли проценты как рубли", compute: () => price - percent },
      { name: "вычли и скидку, и лишний столбец", compute: () => answer - extra },
    ],
  });
}
for (const row of [
  [["цена", "скидка-служебная", "доставка", "упаковка"], [480, 15, 36, 12], 0, 15, 2],
  [["товар", "процент", "страховка", "тара"], [800, 20, 45, 18], 0, 20, 2],
  [["партия", "норма", "брак", "тара"], [250, 12, 18, 8], 0, 12, 2],
  [["заказ", "ставка", "доставка", "скидка"], [900, 10, 60, 40], 0, 10, 2],
  [["счет", "доля", "пени", "залог"], [750, 8, 24, 16], 0, 8, 2],
]) {
  addHardChart(...row);
}

const lengthFloor = {
  count: { easy: 12, medium: 24, hard: 40 },
  symbol: { easy: 24, medium: 60, hard: 120 },
  match: { easy: 10, medium: 16, hard: 24 },
};

function countTraps(total, last) {
  return [
    { name: "пропущен один знак", compute: () => total - 1 },
    { name: "посчитан лишний знак", compute: () => total + 1 },
    { name: "пропущена последняя строка", compute: () => total - last },
    { name: "последняя строка посчитана дважды", compute: () => total + last },
  ];
}

function numberBlock(count, seed, kind) {
  const random = mulberry32(seed);
  const numbers = Array.from({ length: count }, () => 12 + Math.floor(random() * 78));
  const match = (value) => (kind === "odd" ? value % 2 === 1 : kind === "even" ? value % 2 === 0 : value > 50);
  const perLine = count >= 40 ? 10 : count >= 24 ? 8 : 6;
  const lines = [];
  for (let index = 0; index < numbers.length; index += perLine) lines.push(numbers.slice(index, index + perLine));
  let guard = 0;
  while (lines.at(-1).filter(match).length < 2 && guard < 40) {
    guard += 1;
    const line = lines.at(-1);
    const at = line.findIndex((value) => !match(value));
    if (at < 0) break;
    if (kind === "odd") line[at] += line[at] % 2 === 0 ? 1 : 0;
    else if (kind === "even") line[at] += line[at] % 2 === 1 ? 1 : 0;
    else line[at] = 51 + (line[at] % 20);
  }
  const hits = lines.flat().filter(match).length;
  const last = lines.at(-1).filter(match).length;
  const title =
    kind === "odd"
      ? "Сколько нечетных чисел в строках?"
      : kind === "even"
        ? "Сколько четных чисел в строках?"
        : "Сколько чисел больше порога 50?";
  return {
    text: `${title}\n${lines.map((line) => line.join(" ")).join("\n")}`,
    hits,
    last,
    signs: lines.flat().length,
  };
}

const countPlan = [
  ["easy", 12, "odd"],
  ["easy", 12, "even"],
  ["easy", 12, "high"],
  ["easy", 12, "odd"],
  ["medium", 24, "odd"],
  ["medium", 24, "even"],
  ["medium", 24, "high"],
  ["medium", 24, "odd"],
  ["hard", 40, "odd"],
  ["hard", 40, "even"],
  ["hard", 40, "high"],
  ["hard", 40, "odd"],
];
countPlan.forEach(([difficulty, count, kind], index) => {
  const block = numberBlock(count, 4100 + index * 17, kind);
  if (block.signs < lengthFloor.count[difficulty]) throw new Error(`короткий счет ${difficulty}`);
  commitNumeric({
    scale: "attention",
    type: "att-count",
    difficulty,
    text: block.text,
    answer: block.hits,
    traps: countTraps(block.hits, block.last),
    hint: "Идите по строкам и не пропускайте последнюю.",
    lead: "Посчитаны все подходящие числа.",
  });
});

function digitStream(count, target, seed) {
  const random = mulberry32(seed);
  const digits = [];
  for (let index = 0; index < count; index += 1) {
    if (random() < 0.24) digits.push(target);
    else {
      let digit = String((Number(target) + 1 + Math.floor(random() * 8)) % 10);
      if (digit === target) digit = String((Number(digit) + 1) % 10);
      digits.push(digit);
    }
  }
  const width = 30;
  const lines = [];
  for (let index = 0; index < digits.length; index += width) lines.push(digits.slice(index, index + width));
  let guard = 0;
  while (lines.at(-1).filter((digit) => digit === target).length < 2 && guard < 40) {
    guard += 1;
    const line = lines.at(-1);
    const at = line.findIndex((digit) => digit !== target);
    if (at < 0) break;
    line[at] = target;
  }
  const hits = lines.flat().filter((digit) => digit === target).length;
  const last = lines.at(-1).filter((digit) => digit === target).length;
  const text = lines
    .map((line) => {
      const groups = [];
      for (let index = 0; index < line.length; index += 3) groups.push(line.slice(index, index + 3).join(""));
      return groups.join(" ");
    })
    .join("\n");
  return { text, hits, last, signs: digits.length };
}

const symbolPlan = [
  ["easy", 24, "7"],
  ["easy", 24, "4"],
  ["easy", 24, "8"],
  ["easy", 24, "2"],
  ["medium", 60, "7"],
  ["medium", 60, "5"],
  ["medium", 60, "9"],
  ["medium", 60, "3"],
  ["hard", 120, "7"],
  ["hard", 120, "6"],
  ["hard", 120, "1"],
  ["hard", 120, "8"],
];
symbolPlan.forEach(([difficulty, count, digit], index) => {
  const stream = digitStream(count, digit, 7200 + index * 13);
  if (stream.signs < lengthFloor.symbol[difficulty]) throw new Error(`короткая строка знаков ${difficulty}`);
  commitNumeric({
    scale: "attention",
    type: "att-symbol",
    difficulty,
    text: `Сколько раз встречается цифра ${digit}?\n${stream.text}`,
    answer: stream.hits,
    traps: countTraps(stream.hits, stream.last),
    hint: "Считайте только заданную цифру, включая повторы внутри группы и последнюю строку.",
    lead: "Посчитаны все вхождения заданной цифры.",
  });
});

function matchItem(difficulty, length, seed) {
  const random = mulberry32(seed);
  const digits = Array.from({ length }, () => String(Math.floor(random() * 10)));
  if (new Set(digits).size < 2) digits[0] = digits[0] === "1" ? "2" : "1";
  const sample = digits.join("");
  const swapAt = digits.findIndex((digit, index) => index < digits.length - 1 && digit !== digits[index + 1]);
  const swappedDigits = [...digits];
  const hold = swappedDigits[swapAt];
  swappedDigits[swapAt] = swappedDigits[swapAt + 1];
  swappedDigits[swapAt + 1] = hold;
  const substitute = (index, delta) => {
    const copy = [...digits];
    copy[index] = String((Number(copy[index]) + delta) % 10);
    return copy.join("");
  };
  if (sample.length < lengthFloor.match[difficulty]) throw new Error(`короткий образец ${difficulty}`);
  commitChoice({
    scale: "attention",
    type: "att-match",
    difficulty,
    text: `Какая строка совпадает с образцом ${sample}?`,
    answer: sample,
    traps: [
      ["переставлены соседние цифры", swappedDigits.join("")],
      ["заменена цифра в начале", substitute(0, 3)],
      ["заменена цифра в середине", substitute(Math.floor(length / 2), 4)],
      ["заменена цифра в конце", substitute(length - 1, 5)],
    ],
    hint: "Сверьте каждый знак. Перестановка соседних цифр уже делает строку другой.",
    lead: "Совпадает строка без единой замены и без перестановки.",
  });
}
for (const [difficulty, length, seed] of [
  ["easy", 10, 11],
  ["easy", 10, 29],
  ["easy", 12, 47],
  ["medium", 16, 53],
  ["medium", 16, 71],
  ["medium", 18, 83],
  ["hard", 24, 97],
  ["hard", 24, 113],
]) {
  matchItem(difficulty, length, seed);
}

function listed(scale, type, hint, items) {
  for (const item of items) {
    commitChoice({
      scale,
      type,
      difficulty: item[0],
      text: item[1],
      answer: item[2],
      traps: item[3],
      lead: item[4],
      topic: item[5],
      hint,
    });
  }
}

function spelling(difficulty, wrong, rights, errorName) {
  listed("vocabulary", "voc-spelling", "Ищите устойчивую ошибку написания, а не редкое, но верное слово.", [
    [
      difficulty,
      "Укажите неверное написание.",
      wrong,
      rights.map((word) => [errorName === "" ? "верное написание" : `не эта ошибка, верно: ${word}`, word]),
      `Ошибочно одно написание: ${errorName}.`,
    ],
  ]);
}
spelling("easy", "инциндент", ["инцидент", "агентство", "привилегия", "претензия"], "лишняя буква н");
spelling("easy", "агенство", ["агентство", "бюро", "ведомство", "учреждение"], "пропущена буква т");
spelling("easy", "бюлетень", ["бюллетень", "протокол", "справка", "ведомость"], "пропущена буква л");
spelling("easy", "будующий", ["будущий", "следующий", "прошлый", "нынешний"], "лишняя буква ю");
spelling(
  "medium",
  "компроментировать",
  ["компрометировать", "дискредитировать", "изобличать", "уличать"],
  "пропущена буква е",
);
spelling("medium", "прецендент", ["прецедент", "случай", "пример", "основание"], "пропущена буква д");
spelling("medium", "константировать", ["констатировать", "фиксировать", "отмечать", "устанавливать"], "лишняя буква н");
spelling(
  "medium",
  "подскользнуться",
  ["поскользнуться", "оступиться", "споткнуться", "пошатнуться"],
  "лишняя приставка под",
);

const inferHint = "Отбросьте обращение посылки, лишнее обобщение и потерю отрицания.";
listed("verbal", "ver-inference", inferHint, [
  [
    "easy",
    "Все скрипки этой мастерской деревянные. Эта скрипка из этой мастерской. Какой вывод следует?",
    "Эта скрипка деревянная.",
    [
      ["обращение посылки", "Все деревянные предметы - скрипки этой мастерской."],
      ["лишнее обобщение", "Все скрипки на свете деревянные."],
      ["отрицание вывода", "Эта скрипка не деревянная."],
    ],
    "Частный случай входит в общее утверждение о мастерской.",
  ],
  [
    "easy",
    "Если лампа в кабинете включена, в кабинете светло. Лампа включена. Какой вывод следует?",
    "В кабинете светло.",
    [
      ["обращение условной связи", "Если в кабинете светло, включена именно эта лампа."],
      ["лишнее обобщение", "Во всем здании светло."],
      ["отрицание вывода", "В кабинете темно."],
    ],
    "Условие выполнено, значит выполнен и названный результат.",
  ],
  [
    "easy",
    "Все билеты этой пачки проверены. Этот билет из этой пачки. Какой вывод следует?",
    "Этот билет проверен.",
    [
      ["обращение посылки", "Все проверенные билеты лежат в этой пачке."],
      ["лишнее обобщение", "Все билеты кассы проверены."],
      ["отрицание вывода", "Этот билет не проверен."],
    ],
    "Билет наследует свойство своей пачки.",
  ],
  [
    "easy",
    "Каждый договор этой полки подписан юристом. Этот договор с этой полки. Какой вывод следует?",
    "Этот договор подписан юристом.",
    [
      ["обращение посылки", "Каждый договор юриста лежит на этой полке."],
      ["лишнее обобщение", "Все договоры фирмы подписаны юристом."],
      ["отрицание вывода", "Этот договор юрист не подписывал."],
    ],
    "Договор берет признак полки, на которой лежит.",
  ],
  [
    "easy",
    "Все пробы этой серии чистые. Эта проба из этой серии. Какой вывод следует?",
    "Эта проба чистая.",
    [
      ["обращение посылки", "Все чистые пробы входят в эту серию."],
      ["лишнее обобщение", "Все пробы лаборатории чистые."],
      ["отрицание вывода", "Эта проба загрязнена."],
    ],
    "Проба входит в серию, о которой сказано общее.",
  ],
  [
    "easy",
    "Если засов закрыт, дверь не открывается. Засов закрыт. Какой вывод следует?",
    "Дверь не открывается.",
    [
      ["обращение условной связи", "Если дверь не открывается, закрыт именно этот засов."],
      ["лишнее обобщение", "Ни одна дверь в доме не открывается."],
      ["потеря отрицания", "Дверь открывается."],
    ],
    "Условие про засов выполнено, дверь остается закрытой.",
  ],
  [
    "medium",
    "Все архивариусы отдела знают латынь. Все переводчики отдела - архивариусы. Какой вывод следует?",
    "Все переводчики отдела знают латынь.",
    [
      ["обращение посылки", "Все, кто знает латынь, - архивариусы отдела."],
      ["лишнее обобщение", "Все сотрудники отдела знают латынь."],
      ["потеря связи", "Некоторые переводчики отдела латыни не знают."],
    ],
    "Переводчики входят в группу архивариусов, а та целиком знает латынь.",
  ],
  [
    "medium",
    "Все новые станки стоят у окна. Часть станков цеха новые. Какой вывод следует?",
    "Хотя бы один станок стоит у окна.",
    [
      ["лишнее обобщение", "Все станки цеха стоят у окна."],
      ["обращение посылки", "Все станки у окна новые."],
      ["отрицание вывода", "У окна нет ни одного станка."],
    ],
    "Из части, которая целиком у окна, следует хотя бы один станок у окна.",
  ],
  [
    "medium",
    "Ни один отчет этой папки не сдан. Часть отчетов отдела лежит в этой папке. Какой вывод следует?",
    "Хотя бы один отчет отдела не сдан.",
    [
      ["лишнее обобщение", "Ни один отчет отдела не сдан."],
      ["потеря отрицания", "Все отчеты этой папки сданы."],
      ["обращение посылки", "Все несданные отчеты лежат в этой папке."],
    ],
    "Папка целиком не сдана, и в ней есть отчеты отдела.",
  ],
  [
    "medium",
    "Все рейсы этого табло утренние. Некоторые рейсы в Казань есть на этом табло. Какой вывод следует?",
    "Некоторые рейсы в Казань утренние.",
    [
      ["лишнее обобщение", "Все рейсы в Казань утренние."],
      ["обращение посылки", "Все утренние рейсы идут в Казань."],
      ["отрицание вывода", "Ни один рейс в Казань не утренний."],
    ],
    "Часть рейсов в Казань попадает в утреннее табло.",
  ],
  [
    "medium",
    "Все эксперты комиссии имеют допуск. Некоторые авторы заключения - эксперты комиссии. Какой вывод следует?",
    "Некоторые авторы заключения имеют допуск.",
    [
      ["лишнее обобщение", "Все авторы заключения имеют допуск."],
      ["обращение посылки", "Все, кто имеет допуск, - эксперты комиссии."],
      ["отрицание вывода", "Ни один автор заключения допуска не имеет."],
    ],
    "Часть авторов входит в комиссию, а комиссия целиком с допуском.",
  ],
  [
    "hard",
    "Ни один документ этой папки не подписан. Эта справка из этой папки. Какой вывод следует?",
    "Эта справка не подписана.",
    [
      ["потеря отрицания", "Эта справка подписана."],
      ["лишнее обобщение", "Ни один документ архива не подписан."],
      ["обращение посылки", "Все неподписанные документы лежат в этой папке."],
    ],
    "Справка входит в папку, где подписанных документов нет.",
  ],
  [
    "hard",
    "Ни одна монета этого набора не медная. Эта монета из этого набора. Какой вывод следует?",
    "Эта монета не медная.",
    [
      ["потеря отрицания", "Эта монета медная."],
      ["лишнее обобщение", "Ни одна монета в мире не медная."],
      ["подмена металла", "Эта монета золотая."],
    ],
    "Отрицание меди переходит на монету набора и не называет другой металл.",
  ],
  [
    "hard",
    "Если смена не закрыта, ключ остается у мастера. Смена не закрыта. Какой вывод следует?",
    "Ключ остается у мастера.",
    [
      ["потеря отрицания", "Смена закрыта."],
      ["обращение условной связи", "Если ключ у мастера, смена не закрыта."],
      ["лишнее обобщение", "Все ключи завода у этого мастера."],
    ],
    "Отрицательное условие выполнено, значит ключ у мастера.",
  ],
  [
    "hard",
    "Все, кто не сдал допуск, не входят в цех. Этот стажер допуск не сдал. Какой вывод следует?",
    "Этот стажер не входит в цех.",
    [
      ["потеря отрицания", "Этот стажер входит в цех."],
      ["обращение посылки", "Все, кто не входит в цех, не сдали допуск."],
      ["лишнее обобщение", "Никто на заводе не входит в цех."],
    ],
    "Два отрицания сохраняются: нет допуска, значит нет входа.",
  ],
  [
    "hard",
    "Ни один чертеж без печати не принимают. Этот чертеж без печати. Какой вывод следует?",
    "Этот чертеж не принимают.",
    [
      ["потеря отрицания", "Этот чертеж принимают."],
      ["обращение посылки", "Все непринятые чертежи без печати."],
      ["лишнее обобщение", "Ни один чертеж бюро не принимают."],
    ],
    "Отсутствие печати попадает под запрет приема.",
  ],
]);

const analogyHint = "Сохраните одно отношение. Общая тема без этого отношения не подходит.";
listed("verbal", "ver-analogy", analogyHint, [
  [
    "easy",
    "Кисть относится к рисованию, как нож к ...",
    "резанию",
    [
      ["общая тема кухни", "кухне"],
      ["соседний предмет", "вилке"],
      ["свойство вместо действия", "остроте"],
    ],
    "Отношение орудия и действия.",
  ],
  [
    "easy",
    "Страница относится к книге, как ступень к ...",
    "лестнице",
    [
      ["соседняя часть", "перилам"],
      ["целое шире нужного", "дому"],
      ["другой материал", "дереву"],
    ],
    "Отношение части и целого.",
  ],
  [
    "medium",
    "Шум относится к тишине, как свет к ...",
    "тьме",
    [
      ["источник света", "лампе"],
      ["время, а не противоположность", "дню"],
      ["часть света", "лучу"],
    ],
    "Отношение противоположности.",
  ],
  [
    "medium",
    "Дождь относится к луже, как огонь к ...",
    "пеплу",
    [
      ["сопутствующее, но не результат", "дыму"],
      ["источник вместо результата", "костру"],
      ["свойство огня", "теплу"],
    ],
    "Отношение причины и прямого следа.",
  ],
  [
    "medium",
    "Клавиша относится к роялю, как струна к ...",
    "скрипке",
    [
      ["другая часть скрипки", "смычку"],
      ["целое шире инструмента", "оркестру"],
      ["запись вместо инструмента", "ноте"],
    ],
    "Отношение части и инструмента.",
  ],
  [
    "hard",
    "Компас относится к направлению, как термометр к ...",
    "температуре",
    [
      ["единица вместо измеряемого", "градусу"],
      ["область вместо величины", "погоде"],
      ["вещество прибора", "ртути"],
    ],
    "Отношение прибора и того, что он показывает.",
  ],
  [
    "hard",
    "Щедрый относится к скупому, как храбрый к ...",
    "трусливому",
    [
      ["соседнее качество без противоположности", "сильному"],
      ["носитель качества", "воину"],
      ["близкая, но другая оценка", "осторожному"],
    ],
    "Отношение противоположных качеств.",
  ],
  [
    "hard",
    "Трение относится к теплу, как испарение к ...",
    "пару",
    [
      ["противоположность тепла", "холоду"],
      ["другое состояние воды", "льду"],
      ["исходное вещество", "воде"],
    ],
    "Отношение процесса и того, что он производит.",
  ],
]);

const generalHint = "Ищите общее уже широкой рубрики. Сама рубрика остается ложным ответом.";
listed("verbal", "ver-general", generalHint, [
  [
    "easy",
    'Найдите общее для слов "молоток" и "пила".',
    "инструменты",
    [
      ["слишком узкая деталь", "гвозди"],
      ["место вместо общего", "мастерская"],
      ["материал не у обоих", "металл"],
    ],
    "Оба слова называют орудия работы.",
  ],
  [
    "easy",
    'Найдите общее для слов "дуб" и "береза".',
    "лиственные деревья",
    [
      ["широкая рубрика", "растения"],
      ["место вместо вида", "лес"],
      ["изделие из них", "дрова"],
    ],
    "Общее уже, чем просто растения.",
  ],
  [
    "medium",
    'Найдите более точное общее для слов "сонет" и "октава".',
    "стихотворные формы",
    [
      ["широкая рубрика", "литература"],
      ["общий звук, не форма", "рифма"],
      ["противоположность стиху", "проза"],
    ],
    "Сонет и октава задают строение стиха.",
  ],
  [
    "medium",
    'Найдите более точное общее для слов "истец" и "ответчик".',
    "стороны спора",
    [
      ["широкая рубрика", "юристы"],
      ["третье лицо", "судьи"],
      ["не сторона", "свидетели"],
    ],
    "Оба ведут спор с противоположных сторон.",
  ],
  [
    "medium",
    'Найдите более точное общее для слов "вена" и "артерия".',
    "кровеносные сосуды",
    [
      ["широкая рубрика", "организм"],
      ["другая жидкость", "лимфа"],
      ["орган, а не сосуд", "сердце"],
    ],
    "Оба проводят кровь, лимфа - нет.",
  ],
  [
    "hard",
    'Найдите более точное общее для слов "эпиграф" и "посвящение".',
    "тексты перед основным сочинением",
    [
      ["широкая рубрика", "литература"],
      ["основной текст", "глава"],
      ["справочный аппарат", "сноска"],
    ],
    "Оба стоят перед сочинением и не являются главой.",
  ],
  [
    "hard",
    'Найдите более точное общее для слов "дебет" и "кредит".',
    "стороны бухгалтерского счета",
    [
      ["широкая рубрика", "экономика"],
      ["итог счета", "сальдо"],
      ["способ обмена", "бартер"],
    ],
    "Дебет и кредит - две стороны записи, не вся экономика.",
  ],
  [
    "hard",
    'Найдите более точное общее для слов "метафора" и "метонимия".',
    "тропы",
    [
      ["широкая рубрика", "филология"],
      ["часть речи", "существительное"],
      ["композиция", "сюжет"],
    ],
    "Оба переносят значение, сюжет этого не делает.",
  ],
]);

const orderHint = "Доведите цепочку до конца. Промежуточное имя - остановка раньше вопроса.";
listed("verbal", "ver-order", orderHint, [
  [
    "easy",
    "Нина старше Олега. Олег старше Павла. Кто самый старший?",
    "Нина",
    [
      ["остановка на втором имени", "Олег"],
      ["самый младший вместо старшего", "Павел"],
      ["ложный отказ решать", "нельзя решить"],
    ],
    "Нина старше обоих следующих.",
  ],
  [
    "easy",
    "Река шире ручья. Канал шире реки. Пруд уже ручья. Что шире всех?",
    "канал",
    [
      ["остановка на реке", "река"],
      ["середина цепочки", "ручей"],
      ["самый узкий", "пруд"],
    ],
    "Канал шире реки, река шире ручья, пруд уже ручья.",
  ],
  [
    "medium",
    "Том толще брошюры. Журнал толще тома. Листовка тоньше брошюры. Что толще всех?",
    "журнал",
    [
      ["остановка на томе", "том"],
      ["следующий после самого толстого", "брошюра"],
      ["самый тонкий", "листовка"],
    ],
    "Журнал стоит в начале цепочки толщины.",
  ],
  [
    "medium",
    "Анна пришла раньше Бориса. Борис раньше Веры. Вера раньше Глеба. Кто пришел последним?",
    "Глеб",
    [
      ["первый вместо последнего", "Анна"],
      ["остановка в середине", "Борис"],
      ["предпоследний", "Вера"],
    ],
    "Каждый следующий позже предыдущего, в конце Глеб.",
  ],
  [
    "medium",
    "Склад А ближе к вокзалу, чем склад Б. Склад Б ближе, чем склад В. Какой склад ближе всех к вокзалу?",
    "А",
    [
      ["остановка на втором", "Б"],
      ["дальний конец", "В"],
      ["ложный отказ решать", "нельзя решить"],
    ],
    "А ближе Б, Б ближе В, значит А ближе обоих.",
  ],
  [
    "hard",
    "Ира старше Коли. Коля старше Лены. Лена старше Миши. Миша старше Оли. Кто самый младший?",
    "Оля",
    [
      ["первый в цепочке", "Ира"],
      ["остановка в середине", "Лена"],
      ["предпоследний", "Миша"],
    ],
    "Вопрос про конец цепочки, не про первое имя.",
  ],
  [
    "hard",
    "Дом А левее дома Б. Дом Б левее дома В. Дом В левее дома Г. Дом Г левее дома Д. Какой дом второй слева?",
    "Б",
    [
      ["первый слева", "А"],
      ["третий слева", "В"],
      ["крайний справа", "Д"],
    ],
    "Слева направо дома идут А, Б, В, Г, Д.",
  ],
  [
    "hard",
    "Пакет 1 легче пакета 2. Пакет 2 легче пакета 3. Пакет 3 легче пакета 4. Пакет 4 легче пакета 5. Какой пакет второй по легкости?",
    "2",
    [
      ["самый легкий", "1"],
      ["третий", "3"],
      ["самый тяжелый", "5"],
    ],
    "От легкого к тяжелому: 1, 2, 3, 4, 5. Второй - пакет 2.",
  ],
]);

const setHint = "Предмет должен войти в названный признак, а не только в широкую область.";
listed("verbal", "ver-set", setHint, [
  [
    "easy",
    'Какой предмет входит в множество "скрипка, альт, виолончель"?',
    "контрабас",
    [
      ["другой способ игры", "флейта"],
      ["ударный инструмент", "барабан"],
      ["медный духовой", "труба"],
    ],
    "Множество смычковых. Остальные из других групп.",
  ],
  [
    "easy",
    'Какой предмет входит в множество "дуб, береза, клен"?',
    "ясень",
    [
      ["травянистое растение", "ромашка"],
      ["не дерево", "мох"],
      ["споровое растение", "папоротник"],
    ],
    "Множество деревьев. Ясень тоже дерево.",
  ],
  [
    "medium",
    'Какой предмет входит в множество "истец, ответчик, судья"?',
    "секретарь заседания",
    [
      ["человек вне процесса", "зритель"],
      ["наблюдатель без роли", "журналист в зале"],
      ["охрана снаружи", "охранник у входа"],
    ],
    "Нужен участник заседания, не человек просто в здании.",
  ],
  [
    "medium",
    'Какой предмет входит в множество "дебет, кредит, сальдо"?',
    "проводка",
    [
      ["способ обмена", "бартер"],
      ["налог", "акциз"],
      ["складской термин", "инвентарь"],
    ],
    "Множество записей счета. Проводка тоже запись, бартер - нет.",
  ],
  [
    "medium",
    'Какой предмет входит в множество "сонет, октава, терцина"?',
    "рондо",
    [
      ["крупная проза", "роман"],
      ["часть страницы", "абзац"],
      ["справочный аппарат", "сноска"],
    ],
    "Множество твердых стихотворных форм.",
  ],
  [
    "hard",
    'Какой предмет входит в множество "аорта, артерия, капилляр"?',
    "вена",
    [
      ["другая жидкость", "лимфа"],
      ["орган насоса", "сердце"],
      ["клетка крови", "эритроцит"],
    ],
    "Множество кровеносных сосудов. Лимфа к ним не относится.",
  ],
  [
    "hard",
    'Какой предмет входит в множество "метафора, эпитет, олицетворение"?',
    "метонимия",
    [
      ["ход событий", "сюжет"],
      ["часть речи", "глагол"],
      ["размер стиха", "ямб"],
    ],
    "Множество тропов. Метонимия тоже троп.",
  ],
  [
    "hard",
    'Какой предмет входит в множество "увертюра, прелюдия, интродукция"?',
    "пролог",
    [
      ["завершающий раздел", "кода"],
      ["основная часть", "действие"],
      ["исполнитель", "дирижер"],
    ],
    "Множество вступлений. Кода завершает, а не открывает.",
  ],
]);

function typo(difficulty, words, wrongAt, errorName) {
  const answer = words[wrongAt];
  commitChoice({
    scale: "attention",
    type: "att-typo",
    difficulty,
    text: `Какое слово написано неверно?\n${words.join(" ")}`,
    answer,
    traps: words.filter((_, index) => index !== wrongAt).map((word) => [`слово написано верно: ${word}`, word]),
    hint: "Сверьте написание каждого слова. Ошибка одна и она орфографическая.",
    lead: `Орфографическая ошибка: ${errorName}.`,
  });
}
typo("easy", ["Секретарь", "будет", "учавствовать", "в", "заседании"], 2, "буква а вместо у в глаголе участвовать");
typo("easy", ["Агенство", "готовит", "новый", "важный", "документ"], 0, "пропущена буква т в слове агентство");
typo("easy", ["Бюлетень", "лежит", "на", "столе", "секретаря"], 0, "пропущена буква л в слове бюллетень");
typo(
  "medium",
  ["Эксперт", "должен", "константировать", "этот", "прецедент"],
  2,
  "лишняя буква н в слове констатировать",
);
typo("medium", ["Акомпанемент", "мешал", "слышать", "голос", "солиста"], 0, "пропущена буква к в слове аккомпанемент");
typo(
  "hard",
  ["Беспрецендентный", "случай", "требует", "отдельного", "решения"],
  0,
  "пропущена буква д в слове беспрецедентный",
);
typo(
  "hard",
  ["Интелигенция", "обсуждала", "новый", "городской", "устав"],
  0,
  "пропущена буква л в слове интеллигенция",
);
typo("hard", ["Завод", "выпускает", "аллюминий", "для", "самолетов"], 2, "лишняя буква л в слове алюминий");

function diffItem(difficulty, left, right, answer, traps) {
  commitChoice({
    scale: "attention",
    type: "att-diff",
    difficulty,
    text: `Где расхождение двух записей?\n${left}\n${right}`,
    answer,
    traps,
    hint: "Сверьте каждое поле с тем же полем второй строки. Если поля совпали все, это отдельный ответ.",
    lead: "Поля сверены по одному.",
  });
}
const same = [
  ["поле совпадает", "фамилия"],
  ["поле совпадает", "дата"],
  ["поле совпадает", "номер"],
  ["поле совпадает", "сумма"],
];
diffItem("easy", "Иванов, 12.03.1991, 45821, 1860", "Иванова, 12.03.1991, 45821, 1860", "фамилия", [
  ["расхождение не в этом поле", "дата"],
  ["расхождение не в этом поле", "номер"],
  ["расхождение не в этом поле", "сумма"],
  ["расхождение есть", "нет расхождений"],
]);
diffItem("easy", "Петров, 04.11.1984, 90214, 2400", "Петров, 04.11.1985, 90214, 2400", "дата", [
  ["расхождение не в этом поле", "фамилия"],
  ["расхождение не в этом поле", "номер"],
  ["расхождение не в этом поле", "сумма"],
  ["расхождение есть", "нет расхождений"],
]);
diffItem("medium", "Соколова, 19.06.1978, 330918, 5120", "Соколова, 19.06.1978, 330198, 5120", "номер", [
  ["расхождение не в этом поле", "фамилия"],
  ["расхождение не в этом поле", "дата"],
  ["расхождение не в этом поле", "сумма"],
  ["расхождение есть", "нет расхождений"],
]);
diffItem("medium", "Орлов, 28.02.1996, 77120, 6400", "Орлов, 28.02.1996, 77120, 4600", "сумма", [
  ["расхождение не в этом поле", "фамилия"],
  ["расхождение не в этом поле", "дата"],
  ["расхождение не в этом поле", "номер"],
  ["расхождение есть", "нет расхождений"],
]);
diffItem("medium", "Морозова, 15.09.1988, 22045, 3180", "Морозова, 15.09.1988, 22045, 3180", "нет расхождений", same);
diffItem("hard", "Лебедев, 03.07.1975, 4815092763, 12840", "Лебедев, 03.07.1975, 4815097263, 12840", "номер", [
  ["расхождение не в этом поле", "фамилия"],
  ["расхождение не в этом поле", "дата"],
  ["расхождение не в этом поле", "сумма"],
  ["расхождение есть", "нет расхождений"],
]);
diffItem("hard", "Кузнецова, 21.12.1982, 9055128830, 25710", "Кузнецова, 21.12.1983, 9055128830, 25710", "дата", [
  ["расхождение не в этом поле", "фамилия"],
  ["расхождение не в этом поле", "номер"],
  ["расхождение не в этом поле", "сумма"],
  ["расхождение есть", "нет расхождений"],
]);
diffItem(
  "hard",
  "Волков, 09.01.1990, 6720045819, 19355",
  "Волков, 09.01.1990, 6720045819, 19355",
  "нет расхождений",
  same,
);

const factHint = "Отличите устойчивый факт от обычной путаницы с соседним названием.";
const facts = JSON.parse(readFileSync(join(root, "scripts", "facts.json"), "utf8"));
listed("erudition", "fact", factHint, facts);
spelling(
  "hard",
  "учавствовать",
  ["участвовать", "присутствовать", "содействовать", "сотрудничать"],
  "буква а вместо у",
);
spelling("hard", "акомпанемент", ["аккомпанемент", "сопровождение", "поддержка", "подыгрыш"], "пропущена буква к");
spelling("hard", "интелигенция", ["интеллигенция", "профессура", "аудитория", "общественность"], "пропущена буква л");
spelling("hard", "аллюминий", ["алюминий", "титан", "магний", "никель"], "лишняя буква л");

function formatGrid(rows) {
  const width = Math.max(...rows.flat().map((value) => (value == null ? 1 : String(value).length)));
  return rows
    .map((row) => row.map((value) => (value == null ? "?" : String(value)).padStart(width)).join("  "))
    .join("\n");
}

function gridItem(difficulty, rows, answer, hint, lead, traps) {
  commitNumeric({
    scale: "calculation",
    type: "calc-grid",
    difficulty,
    text: `Какое число пропущено?\n${formatGrid(rows)}`,
    answer,
    hint,
    lead,
    traps,
  });
}

function easyGrid(start, step, shift) {
  const rows = [0, 1, 2].map((row) => {
    const origin = start + row * shift;
    return [0, 1, 2].map((column) => origin + column * step);
  });
  const answer = rows[2][2];
  const left = rows[2][1];
  const above = rows[1][2];
  rows[2][2] = null;
  gridItem(
    "easy",
    rows,
    answer,
    "Сравните соседние числа в одной строке и повторите ту же разность.",
    "В каждой строке одна и та же разность.",
    [
      { name: "шаг на единицу больше", compute: () => left + step + 1 },
      { name: "шаг на единицу меньше", compute: () => left + step - 1 },
      { name: "соседнее число из другой клетки", compute: () => above },
    ],
  );
}

function mediumGrid(origin, rowStep, colStep) {
  const cell = (row, column) => origin + row * rowStep + column * colStep;
  const rows = [0, 1, 2].map((row) => [0, 1, 2].map((column) => cell(row, column)));
  const answer = rows[2][2];
  const left = rows[2][1];
  const above = rows[1][2];
  rows[2][2] = null;
  gridItem(
    "medium",
    rows,
    answer,
    "В строке одна разность, в столбце другая. Для пустой клетки нужны обе.",
    "По строке одна разность, по столбцу другая.",
    [
      { name: "только шаг строки", compute: () => left + rowStep },
      { name: "только шаг столбца", compute: () => above + colStep },
      { name: "шаг на единицу больше", compute: () => left + colStep + 1 },
    ],
  );
}

function hardGrid(start, firstStep, growth, vertical) {
  const rows = [];
  const steps = [];
  let origin = start;
  for (let row = 0; row < 3; row += 1) {
    const step = firstStep + row * growth;
    steps.push(step);
    rows.push([origin, origin + step, origin + step * 2]);
    origin += step * 2 + vertical;
  }
  const answer = rows[2][2];
  const left = rows[2][1];
  rows[2][2] = null;
  gridItem(
    "hard",
    rows,
    answer,
    "Разность внутри строки меняется от строки к строке. Прежний шаг уже не годится.",
    "Шаг строки растет, и следующая строка начинается после отдельного перехода.",
    [
      { name: "старый шаг", compute: () => left + steps[1] },
      { name: "только одно из двух правил", compute: () => left + steps[0] },
      { name: "шаг на единицу больше", compute: () => left + steps[2] + 1 },
    ],
  );
}

easyGrid(14, 6, 9);
easyGrid(17, 8, 11);
mediumGrid(8, 5, 9);
mediumGrid(11, 7, 4);
mediumGrid(6, 9, 5);
hardGrid(9, 4, 3, 5);
hardGrid(13, 5, 2, 6);
hardGrid(8, 6, 4, 3);

function scrambleWord(word, turn) {
  const chars = [...word.toLowerCase()];
  const shift = turn % chars.length || 1;
  let result = chars.slice(shift).concat(chars.slice(0, shift)).join("");
  if (result === word.toLowerCase()) {
    const swapped = [...chars];
    const last = swapped.length - 1;
    [swapped[0], swapped[last]] = [swapped[last], swapped[0]];
    result = swapped.join("");
  }
  const sorted = (value) => [...value].sort().join("");
  if (result === word.toLowerCase() || sorted(result) !== sorted(word.toLowerCase())) {
    throw new Error(`${word} не удалось перемешать`);
  }
  return result.toUpperCase();
}

const anagramHint = "Сначала соберите из букв обычные слова, затем найдите чужую группу.";

function anagramItem(difficulty, groupName, oddWord, memberWords) {
  const odd = scrambleWord(oddWord, 1);
  const members = memberWords.map((word, index) => [scrambleWord(word, index + 2), word]);
  const solvedWords = [oddWord, ...memberWords];
  for (const word of solvedWords) {
    if (word.length >= 3 && anagramHint.toLowerCase().includes(word.toLowerCase())) {
      throw new Error(`подсказка анаграммы содержит ${word}`);
    }
  }
  commitChoice({
    scale: "vocabulary",
    type: "voc-anagram",
    difficulty,
    text: "Соберите из букв слова и укажите то, которое не входит в одну группу с остальными.",
    answer: odd,
    hint: anagramHint,
    lead: `Четыре слова относятся к группе "${groupName}", лишнее - ${oddWord}.`,
    traps: members.map(([scrambled, word]) => [`слово группы ${word}`, scrambled]),
  });
}

anagramItem("easy", "животные", "стул", ["кошка", "собака", "лошадь", "корова"]);
anagramItem("easy", "фрукты", "молоток", ["яблоко", "груша", "слива", "вишня"]);
anagramItem("easy", "цвета", "заяц", ["красный", "синий", "зеленый", "белый"]);
anagramItem("easy", "посуда", "поезд", ["тарелка", "чашка", "ложка", "вилка"]);
anagramItem("medium", "начало текста", "эпилог", ["пролог", "преамбула", "вступление", "зачин"]);
anagramItem("medium", "чем пишут", "ластик", ["карандаш", "фломастер", "маркер", "перо"]);
anagramItem("medium", "струнные инструменты", "барабан", ["скрипка", "альт", "виолончель", "контрабас"]);
anagramItem("medium", "головной убор", "перчатка", ["шляпа", "кепка", "берет", "капюшон"]);
anagramItem("hard", "подтверждает право", "афиша", ["патент", "диплом", "лицензия", "аттестат"]);
anagramItem("hard", "несущая часть здания", "карниз", ["фундамент", "колонна", "перекрытие", "балка"]);
anagramItem("hard", "художественный сюжет", "очерк", ["роман", "повесть", "новелла", "рассказ"]);
anagramItem("hard", "измеряет величину", "микроскоп", ["термометр", "барометр", "амперметр", "манометр"]);

function vocItem(type, difficulty, text, answer, traps, hint, lead, scene) {
  commitChoice({
    scale: "vocabulary",
    type,
    difficulty,
    text,
    scene,
    answer,
    hint,
    lead,
    traps,
  });
}

vocItem(
  "voc-analogy",
  "easy",
  'Слово "кисть" относится к слову "рисовать", как слово "игла" к слову …',
  "шить",
  [
    ["путаница с ножом", "резать"],
    ["смежное действие иглы", "колоть"],
    ["другое рукоделие", "вязать"],
    ["другое действие с тканью", "гладить"],
  ],
  "Определите действие инструмента в первой паре и найдите такое же для второй.",
  "Кисть нужна, чтобы рисовать, игла нужна, чтобы шить.",
);
vocItem(
  "voc-analogy",
  "medium",
  'Слово "ветка" относится к слову "дерево", как слово "лепесток" к слову …',
  "цветок",
  [
    ["соседняя часть дерева", "лист"],
    ["другая часть растения", "корень"],
    ["место, а не целое", "сад"],
    ["стадия, а не целое", "бутон"],
  ],
  "Первое слово называет часть, второе - целое. Перенесите эту связь.",
  "Ветка - часть дерева, лепесток - часть цветка.",
);
vocItem(
  "voc-analogy",
  "hard",
  'Слово "архитектор" относится к слову "здание", как слово "композитор" к слову …',
  "симфония",
  [
    ["исполнители, не произведение", "оркестр"],
    ["другая роль, не создатель", "дирижер"],
    ["запись, не само сочинение", "ноты"],
    ["событие, не произведение", "концерт"],
  ],
  "Посмотрите, что создает человек из первой пары, и найдите такое же создание.",
  "Архитектор создает здание, композитор создает симфонию.",
);
vocItem(
  "voc-ana-meaning",
  "easy",
  'Анаграмма (переставленный набор букв) "КОЛЯБО" означает …',
  "фрукт",
  [
    ["соседняя рубрика еды", "овощ"],
    ["другая рубрика еды", "ягода"],
    ["не плод растения", "гриб"],
    ["твердый плод, не этот", "орех"],
  ],
  "Переставьте буквы в знакомое слово и выберите, чем оно является.",
  "КОЛЯБО собирается в слово яблоко, это фрукт.",
);
vocItem(
  "voc-ana-meaning",
  "medium",
  'Анаграмма (переставленный набор букв) "ЛОКОШАД" означает …',
  "сладость",
  [
    ["то, что пьют", "напиток"],
    ["плод, не изделие", "фрукт"],
    ["добавка к еде", "пряность"],
    ["сыпучий продукт", "крупа"],
  ],
  "Соберите слово и определите, к какой еде оно относится.",
  "ЛОКОШАД - это шоколад, сладкое изделие.",
);
vocItem(
  "voc-ana-meaning",
  "hard",
  'Анаграмма (переставленный набор букв) "РОКТЕХАТРИ" означает …',
  "профессия",
  [
    ["результат работы, не человек", "здание"],
    ["орудие, не человек", "инструмент"],
    ["область знания", "наука"],
    ["бумага, не человек", "документ"],
  ],
  "Соберите длинное слово и решите, кого или что оно называет.",
  "РОКТЕХАТРИ собирается в слово архитектор, это профессия.",
);
vocItem(
  "voc-style",
  "easy",
  "Найдите предложение со стилистической ошибкой в употреблении имени прилагательного.",
  "Это самый наилучший ответ",
  [
    ["верная превосходная степень", "Ответ оказался самым точным"],
    ["верная сравнительная степень", "Задача стала менее трудной"],
    ["верное сравнение", "У него более спокойный тон"],
    ["верная краткая форма", "Текст получился кратким"],
  ],
  "Ищите лишнее усиление при форме, которая уже выражает высшую степень.",
  '"Самый наилучший" удваивает превосходную степень.',
);
vocItem(
  "voc-style",
  "medium",
  "Найдите предложение со стилистической ошибкой в употреблении имени прилагательного.",
  "Ее платье было более красивее остальных",
  [
    ["сравнение без лишнего слова", "Ее платье было красивее остальных"],
    ["более при обычной форме", "Этот путь более короткий"],
    ["менее при обычной форме", "Голос стал менее резким"],
    ["превосходная степень к месту", "Решение выглядит самым простым"],
  ],
  "Смотрите, не стоит ли сравнительная форма рядом со словом усиления.",
  '"Более красивее" соединяет сравнительную степень и лишнее усиление.',
);
vocItem(
  "voc-style",
  "hard",
  "Найдите предложение со стилистической ошибкой в употреблении имени прилагательного.",
  "Он самый лучший из двух кандидатов",
  [
    ["сравнение из двух без самый", "Он лучше из двух кандидатов"],
    ["превосходная степень для многих", "Он самый опытный из всех кандидатов"],
    ["более при выборе из двух", "Из двух планов выбрали более короткий"],
    ["менее при обычной форме", "Этот вариант менее рискованный"],
  ],
  "При двух предметах нужна сравнительная степень, а не высшая.",
  'При выборе из двух говорят "лучший", а не "самый лучший".',
);
vocItem(
  "voc-relation",
  "medium",
  'Какое значение имеют следующие слова?\n"алфавит" и "азбука"',
  "сходное",
  [
    ["противоположность, которой нет", "противоположное"],
    ["отказ от сходства", "ни сходное, ни противоположное"],
    ["уход от ответа", "нельзя сказать однозначно"],
    ["ложное отрицание слова", 'слова "азбука" не существует'],
  ],
  "Вспомните, оба ли слова называют порядок букв.",
  "Алфавит и азбука называют один и тот же порядок букв.",
);
vocItem(
  "voc-relation",
  "hard",
  'Какое значение имеют следующие слова?\n"вердикт" и "верстак"',
  "ни сходное, ни противоположное",
  [
    ["сходство только по звучанию", "сходное значение"],
    ["противоположность, которой нет", "противоположное значение"],
    ["уход от ответа", "нельзя сказать однозначно"],
    ["ложное включение одного слова в другое", "верстак - вид вердикта"],
  ],
  "Одно слово из суда, другое из мастерской. Сравните смыслы, а не начало.",
  "Вердикт - судебное решение, верстак - рабочий стол. Смыслы не сходятся и не противоположны.",
);
vocItem(
  "voc-ana-join",
  "easy",
  "Расшифруйте слово (путем перестановки букв), которое было бы окончанием первого и началом второго слова.\nКАР(…)НА",
  "НТО",
  [
    ["другие три буквы", "ТОР"],
    ["другой короткий набор", "КОТ"],
    ["набор без нужных букв", "РОМ"],
    ["еще один чужой набор", "ЛУК"],
  ],
  'Соберите слово из букв варианта и проверьте два сложения: с "КАР-" спереди и с "-НА" сзади.',
  "НТО переставляется в тон: КАР + ТОН = картон, ТОН + НА = тонна.",
);
vocItem(
  "voc-ana-join",
  "hard",
  "Вставьте вместо точек слово, которое было бы окончанием первого и началом второго слова (при этом решите анаграммы в ответах путем перестановки букв).\nВОДО(…)ЕНИЕ",
  "ДПА",
  [
    ["другой набор из трех букв", "ТОК"],
    ["набор без нужных букв", "РОМ"],
    ["еще один чужой набор", "ЛУЧ"],
    ["короткий чужой набор", "НИЗ"],
  ],
  'Соберите слово из букв варианта и проверьте два сложения: с "ВОДО-" спереди и с "-ЕНИЕ" сзади.',
  "ДПА переставляется в пад: ВОДО + ПАД = водопад, ПАД + ЕНИЕ = падение.",
);
vocItem(
  "voc-punct",
  "easy",
  'Сколько запятых должно быть в предложении?\n"Ребята давайте дружно уберем класс".',
  "1",
  [
    ["лишняя запятая", "2"],
    ["еще одна лишняя", "3"],
    ["счет по словам", "4"],
    ["запятую пропустили", "0"],
  ],
  "Найдите обращение в начале фразы.",
  "Запятая отделяет обращение. Других запятых нет.",
);
vocItem(
  "voc-punct",
  "medium",
  'Сколько запятых должно быть в предложении?\n"По-моему эта задача если не ошибаюсь труднее вчерашней".',
  "3",
  [
    ["только вводное слово", "1"],
    ["вводное слово без одной границы оборота", "2"],
    ["лишняя граница", "4"],
    ["счет каждой паузы", "5"],
  ],
  "Отделите вводное слово в начале и вводный оборот в середине.",
  "Запятые стоят после вводного слова и по краям вводного оборота.",
);
vocItem(
  "voc-proverb",
  "easy",
  'Выберите выражение, близкое по смыслу к пословице\n"Без труда не вытащишь и рыбку из пруда".',
  "Терпение и труд все перетрут",
  [
    ["о последствиях, не об усилии", "Что посеешь, то и пожнешь"],
    ["о внешнем виде", "Не все то золото, что блестит"],
    ["об осторожности", "Семь раз отмерь, один отрежь"],
    ["о неспешности", "Тише едешь, дальше будешь"],
  ],
  "Ищите тот же смысл: результат приходит после усилия.",
  "Обе пословицы говорят, что результат требует труда.",
);
vocItem(
  "voc-proverb",
  "medium",
  'Выберите выражение, близкое по смыслу к пословице\n"Не зная броду, не суйся в воду".',
  "Семь раз отмерь, один отрежь",
  [
    ["о спешке, не о проверке", "Куй железо, пока горячо"],
    ["об излишнем страхе", "Волков бояться, в лес не ходить"],
    ["об ответственности", "Назвался груздем, полезай в кузов"],
    ["об усилии", "Любишь кататься, люби и саночки возить"],
  ],
  "Пословица советует сначала проверить опасность, а не бросаться вперед.",
  "Обе пословицы требуют осмотрительности до поступка.",
);
vocItem(
  "voc-proverb",
  "hard",
  'Выберите выражение, близкое по смыслу к пословице\n"Яблоко от яблони недалеко падает".',
  "Каков батька, таков и сын",
  [
    ["о побочном результате", "Лес рубят, щепки летят"],
    ["о доме", "В гостях хорошо, а дома лучше"],
    ["об учении", "Повторение мать учения"],
    ["о пользе учебы", "Ученье свет, а неученье тьма"],
  ],
  "Ищите мысль о сходстве ребенка с родителями, а не о самом яблоке.",
  "Обе пословицы говорят, что дети похожи на родителей.",
);
vocItem(
  "voc-grammar",
  "easy",
  "Укажите слово, которое в русском языке может быть более чем одной частью речи.",
  "печь",
  [
    ["только предмет", "стол"],
    ["только действие", "бежать"],
    ["только признак", "синий"],
    ["только обстоятельство", "быстро"],
  ],
  "Проверьте, может ли слово называть предмет и одновременно быть действием.",
  "Печь - и существительное, и глагол. Остальные слова одной части речи.",
);
vocItem(
  "voc-grammar",
  "medium",
  "Укажите слово, которое в русском языке может быть более чем одной частью речи.",
  "течь",
  [
    ["только предмет", "река"],
    ["только действие", "литься"],
    ["только предмет, не действие", "капля"],
    ["только признак", "мокрый"],
  ],
  "Ищите слово, у которого есть и предметное, и глагольное значение.",
  "Течь называют и протечку, и действие воды.",
);
vocItem(
  "voc-grammar",
  "hard",
  "Укажите слово, которое в русском языке может быть более чем одной частью речи.",
  "три",
  [
    ["только числительное", "пять"],
    ["только глагол", "тереть"],
    ["только обстоятельство", "трижды"],
    ["только предмет", "треть"],
  ],
  "Проверьте, не совпадает ли слово с формой глагола и с числительным.",
  "Три - и числительное, и повелительная форма глагола тереть.",
);
vocItem(
  "voc-ring",
  "easy",
  "Вставьте на место цифр буквы так, чтобы получилось слово из 7 букв.",
  "1 - П, 2 - Т",
  [
    ["буквы пропусков поменяны местами", "1 - Т, 2 - П"],
    ["первая буква чужая", "1 - Б, 2 - Т"],
    ["вторая буква чужая", "1 - П, 2 - С"],
    ["первая буква взята из слова", "1 - К, 2 - Т"],
  ],
  "Читайте буквы по часовой стрелке от верхней точки и подставляйте буквы из варианта.",
  "С буквами первого варианта по кольцу читается палатка.",
  { kind: "ring", letters: ["1", "А", "Л", "А", "2", "К", "А"] },
);
vocItem(
  "voc-ring",
  "medium",
  "Вставьте на место цифр буквы так, чтобы получилось слово из 9 букв.",
  "1 - К, 2 - Д",
  [
    ["буквы пропусков поменяны местами", "1 - Д, 2 - К"],
    ["первая буква чужая", "1 - Г, 2 - Д"],
    ["вторая буква чужая", "1 - К, 2 - Т"],
    ["первая буква чужая, вторая верная", "1 - П, 2 - Д"],
  ],
  "Читайте буквы по часовой стрелке от верхней точки и подставляйте буквы из варианта.",
  "С буквами первого варианта по кольцу читается календарь.",
  { kind: "ring", letters: ["1", "А", "Л", "Е", "Н", "2", "А", "Р", "Ь"] },
);
vocItem(
  "voc-ring",
  "hard",
  "Вставьте на место цифр буквы так, чтобы получилось слово из 11 букв.",
  "1 - Л, 2 - Т",
  [
    ["буквы пропусков поменяны местами", "1 - Т, 2 - Л"],
    ["первая буква чужая", "1 - Р, 2 - Т"],
    ["вторая буква чужая", "1 - Л, 2 - Д"],
    ["первая буква чужая, вторая верная", "1 - Н, 2 - Т"],
  ],
  "Читайте буквы по часовой стрелке от верхней точки и подставляйте буквы из варианта.",
  "С буквами первого варианта по кольцу читается лаборатория.",
  { kind: "ring", letters: ["1", "А", "Б", "О", "Р", "А", "2", "О", "Р", "И", "Я"] },
);

const RUMB = [
  [0, "С"],
  [45, "С-В"],
  [90, "В"],
  [135, "Ю-В"],
  [180, "Ю"],
  [225, "Ю-З"],
  [270, "З"],
  [315, "С-З"],
];
const LETTER_BEARING = { С: 0, В: 90, Ю: 180, З: 270 };

function rumbName(deg) {
  const normal = ((deg % 360) + 360) % 360;
  const found = RUMB.find(([angle]) => angle === normal);
  if (!found) throw new Error(`нет румба ${deg}`);
  return found[1];
}

function compassItem(difficulty, arrow, label, labelAt) {
  const letterBearing = LETTER_BEARING[label];
  if (letterBearing == null) throw new Error(`буква ${label}`);
  const answerDeg = (arrow - labelAt + letterBearing + 360) % 360;
  const answer = rumbName(answerDeg);
  const letterSide = rumbName(letterBearing);
  if (difficulty === "hard") {
    if (labelAt === 0) throw new Error("трудный компас: буква сверху");
    if (answer === letterSide) throw new Error("трудный компас: ответ равен букве");
  }
  const candidates = [
    ["противоположная сторона", rumbName(answerDeg + 180)],
    ["поворот по часовой", rumbName(answerDeg + 90)],
    ["поворот против часовой", rumbName(answerDeg + 270)],
    ["сторона самой буквы", letterSide],
  ];
  const picked = [];
  for (const candidate of candidates) {
    if (candidate[1] === answer || picked.some((item) => item[1] === candidate[1])) continue;
    picked.push(candidate);
    if (picked.length === 3) break;
  }
  if (picked.length < 3) throw new Error(`не хватило румбов для ${answer}`);
  commitChoice({
    scale: "spatial",
    type: "spa-compass",
    difficulty,
    text: "На какую сторону света указывает стрелка?",
    scene: { kind: "compass", arrow, label, labelAt },
    answer,
    hint: "Буква на ободе задает сторону в этом месте. От буквы поверните взгляд к стрелке.",
    lead: `Буква ${label} стоит на ободе, стрелка смотрит на ${answer}.`,
    traps: picked,
  });
}

compassItem("easy", 90, "С", 0);
compassItem("easy", 0, "В", 90);
compassItem("medium", 45, "С", 0);
compassItem("medium", 45, "Ю", 180);
compassItem("medium", 135, "З", 270);
compassItem("hard", 0, "С", 90);
compassItem("hard", 0, "В", 180);
compassItem("hard", 90, "Ю", 270);

function repeatCycle(cycle, length) {
  if (length % cycle.length !== 0) throw new Error(`длина ${length} не кратна циклу ${cycle}`);
  return cycle.repeat(length / cycle.length);
}

function purePeriod(text) {
  for (let size = 1; size <= text.length / 2; size += 1) {
    if (text.length % size === 0 && text === text.slice(0, size).repeat(text.length / size)) return size;
  }
  return null;
}

function breakCycle(text, mode, at) {
  const chars = [...text];
  if (mode === "swap") {
    if (chars[at] === chars[at + 1]) throw new Error("одинаковые соседи");
    [chars[at], chars[at + 1]] = [chars[at + 1], chars[at]];
  } else {
    chars[at] = chars[at] === "9" ? "1" : String(Number(chars[at]) + 1);
  }
  return chars.join("");
}

function cycleItem(difficulty, length, cycle, mode, at, cleanCycles) {
  const minimum = { easy: 18, medium: 30, hard: 48 }[difficulty];
  if (length < minimum) throw new Error(`цикл короче порога ${difficulty}`);
  const broken = breakCycle(repeatCycle(cycle, length), mode, at);
  if (purePeriod(broken) != null) throw new Error(`сбой остался циклом: ${broken}`);
  const cleans = cleanCycles.map((clean) => {
    const text = repeatCycle(clean, length);
    if (purePeriod(text) == null) throw new Error(`не целый цикл ${clean}`);
    if (text === broken) throw new Error("целая строка совпала со сбоем");
    return text;
  });
  if (new Set(cleans).size !== cleans.length) throw new Error("одинаковые целые строки");
  const breakName = mode === "swap" ? "переставлены соседние цифры" : "заменена одна цифра";
  commitChoice({
    scale: "attention",
    type: "att-cycle",
    difficulty,
    text: "В какой строке сбит повторяющийся цикл цифр?",
    answer: broken,
    hint: "Проверьте, повторяется ли в строке один и тот же короткий кусок без сбоя.",
    lead: `Сбит цикл ${cycle}: ${breakName}.`,
    traps: cleans.map((text, index) => [`целый цикл ${cleanCycles[index]}`, text]),
  });
}

cycleItem("easy", 18, "246", "swap", 4, ["135", "789", "123", "864"]);
cycleItem("easy", 18, "357", "replace", 6, ["246", "789", "123", "864"]);
cycleItem("medium", 30, "38159", "swap", 7, ["13579", "86420", "19283", "47025"]);
cycleItem("medium", 30, "24680", "replace", 11, ["13579", "38159", "19283", "47025"]);
cycleItem("medium", 30, "90731", "swap", 14, ["13579", "86420", "61839", "47025"]);
cycleItem("hard", 48, "2704", "swap", 9, ["1358", "6891", "2469", "9753"]);
cycleItem("hard", 48, "1358", "replace", 16, ["2704", "6891", "2469", "9753"]);
cycleItem("hard", 48, "6891", "swap", 21, ["2704", "1358", "8026", "4137"]);

function analog(type, difficulty, text, answer, traps, hint, lead, scene) {
  commitChoice({
    scale: "calculation",
    type,
    difficulty,
    text,
    scene,
    answer,
    hint,
    lead,
    traps,
  });
}

analog(
  "calc-share",
  "easy",
  "Из бутылки молока выпили 1/5, а потом еще 4/5. Выпили ли все молоко?",
  "да, все",
  [
    ["забыли вторую долю", "нет, останется пятая часть"],
    ["сложили доли как больше единицы", "молока не хватит"],
    ["остановились на половине", "нет, останется половина"],
  ],
  "Приведите доли к одному знаменателю и сравните сумму с единицей.",
  "Доли уже с общим знаменателем и в сумме дают целое.",
);
analog(
  "calc-share",
  "medium",
  "На обед взяли 1/2 пирога, 1/6 пирога и еще 1/6. Съеден ли весь пирог?",
  "нет, останется шестая часть",
  [
    ["не вычли остаток из целого", "да, все"],
    ["сложили доли как больше единицы", "пирога не хватит"],
    ["учли только первую долю", "нет, останется половина"],
  ],
  "Приведите доли к одному знаменателю и сравните сумму с единицей.",
  "После общего знаменателя сумма меньше целого на одну из названных долей.",
);
analog(
  "calc-share",
  "hard",
  "Из запасов взяли 2/5, затем 1/4 и 7/20. Хватит ли запасов ровно без остатка?",
  "да, все",
  [
    ["не включили последнюю долю", "нет, останется четверть"],
    ["сложили доли как больше единицы", "запасов не хватит"],
    ["остановились на первой доле", "нет, останется две пятых"],
  ],
  "Приведите доли к одному знаменателю и сравните сумму с единицей.",
  "Три разные доли после общего знаменателя дают целое.",
);
analog(
  "calc-signs",
  "easy",
  "Расставьте арифметические знаки в местах прочерков.\n\n8 _ 4 _ 2 _ 1 = 3",
  "÷ + − (деление, сложение, вычитание)",
  [
    ["сначала умножение", "× ÷ − (умножение, деление, вычитание)"],
    ["сложение раньше умножения", "+ − × (сложение, вычитание, умножение)"],
    ["вычитание в начале", "− + × (вычитание, сложение, умножение)"],
  ],
  "Сначала выполните умножение и деление, потом сложение и вычитание.",
  "Верная цепочка делает равенство истинным.",
);
analog(
  "calc-signs",
  "medium",
  "Расставьте арифметические знаки в местах прочерков.\n\n9 _ 3 _ 1 _ 2 = 5",
  "÷ + × (деление, сложение, умножение)",
  [
    ["сложение раньше умножения", "+ − × (сложение, вычитание, умножение)"],
    ["сначала умножение", "× ÷ − (умножение, деление, вычитание)"],
    ["вычитание в начале", "− × + (вычитание, умножение, сложение)"],
  ],
  "Сначала выполните умножение и деление, потом сложение и вычитание.",
  "Верная цепочка делает равенство истинным.",
);
analog(
  "calc-signs",
  "hard",
  "Расставьте арифметические знаки в местах прочерков.\n\n4 _ 4 _ 2 _ 2 = 10",
  "+ × − (сложение, умножение, вычитание)",
  [
    ["умножение без приоритета сложения", "× − × (умножение, вычитание, умножение)"],
    ["вычитание в начале", "− + × (вычитание, сложение, умножение)"],
    ["деление вместо сложения", "÷ × + (деление, умножение, сложение)"],
  ],
  "Сначала выполните умножение и деление, потом сложение и вычитание.",
  "Верная цепочка делает равенство истинным.",
);
analog(
  "calc-odd-pair",
  "medium",
  "Найдите пару, которая выпадает из общего правила.",
  "5 и 9",
  [
    ["пара с тем же произведением", "6 и 8"],
    ["другая пара с тем же произведением", "4 и 12"],
    ["третья пара с тем же произведением", "3 и 16"],
  ],
  "Перемножьте числа в каждой паре.",
  "Три пары держатся на одном произведении, четвертая нет.",
);
analog(
  "calc-odd-pair",
  "hard",
  "Найдите пару, которая выпадает из общего правила.",
  "6 и 28",
  [
    ["пара с тем же отношением", "3 и 6"],
    ["другая пара с тем же отношением", "4 и 12"],
    ["третья пара с тем же отношением", "5 и 20"],
  ],
  "Проверьте, получается ли второе число из первого одним и тем же действием.",
  "У трех пар второе число равно произведению первого на предыдущее к нему число.",
);
analog(
  "calc-divisor",
  "easy",
  "Укажите число, имеющее общий делитель с числом 15.",
  "25",
  [
    ["взаимно простое число", "8"],
    ["другое взаимно простое число", "14"],
    ["третье взаимно простое число", "16"],
  ],
  "Найдите вариант с общим множителем больше единицы.",
  "Только у верного варианта общий множитель больше единицы.",
);
analog(
  "calc-divisor",
  "medium",
  "Укажите число, имеющее общий делитель с числом 36.",
  "28",
  [
    ["взаимно простое число", "25"],
    ["другое взаимно простое число", "49"],
    ["третье взаимно простое число", "35"],
  ],
  "Найдите вариант с общим множителем больше единицы.",
  "Только у верного варианта общий множитель больше единицы.",
);
analog(
  "calc-divisor",
  "hard",
  "Укажите число, имеющее общий делитель с числом 48.",
  "45",
  [
    ["взаимно простое число", "25"],
    ["другое взаимно простое число", "49"],
    ["третье взаимно простое число", "35"],
  ],
  "Найдите вариант с общим множителем больше единицы.",
  "Только у верного варианта общий множитель больше единицы.",
);
analog(
  "calc-shelf",
  "easy",
  "На полке стоят 6 томов не по порядку. Менять можно только соседние тома. Какое минимальное число обменов вернет их к возрастанию номеров?",
  "3",
  [
    ["не учли одну соседнюю пару", "2"],
    ["посчитали лишнюю пару", "4"],
    ["удвоили одну перестановку", "5"],
  ],
  "Посчитайте пары, в которых левый том больше правого.",
  "Минимум обменов соседних томов равен числу таких пар.",
  { kind: "shelf", volumes: [2, 1, 4, 3, 6, 5] },
);
analog(
  "calc-shelf",
  "medium",
  "На полке стоят 6 томов не по порядку. Менять можно только соседние тома. Какое минимальное число обменов вернет их к возрастанию номеров?",
  "4",
  [
    ["посчитали только проход одного тома", "3"],
    ["добавили лишний обмен", "5"],
    ["сложили номер тома и число соседей", "6"],
  ],
  "Посчитайте пары, в которых левый том больше правого.",
  "Минимум обменов соседних томов равен числу таких пар.",
  { kind: "shelf", volumes: [4, 1, 2, 3, 6, 5] },
);
analog(
  "calc-shelf",
  "hard",
  "На полке стоят 8 томов не по порядку. Менять можно только соседние тома. Какое минимальное число обменов вернет их к возрастанию номеров?",
  "8",
  [
    ["пропустили два прохода", "6"],
    ["пропустили один проход", "7"],
    ["добавили лишний обмен", "9"],
  ],
  "Посчитайте пары, в которых левый том больше правого.",
  "Минимум обменов соседних томов равен числу таких пар.",
  { kind: "shelf", volumes: [5, 1, 4, 2, 6, 3, 8, 7] },
);

const minimums = {
  "calc-story": 16,
  "calc-series": 8,
  "calc-grid": 8,
  "calc-chart": 16,
  "calc-share": 3,
  "calc-signs": 3,
  "calc-odd-pair": 2,
  "calc-divisor": 3,
  "calc-shelf": 3,
  "voc-spelling": 12,
  "voc-anagram": 12,
  "voc-punct": 2,
  "voc-ana-join": 2,
  "voc-ana-meaning": 3,
  "voc-relation": 2,
  "voc-analogy": 3,
  "voc-style": 3,
  "voc-proverb": 3,
  "voc-grammar": 3,
  "voc-ring": 3,
  fact: 48,
  "spa-assembly": 8,
  "spa-net": 8,
  "spa-compass": 8,
  "spa-transform": 8,
  "spa-top": 8,
  "spa-cubes": 8,
  "non-matrix": 16,
  "non-odd": 8,
  "non-sequence": 8,
  "non-analogy": 8,
  "non-group": 8,
  "ver-inference": 16,
  "ver-analogy": 8,
  "ver-general": 8,
  "ver-order": 8,
  "ver-set": 8,
  "att-count": 12,
  "att-symbol": 8,
  "att-match": 8,
  "att-typo": 8,
  "att-diff": 4,
  "att-cycle": 8,
};
const topics = ["geography", "history", "science", "culture", "economy", "nature", "sport"];
const issues = [];
for (const [scale, items] of Object.entries(bank)) {
  if (items.length < 48) issues.push(`${scale}: ${items.length} < 48`);
  for (const difficulty of ["easy", "medium", "hard"]) {
    const count = items.filter((item) => item.difficulty === difficulty).length;
    if (count < 12) issues.push(`${scale} ${difficulty}: ${count}`);
  }
  if (scale === "erudition") {
    for (const topic of topics) {
      const count = items.filter((item) => item.topic === topic).length;
      if (count < 8) issues.push(`topic ${topic}: ${count}`);
    }
  }
}
for (const [type, minimum] of Object.entries(minimums)) {
  const count = Object.values(bank)
    .flat()
    .filter((item) => item.type === type).length;
  if (count < minimum) issues.push(`${type}: ${count} < ${minimum}`);
}
if (issues.length > 0) {
  console.error(issues.join("\n"));
  process.exit(1);
}

const dataDir = join(root, "data");
mkdirSync(dataDir, { recursive: true });
for (const [scale, items] of Object.entries(bank)) {
  writeFileSync(join(dataDir, `${scale}.json`), `${JSON.stringify(items, null, 2)}\n`, "utf8");
}
const fmt = spawnSync(process.execPath, [join(root, "node_modules", "oxfmt", "bin", "oxfmt"), "data"], {
  cwd: root,
  stdio: "inherit",
});
if (fmt.status !== 0) process.exit(fmt.status ?? 1);
console.log(
  Object.entries(bank)
    .map(([scale, items]) => `${scale}:${items.length}`)
    .join(" "),
);
