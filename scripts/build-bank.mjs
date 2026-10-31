import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const bank = {
  calculation: [],
  vocabulary: [],
  erudition: [],
  spatial: [],
  nonverbal: [],
  verbal: [],
  attention: [],
}
const counts = {}

function numbersIn(text) {
  return [...text.matchAll(/\d+/g)].map((match) => match[0])
}

function leakReason(hint, explanation, correctText) {
  const explained = new Set(numbersIn(explanation))
  for (const value of numbersIn(hint)) {
    if (explained.has(value)) return `число ${value}`
  }
  if (correctText.length >= 3 && hint.toLowerCase().includes(correctText.toLowerCase())) {
    return `ответ "${correctText}"`
  }
  return null
}

function nearNumbers(answer, seeds) {
  const values = []
  const push = (value) => {
    if (value !== answer && value > 0 && !values.includes(value)) values.push(value)
  }
  for (const seed of seeds) push(seed)
  let extra = 1
  while (values.length < 3) {
    push(answer + extra)
    extra += 1
  }
  return values.slice(0, 3)
}

function add(spec) {
  const number = (counts[spec.type] = (counts[spec.type] ?? 0) + 1)
  const id = `${spec.type}-${String(number).padStart(2, '0')}`
  const options = spec.options.map((option, index) => {
    const optionId = `${id}-${index + 1}`
    if (typeof option === 'string') return { id: optionId, text: option }
    return { id: optionId, ...option }
  })
  const correct = options[spec.correct]
  if (!correct) throw new Error(`${id}: нет верного варианта`)
  const correctText = typeof spec.options[spec.correct] === 'string' ? spec.options[spec.correct] : ''
  const leak = leakReason(spec.hint, spec.explanation, correctText)
  if (leak) throw new Error(`${id}: подсказка содержит ${leak}`)
  const texts = options.map((option) => option.text).filter(Boolean)
  if (new Set(texts).size !== texts.length) throw new Error(`${id}: повторяется текст варианта`)
  bank[spec.scale].push({
    id,
    scale: spec.scale,
    type: spec.type,
    source: spec.source,
    difficulty: spec.difficulty,
    ...(spec.topic ? { topic: spec.topic } : {}),
    stimulus: {
      ...(spec.text ? { text: spec.text } : {}),
      ...(spec.rows ? { rows: spec.rows } : {}),
      ...(spec.scene ? { scene: spec.scene } : {}),
    },
    options,
    correctOptionId: correct.id,
    shuffle: true,
    hint: spec.hint,
    explanation: spec.explanation,
  })
}

function mulberry32(seed) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const rng = mulberry32(20261031)

function normalize(cells) {
  const minX = Math.min(...cells.map((cell) => cell[0]))
  const minY = Math.min(...cells.map((cell) => cell[1]))
  return cells
    .map(([x, y]) => [x - minX, y - minY])
    .sort((left, right) => left[0] - right[0] || left[1] - right[1])
}

function keyOf(cells) {
  return normalize(cells)
    .map((cell) => cell.join(','))
    .join(';')
}

function rotationsOf(cells) {
  const found = []
  const seen = new Set()
  let current = normalize(cells)
  for (let turn = 0; turn < 4; turn += 1) {
    const key = keyOf(current)
    if (!seen.has(key)) {
      seen.add(key)
      found.push(current)
    }
    current = normalize(current.map(([x, y]) => [y, -x]))
  }
  return found
}

function mirrored(cells) {
  return normalize(cells.map(([x, y]) => [-x, y]))
}

function sameShape(left, right) {
  return keyOf(left) === keyOf(right)
}

function isRotation(candidate, source) {
  return rotationsOf(source).some((rotation) => sameShape(rotation, candidate))
}

function grow(size) {
  const cells = [[0, 0]]
  const used = new Set(['0,0'])
  const directions = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
  let guard = 0
  while (cells.length < size && guard < 300) {
    guard += 1
    const base = cells[Math.floor(rng() * cells.length)]
    const direction = directions[Math.floor(rng() * directions.length)]
    const next = [base[0] + direction[0], base[1] + direction[1]]
    const key = next.join(',')
    if (used.has(key)) continue
    used.add(key)
    cells.push(next)
  }
  return cells.length === size ? normalize(cells) : null
}

function fullCells(cols, rows) {
  const cells = []
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) cells.push([x, y])
  }
  return cells
}

function placements(piece, cols, rows, allowed) {
  const places = []
  for (const rotation of rotationsOf(piece)) {
    const maxX = Math.max(...rotation.map((cell) => cell[0]))
    const maxY = Math.max(...rotation.map((cell) => cell[1]))
    for (let offsetX = 0; offsetX <= cols - maxX - 1; offsetX += 1) {
      for (let offsetY = 0; offsetY <= rows - maxY - 1; offsetY += 1) {
        const cells = rotation.map(([x, y]) => [x + offsetX, y + offsetY])
        if (cells.every(([x, y]) => allowed.has(`${x},${y}`))) places.push(cells)
      }
    }
  }
  return places
}

function canTile(cols, rows, pieces, filled) {
  const allowed = new Set((filled ?? fullCells(cols, rows)).map(([x, y]) => `${x},${y}`))
  const options = pieces.map((piece) => placements(piece, cols, rows, allowed))
  if (options.some((list) => list.length === 0)) return false
  const walk = (index, used) => {
    if (index === pieces.length) return used.size === allowed.size
    for (const place of options[index]) {
      if (place.some(([x, y]) => used.has(`${x},${y}`))) continue
      for (const [x, y] of place) used.add(`${x},${y}`)
      if (walk(index + 1, used)) return true
      for (const [x, y] of place) used.delete(`${x},${y}`)
    }
    return false
  }
  return walk(0, new Set())
}

function assertTile(label, cols, rows, pieces, expected) {
  const actual = canTile(cols, rows, pieces, fullCells(cols, rows))
  if (actual !== expected) throw new Error(`${label}: ожидалась сборка ${expected}, получено ${actual}`)
}

const specA = [
  [0, 0],
  [0, 1],
  [1, 1],
  [2, 1],
]
const specB = [
  [1, 0],
  [2, 0],
  [3, 0],
  [3, 1],
]
assertTile('spec correct', 4, 2, [specA, specB], true)
assertTile(
  'spec T',
  4,
  2,
  [
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
  ],
  false,
)
assertTile(
  'spec square',
  4,
  2,
  [
    [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
  ],
  false,
)

function findPieces(cols, rows, sizes) {
  for (let attempt = 0; attempt < 800; attempt += 1) {
    const pieces = sizes.map((size) => grow(size))
    if (pieces.some((piece) => !piece)) continue
    if (canTile(cols, rows, pieces, fullCells(cols, rows))) return pieces
  }
  throw new Error(`не найден силуэт ${cols}x${rows} ${sizes.join('+')}`)
}

function findWrongPieces(cols, rows, sizes, banned) {
  for (let attempt = 0; attempt < 800; attempt += 1) {
    const pieces = sizes.map((size) => grow(size))
    if (pieces.some((piece) => !piece)) continue
    const key = pieces.map((piece) => keyOf(piece)).sort().join('|')
    if (banned.has(key)) continue
    if (!canTile(cols, rows, pieces, fullCells(cols, rows))) return pieces
  }
  throw new Error(`не найден неверный набор ${cols}x${rows}`)
}

function addAssembly(difficulty, cols, rows, correct, wrongs) {
  const filled = fullCells(cols, rows)
  if (!canTile(cols, rows, correct, filled)) throw new Error('верный набор не собирается')
  for (const wrong of wrongs) {
    if (canTile(cols, rows, wrong, filled)) throw new Error('неверный набор собирается')
  }
  add({
    scale: 'spatial',
    type: 'spa-assembly',
    source: 'demo',
    difficulty,
    text: 'Какой набор фигурок складывается в силуэт? Фигурки можно поворачивать на 90 градусов.',
    scene: { kind: 'cells', cols, rows, filled },
    options: [correct, ...wrongs].map((pieces) => ({ scene: { kind: 'cells', pieces } })),
    correct: 0,
    hint: 'Сравните число клеток силуэта и набора, затем проверьте, стыкуются ли формы. Поворот разрешен.',
    explanation: 'Верный набор закрывает силуэт без наложений и без клеток снаружи. Остальные наборы либо не сходятся по числу клеток, либо не складываются в этот контур даже с поворотом.',
  })
}

addAssembly(
  'medium',
  4,
  2,
  [specA, specB],
  [
    [
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [1, 1],
      ],
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
      ],
    ],
    [
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ],
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
      ],
    ],
    [
      [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [3, 1],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [2, 0],
      ],
    ],
  ],
)

const assemblyPlans = [
  ['easy', 2, 2, [2, 2]],
  ['medium', 3, 2, [3, 3]],
  ['hard', 4, 2, [4, 4]],
  ['medium', 3, 3, [3, 3, 3]],
  ['hard', 4, 3, [4, 4, 4]],
]
const usedAssemblies = new Set([keyOf(specA) + '|' + keyOf(specB)])
for (const [difficulty, cols, rows, sizes] of assemblyPlans) {
  let correct = null
  for (let attempt = 0; attempt < 40 && !correct; attempt += 1) {
    const pieces = findPieces(cols, rows, sizes)
    const key = pieces.map((piece) => keyOf(piece)).sort().join('|')
    if (usedAssemblies.has(key)) continue
    usedAssemblies.add(key)
    correct = pieces
  }
  if (!correct) throw new Error(`повтор силуэта ${cols}x${rows}`)
  const banned = new Set([correct.map((piece) => keyOf(piece)).sort().join('|')])
  const area = cols * rows
  const plans = [
    sizes.map((size, index) => (index === 0 ? size + 1 : size)),
    sizes.map((size, index) => (index === 0 ? size + 2 : size)),
    sizes.reduce((sum, size) => sum + size, 0) === area && area > 4 ? sizes : sizes.map((size, index) => (index === 0 ? size + 3 : size)),
  ]
  const wrongs = plans.map((plan) => {
    const pieces = findWrongPieces(cols, rows, plan, banned)
    banned.add(pieces.map((piece) => keyOf(piece)).sort().join('|'))
    return pieces
  })
  addAssembly(difficulty, cols, rows, correct, wrongs)
}

function addGrid(difficulty, origin, colStep, rowStep, emptyAt) {
  const rows = []
  for (let y = 0; y < 3; y += 1) {
    const line = []
    for (let x = 0; x < 3; x += 1) {
      const value = origin + x * colStep + y * rowStep
      line.push(emptyAt[0] === x && emptyAt[1] === y ? null : String(value))
    }
    rows.push(line)
  }
  const answer = origin + emptyAt[0] * colStep + emptyAt[1] * rowStep
  const distractors = nearNumbers(answer, [answer + colStep, answer - colStep, answer + rowStep, answer - 1, answer + 1])
  add({
    scale: 'calculation',
    type: 'calc-grid',
    source: 'demo',
    difficulty,
    text: 'Какое число стоит в пустой клетке?',
    rows,
    options: [answer, ...distractors].map(String),
    correct: 0,
    hint: 'Сравните шаг вдоль строки и шаг вдоль столбца. Оба должны сойтись в пустой клетке.',
    explanation: `В строке шаг ${colStep}, в столбце шаг ${rowStep}, оба дают ${answer}.`,
  })
}

addGrid('medium', 2, 3, 4, [2, 2])
addGrid('easy', 1, 1, 1, [2, 2])
addGrid('easy', 10, 10, 1, [2, 2])
addGrid('medium', 4, 2, 5, [1, 2])
addGrid('hard', 7, 3, 8, [0, 2])
addGrid('hard', 6, 4, 9, [2, 1])

const stories = [
  ['medium', 'За 3 часа мастер делает 18 рам. Сколько рам он сделает за 8 часов при той же скорости?', [48, 42, 54, 36], 0, 'Сначала найдите, сколько рам выходит за один час, затем пересчитайте на нужное время.', '18 / 3 = 6 рам в час, 6 * 8 = 48.'],
  ['easy', 'В пачке 6 тетрадей. Сколько тетрадей в 4 таких пачках?', [24, 10, 20, 28], 0, 'Перемножьте число пачек и число тетрадей в одной.', '4 * 6 = 24.'],
  ['easy', 'Один билет стоит 15 рублей. Сколько стоят 3 билета?', [45, 18, 30, 60], 0, 'Умножьте цену одного билета на их число.', '15 * 3 = 45.'],
  ['medium', 'Куртка стоила 2000 рублей. Магазин снизил цену на 10%. Сколько она стоит теперь?', [1800, 1900, 1500, 1990], 0, 'Сначала найдите сумму скидки, затем вычтите ее из начальной цены.', '10% от 2000 равно 200, 2000 - 200 = 1800.'],
  ['hard', 'Бригада за 4 дня делает 20 деталей. Сколько дней нужно на 35 деталей при той же скорости?', [7, 6, 8, 9], 0, 'Сначала найдите дневную выработку, затем разделите весь заказ на эту выработку.', '20 / 4 = 5 деталей в день, 35 / 5 = 7 дней.'],
  ['medium', 'В бочке было 40 литров воды. За день израсходовали четверть. Сколько литров осталось?', [30, 10, 20, 36], 0, 'Найдите израсходованную часть и вычтите ее из исходного объема.', 'Четверть от 40 равна 10, 40 - 10 = 30.'],
]
for (const [difficulty, text, options, correct, hint, explanation] of stories) {
  add({ scale: 'calculation', type: 'calc-story', source: 'demo', difficulty, text, options: options.map(String), correct, hint, explanation })
}

function addSeries(difficulty, values, ruleText) {
  const shown = values.slice(0, -1)
  const answer = values[values.length - 1]
  const distractors = nearNumbers(answer, [answer + 10, answer - 10, answer + values[1] - values[0]])
  add({
    scale: 'calculation',
    type: 'calc-series',
    source: 'analog',
    difficulty,
    text: `${shown.join(', ')}, ?`,
    options: [answer, distractors[0], distractors[1], distractors[2]].map(String),
    correct: 0,
    hint: 'Посмотрите, как каждое число получается из предыдущего.',
    explanation: ruleText,
  })
}
addSeries('easy', [5, 10, 20, 40, 80], 'Каждое число вдвое больше предыдущего, поэтому дальше 80.')
addSeries('medium', [2, 5, 11, 23, 47], 'Каждый шаг удваивает предыдущее число и прибавляет единицу: дальше 47.')
addSeries('hard', [4, 5, 7, 11, 19, 35], 'Прибавки удваиваются: 1, 2, 4, 8, 16. Дальше 35.')

const shares = [
  ['easy', 'В ящике 40 деталей, 8 из них бракованные. Какая это доля?', ['1/5', '1/4', '1/8', '1/2'], 0, 'Разделите часть на целое и сократите дробь.', '8 / 40 = 1/5.'],
  ['easy', 'Из 20 учеников 5 опоздали. Какая это доля?', ['1/4', '1/5', '1/2', '1/10'], 0, 'Разделите число опоздавших на число всех учеников и сократите.', '5 / 20 = 1/4.'],
  ['medium', 'Сколько процентов составляют 12 от 48?', ['25', '20', '30', '12'], 0, 'Разделите часть на целое и переведите дробь в проценты.', '12 / 48 = 1/4, это 25%.'],
]
for (const [difficulty, text, options, correct, hint, explanation] of shares) {
  add({ scale: 'calculation', type: 'calc-share', source: 'analog', difficulty, text, options, correct, hint, explanation })
}

const motions = [
  ['medium', 'Автомобиль ехал 2 часа со скоростью 50 км/ч и еще 1 час со скоростью 80 км/ч. Сколько километров он проехал?', ['180', '130', '150', '210'], 0, 'Посчитайте путь на каждом участке отдельно и сложите.', '2 * 50 = 100, плюс 80, всего 180.'],
  ['easy', 'Пешеход шел 3 часа со скоростью 4 км/ч. Какой путь он прошел?', ['12', '7', '16', '9'], 0, 'Умножьте скорость на время.', '3 * 4 = 12.'],
  ['hard', 'Лодка плыла 2 часа со скоростью 11 км/ч и еще 3 часа со скоростью 9 км/ч. Какой путь она прошла?', ['49', '40', '45', '52'], 0, 'Найдите путь каждого участка и сложите пути.', '2 * 11 = 22, 3 * 9 = 27, вместе 49.'],
]
for (const [difficulty, text, options, correct, hint, explanation] of motions) {
  add({ scale: 'calculation', type: 'calc-motion', source: 'analog', difficulty, text, options, correct, hint, explanation })
}

const estimates = [
  ['easy', 'Чему примерно равно 198 * 5?', ['около 1000', 'около 500', 'около 2000', 'около 100'], 0, 'Замените множитель на близкое круглое число и оцените порядок, не считая в столбик.', '200 * 5 = 1000, 198 чуть меньше 200, результат около 1000.'],
  ['easy', 'Чему примерно равно 51 * 19?', ['около 1000', 'около 100', 'около 500', 'около 5000'], 0, 'Замените оба множителя близкими круглыми числами.', '50 * 20 = 1000, исходные числа близки к ним.'],
  ['medium', 'Чему примерно равно 310 * 21?', ['около 6000', 'около 3000', 'около 9000', 'около 600'], 0, 'Округлите числа так, чтобы произведение читалось без столбика.', '300 * 20 = 6000, оба множителя чуть больше этих круглых значений, порядок тот же.'],
]
for (const [difficulty, text, options, correct, hint, explanation] of estimates) {
  add({ scale: 'calculation', type: 'calc-estimate', source: 'analog', difficulty, text, options, correct, hint, explanation })
}

function addCalcChart(difficulty, labels, values, text, answer, explanation) {
  const numeric = nearNumbers(answer, [answer + 6, answer - 6, answer + values[0]])
  add({
    scale: 'calculation',
    type: 'calc-chart',
    source: 'analog',
    difficulty,
    text,
    scene: { kind: 'chart', variant: 'bar', labels, values },
    options: [answer, ...numeric.slice(0, 3)].map(String),
    correct: 0,
    hint: 'Вычтите высоту одного названного столбца из высоты другого.',
    explanation,
  })
}
addCalcChart('medium', ['янв', 'фев', 'мар', 'апр'], [12, 30, 18, 24], 'На сколько февраль больше марта?', 12, '30 - 18 = 12.')
addCalcChart('easy', ['пн', 'вт', 'ср', 'чт'], [5, 9, 8, 4], 'Чему равна высота столбца понедельника?', 5, 'Столбец понедельника имеет высоту 5.')
addCalcChart('hard', ['А', 'Б', 'В', 'Г'], [16, 27, 21, 40], 'На сколько Г больше В?', 19, '40 - 21 = 19.')

function scramble(word) {
  const chars = [...word]
  let seed = [...word].reduce((sum, char) => sum + char.charCodeAt(0), 17)
  const next = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  for (let index = chars.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(next() * (index + 1))
    const current = chars[index]
    chars[index] = chars[swap]
    chars[swap] = current
  }
  let result = chars.join('').toUpperCase()
  if (result.toLowerCase() === word.toLowerCase()) result = [...word].reverse().join('').toUpperCase()
  const sorted = (text) => [...text.toLowerCase().replaceAll('ё', 'е')].sort().join('')
  if (sorted(result) !== sorted(word)) throw new Error(`плохая анаграмма ${word}`)
  return result
}

const anagrams = [
  ['hard', ['кошка', 'тигр', 'волк', 'лиса'], 'стол', 'животные', 'ШАКОК', 'РГИТ', 'КЛОВ', 'САИЛ', 'ТОЛС'],
  ['hard', ['яблоко', 'груша', 'слива', 'вишня'], 'морковь', 'фрукты', null],
  ['medium', ['скрипка', 'альт', 'виолончель', 'контрабас'], 'флейта', 'смычковые', null],
  ['hard', ['красный', 'синий', 'зеленый', 'белый'], 'стул', 'цвета', null],
  ['medium', ['дуб', 'клен', 'липа', 'береза'], 'роза', 'деревья', null],
  ['hard', ['Москва', 'Казань', 'Омск', 'Тула'], 'Волга', 'города', null],
]
for (const [difficulty, group, odd, title, ...fixed] of anagrams) {
  const forms = fixed.length === 5 ? fixed : [...group.map((word) => scramble(word)), scramble(odd)]
  const words = [...group, odd]
  add({
    scale: 'vocabulary',
    type: 'voc-anagram',
    source: 'demo',
    difficulty,
    text: 'Соберите слова. Какое из них лишнее?',
    options: forms,
    correct: 4,
    hint: 'Соберите из букв обычные слова и найдите то, которое не из общей группы.',
    explanation: `${words
      .map((word, index) => `${forms[index]} - ${word}`)
      .join(', ')}. Общая группа - ${title}, лишнее слово - ${odd}.`,
  })
}

const spellings = [
  ['medium', ['пространство', 'будующий', 'лестница', 'агентство', 'привилегия'], 1, 'будущий'],
  ['medium', ['претензия', 'алюминий', 'приоритет', 'катастрофа', 'инциндент'], 4, 'инцидент'],
  ['hard', ['абонент', 'стипендия', 'жюри', 'дилетант', 'бюлетень'], 4, 'бюллетень'],
  ['easy', ['академия', 'интеллигенция', 'винегрет', 'перила', 'акадэмия'], 4, 'академия'],
  ['hard', ['кристалл', 'колоссальный', 'искусный', 'антагонизм', 'полисадник'], 4, 'палисадник'],
  ['medium', ['рассчитывать', 'конъюнктура', 'привилегия', 'подскользнуться', 'беспрецедентный'], 3, 'поскользнуться'],
]
for (const [difficulty, options, correct, right] of spellings) {
  add({
    scale: 'vocabulary',
    type: 'voc-spelling',
    source: 'demo',
    difficulty,
    text: 'Укажите неверное написание.',
    options,
    correct,
    hint: 'Сверьте каждое слово с привычным написанием, ошибка в одной букве или в лишней букве.',
    explanation: `Верная форма - ${right}.`,
  })
}

const synonyms = [
  ['easy', 'Синоним слова "быстрый".', ['скорый', 'медленный', 'тихий', 'поздний', 'редкий'], 0, 'Нужно слово с тем же смыслом, а не противоположное.', 'Скорый значит быстрый. Медленный - антоним.'],
  ['easy', 'Антоним слова "широкий".', ['узкий', 'просторный', 'высокий', 'ровный', 'частый'], 0, 'Нужно слово с противоположным смыслом.', 'Узкий противоположен широкому.'],
  ['medium', 'Синоним слова "храбрый".', ['смелый', 'робкий', 'громкий', 'быстрый', 'добрый'], 0, 'Ищите близкое по смыслу слово, а не противоположное.', 'Смелый и храбрый обозначают одно и то же качество.'],
]
for (const [difficulty, text, options, correct, hint, explanation] of synonyms) {
  add({ scale: 'vocabulary', type: 'voc-synonym', source: 'analog', difficulty, text, options, correct, hint, explanation })
}

const meanings = [
  ['medium', 'Что означает слово "лаконичный"?', ['краткий', 'яркий', 'древний', 'случайный', 'шумный'], 0, 'Подставьте толкование вместо слова и оставьте то, которое не меняет смысл.', 'Лаконичный - краткий, без лишних слов.'],
  ['easy', 'Что означает слово "альбом"?', ['книга для рисунков или снимков', 'кухонная посуда', 'вид транспорта', 'единица времени', 'садовый инструмент'], 0, 'Вспомните, куда обычно складывают рисунки и фотографии.', 'Альбом - книга или тетрадь для рисунков и снимков.'],
  ['hard', 'Что означает слово "дефицит"?', ['нехватка', 'избыток', 'равенство', 'обмен', 'заказ'], 0, 'Слово говорит о том, чего не хватает, а не о том, чего слишком много.', 'Дефицит - это нехватка.'],
]
for (const [difficulty, text, options, correct, hint, explanation] of meanings) {
  add({ scale: 'vocabulary', type: 'voc-meaning', source: 'analog', difficulty, text, options, correct, hint, explanation })
}

const oddWords = [
  ['easy', ['яблоко', 'груша', 'слива', 'морковь', 'вишня'], 3, 'Остальные - фрукты, морковь - овощ.'],
  ['easy', ['гитара', 'скрипка', 'барабан', 'молоток', 'флейта'], 3, 'Остальные - музыкальные инструменты, молоток - инструмент столяра.'],
  ['medium', ['утро', 'вечер', 'ночь', 'вторник', 'полдень'], 3, 'Остальные - части суток, вторник - день недели.'],
]
for (const [difficulty, options, correct, explanation] of oddWords) {
  add({
    scale: 'vocabulary',
    type: 'voc-odd-word',
    source: 'analog',
    difficulty,
    text: 'Какое слово из другой группы?',
    options,
    correct,
    hint: 'Четыре слова из одной группы, одно из другой. Буквы переставлять не нужно.',
    explanation,
  })
}

const letters = [
  ['easy', 'Вставьте букву: в...кзал.', ['о', 'а', 'е', 'и', 'ы'], 0, 'вокзал'],
  ['easy', 'Вставьте букву: к...рман.', ['а', 'о', 'е', 'и', 'у'], 0, 'карман'],
  ['medium', 'Вставьте букву: св...сток.', ['и', 'е', 'о', 'а', 'у'], 0, 'свисток'],
]
for (const [difficulty, text, options, correct, word] of letters) {
  add({
    scale: 'vocabulary',
    type: 'voc-letter',
    source: 'analog',
    difficulty,
    text,
    options,
    correct,
    hint: 'Прочитайте слово целиком и вспомните привычное написание.',
    explanation: `Верное слово - ${word}.`,
  })
}

const paronyms = [
  ['medium', 'Ведущий ... слово гостю.', ['предоставил', 'представил', 'представился', 'предоставился', 'представлял'], 0, 'Здесь устойчивое сочетание со словом "слово". Похожие глаголы значат другое.', 'Устойчивое сочетание - предоставить слово.'],
  ['easy', 'На улице холодно, ... шапку.', ['надень', 'одень', 'оденься', 'наденься', 'одевай'], 0, 'Речь о предмете одежды, который человек надевает на себя.', 'Шапку надевают, а одевают другого человека.'],
  ['hard', 'Библиотечный ... дает право брать книги домой.', ['абонемент', 'абонент', 'абонента', 'абонирование', 'абонемента'], 0, 'Нужно название документа на право пользования, а не человек, который им пользуется.', 'Абонемент дает право брать книги, абонент - это человек.'],
]
for (const [difficulty, text, options, correct, hint, explanation] of paronyms) {
  add({ scale: 'vocabulary', type: 'voc-paronym', source: 'analog', difficulty, text, options, correct, hint, explanation })
}

const facts = [
  ['geography', 'easy', 'Столица Австралии.', ['Канберра', 'Сидней', 'Мельбурн', 'Перт', 'Аделаида'], 0, 'Столица и самый большой город здесь не совпадают.', 'Столица Австралии - Канберра, не Сидней.'],
  ['geography', 'medium', 'Столица Канады.', ['Оттава', 'Торонто', 'Монреаль', 'Ванкувер', 'Квебек'], 0, 'Столица и крупнейший город здесь разные.', 'Столица Канады - Оттава.'],
  ['geography', 'medium', 'Самое глубокое озеро мира.', ['Байкал', 'Верхнее', 'Виктория', 'Танганьика', 'Ладожское'], 0, 'Сравнивайте глубину, а не площадь водной поверхности.', 'Самое глубокое озеро - Байкал.'],
  ['geography', 'hard', 'Какой пролив отделяет Азию от Северной Америки?', ['Берингов', 'Гибралтарский', 'Магелланов', 'Ла-Манш', 'Босфор'], 0, 'Он лежит между Чукоткой и Аляской.', 'Азию и Северную Америку разделяет Берингов пролив.'],
  ['history', 'easy', 'В каком году началась Великая Отечественная война?', ['в 1941 году', 'в 1939 году', 'в 1945 году', 'в 1914 году', 'в 1940 году'], 0, 'Вопрос про Великую Отечественную, а не про начало войны в Европе и не про год ее окончания.', '1939 год - начало Второй мировой войны в Европе, вопрос про Великую Отечественную.'],
  ['history', 'medium', 'В каком году человек впервые полетел в космос?', ['в 1961 году', 'в 1957 году', 'в 1969 году', 'в 1971 году', 'в 1945 году'], 0, 'Это полет Юрия Гагарина, не запуск первого спутника и не высадка на Луну.', 'Первый полет человека в космос состоялся в 1961 году.'],
  ['history', 'hard', 'В каком году была Куликовская битва?', ['в 1380 году', 'в 1240 году', 'в 1480 году', 'в 1382 году', 'в 1812 году'], 0, 'Сражение Дмитрия Донского с Мамаем, не Ледовое побоище и не стояние на Угре.', 'Куликовская битва была в 1380 году.'],
  ['history', 'hard', 'В каком году в России отменили крепостное право?', ['в 1861 году', 'в 1801 году', 'в 1905 году', 'в 1762 году', 'в 1812 году'], 0, 'Это реформа Александра II.', 'Крепостное право отменили в 1861 году.'],
  ['science', 'easy', 'Химическая формула воды.', ['H2O', 'CO2', 'NaCl', 'O2', 'H2SO4'], 0, 'В формуле есть водород и кислород.', 'Формула воды - H2O.'],
  ['science', 'easy', 'Ближайшая к Солнцу планета.', ['Меркурий', 'Венера', 'Земля', 'Марс', 'Юпитер'], 0, 'Это не самая яркая планета на небе и не наша собственная.', 'Ближе всех к Солнцу стоит Меркурий.'],
  ['science', 'medium', 'Сколько планет в Солнечной системе?', ['8', '9', '7', '10', '12'], 0, 'Плутон больше не считают планетой этой системы.', 'Планет восемь, Плутон относят к карликовым.'],
  ['science', 'hard', 'Единица силы в СИ.', ['ньютон', 'джоуль', 'паскаль', 'ватт', 'генри'], 0, 'Ее называют по фамилии автора законов механики.', 'Единица силы - ньютон.'],
  ['culture', 'easy', 'Кто написал роман "Война и мир"?', ['Толстой', 'Достоевский', 'Тургенев', 'Гоголь', 'Чехов'], 0, 'Автор также написал "Анну Каренину".', 'Роман написал Лев Толстой.'],
  ['culture', 'easy', 'Кто написал "Евгения Онегина"?', ['Пушкин', 'Лермонтов', 'Грибоедов', 'Жуковский', 'Крылов'], 0, 'Это роман в стихах.', 'Евгения Онегина написал Александр Пушкин.'],
  ['culture', 'medium', 'Кто написал картину "Черный квадрат"?', ['Малевич', 'Кандинский', 'Шагал', 'Репин', 'Айвазовский'], 0, 'Художник русского авангарда, не передвижник.', 'Черный квадрат написал Казимир Малевич.'],
  ['economy', 'easy', 'Валюта Японии.', ['иена', 'юань', 'вон', 'рупия', 'бат'], 0, 'Ее не путают с валютой Китая.', 'Валюта Японии - иена.'],
  ['economy', 'medium', 'Валюта Великобритании.', ['фунт стерлингов', 'евро', 'крона', 'франк', 'доллар'], 0, 'Страна не перешла на общую европейскую валюту.', 'Валюта Великобритании - фунт стерлингов.'],
  ['economy', 'hard', 'Валюта Китая.', ['юань', 'иена', 'вон', 'рупия', 'доллар'], 0, 'Это валюта КНР, не соседней островной страны.', 'Валюта Китая - юань.'],
  ['nature', 'easy', 'Самое крупное современное млекопитающее.', ['синий кит', 'африканский слон', 'кашалот', 'белый медведь', 'жираф'], 0, 'Оно живет в океане, это не сухопутное животное.', 'Самое крупное млекопитающее - синий кит.'],
  ['nature', 'medium', 'Где в природе живут императорские пингвины?', ['в Антарктиде', 'в Арктике', 'в Гренландии', 'на Аляске', 'в Исландии'], 0, 'Их родина у южного полюса, а не у северного.', 'Императорские пингвины живут в Антарктиде.'],
  ['nature', 'hard', 'Высочайшая вершина Земли.', ['Джомолунгма', 'Аконкагуа', 'Денали', 'Эльбрус', 'Килиманджаро'], 0, 'Она стоит в Гималаях.', 'Высочайшая вершина Земли - Джомолунгма.'],
  ['sport', 'easy', 'Сколько игроков одной команды одновременно на поле в футболе?', ['11', '10', '9', '12', '7'], 0, 'Считайте полевых игроков вместе с вратарем.', 'На поле одиннадцать игроков.'],
  ['sport', 'medium', 'Сколько очков приносит штрафной бросок в баскетболе?', ['1', '2', '3', '4', '5'], 0, 'Это самый дешевый успешный бросок, не бросок из игры и не из-за дуги.', 'Штрафной бросок приносит одно очко.'],
  ['sport', 'medium', 'Через сколько лет повторяются летние Олимпийские игры?', ['4', '2', '3', '5', '6'], 0, 'Между соседними летними Играми один и тот же многолетний промежуток.', 'Летние Игры проводят раз в четыре года.'],
]
for (const [topic, difficulty, text, options, correct, hint, explanation] of facts) {
  add({ scale: 'erudition', type: 'fact', source: 'demo', topic, difficulty, text, options, correct, hint, explanation })
}

const compass = ['север', 'восток', 'юг', 'запад']
const dirIndex = { up: 0, right: 1, down: 2, left: 3 }
const placeIndex = { top: 0, right: 1, bottom: 2, left: 3 }
const placeLabel = { север: 'С', восток: 'В', юг: 'Ю', запад: 'З' }
const schemes = [
  ['easy', 'top', 'север', 'down'],
  ['easy', 'top', 'север', 'left'],
  ['medium', 'top', 'север', 'right'],
  ['medium', 'right', 'восток', 'down'],
  ['hard', 'bottom', 'юг', 'up'],
  ['medium', 'left', 'запад', 'right'],
]
for (const [difficulty, place, label, arrow] of schemes) {
  const answer = compass[(compass.indexOf(label) + dirIndex[arrow] - placeIndex[place] + 8) % 4]
  add({
    scale: 'spatial',
    type: 'spa-scheme',
    source: 'demo',
    difficulty,
    text: 'Куда показывает стрелка?',
    scene: {
      kind: 'scheme',
      parts: [{ type: 'circle' }, { type: 'label', text: placeLabel[label], place }, { type: 'arrow', dir: arrow }],
    },
    options: compass,
    correct: compass.indexOf(answer),
    hint: 'Подпись задает одну сторону света, остальные идут от нее по кругу.',
    explanation: `Подпись отмечает сторону "${label}", стрелка относительно нее показывает ${answer}.`,
  })
}

const faces = ['blank', 'circle', 'triangle', 'square', 'line']
const faceName = { blank: 'пустую грань', circle: 'круг', triangle: 'треугольник', square: 'квадрат', line: 'линию' }
function addNet(difficulty, top, front, right) {
  const layout = [
    [null, top, null, null],
    ['blank', front, right, 'blank'],
    [null, 'blank', null, null],
  ]
  const correct = { front, top, right }
  const wrongs = [
    { front: top, top: front, right },
    { front, top: right, right: top },
    { front: right, top, right: front },
  ].filter((cube, index, list) => JSON.stringify(cube) !== JSON.stringify(correct) && list.findIndex((item) => JSON.stringify(item) === JSON.stringify(cube)) === index)
  while (wrongs.length < 3) {
    wrongs.push({ front: faces[(wrongs.length + 1) % faces.length], top, right: 'line' })
  }
  add({
    scale: 'spatial',
    type: 'spa-net',
    source: 'analog',
    difficulty,
    text: `На каком кубике спереди ${faceName[front]}, а сверху ${faceName[top]}?`,
    scene: { kind: 'net', layout },
    options: [correct, ...wrongs.slice(0, 3)].map((cube) => ({ scene: { kind: 'cube', ...cube } })),
    correct: 0,
    hint: 'На крестовой развертке верхняя клетка становится верхом кубика, центральная - передом, клетка справа от нее - правой гранью.',
    explanation: `Передняя грань развертки - ${faceName[front]}, верхняя - ${faceName[top]}. Верный кубик показывает их так же.`,
  })
}
addNet('hard', 'triangle', 'circle', 'blank')
addNet('medium', 'square', 'line', 'blank')
addNet('hard', 'circle', 'triangle', 'square')

function addTransform(difficulty, mode, sourceCells) {
  const turns = rotationsOf(sourceCells)
  const mirror = mirrored(sourceCells)
  if (mode === 'rotate' && isRotation(mirror, sourceCells)) throw new Error('зеркало совпало с поворотом')
  const correct = mode === 'rotate' ? turns.find((turn) => !sameShape(turn, sourceCells)) : mirror
  if (!correct) throw new Error('нет отличного поворота')
  const wrongs = []
  const seen = new Set([keyOf(correct), keyOf(sourceCells)])
  if (mode === 'rotate') {
    wrongs.push(mirror)
    seen.add(keyOf(mirror))
  }
  for (const turn of turns) {
    if (wrongs.length >= 3) break
    if (seen.has(keyOf(turn))) continue
    wrongs.push(turn)
    seen.add(keyOf(turn))
  }
  while (wrongs.length < 3) {
    const extra = grow(sourceCells.length)
    if (!extra || seen.has(keyOf(extra)) || isRotation(extra, sourceCells) || sameShape(extra, mirror)) continue
    wrongs.push(extra)
    seen.add(keyOf(extra))
  }
  const bounds = (cells) => ({
    cols: Math.max(...cells.map((cell) => cell[0])) + 1,
    rows: Math.max(...cells.map((cell) => cell[1])) + 1,
  })
  const sourceBounds = bounds(sourceCells)
  add({
    scale: 'spatial',
    type: 'spa-transform',
    source: 'analog',
    difficulty,
    text: mode === 'rotate' ? 'Какая фигура получена поворотом образца?' : 'Какая фигура является зеркальным отражением образца?',
    scene: { kind: 'cells', cols: sourceBounds.cols, rows: sourceBounds.rows, filled: sourceCells, mode },
    options: [correct, ...wrongs.slice(0, 3)].map((cells) => {
      const box = bounds(cells)
      return { scene: { kind: 'cells', cols: box.cols, rows: box.rows, filled: cells } }
    }),
    correct: 0,
    hint: mode === 'rotate' ? 'Мысленно поверните образец. Фигура, у которой выступ оказался с другой стороны, получается отражением, а не поворотом.' : 'Отразите образец как в зеркале. Обычный поворот оставляет выступ с той же стороны относительно длинной части.',
    explanation: mode === 'rotate' ? 'Верная фигура совпадает с образцом после поворота. Зеркальный вариант поворотом не получить.' : 'Верная фигура - отражение образца. Остальные получаются поворотом или имеют другую форму.',
  })
}
addTransform('medium', 'rotate', [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 2],
])
addTransform('hard', 'rotate', [
  [0, 1],
  [1, 0],
  [1, 1],
  [2, 0],
])
addTransform('medium', 'mirror', [
  [0, 0],
  [0, 1],
  [0, 2],
  [1, 2],
])

function addTop(difficulty, heights) {
  const flat = heights.flat()
  const wrongs = []
  for (let index = 0; index < flat.length && wrongs.length < 3; index += 1) {
    for (let other = index + 1; other < flat.length && wrongs.length < 3; other += 1) {
      if (flat[index] === flat[other]) continue
      const copy = flat.slice()
      const current = copy[index]
      copy[index] = copy[other]
      copy[other] = current
      const grid = []
      for (let row = 0; row < heights.length; row += 1) {
        grid.push(copy.slice(row * heights[0].length, (row + 1) * heights[0].length))
      }
      wrongs.push(grid)
    }
  }
  add({
    scale: 'spatial',
    type: 'spa-top',
    source: 'analog',
    difficulty,
    text: 'Какой вид сверху верен?',
    scene: { kind: 'stack', heights, view: 'iso' },
    options: [heights, ...wrongs].map((grid) => ({ scene: { kind: 'stack', heights: grid, view: 'top' } })),
    correct: 0,
    hint: 'Число в клетке вида сверху - высота столбика в этой же клетке.',
    explanation: 'Вид сверху повторяет сетку высот без перестановки чисел.',
  })
}
addTop('medium', [
  [1, 3],
  [2, 1],
])
addTop('easy', [
  [2, 2],
  [1, 4],
])
addTop('hard', [
  [1, 2, 1],
  [3, 1, 2],
])

function addCubes(difficulty, heights) {
  const answer = heights.flat().reduce((sum, value) => sum + value, 0)
  const options = [answer, answer - 1, answer + 1, answer + 2].map(String)
  add({
    scale: 'spatial',
    type: 'spa-cubes',
    source: 'analog',
    difficulty,
    text: 'Сколько кубиков в постройке, включая невидимые?',
    scene: { kind: 'stack', heights, view: 'iso' },
    options,
    correct: 0,
    hint: 'Сложите высоты всех столбиков, в том числе тех, что закрыты спереди.',
    explanation: `Сумма высот равна ${answer}.`,
  })
}
addCubes('easy', [
  [2, 1],
  [1, 1],
])
addCubes('medium', [
  [3, 1],
  [2, 2],
])
addCubes('easy', [
  [1, 1],
  [1, 2],
])

function addSpaChart(difficulty, values, text, answer, explanation) {
  add({
    scale: 'spatial',
    type: 'spa-chart',
    source: 'analog',
    difficulty,
    text,
    scene: { kind: 'chart', variant: 'bar', labels: ['1', '2', '3', '4'], values },
    options: ['первый', 'второй', 'третий', 'четвертый'],
    correct: answer,
    hint: 'Сравните высоты столбцов, разницу считать не нужно.',
    explanation,
  })
}
addSpaChart('easy', [4, 9, 6, 2], 'Какой столбец самый высокий?', 1, 'Второй столбец выше остальных.')
addSpaChart('easy', [8, 3, 5, 7], 'Какой столбец самый низкий?', 1, 'Второй столбец ниже остальных.')
addSpaChart('medium', [2, 6, 6, 9], 'Какой столбец самый высокий?', 3, 'Четвертый столбец выше двух одинаковых средних и первого.')

const places = {
  c: [0.5, 0.5],
  tl: [0.32, 0.3],
  tr: [0.68, 0.3],
  bl: [0.32, 0.7],
  br: [0.68, 0.7],
  t: [0.5, 0.28],
  b: [0.5, 0.74],
  l: [0.26, 0.5],
  r: [0.74, 0.5],
}
function element(shape, place, size = 0.34, dir) {
  const point = places[place]
  return { shape, x: point[0], y: point[1], size, ...(dir ? { dir } : {}) }
}
function card(...elements) {
  return { elements }
}
function dots(count) {
  const order = ['c', 'tl', 'br', 'tr', 'bl', 't', 'b', 'l', 'r']
  return card(...Array.from({ length: count }, (_, index) => element('dot', order[index], 0.14)))
}
function cardOption(content) {
  return { scene: { kind: 'card', elements: content.elements } }
}

const matrices = [
  ['medium', [[1, 2, 3], [2, 3, 4], [3, 4, null]], 5, [3, 4, 5, 6], 'Шаг вправо и шаг вниз добавляют одну точку.'],
  ['easy', [[1, 2, 3], [1, 2, 3], [1, 2, null]], 3, [2, 3, 4, 1], 'В каждой строке повторяется один и тот же ряд.'],
  ['medium', [[2, 3, 4], [3, 4, 5], [4, 5, null]], 6, [5, 6, 7, 4], 'Вправо и вниз число точек растет на одну.'],
  ['hard', [[1, 1, 2], [1, 2, 3], [2, 3, null]], 5, [4, 5, 6, 3], 'Третье число строки равно сумме двух предыдущих.'],
  ['easy', [[4, 3, 2], [4, 3, 2], [4, 3, null]], 2, [1, 2, 3, 4], 'Строки одинаковые, в строке число убывает.'],
  ['hard', [[1, 3, 5], [2, 4, 6], [3, 5, null]], 7, [7, 6, 8, 9], 'В строке числа идут через одно, следующая строка начинается на единицу выше.'],
]
for (const [difficulty, grid, answer, choices, reason] of matrices) {
  add({
    scale: 'nonverbal',
    type: 'non-matrix',
    source: 'demo',
    difficulty,
    text: 'Какая карточка стоит в пустой клетке?',
    scene: { kind: 'matrix', cells: grid.map((row) => row.map((value) => (value == null ? null : dots(value)))) },
    options: choices.map((value) => cardOption(dots(value))),
    correct: choices.indexOf(answer),
    hint: 'Проследите, как меняется число точек на один шаг вправо и на один шаг вниз.',
    explanation: `${reason} В пустой клетке ${answer}.`,
  })
}

const odds = [
  ['easy', [card(element('triangle', 'c', 0.46, 'up')), card(element('triangle', 'c', 0.46, 'up')), card(element('triangle', 'c', 0.46, 'up')), card(element('triangle', 'c', 0.46, 'down'))], 3, 'Лишняя карточка - та, где треугольник направлен вниз.'],
  ['easy', [card(element('circle', 'c', 0.4)), card(element('circle', 'c', 0.4)), card(element('circle', 'c', 0.4)), card(element('square', 'c', 0.4))], 3, 'Три карточки с кругом, лишняя - с квадратом.'],
  ['medium', [card(element('diamond', 'c')), card(element('diamond', 'c')), card(element('diamond', 'c')), card(element('dot', 'c', 0.16))], 3, 'Три карточки с ромбом, лишняя - с точкой.'],
  ['medium', [card(element('line', 'c', 0.5)), card(element('line', 'c', 0.5)), card(element('line', 'c', 0.5)), card(element('square', 'c', 0.36))], 3, 'Три карточки с линией, лишняя - с квадратом.'],
  ['hard', [card(element('triangle', 't', 0.36, 'up')), card(element('circle', 't', 0.32)), card(element('square', 't', 0.32)), card(element('diamond', 'b', 0.32))], 3, 'У трех карточек фигура в верхней половине, у лишней - в нижней.'],
  ['easy', [card(element('dot', 'c', 0.16)), card(element('dot', 'tl', 0.16), element('dot', 'br', 0.16)), card(element('dot', 'c', 0.16)), card(element('dot', 'c', 0.16))], 1, 'Три карточки с одной точкой, лишняя - с двумя.'],
]
for (const [difficulty, cards, correct, explanation] of odds) {
  add({
    scale: 'nonverbal',
    type: 'non-odd',
    source: 'demo',
    difficulty,
    text: 'Какая фигура устроена иначе?',
    scene: { kind: 'group', cards },
    options: cards.map((item) => cardOption(item)),
    correct,
    hint: 'Сравните форму, число или положение. Три фигуры устроены одинаково в выбранном признаке.',
    explanation,
  })
}

const sequences = [
  ['easy', [card(element('circle', 'c')), card(element('square', 'c')), card(element('circle', 'c')), card(element('square', 'c'))], [card(element('circle', 'c')), card(element('square', 'c')), card(element('triangle', 'c', 0.42, 'up')), card(element('diamond', 'c'))], 0, 'Фигуры чередуются, следующая - круг.'],
  ['easy', [dots(1), dots(2), dots(3), dots(4)], [dots(5), dots(4), dots(6), dots(3)], 0, 'Число точек растет на одну, дальше пять.'],
  ['medium', [card(element('triangle', 'c', 0.46, 'up')), card(element('triangle', 'c', 0.46, 'down')), card(element('triangle', 'c', 0.46, 'up')), card(element('triangle', 'c', 0.46, 'down'))], [card(element('triangle', 'c', 0.46, 'up')), card(element('triangle', 'c', 0.46, 'down')), card(element('square', 'c')), card(element('circle', 'c'))], 0, 'Направление треугольника чередуется, следующий смотрит вверх.'],
  ['hard', [card(element('square', 'c')), card(element('circle', 'c')), card(element('triangle', 'c', 0.42, 'up')), card(element('square', 'c')), card(element('circle', 'c'))], [card(element('triangle', 'c', 0.42, 'up')), card(element('square', 'c')), card(element('diamond', 'c')), card(element('circle', 'c'))], 0, 'Повторяется тройка фигур, следующая замыкает вторую тройку.'],
]
for (const [difficulty, steps, choices, correct, explanation] of sequences) {
  add({
    scale: 'nonverbal',
    type: 'non-sequence',
    source: 'analog',
    difficulty,
    text: 'Какая фигура продолжает ряд?',
    scene: { kind: 'sequence', steps },
    options: choices.map((item) => cardOption(item)),
    correct,
    hint: 'Найдите повтор или шаг изменения и продолжите его на одну фигуру.',
    explanation,
  })
}

const analogies = [
  ['medium', dots(1), dots(2), card(element('square', 'c', 0.34)), [card(element('square', 'c', 0.28), element('square', 'tr', 0.28)), card(element('square', 'c')), card(element('triangle', 'c', 0.4, 'up'), element('triangle', 'br', 0.4, 'up')), card(element('square', 'tl', 0.24), element('square', 'c', 0.24), element('square', 'br', 0.24))], 0, 'Число фигур удваивается, форма второй пары сохраняется.'],
  ['easy', card(element('circle', 'c', 0.22)), card(element('circle', 'c', 0.48)), card(element('triangle', 'c', 0.24, 'up')), [card(element('triangle', 'c', 0.5, 'up')), card(element('triangle', 'c', 0.24, 'up')), card(element('square', 'c', 0.5)), card(element('circle', 'c', 0.48))], 0, 'Фигура той же формы становится крупнее.'],
  ['medium', card(element('triangle', 'c', 0.46, 'up')), card(element('triangle', 'c', 0.46, 'down')), card(element('square', 't', 0.3)), [card(element('square', 'b', 0.3)), card(element('square', 't', 0.3)), card(element('circle', 'b', 0.3)), card(element('triangle', 'b', 0.4, 'down'))], 0, 'Фигура переходит из верхней половины в нижнюю, форма сохраняется.'],
  ['hard', card(element('circle', 'l', 0.24)), card(element('circle', 'r', 0.24)), card(element('square', 'l', 0.26)), [card(element('square', 'r', 0.26)), card(element('square', 'l', 0.26)), card(element('circle', 'r', 0.24)), card(element('diamond', 'r', 0.26))], 0, 'Фигура смещается к противоположному краю рамки и не меняет форму.'],
]
for (const [difficulty, left, right, given, choices, correct, explanation] of analogies) {
  add({
    scale: 'nonverbal',
    type: 'non-analogy',
    source: 'analog',
    difficulty,
    text: 'Первая фигура относится ко второй, как третья к какой?',
    scene: { kind: 'analogy', pair: [left, right], given },
    options: choices.map((item) => cardOption(item)),
    correct,
    hint: 'Заметьте, что изменилось от первой фигуры ко второй, и повторите это с третьей.',
    explanation,
  })
}

const groups = [
  ['medium', [card(element('triangle', 't', 0.36, 'up')), card(element('circle', 't', 0.3)), card(element('square', 't', 0.3))], [card(element('diamond', 't', 0.3)), card(element('diamond', 'b', 0.3)), card(), card(element('dot', 't', 0.12), element('dot', 'b', 0.12))], 0, 'У карточек группы элемент в верхней половине, верный вариант устроен так же.'],
  ['easy', [card(element('circle', 'c', 0.42)), card(element('circle', 'tl', 0.28)), card(element('circle', 'br', 0.24))], [card(element('circle', 'c', 0.3)), card(element('square', 'c')), card(element('triangle', 'c', 0.42, 'up')), card()], 0, 'Общий признак - круг. Верный вариант тоже содержит только круг.'],
  ['medium', [dots(1), dots(1), dots(1)], [dots(1), dots(2), card(element('square', 'c')), card()], 0, 'В группе ровно одна точка. Верный вариант сохраняет это число.'],
  ['hard', [card(element('triangle', 'c', 0.46, 'up')), card(element('triangle', 'tl', 0.36, 'up')), card(element('triangle', 'br', 0.36, 'up'))], [card(element('triangle', 'c', 0.4, 'up')), card(element('triangle', 'c', 0.4, 'down')), card(element('circle', 'c')), card(element('triangle', 't', 0.3, 'up'), element('triangle', 'b', 0.3, 'up'))], 0, 'В группе один треугольник смотрит вверх. Верный вариант повторяет и число, и направление.'],
]
for (const [difficulty, cards, choices, correct, explanation] of groups) {
  add({
    scale: 'nonverbal',
    type: 'non-group',
    source: 'analog',
    difficulty,
    text: 'Какая фигура подходит к группе?',
    scene: { kind: 'group', cards },
    options: choices.map((item) => cardOption(item)),
    correct,
    hint: 'Общий признак может быть положением, формой или числом элементов, а не случайной деталью одной карточки.',
    explanation,
  })
}

const sets = [
  ['easy', 'Какой предмет относится к множеству "скрипка, виолончель, альт"?', ['контрабас', 'флейта', 'барабан', 'труба'], 0, 'Все слова множества называют инструменты одного способа игры.', 'Это смычковые струнные, остальные - другие группы инструментов.'],
  ['easy', 'Какой предмет относится к множеству "дуб, береза, клен"?', ['липа', 'роза', 'пшеница', 'мох'], 0, 'Все слова множества называют растения одного вида.', 'Это деревья, липа тоже дерево.'],
  ['medium', 'Какой предмет относится к множеству "килограмм, грамм, тонна"?', ['центнер', 'метр', 'литр', 'секунда'], 0, 'Слова множества называют единицы одной величины.', 'Это единицы массы, центнер тоже единица массы.'],
  ['medium', 'Какой предмет относится к множеству "январь, март, май"?', ['июль', 'вторник', 'утро', 'весна'], 0, 'Слова множества называют отрезки одного календаря.', 'Это месяцы, июль тоже месяц.'],
  ['hard', 'Какой предмет относится к множеству "медь, железо, алюминий"?', ['цинк', 'вода', 'уголь', 'стекло'], 0, 'Слова множества называют вещества одного класса.', 'Это металлы, цинк тоже металл.'],
  ['easy', 'Какой предмет относится к множеству "Москва, Казань, Омск"?', ['Тула', 'Волга', 'Урал', 'Байкал'], 0, 'Слова множества называют населенные пункты, а не реки и горы.', 'Тула - город, как и остальные слова множества.'],
]
for (const [difficulty, text, options, correct, hint, explanation] of sets) {
  add({ scale: 'verbal', type: 'ver-set', source: 'demo', difficulty, text, options, correct, hint, explanation })
}

const inferences = [
  ['medium', 'Все архивисты музея знают латынь. Все переводчики музея - архивисты.', 'Какой вывод следует из текста?', ['Все переводчики музея знают латынь.', 'Все, кто знает латынь, - архивисты.', 'Все сотрудники музея знают латынь.', 'Некоторые переводчики музея не знают латынь.'], 0, 'Проверьте, входит ли группа из второй фразы в группу из первой. Обратное включение из текста не следует.', 'Переводчики входят в архивистов, архивисты знают латынь, значит переводчики знают латынь.'],
  ['easy', 'Все березы - деревья. Это растение - береза.', 'Какой вывод следует из текста?', ['Это растение - дерево.', 'Все деревья - березы.', 'Это растение - дуб.', 'Некоторые березы не деревья.'], 0, 'Частный предмет наследует свойство всей своей группы.', 'Раз это береза, а все березы - деревья, это растение - дерево.'],
  ['medium', 'Ни один пингвин в этом зоопарке не живет в теплом павильоне. Кеша - пингвин этого зоопарка.', 'Какой вывод следует из текста?', ['Кеша не живет в теплом павильоне.', 'Все обитатели зоопарка не живут в теплом павильоне.', 'Кеша живет в теплом павильоне.', 'Все, кто не живет в теплом павильоне, - пингвины.'], 0, 'Свойство всей группы переходит к названному члену этой группы.', 'Кеша входит в группу пингвинов зоопарка, поэтому теплый павильон ему не подходит.'],
  ['hard', 'Все рейсы этой авиакомпании утренние. Рейс 17 принадлежит этой авиакомпании.', 'Какой вывод следует из текста?', ['Рейс 17 утренний.', 'Все утренние рейсы принадлежат этой авиакомпании.', 'Рейс 17 вечерний.', 'У этой авиакомпании нет утренних рейсов.'], 0, 'Номер рейса не меняет правило, если рейс входит в названную компанию.', 'Рейс 17 входит в компанию, у которой все рейсы утренние.'],
  ['medium', 'Все экспонаты витрины - монеты. Этот предмет стоит в витрине.', 'Какой вывод следует из текста?', ['Этот предмет - монета.', 'Все монеты стоят в витрине.', 'Этот предмет - марка.', 'В витрине есть экспонат, который не монета.'], 0, 'Место предмета включает его в группу, о которой сказано "все".', 'Предмет из витрины входит в экспонаты, а все они монеты.'],
  ['hard', 'Каждый чертеж в папке подписан. Этот лист - чертеж из папки.', 'Какой вывод следует из текста?', ['Этот лист подписан.', 'Каждый подписанный лист лежит в папке.', 'Этот лист без подписи.', 'В папке есть неподписанный чертеж.'], 0, 'Слово "каждый" относит признак ко всем членам группы, включая названный лист.', 'Лист входит в чертежи папки, а каждый из них подписан.'],
]
for (const [difficulty, passage, question, options, correct, hint, explanation] of inferences) {
  add({ scale: 'verbal', type: 'ver-inference', source: 'demo', difficulty, text: `${passage} ${question}`, options, correct, hint, explanation })
}

const verbalAnalogies = [
  ['easy', 'Холод относится к жаре, как день к ...', ['ночи', 'солнцу', 'утру', 'лету'], 0, 'Отношение в первой паре - противоположность. Во второй паре ищите то же отношение.', 'Во второй паре тоже противоположность.'],
  ['easy', 'Кисть относится к художнику, как молоток к ...', ['столяру', 'гвоздю', 'картине', 'краске'], 0, 'Первое слово - инструмент, второе - тот, кто им работает.', 'Молоток - инструмент столяра, как кисть - инструмент художника.'],
  ['medium', 'Глава относится к книге, как акт к ...', ['пьесе', 'театру', 'актеру', 'странице'], 0, 'Первое слово - часть целого, названного вторым.', 'Акт - часть пьесы, как глава - часть книги.'],
]
for (const [difficulty, text, options, correct, hint, explanation] of verbalAnalogies) {
  add({ scale: 'verbal', type: 'ver-analogy', source: 'analog', difficulty, text, options, correct, hint, explanation })
}

const generals = [
  ['easy', 'Найдите общее для слов "дуб" и "береза".', ['деревья', 'цветы', 'кустарники', 'травы'], 0, 'Оба слова называют растения одного вида. Выберите имя этой группы.', 'Дуб и береза - деревья.'],
  ['easy', 'Найдите общее для слов "скрипка" и "виолончель".', ['струнные инструменты', 'ударные инструменты', 'клавишные инструменты', 'духовые инструменты'], 0, 'Оба слова называют инструменты одного способа звука.', 'Скрипка и виолончель - струнные инструменты.'],
  ['medium', 'Найдите общее для слов "Москва" и "Казань".', ['города', 'реки', 'страны', 'моря'], 0, 'Оба слова называют населенные пункты одного типа.', 'Москва и Казань - города.'],
]
for (const [difficulty, text, options, correct, hint, explanation] of generals) {
  add({ scale: 'verbal', type: 'ver-general', source: 'analog', difficulty, text, options, correct, hint, explanation })
}

const syllogisms = [
  ['hard', 'Ни один пингвин не умеет летать. Некоторые птицы - пингвины.', ['Некоторые птицы не умеют летать.', 'Ни одна птица не умеет летать.', 'Все птицы - пингвины.', 'Некоторые пингвины умеют летать.'], 0, 'Частный случай наследует свойство всей своей группы. Вывод про всех членов более широкой группы не следует.', 'Пингвины - часть птиц и летать не умеют, значит часть птиц не летает.'],
  ['medium', 'Все архивисты знают латынь. Некоторые сотрудники - архивисты.', ['Некоторые сотрудники знают латынь.', 'Все сотрудники знают латынь.', 'Все, кто знает латынь, - сотрудники.', 'Ни один сотрудник не знает латынь.'], 0, 'Свойство всей узкой группы переходит хотя бы к тем, кто в нее входит.', 'Часть сотрудников - архивисты, а все архивисты знают латынь.'],
  ['hard', 'Ни одна река этого списка не впадает в озеро. Некоторые водоемы списка - реки.', ['Некоторые водоемы списка не впадают в озеро.', 'Ни один водоем списка не впадает в озеро.', 'Все водоемы списка - реки.', 'Некоторые реки списка впадают в озеро.'], 0, 'Запрет для всей группы рек сохраняется у тех водоемов, которые являются этими реками.', 'Часть водоемов - реки, а ни одна такая река не впадает в озеро.'],
]
for (const [difficulty, text, options, correct, hint, explanation] of syllogisms) {
  add({
    scale: 'verbal',
    type: 'ver-syllogism',
    source: 'analog',
    difficulty,
    text: `${text} Какой вывод верен?`,
    options,
    correct,
    hint,
    explanation,
  })
}

const follows = [
  ['medium', 'В офисе три принтера. Два из них цветные. Цветные принтеры стоят у окна.', ['Хотя бы один принтер стоит у окна.', 'Все принтеры стоят у окна.', 'Третий принтер цветной.', 'У окна нет принтеров.'], 0, 'Отделите то, что сказано про часть предметов, от вывода про все предметы.', 'Два цветных стоят у окна, значит у окна есть хотя бы один.'],
  ['easy', 'В корзине 5 яблок. 2 из них зеленые.', ['В корзине есть зеленое яблоко.', 'Все яблоки зеленые.', 'В корзине нет зеленых яблок.', 'Зеленых яблок больше, чем остальных.'], 0, 'Число больше нуля уже позволяет утверждать, что такой предмет есть.', 'Два зеленых яблока лежат в корзине, значит зеленое яблоко там есть.'],
  ['hard', 'На полке 6 книг. Некоторые из них на английском. Все английские книги стоят слева.', ['Слева стоит хотя бы одна книга.', 'Все книги стоят слева.', 'Все книги на английском.', 'Слева нет книг.'], 0, 'Слово "некоторые" гарантирует непустую часть, но не распространяет признак на все книги.', 'Английские книги есть, и все они слева, значит слева есть книга.'],
]
for (const [difficulty, text, options, correct, hint, explanation] of follows) {
  add({ scale: 'verbal', type: 'ver-follows', source: 'analog', difficulty, text: `${text} Что из этого следует?`, options, correct, hint, explanation })
}

const orders = [
  ['medium', 'Анна старше Бориса. Борис старше Веры. Вера старше Глеба. Кто самый старший?', ['Анна', 'Борис', 'Вера', 'Глеб'], 0, 'Выпишите цепочку от старшего к младшему по каждой следующей фразе.', 'Анна старше Бориса, а Борис старше остальных, значит Анна старше всех.'],
  ['easy', 'Кот больше щенка. Щенок больше хомяка. Кто самый маленький?', ['хомяк', 'кот', 'щенок', 'никто'], 0, 'Каждая следующая фраза называет еще меньшего.', 'Хомяк меньше щенка, а щенок меньше кота.'],
  ['hard', 'Дом левее башни. Башня левее моста. Мост левее сарая. Что стоит правее всех?', ['сарай', 'дом', 'башня', 'мост'], 0, 'Соберите ряд слева направо и посмотрите на конец ряда.', 'Сарай правее моста, а мост правее остальных названных объектов.'],
]
for (const [difficulty, text, options, correct, hint, explanation] of orders) {
  add({ scale: 'verbal', type: 'ver-order', source: 'analog', difficulty, text, options, correct, hint, explanation })
}

function addCount(difficulty, rows, kind) {
  const flat = rows.flat()
  const answer =
    kind === 'odd' ? flat.filter((value) => value % 2 === 1).length : flat.filter((value) => value > kind).length
  const options = [answer, answer - 1, answer + 1, answer + 2, answer - 2].filter((value) => value >= 0)
  const unique = [...new Set(options)].slice(0, 5)
  while (unique.length < 5) unique.push(answer + unique.length + 3)
  const question = kind === 'odd' ? 'Сколько нечетных чисел в строках?' : `Сколько чисел больше ${kind}?`
  add({
    scale: 'attention',
    type: 'att-count',
    source: 'demo',
    difficulty,
    text: `${question}\n${rows.map((row) => row.join(' ')).join('\n')}`,
    options: unique.map(String),
    correct: unique.indexOf(answer),
    hint: kind === 'odd' ? 'Идите по строкам и отмечайте числа, которые не делятся на два.' : 'Идите по строкам и отмечайте только числа строго больше названного порога.',
    explanation: kind === 'odd' ? `Нечетных чисел ${answer}.` : `Чисел больше порога ${answer}.`,
  })
}
addCount('medium', [
  [12, 7, 18, 3, 40],
  [9, 22, 15, 6, 11],
  [8, 4, 13, 30, 2],
], 'odd')
addCount('easy', [
  [2, 4, 6],
  [1, 8, 3],
  [10, 5, 12],
], 'odd')
addCount('hard', [
  [14, 21, 8, 33],
  [16, 19, 40, 7],
  [2, 25, 18, 11],
  [6, 9, 28, 15],
], 'odd')
addCount('easy', [
  [3, 8, 10],
  [1, 4, 12],
  [6, 2, 9],
], 5)
addCount('medium', [
  [11, 20, 4, 18],
  [15, 7, 30, 2],
  [16, 19, 5, 22],
], 10)
addCount('hard', [
  [25, 40, 12, 33],
  [18, 50, 27, 8],
  [41, 16, 29, 36],
], 20)

function cycleLine(pattern, times) {
  return pattern.repeat(times)
}
function breakLine(pattern, times) {
  const chars = [...cycleLine(pattern, times)]
  const index = pattern.length * 2
  const current = chars[index]
  chars[index] = current === '9' ? '8' : String(Number(current) + 1)
  return chars.join('')
}
const cycles = [
  ['medium', '246', '135', '808', '919', '472'],
  ['easy', '121', '343', '565', '787', '909'],
  ['medium', '314', '628', '707', '151', '262'],
  ['hard', '482', '593', '160', '271', '384'],
  ['easy', '101', '202', '303', '404', '505'],
  ['hard', '675', '786', '213', '324', '435'],
]
for (const [difficulty, ...patterns] of cycles) {
  const lines = patterns.map((pattern, index) => (index === 0 ? breakLine(pattern, 5) : cycleLine(pattern, 5)))
  add({
    scale: 'attention',
    type: 'att-cycle',
    source: 'demo',
    difficulty,
    text: 'В какой строке цикл сбит?',
    options: lines,
    correct: 0,
    hint: 'В каждой строке найдите короткий повторяющийся кусок и проверьте, не сбился ли он.',
    explanation: 'В верной строке один повтор заменен соседней цифрой, остальные строки держат свой повтор.',
  })
}

const diffs = [
  ['easy', 'Петров П.П., ул. Речная, д. 14, кв. 8', 'Петров П.П., ул. Речная, д. 14, кв. 3', 'квартира', 'Фамилия, улица и дом совпадают. Расходится номер квартиры.'],
  ['medium', 'Иванова А.С., ул. Лесная, д. 7, кв. 2', 'Иванова А.С., ул. Луговая, д. 7, кв. 2', 'улица', 'Фамилия, дом и квартира совпадают. Расходится улица.'],
  ['easy', 'Сидоров И.И., ул. Садовая, д. 3, кв. 11', 'Сидоров И.И., ул. Садовая, д. 3, кв. 11', 'нет расхождений', 'Все четыре поля двух записей совпадают.'],
]
for (const [difficulty, left, right, answer, explanation] of diffs) {
  const options = ['фамилия', 'улица', 'дом', 'квартира', 'нет расхождений']
  add({
    scale: 'attention',
    type: 'att-diff',
    source: 'analog',
    difficulty,
    text: `${left}\n${right}`,
    options,
    correct: options.indexOf(answer),
    hint: 'Сверяйте две записи по одинаковым частям слева направо.',
    explanation,
  })
}

const typos = [
  ['easy', 'Заказчик обязуется аплатить документ вовремя.', ['заказчик', 'обязуется', 'аплатить', 'документ', 'вовремя'], 2, 'оплатить'],
  ['medium', 'Секретарь отправляет атчет в архив.', ['секретарь', 'отправляет', 'атчет', 'в', 'архив'], 2, 'отчет'],
  ['easy', 'Курьер привез пакет вофис сегодня.', ['курьер', 'привез', 'пакет', 'вофис', 'сегодня'], 3, 'в офис'],
]
for (const [difficulty, text, options, correct, right] of typos) {
  add({
    scale: 'attention',
    type: 'att-typo',
    source: 'analog',
    difficulty,
    text,
    options,
    correct,
    hint: 'Прочитайте каждое слово отдельно и проверьте буквы.',
    explanation: `Нужно "${right}".`,
  })
}

function addSymbol(difficulty, source, digit) {
  const answer = [...source].filter((char) => char === digit).length
  const unique = [...new Set([answer, answer - 1, answer + 1, answer + 2, answer - 2])].filter((value) => value >= 0).slice(0, 5)
  while (unique.length < 5) unique.push(answer + unique.length + 2)
  add({
    scale: 'attention',
    type: 'att-symbol',
    source: 'analog',
    difficulty,
    text: `Сколько раз встречается цифра ${digit}: ${source}`,
    options: unique.map(String),
    correct: unique.indexOf(answer),
    hint: 'Считайте только заданную цифру в каждой группе, затем сложите.',
    explanation: `Цифра встречается ${answer} раз.`,
  })
}
addSymbol('medium', '717 177 717 771 177', '7')
addSymbol('easy', '202 220 202', '2')
addSymbol('hard', '353 335 533 353 535', '3')

function mutate(sample, index) {
  const chars = [...sample]
  chars[index] = chars[index] === '9' ? '8' : String(Number(chars[index]) + 1)
  return chars.join('')
}
const matches = [
  ['easy', '48291'],
  ['medium', '73064'],
  ['hard', '15928'],
]
for (const [difficulty, sample] of matches) {
  const options = [sample, mutate(sample, 1), mutate(sample, 2), mutate(sample, 3), mutate(sample, 4)]
  add({
    scale: 'attention',
    type: 'att-match',
    source: 'analog',
    difficulty,
    text: `Какая строка совпадает с образцом ${sample}?`,
    options,
    correct: 0,
    hint: 'Сверьте образец с каждой строкой по знакам. Совпадение должно быть полным.',
    explanation: 'Одна строка совпадает с образцом целиком, в остальных изменен один знак.',
  })
}

const demoMinimum = {
  calculation: ['calc-story', 'calc-grid'],
  vocabulary: ['voc-anagram', 'voc-spelling'],
  spatial: ['spa-scheme', 'spa-assembly'],
  nonverbal: ['non-matrix', 'non-odd'],
  verbal: ['ver-set', 'ver-inference'],
  attention: ['att-count', 'att-cycle'],
}
const analogMinimum = {
  calculation: ['calc-series', 'calc-share', 'calc-motion', 'calc-estimate', 'calc-chart'],
  vocabulary: ['voc-synonym', 'voc-meaning', 'voc-odd-word', 'voc-letter', 'voc-paronym'],
  spatial: ['spa-net', 'spa-transform', 'spa-top', 'spa-chart', 'spa-cubes'],
  nonverbal: ['non-sequence', 'non-analogy', 'non-group'],
  verbal: ['ver-analogy', 'ver-general', 'ver-syllogism', 'ver-follows', 'ver-order'],
  attention: ['att-diff', 'att-typo', 'att-symbol', 'att-match'],
}
const topics = ['geography', 'history', 'science', 'culture', 'economy', 'nature', 'sport']
const names = {
  calculation: 'Вычисления',
  vocabulary: 'Лексика',
  erudition: 'Эрудиция',
  spatial: 'Пространственное мышление',
  nonverbal: 'Невербальная логика',
  verbal: 'Вербальная логика',
  attention: 'Внимание',
}

const issues = []
const ids = new Set()
for (const [scale, items] of Object.entries(bank)) {
  if (items.length < 24) issues.push(`${names[scale]}: ${items.length} < 24`)
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const count = items.filter((item) => item.difficulty === difficulty).length
    if (count < 4) issues.push(`${names[scale]} ${difficulty}: ${count}`)
  }
  if (scale === 'erudition') {
    for (const topic of topics) {
      const count = items.filter((item) => item.topic === topic).length
      if (count < 3) issues.push(`topic ${topic}: ${count}`)
    }
  } else {
    for (const type of demoMinimum[scale]) {
      const count = items.filter((item) => item.type === type).length
      if (count < 6) issues.push(`${type}: ${count}`)
    }
    for (const type of analogMinimum[scale]) {
      const count = items.filter((item) => item.type === type).length
      if (count < 3) issues.push(`${type}: ${count}`)
    }
  }
  for (const item of items) {
    if (ids.has(item.id)) issues.push(`dup ${item.id}`)
    ids.add(item.id)
    if (!item.hint.trim() || !item.explanation.trim()) issues.push(`empty text ${item.id}`)
  }
}
if (issues.length > 0) {
  console.error(issues.join('\n'))
  process.exit(1)
}

const dataDir = join(root, 'data')
mkdirSync(dataDir, { recursive: true })
for (const [scale, items] of Object.entries(bank)) {
  writeFileSync(join(dataDir, `${scale}.json`), `${JSON.stringify(items, null, 2)}\n`, 'utf8')
}
const summary = Object.entries(bank)
  .map(([scale, items]) => `${scale}:${items.length}`)
  .join(' ')
console.log(summary)
