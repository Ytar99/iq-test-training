import { assembleAttempt } from "../src/domain/assemble.ts";
import { createAttempt, reduceAttempt } from "../src/domain/attempt.ts";
import { bankIssues, bankItems } from "../src/domain/bank.ts";
import { SCALES } from "../src/domain/catalog.ts";
import { SCALE_ORDER } from "../src/domain/types.ts";

if (bankIssues.length > 0) {
  console.error(bankIssues.join("\n"));
  process.exit(1);
}

for (const scaleId of SCALE_ORDER) {
  const info = SCALES[scaleId];
  const items = bankItems.filter((item) => item.scale === scaleId);
  if (items.length < 48) throw new Error(`${scaleId} pool ${items.length}`);
  for (const form of info.forms) {
    const count = items.filter((item) => item.type === form.type).length;
    if (count < form.quota * 4) throw new Error(`${scaleId} ${form.type} pool ${count}`);
  }
}

function counts(items: { difficulty: string; type: string; topic?: string }[]) {
  const difficulty = { easy: 0, medium: 0, hard: 0 };
  const types = new Map<string, number>();
  const topics = new Map<string, number>();
  for (const item of items) {
    difficulty[item.difficulty as "easy" | "medium" | "hard"] += 1;
    types.set(item.type, (types.get(item.type) ?? 0) + 1);
    if (item.topic) topics.set(item.topic, (topics.get(item.topic) ?? 0) + 1);
  }
  return { difficulty, types, topics };
}

for (let attempt = 0; attempt < 40; attempt += 1) {
  const assembled = assembleAttempt([...SCALE_ORDER], bankItems);
  if (!assembled.ok) throw new Error(assembled.error);
  if (assembled.blocks.length !== 7) throw new Error("blocks");
  for (const block of assembled.blocks) {
    if (block.items.length !== 12) throw new Error(`${block.scaleId} length`);
    const info = SCALES[block.scaleId];
    const summary = counts(block.items);
    const ids = new Set(block.items.map((item) => item.id));
    if (ids.size !== 12) throw new Error("duplicate item");
    if (block.scaleId === "erudition") {
      if (summary.difficulty.easy === 4 && summary.difficulty.medium === 4 && summary.difficulty.hard === 4) {
        for (const count of summary.topics.values()) {
          if (count > 2) throw new Error("topic overflow with strict difficulty");
        }
      }
    } else {
      const strict = summary.difficulty.easy === 4 && summary.difficulty.medium === 4 && summary.difficulty.hard === 4;
      for (const form of info.forms) {
        const count = summary.types.get(form.type) ?? 0;
        if (strict && count !== form.quota) throw new Error(`${block.scaleId} ${form.type} ${count}`);
        if (!strict && (count < 1 || count > form.quota * 2))
          throw new Error(`${block.scaleId} relaxed ${form.type} ${count}`);
      }
    }
    for (const item of block.items) {
      if (item.options.length !== info.optionCount) throw new Error("options");
      if (!item.options.some((option) => option.id === item.correctOptionId)) throw new Error("correct missing");
    }
  }
}

let state = createAttempt(
  assembleAttempt(["attention"], bankItems).ok
    ? (assembleAttempt(["attention"], bankItems) as { ok: true; blocks: Parameters<typeof createAttempt>[0] }).blocks
    : [],
  false,
  false,
);
if (state.blocks.length !== 1) throw new Error("single block");
state = reduceAttempt(state, { type: "next" });
if (state.phase.kind !== "task" || state.phase.itemIndex !== 0) throw new Error("open first");
if (!state.blocks[0]!.slots[0]!.opened) throw new Error("not opened");
const before = state.blocks[0]!.remainingSec;
state = reduceAttempt(state, { type: "tick" });
if (state.blocks[0]!.remainingSec !== before - 1) throw new Error("block tick");
if (state.blocks[0]!.slots[0]!.remainingSec !== state.blocks[0]!.slots[0]!.limitSec - 1) throw new Error("item tick");
state = reduceAttempt(state, { type: "next" });
if (state.blocks[0]!.slots[0]!.outcome.kind !== "skip") throw new Error("empty next should skip");
state = reduceAttempt(state, { type: "back" });
state = reduceAttempt(state, { type: "select", optionId: state.blocks[0]!.slots[0]!.item.options[0]!.id });
if (state.blocks[0]!.slots[0]!.outcome.kind !== "answer") throw new Error("skip was not replaced");

let expired = createAttempt(
  (assembleAttempt(["vocabulary", "attention"], bankItems) as { ok: true; blocks: Parameters<typeof createAttempt>[0] })
    .blocks,
  true,
  true,
);
expired = reduceAttempt(expired, { type: "next" });
const firstOption = expired.blocks[0]!.slots[0]!.item.options[1]!.id;
expired = reduceAttempt(expired, { type: "select", optionId: firstOption });
expired = {
  ...expired,
  blocks: expired.blocks.map((block, index) =>
    index === 0
      ? {
          ...block,
          remainingSec: 1,
          slots: block.slots.map((slot, slotIndex) => (slotIndex === 0 ? { ...slot, remainingSec: 1 } : slot)),
        }
      : block,
  ),
};
expired = reduceAttempt(expired, { type: "tick" });
if (expired.phase.kind !== "instruction" || expired.phase.mode !== "entry" || expired.phase.scaleIndex !== 1) {
  throw new Error(`block expiry phase ${JSON.stringify(expired.phase)}`);
}
if (expired.blocks[0]!.slots[0]!.outcome.kind !== "answer") throw new Error("current answer was dropped");
if (expired.blocks[0]!.slots.slice(1).some((slot) => slot.outcome.kind !== "skip"))
  throw new Error("unopened not skipped");
if (expired.blocks[0]!.spentSec !== expired.blocks[0]!.limitSec) throw new Error("spent time");

let itemOnly = createAttempt(
  (assembleAttempt(["verbal"], bankItems) as { ok: true; blocks: Parameters<typeof createAttempt>[0] }).blocks,
  false,
  false,
);
itemOnly = reduceAttempt(itemOnly, { type: "next" });
itemOnly = {
  ...itemOnly,
  blocks: [
    {
      ...itemOnly.blocks[0]!,
      slots: itemOnly.blocks[0]!.slots.map((slot, index) => (index === 0 ? { ...slot, remainingSec: 1 } : slot)),
    },
  ],
};
itemOnly = reduceAttempt(itemOnly, { type: "tick" });
if (itemOnly.phase.kind !== "task" || itemOnly.phase.itemIndex !== 1)
  throw new Error("item expiry should open the next task");
if (itemOnly.blocks[0]!.slots[0]!.outcome.kind !== "skip") throw new Error("empty expiry should skip");

console.log("checks ok", bankItems.length);
