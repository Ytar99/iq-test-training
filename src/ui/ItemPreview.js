import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Button, Group, Select, SimpleGrid, Stack, Switch, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { SCALES } from "../domain/catalog.ts";
import { bankFiles } from "../domain/bank.ts";
import { SCALE_ORDER } from "../domain/types.ts";
import { LETTERS } from "./options.ts";
import { NavButton, Shell, SideButtons } from "./Shell.tsx";
import { TaskCard } from "./TaskCard.tsx";
import classes from "./Shell.module.css";
const BUCKETS = [
  { value: "invented", label: "Банк" },
  { value: "demo", label: "Демо" },
  { value: "example", label: "Примеры" },
];
const previewEntries = [];
const seenIds = new Set();
for (const file of bankFiles) {
  for (const item of file.items) {
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    previewEntries.push({ bucket: file.bucket, scale: file.scale, item });
  }
}
function isBucket(value) {
  return value === "invented" || value === "demo" || value === "example";
}
function isScale(value) {
  return SCALE_ORDER.some((scaleId) => scaleId === value);
}
function scalesIn(bucket) {
  return SCALE_ORDER.filter((scaleId) =>
    previewEntries.some((entry) => entry.bucket === bucket && entry.scale === scaleId),
  );
}
function typesIn(bucket, scaleId) {
  const types = [];
  for (const entry of previewEntries) {
    if (entry.bucket !== bucket || entry.scale !== scaleId || types.includes(entry.item.type)) continue;
    types.push(entry.item.type);
  }
  return types;
}
function answerLetter(entry) {
  const index = entry.item.options.findIndex((option) => option.id === entry.item.correctOptionId);
  if (index < 0) return entry.item.correctOptionId;
  return LETTERS[index] ?? entry.item.correctOptionId;
}
export function ItemPreview({ itemId, onItemId }) {
  const located = previewEntries.find((entry) => entry.item.id === itemId) ?? null;
  const fallback = previewEntries[0];
  const [bucket, setBucket] = useState(located?.bucket ?? fallback?.bucket ?? "invented");
  const [scale, setScale] = useState(located?.scale ?? fallback?.scale ?? "calculation");
  const [type, setType] = useState(located?.item.type ?? fallback?.item.type ?? "");
  const [trackedId, setTrackedId] = useState(itemId);
  const [selection, setSelection] = useState(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [expired, setExpired] = useState(false);
  if (itemId !== trackedId) {
    setTrackedId(itemId);
    setSelection(null);
    if (located) {
      setBucket(located.bucket);
      setScale(located.scale);
      setType(located.item.type);
    }
  }
  useEffect(() => {
    if (itemId !== "") return;
    const first = previewEntries[0];
    if (first) onItemId(first.item.id);
  }, [itemId, onItemId]);
  const filtered = previewEntries.filter(
    (entry) => entry.bucket === bucket && entry.scale === scale && entry.item.type === type,
  );
  const index = filtered.findIndex((entry) => entry.item.id === itemId);
  const info = SCALES[located?.scale ?? scale];
  const applyFilter = (nextBucket, nextScale, nextType) => {
    setBucket(nextBucket);
    setScale(nextScale);
    setType(nextType);
    const list = previewEntries.filter(
      (entry) => entry.bucket === nextBucket && entry.scale === nextScale && entry.item.type === nextType,
    );
    const still = list.some((entry) => entry.item.id === itemId);
    if (!still && list[0]) onItemId(list[0].item.id);
  };
  const chooseBucket = (value) => {
    if (!value || !isBucket(value)) return;
    const nextScale = scalesIn(value).includes(scale) ? scale : scalesIn(value)[0];
    if (!nextScale) return;
    const nextType = typesIn(value, nextScale).includes(type) ? type : typesIn(value, nextScale)[0];
    if (!nextType) return;
    applyFilter(value, nextScale, nextType);
  };
  const chooseScale = (value) => {
    if (!value || !isScale(value)) return;
    const nextType = typesIn(bucket, value).includes(type) ? type : typesIn(bucket, value)[0];
    if (!nextType) return;
    applyFilter(bucket, value, nextType);
  };
  const chooseType = (value) => {
    if (!value) return;
    applyFilter(bucket, scale, value);
  };
  const go = (delta) => {
    const next = filtered[index + delta];
    if (next) onItemId(next.item.id);
  };
  const backDisabled = index <= 0;
  const nextDisabled = index < 0 || index >= filtered.length - 1;
  const hintButton = _jsx(NavButton, {
    icon: "hint",
    color: "orange",
    filled: hintOpen,
    pressed: hintOpen,
    onClick: () => setHintOpen((open) => !open),
    children: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430",
  });
  return _jsxs(Stack, {
    gap: "md",
    children: [
      _jsx(Box, {
        px: "md",
        pt: "md",
        children: _jsxs(Stack, {
          gap: "sm",
          children: [
            _jsxs(SimpleGrid, {
              cols: { base: 1, sm: 2, lg: 4 },
              spacing: "sm",
              children: [
                _jsx(Select, {
                  label: "\u041A\u043E\u0440\u0437\u0438\u043D\u0430",
                  data: BUCKETS,
                  value: bucket,
                  allowDeselect: false,
                  onChange: chooseBucket,
                }),
                _jsx(Select, {
                  label: "\u0428\u043A\u0430\u043B\u0430",
                  data: scalesIn(bucket).map((scaleId) => ({ value: scaleId, label: SCALES[scaleId].name })),
                  value: scale,
                  allowDeselect: false,
                  onChange: chooseScale,
                }),
                _jsx(Select, {
                  label: "\u0422\u0438\u043F",
                  data: typesIn(bucket, scale),
                  value: type,
                  allowDeselect: false,
                  onChange: chooseType,
                }),
                _jsx(Select, {
                  label: "\u0417\u0430\u0434\u0430\u043D\u0438\u0435",
                  data: filtered.map((entry) => entry.item.id),
                  value: index >= 0 ? itemId : null,
                  allowDeselect: false,
                  searchable: true,
                  nothingFoundMessage: "\u041D\u0435\u0442 \u0442\u0430\u043A\u043E\u0433\u043E id",
                  onChange: (value) => {
                    if (value) onItemId(value);
                  },
                }),
              ],
            }),
            _jsxs(Group, {
              gap: "lg",
              children: [
                _jsx(Switch, {
                  label: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430",
                  checked: hintOpen,
                  onChange: (event) => setHintOpen(event.currentTarget.checked),
                }),
                _jsx(Switch, {
                  label: "\u0412\u0440\u0435\u043C\u044F \u0438\u0441\u0442\u0435\u043A\u043B\u043E",
                  checked: expired,
                  onChange: (event) => setExpired(event.currentTarget.checked),
                }),
              ],
            }),
            located
              ? _jsxs(Text, {
                  size: "sm",
                  children: [
                    located.item.id,
                    ", ",
                    located.item.type,
                    ", \u0432\u0435\u0440\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442 ",
                    answerLetter(located),
                  ],
                })
              : null,
          ],
        }),
      }),
      _jsx(Shell, {
        center: index >= 0 ? `Задание ${index + 1} / ${filtered.length}` : "Задание",
        blockLabel: "\u0411\u043B\u043E\u043A 1 / 1",
        blockSeconds: info.blockSec,
        itemSeconds: expired ? 0 : info.itemSec,
        menu: _jsx(Button, {
          hiddenFrom: "md",
          variant: "subtle",
          color: "teal",
          size: "compact-sm",
          children: "\u041C\u0435\u043D\u044E",
        }),
        left: _jsxs(SideButtons, {
          place: "left",
          children: [
            _jsx(NavButton, { icon: "menu", children: "\u041C\u0435\u043D\u044E" }),
            _jsx(Box, {
              className: classes.railMiddle,
              children: _jsx(NavButton, {
                icon: "back",
                disabled: backDisabled,
                onClick: () => go(-1),
                children: "\u041D\u0430\u0437\u0430\u0434",
              }),
            }),
            _jsx(Stack, { gap: 6, align: "center", children: hintButton }),
          ],
        }),
        right: _jsx(SideButtons, {
          place: "right",
          children: _jsx(NavButton, {
            icon: "next",
            color: "orange",
            filled: true,
            disabled: nextDisabled,
            onClick: () => go(1),
            children: "\u0414\u0430\u043B\u0435\u0435",
          }),
        }),
        bottom: _jsxs(Group, {
          className: classes.phoneBar,
          hiddenFrom: "md",
          grow: true,
          gap: 4,
          wrap: "nowrap",
          children: [
            _jsx(Button, {
              size: "compact-xs",
              variant: "default",
              disabled: backDisabled,
              onClick: () => go(-1),
              children: "\u041D\u0430\u0437\u0430\u0434",
            }),
            _jsx(Button, {
              size: "compact-xs",
              color: "orange",
              variant: hintOpen ? "filled" : "light",
              "aria-pressed": hintOpen,
              onClick: () => setHintOpen((open) => !open),
              children: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430",
            }),
            _jsx(Button, {
              size: "compact-xs",
              color: "teal",
              disabled: nextDisabled,
              onClick: () => go(1),
              children: "\u0414\u0430\u043B\u0435\u0435",
            }),
          ],
        }),
        children: located
          ? _jsx(TaskCard, {
              item: located.item,
              selection: selection,
              onSelect: setSelection,
              hintOpen: hintOpen,
              expired: expired,
            })
          : _jsxs(Text, {
              children: [
                "\u0417\u0430\u0434\u0430\u043D\u0438\u0435 ",
                itemId,
                " \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E",
              ],
            }),
      }),
    ],
  });
}
