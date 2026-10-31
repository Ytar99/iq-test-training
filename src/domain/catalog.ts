import type { ScaleId } from './types.ts'

export type ScaleInfo = {
  id: ScaleId
  name: string
  instruction: string
  itemSec: number
  blockSec: number
  optionCount: number
  demo: readonly string[]
  analog: readonly string[]
  scenes: readonly string[]
}

export const SCALES: Record<ScaleId, ScaleInfo> = {
  calculation: {
    id: 'calculation',
    name: 'Вычисления',
    instruction: 'Блок тренирует счет в уме и решение коротких математических задач.',
    itemSec: 70,
    blockSec: 540,
    optionCount: 4,
    demo: ['calc-story', 'calc-grid'],
    analog: ['calc-series', 'calc-share', 'calc-motion', 'calc-estimate', 'calc-chart'],
    scenes: ['chart', 'table'],
  },
  vocabulary: {
    id: 'vocabulary',
    name: 'Лексика',
    instruction: 'Блок тренирует запас слов и точность письменной формы.',
    itemSec: 60,
    blockSec: 480,
    optionCount: 5,
    demo: ['voc-anagram', 'voc-spelling'],
    analog: ['voc-synonym', 'voc-meaning', 'voc-odd-word', 'voc-letter', 'voc-paronym'],
    scenes: [],
  },
  erudition: {
    id: 'erudition',
    name: 'Эрудиция',
    instruction: 'Блок тренирует осведомленность в разных областях.',
    itemSec: 50,
    blockSec: 300,
    optionCount: 5,
    demo: ['fact'],
    analog: [],
    scenes: [],
  },
  spatial: {
    id: 'spatial',
    name: 'Пространственное мышление',
    instruction: 'Блок тренирует работу с фигурами, схемами и чертежами.',
    itemSec: 70,
    blockSec: 540,
    optionCount: 4,
    demo: ['spa-scheme', 'spa-assembly'],
    analog: ['spa-net', 'spa-transform', 'spa-top', 'spa-chart', 'spa-cubes'],
    scenes: ['scheme', 'cells', 'net', 'cube', 'chart', 'table', 'stack'],
  },
  nonverbal: {
    id: 'nonverbal',
    name: 'Невербальная логика',
    instruction: 'Блок тренирует закономерности в фигурах.',
    itemSec: 70,
    blockSec: 540,
    optionCount: 4,
    demo: ['non-matrix', 'non-odd'],
    analog: ['non-sequence', 'non-analogy', 'non-group'],
    scenes: ['card', 'matrix', 'sequence', 'analogy', 'group'],
  },
  verbal: {
    id: 'verbal',
    name: 'Вербальная логика',
    instruction: 'Блок тренирует выводы из текста и отношений между понятиями.',
    itemSec: 70,
    blockSec: 540,
    optionCount: 4,
    demo: ['ver-set', 'ver-inference'],
    analog: ['ver-analogy', 'ver-general', 'ver-syllogism', 'ver-follows', 'ver-order'],
    scenes: [],
  },
  attention: {
    id: 'attention',
    name: 'Внимание',
    instruction: 'Блок тренирует точность и устойчивость при однообразной сверке.',
    itemSec: 70,
    blockSec: 540,
    optionCount: 5,
    demo: ['att-count', 'att-cycle'],
    analog: ['att-diff', 'att-typo', 'att-symbol', 'att-match'],
    scenes: [],
  },
}

export const TYPE_LABEL: Record<string, string> = {
  'calc-story': 'Текстовая задача',
  'calc-grid': 'Сетка чисел',
  'calc-series': 'Числовой ряд',
  'calc-share': 'Доля',
  'calc-motion': 'Скорость и путь',
  'calc-estimate': 'Прикидка',
  'calc-chart': 'График и таблица',
  'voc-anagram': 'Анаграмма',
  'voc-spelling': 'Написание',
  'voc-synonym': 'Синоним и антоним',
  'voc-meaning': 'Значение слова',
  'voc-odd-word': 'Лишнее слово',
  'voc-letter': 'Пропущенная буква',
  'voc-paronym': 'Пароним',
  fact: 'Факт',
  'spa-scheme': 'Схема',
  'spa-assembly': 'Сборка',
  'spa-net': 'Развертка',
  'spa-transform': 'Поворот и отражение',
  'spa-top': 'Вид сверху',
  'spa-chart': 'Чтение схемы',
  'spa-cubes': 'Число кубиков',
  'non-matrix': 'Матрица',
  'non-odd': 'Лишняя фигура',
  'non-sequence': 'Ряд фигур',
  'non-analogy': 'Аналогия фигур',
  'non-group': 'Общий признак',
  'ver-set': 'Множество',
  'ver-inference': 'Вывод из текста',
  'ver-analogy': 'Аналогия',
  'ver-general': 'Общее название',
  'ver-syllogism': 'Кванторы',
  'ver-follows': 'Следствие',
  'ver-order': 'Порядок',
  'att-count': 'Подсчет',
  'att-cycle': 'Цикл',
  'att-diff': 'Расхождение',
  'att-typo': 'Опечатка',
  'att-symbol': 'Символ',
  'att-match': 'Совпадение',
}

export function typeSource(scale: ScaleId, type: string): 'demo' | 'analog' | null {
  const info = SCALES[scale]
  if (info.demo.includes(type)) return 'demo'
  if (info.analog.includes(type)) return 'analog'
  return null
}
