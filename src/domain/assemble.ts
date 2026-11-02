import { SCALES } from "./catalog.ts";
import type { Difficulty, Item, ScaleId } from "./types.ts";

export type AssembledBlock = {
  scaleId: ScaleId;
  items: Item[];
};

export type AssembleSuccess = {
  ok: true;
  blocks: AssembledBlock[];
};

export type AssembleFailure = {
  ok: false;
  error: string;
};

const TOPIC_LEVELS = [
  { difficulty: true, maxPer: 2 as number | null },
  { difficulty: false, maxPer: 2 as number | null },
  { difficulty: false, maxPer: null },
];

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap]!;
    copy[swap] = current!;
  }
  return copy;
}

function sampleK<T>(items: readonly T[], count: number, rng: () => number): T[] | null {
  if (items.length < count) return null;
  return shuffle(items, rng).slice(0, count);
}

function balanced(items: Item[]): boolean {
  const counts: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  for (const item of items) {
    if (item.difficulty) counts[item.difficulty] += 1;
  }
  return counts.easy === 4 && counts.medium === 4 && counts.hard === 4;
}

function groupBy(items: Item[], key: (item: Item) => string): Item[][] {
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const id = key(item);
    const list = groups.get(id);
    if (list) list.push(item);
    else groups.set(id, [item]);
  }
  return [...groups.values()];
}

function sampleLimited(groups: Item[][], need: number, maxPer: number | null, rng: () => number): Item[] | null {
  if (maxPer == null) {
    const flat = groups.flat();
    return sampleK(flat, need, rng);
  }

  const counts = groups.map(() => 0);
  let left = need;
  let guard = 0;
  while (left > 0 && guard < 5000) {
    guard += 1;
    const index = Math.floor(rng() * groups.length);
    const cap = Math.min(maxPer, groups[index]!.length);
    if (counts[index]! < cap) {
      counts[index] += 1;
      left -= 1;
    }
    if (guard > 1000 && left > 0) {
      const canGrow = counts.some((count, index) => count < Math.min(maxPer, groups[index]!.length));
      if (!canGrow) return null;
    }
  }
  if (left > 0) return null;

  const picked: Item[] = [];
  groups.forEach((group, index) => {
    picked.push(...shuffle(group, rng).slice(0, counts[index]));
  });
  return picked;
}

function present(item: Item, rng: () => number): Item {
  if (!item.shuffle) return item;
  return { ...item, options: shuffle(item.options, rng) };
}

function tryExact(pools: Item[][], quotas: number[], difficulty: boolean, rng: () => number): Item[] | null {
  if (pools.some((pool, index) => pool.length < quotas[index]!)) return null;
  for (let attempt = 0; attempt < 2500; attempt += 1) {
    const parts = pools.map((pool, index) => sampleK(pool, quotas[index]!, rng));
    if (parts.some((part) => !part)) return null;
    const set = parts.flatMap((part) => part ?? []);
    if (difficulty && !balanced(set)) continue;
    return shuffle(set, rng);
  }
  return null;
}

function tryRelaxed(pools: Item[][], quotas: number[], rng: () => number): Item[] | null {
  const caps = quotas.map((quota, index) => Math.min(pools[index]!.length, quota * 2));
  if (caps.some((cap) => cap < 1)) return null;
  if (caps.reduce((sum, cap) => sum + cap, 0) < 12) return null;
  const formCount = quotas.length;
  for (let attempt = 0; attempt < 2500; attempt += 1) {
    const counts = caps.map(() => 1);
    let left = 12 - formCount;
    let guard = 0;
    while (left > 0 && guard < 2000) {
      guard += 1;
      const index = Math.floor(rng() * formCount);
      if (counts[index]! < caps[index]!) {
        counts[index] = counts[index]! + 1;
        left -= 1;
      }
    }
    if (left > 0) continue;
    const parts = pools.map((pool, index) => sampleK(pool, counts[index]!, rng));
    if (parts.some((part) => !part)) continue;
    return shuffle(
      parts.flatMap((part) => part ?? []),
      rng,
    );
  }
  return null;
}

function tryTopics(
  items: Item[],
  level: { difficulty: boolean; maxPer: number | null },
  rng: () => number,
): Item[] | null {
  const groups = groupBy(items, (item) => item.topic ?? "");
  for (let attempt = 0; attempt < 2500; attempt += 1) {
    const set = sampleLimited(groups, 12, level.maxPer, rng);
    if (!set) continue;
    if (level.difficulty && !balanced(set)) continue;
    return shuffle(set, rng);
  }
  return null;
}

function assembleScale(items: Item[], scaleId: ScaleId, rng: () => number): Item[] | string {
  const info = SCALES[scaleId];
  if (scaleId === "erudition") {
    for (const level of TOPIC_LEVELS) {
      const found = tryTopics(items, level, rng);
      if (found) return found.map((item) => present(item, rng));
    }
    return `Ошибка банка: не удалось собрать блок "${info.name}".`;
  }

  const pools = info.forms.map((form) => items.filter((item) => item.type === form.type));
  const quotas = info.forms.map((form) => form.quota);
  const short = info.forms.find((form, index) => pools[index]!.length < form.quota);
  if (short) {
    return `Ошибка банка: для шкалы "${info.name}" не хватает заданий формы ${short.type}.`;
  }

  const exact = tryExact(pools, quotas, true, rng) ?? tryExact(pools, quotas, false, rng);
  const found = exact ?? tryRelaxed(pools, quotas, rng);
  if (found) return found.map((item) => present(item, rng));
  return `Ошибка банка: не удалось собрать блок "${info.name}".`;
}

export function assembleAttempt(
  scaleIds: ScaleId[],
  items: readonly Item[],
  rng: () => number = Math.random,
): AssembleSuccess | AssembleFailure {
  const blocks: AssembledBlock[] = [];
  for (const scaleId of scaleIds) {
    const pool = items.filter((item) => item.scale === scaleId && item.difficulty != null);
    const assembled = assembleScale(pool, scaleId, rng);
    if (typeof assembled === "string") return { ok: false, error: assembled };
    blocks.push({ scaleId, items: assembled });
  }
  return { ok: true, blocks };
}
