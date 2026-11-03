import type { ScaleId } from "./types.ts";

export type ScaleForm = {
  type: string;
  quota: number;
};

export type ScaleInfo = {
  id: ScaleId;
  name: string;
  instruction: string;
  itemSec: number;
  blockSec: number;
  optionCount: number;
  forms: readonly ScaleForm[];
  scenes: readonly string[];
};

export const SCALES: Record<ScaleId, ScaleInfo> = {
  calculation: {
    id: "calculation",
    name: "Вычисления",
    instruction: "Блок тренирует счет в уме и решение коротких математических задач.",
    itemSec: 70,
    blockSec: 540,
    optionCount: 4,
    forms: [
      { type: "calc-story", quota: 2 },
      { type: "calc-series", quota: 1 },
      { type: "calc-grid", quota: 2 },
      { type: "calc-chart", quota: 2 },
      { type: "calc-share", quota: 1 },
      { type: "calc-signs", quota: 1 },
      { type: "calc-odd-pair", quota: 1 },
      { type: "calc-divisor", quota: 1 },
      { type: "calc-shelf", quota: 1 },
    ],
    scenes: ["chart", "table", "shelf"],
  },
  vocabulary: {
    id: "vocabulary",
    name: "Лексика",
    instruction: "Блок тренирует запас слов и точность письменной формы.",
    itemSec: 60,
    blockSec: 480,
    optionCount: 5,
    forms: [
      { type: "voc-meaning", quota: 2 },
      { type: "voc-odd-word", quota: 2 },
      { type: "voc-spelling", quota: 3 },
      { type: "voc-paronym", quota: 2 },
      { type: "voc-anagram", quota: 3 },
    ],
    scenes: [],
  },
  erudition: {
    id: "erudition",
    name: "Эрудиция",
    instruction: "Блок тренирует осведомленность в разных областях.",
    itemSec: 50,
    blockSec: 300,
    optionCount: 5,
    forms: [{ type: "fact", quota: 12 }],
    scenes: [],
  },
  spatial: {
    id: "spatial",
    name: "Пространственное мышление",
    instruction: "Блок тренирует работу с фигурами, схемами и чертежами.",
    itemSec: 70,
    blockSec: 540,
    optionCount: 4,
    forms: [
      { type: "spa-assembly", quota: 2 },
      { type: "spa-net", quota: 2 },
      { type: "spa-transform", quota: 2 },
      { type: "spa-top", quota: 2 },
      { type: "spa-cubes", quota: 2 },
      { type: "spa-compass", quota: 2 },
    ],
    scenes: ["cells", "net", "cube", "stack", "compass"],
  },
  nonverbal: {
    id: "nonverbal",
    name: "Невербальная логика",
    instruction: "Блок тренирует закономерности в фигурах.",
    itemSec: 70,
    blockSec: 540,
    optionCount: 4,
    forms: [
      { type: "non-matrix", quota: 4 },
      { type: "non-odd", quota: 2 },
      { type: "non-sequence", quota: 2 },
      { type: "non-analogy", quota: 2 },
      { type: "non-group", quota: 2 },
    ],
    scenes: ["card", "matrix", "sequence", "analogy", "group"],
  },
  verbal: {
    id: "verbal",
    name: "Вербальная логика",
    instruction: "Блок тренирует выводы из текста и отношений между понятиями.",
    itemSec: 70,
    blockSec: 540,
    optionCount: 4,
    forms: [
      { type: "ver-inference", quota: 4 },
      { type: "ver-analogy", quota: 2 },
      { type: "ver-general", quota: 2 },
      { type: "ver-order", quota: 2 },
      { type: "ver-set", quota: 2 },
    ],
    scenes: [],
  },
  attention: {
    id: "attention",
    name: "Внимание",
    instruction: "Блок тренирует точность и устойчивость при однообразной сверке.",
    itemSec: 70,
    blockSec: 540,
    optionCount: 5,
    forms: [
      { type: "att-count", quota: 3 },
      { type: "att-symbol", quota: 2 },
      { type: "att-match", quota: 2 },
      { type: "att-typo", quota: 2 },
      { type: "att-diff", quota: 1 },
      { type: "att-cycle", quota: 2 },
    ],
    scenes: [],
  },
};

export const TYPE_LABEL: Record<string, string> = {
  "calc-story": "Текстовая задача",
  "calc-series": "Числовой ряд",
  "calc-grid": "Числовая решетка",
  "calc-chart": "График и таблица",
  "calc-share": "Доли целого",
  "calc-signs": "Арифметические знаки",
  "calc-odd-pair": "Лишняя пара",
  "calc-divisor": "Общий делитель",
  "calc-shelf": "Полка",
  "voc-meaning": "Значение слова",
  "voc-odd-word": "Лишнее слово",
  "voc-spelling": "Написание",
  "voc-paronym": "Пароним",
  "voc-anagram": "Анаграмма",
  fact: "Факт",
  "spa-assembly": "Сборка",
  "spa-net": "Развертка",
  "spa-transform": "Поворот и отражение",
  "spa-top": "Вид сверху",
  "spa-cubes": "Число кубиков",
  "spa-compass": "Компас",
  "non-matrix": "Матрица",
  "non-odd": "Лишняя фигура",
  "non-sequence": "Ряд фигур",
  "non-analogy": "Аналогия фигур",
  "non-group": "Общий признак",
  "ver-inference": "Вывод из текста",
  "ver-analogy": "Аналогия",
  "ver-general": "Общее название",
  "ver-order": "Порядок",
  "ver-set": "Множество",
  "att-count": "Подсчет",
  "att-symbol": "Символ",
  "att-match": "Совпадение",
  "att-typo": "Опечатка",
  "att-diff": "Расхождение",
  "att-cycle": "Сбитый цикл",
};

export function formOf(scale: ScaleId, type: string) {
  return SCALES[scale].forms.find((form) => form.type === type) ?? null;
}
