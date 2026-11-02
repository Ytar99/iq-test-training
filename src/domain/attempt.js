import { SCALES } from "./catalog.ts";
export function createAttempt(blocks, hints, explanations) {
  return {
    hints,
    explanations,
    finishedAt: null,
    phase: { kind: "instruction", scaleIndex: 0, mode: "entry" },
    blocks: blocks.map((block) => {
      const limitSec = SCALES[block.scaleId].blockSec;
      const itemSec = SCALES[block.scaleId].itemSec;
      return {
        scaleId: block.scaleId,
        limitSec,
        remainingSec: limitSec,
        closed: false,
        spentSec: null,
        slots: block.items.map((item) => ({
          item,
          limitSec: itemSec,
          remainingSec: itemSec,
          opened: false,
          outcome: { kind: "pending" },
          selection: null,
        })),
      };
    }),
  };
}
function replaceSlot(state, scaleIndex, itemIndex, slot) {
  return {
    ...state,
    blocks: state.blocks.map((block, index) =>
      index === scaleIndex
        ? { ...block, slots: block.slots.map((current, slotIndex) => (slotIndex === itemIndex ? slot : current)) }
        : block,
    ),
  };
}
function replaceBlock(state, scaleIndex, block) {
  return {
    ...state,
    blocks: state.blocks.map((current, index) => (index === scaleIndex ? block : current)),
  };
}
function commit(slot) {
  if (slot.remainingSec === 0 && slot.outcome.kind !== "pending") return slot;
  if (slot.selection) return { ...slot, outcome: { kind: "answer", optionId: slot.selection } };
  return { ...slot, outcome: { kind: "skip" } };
}
function openSlot(slot) {
  return slot.opened ? slot : { ...slot, opened: true };
}
function afterBlock(state, scaleIndex) {
  const next = scaleIndex + 1;
  if (next >= state.blocks.length) {
    return { ...state, phase: { kind: "result" }, finishedAt: state.finishedAt ?? Date.now() };
  }
  return { ...state, phase: { kind: "instruction", scaleIndex: next, mode: "entry" } };
}
function closeBlock(block) {
  if (block.closed) return block;
  return {
    ...block,
    closed: true,
    spentSec: block.limitSec - block.remainingSec,
    slots: block.slots.map((slot) => (slot.opened ? slot : { ...slot, remainingSec: 0, outcome: { kind: "skip" } })),
  };
}
function leaveForward(state, scaleIndex, itemIndex, shouldCommit) {
  const block = state.blocks[scaleIndex];
  const current = block.slots[itemIndex];
  const committed = shouldCommit ? commit(current) : current;
  const withCurrent = replaceSlot(state, scaleIndex, itemIndex, committed);
  if (itemIndex < block.slots.length - 1) {
    const nextIndex = itemIndex + 1;
    const nextSlot = openSlot(withCurrent.blocks[scaleIndex].slots[nextIndex]);
    return {
      ...replaceSlot(withCurrent, scaleIndex, nextIndex, nextSlot),
      phase: { kind: "task", scaleIndex, itemIndex: nextIndex },
    };
  }
  const closed = closeBlock(withCurrent.blocks[scaleIndex]);
  return afterBlock(replaceBlock(withCurrent, scaleIndex, closed), scaleIndex);
}
function activeItem(phase) {
  if (phase.kind === "task") return { scaleIndex: phase.scaleIndex, itemIndex: phase.itemIndex };
  if (phase.kind === "instruction" && phase.mode === "return") {
    return { scaleIndex: phase.scaleIndex, itemIndex: phase.itemIndex };
  }
  return null;
}
export function reduceAttempt(state, action) {
  if (action.type === "select") {
    const place = activeItem(state.phase);
    if (!place || state.phase.kind !== "task") return state;
    const slot = state.blocks[place.scaleIndex].slots[place.itemIndex];
    if (slot.remainingSec === 0) return state;
    const outcome = slot.outcome.kind === "pending" ? slot.outcome : { kind: "answer", optionId: action.optionId };
    return replaceSlot(state, place.scaleIndex, place.itemIndex, {
      ...slot,
      selection: action.optionId,
      outcome,
    });
  }
  if (action.type === "back") {
    if (state.phase.kind !== "task" || state.phase.itemIndex === 0) return state;
    return {
      ...state,
      phase: { kind: "task", scaleIndex: state.phase.scaleIndex, itemIndex: state.phase.itemIndex - 1 },
    };
  }
  if (action.type === "instruction") {
    if (state.phase.kind !== "task") return state;
    return {
      ...state,
      phase: {
        kind: "instruction",
        scaleIndex: state.phase.scaleIndex,
        mode: "return",
        itemIndex: state.phase.itemIndex,
      },
    };
  }
  if (action.type === "next") {
    if (state.phase.kind === "instruction" && state.phase.mode === "entry") {
      const opened = openSlot(state.blocks[state.phase.scaleIndex].slots[0]);
      return {
        ...replaceSlot(state, state.phase.scaleIndex, 0, opened),
        phase: { kind: "task", scaleIndex: state.phase.scaleIndex, itemIndex: 0 },
      };
    }
    if (state.phase.kind === "instruction" && state.phase.mode === "return") {
      return {
        ...state,
        phase: { kind: "task", scaleIndex: state.phase.scaleIndex, itemIndex: state.phase.itemIndex },
      };
    }
    if (state.phase.kind === "task") {
      const slot = state.blocks[state.phase.scaleIndex].slots[state.phase.itemIndex];
      const shouldCommit = slot.remainingSec > 0 || slot.outcome.kind === "pending";
      return leaveForward(state, state.phase.scaleIndex, state.phase.itemIndex, shouldCommit);
    }
    return state;
  }
  const place = activeItem(state.phase);
  if (!place) return state;
  const block = state.blocks[place.scaleIndex];
  const slot = block.slots[place.itemIndex];
  let nextSlot = slot;
  let itemExpired = false;
  if (slot.remainingSec > 0) {
    const remainingSec = slot.remainingSec - 1;
    nextSlot = { ...slot, remainingSec };
    if (remainingSec === 0) itemExpired = true;
  }
  let nextBlockRemaining = block.remainingSec;
  let blockExpired = false;
  if (block.remainingSec > 0) {
    nextBlockRemaining -= 1;
    if (nextBlockRemaining === 0) blockExpired = true;
  }
  const withSlot = replaceSlot(state, place.scaleIndex, place.itemIndex, nextSlot);
  const ticked = replaceBlock(withSlot, place.scaleIndex, {
    ...withSlot.blocks[place.scaleIndex],
    remainingSec: nextBlockRemaining,
  });
  if (!itemExpired && !blockExpired) return ticked;
  if (blockExpired) {
    const committed = commit(ticked.blocks[place.scaleIndex].slots[place.itemIndex]);
    const withCommit = replaceSlot(ticked, place.scaleIndex, place.itemIndex, committed);
    const closed = closeBlock(withCommit.blocks[place.scaleIndex]);
    return afterBlock(replaceBlock(withCommit, place.scaleIndex, closed), place.scaleIndex);
  }
  const committed = commit(ticked.blocks[place.scaleIndex].slots[place.itemIndex]);
  const withCommit = replaceSlot(ticked, place.scaleIndex, place.itemIndex, committed);
  if (withCommit.phase.kind === "instruction" && withCommit.phase.mode === "return") {
    return {
      ...withCommit,
      phase: { kind: "task", scaleIndex: place.scaleIndex, itemIndex: place.itemIndex },
    };
  }
  return withCommit;
}
export function grade(slot) {
  if (slot.outcome.kind !== "answer") return "skip";
  return slot.outcome.optionId === slot.item.correctOptionId ? "correct" : "wrong";
}
