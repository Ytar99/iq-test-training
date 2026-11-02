import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Group, Paper, SimpleGrid, Stack, Text, Title } from "@mantine/core";
import { SCALES } from "../domain/catalog.ts";
import { bankIssues } from "../domain/bank.ts";
import { SCALE_ORDER } from "../domain/types.ts";
import { Shell } from "./Shell.tsx";
function Tile({ pressed, color, children, onClick }) {
  return _jsx(Button, {
    fullWidth: true,
    size: "md",
    variant: pressed ? "filled" : "outline",
    color: color,
    "aria-pressed": pressed,
    onClick: onClick,
    styles: {
      root: { height: "auto", paddingBlock: "0.55rem" },
      label: { whiteSpace: "normal", textAlign: "center", lineHeight: 1.25 },
    },
    children: children,
  });
}
export function StartScreen({
  selected,
  hints,
  explanations,
  assembleError,
  onToggleScale,
  onToggleHints,
  onToggleExplanations,
  onAll,
  onNone,
  onStart,
}) {
  const blocked = selected.length === 0 || bankIssues.length > 0;
  return _jsx(Shell, {
    children: _jsxs(Stack, {
      gap: "xl",
      maw: 720,
      mx: "auto",
      w: "100%",
      children: [
        _jsxs(Stack, {
          gap: "xs",
          children: [
            _jsx(Title, { order: 2, children: "\u0422\u0440\u0435\u043D\u0430\u0436\u0435\u0440" }),
            _jsx(Text, {
              children:
                "\u042D\u0442\u043E \u0442\u0440\u0435\u043D\u0438\u0440\u043E\u0432\u043A\u0430 \u043F\u043E \u0444\u043E\u0440\u043C\u0430\u0442\u0443 \u0422\u0418\u041F\u0421, \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442 \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043E\u0446\u0435\u043D\u043A\u043E\u0439 HT Lab.",
            }),
          ],
        }),
        _jsxs(Stack, {
          gap: "sm",
          children: [
            _jsxs(Group, {
              justify: "space-between",
              align: "baseline",
              wrap: "nowrap",
              children: [
                _jsx(Text, { fw: 700, children: "\u0428\u043A\u0430\u043B\u044B" }),
                _jsxs(Text, {
                  size: "sm",
                  c: "dimmed",
                  children: ["\u0412\u044B\u0431\u0440\u0430\u043D\u043E ", selected.length, " \u0438\u0437 7"],
                }),
              ],
            }),
            _jsx(SimpleGrid, {
              cols: 2,
              spacing: "sm",
              children: SCALE_ORDER.map((scaleId) =>
                _jsx(
                  Tile,
                  {
                    pressed: selected.includes(scaleId),
                    color: "teal",
                    onClick: () => onToggleScale(scaleId),
                    children: SCALES[scaleId].name,
                  },
                  scaleId,
                ),
              ),
            }),
            _jsxs(SimpleGrid, {
              cols: { base: 1, md: 2 },
              spacing: "sm",
              children: [
                _jsx(Button, {
                  fullWidth: true,
                  variant: "light",
                  color: "teal",
                  onClick: onAll,
                  children: "\u041F\u043E\u043B\u043D\u044B\u0439 \u0442\u0435\u0441\u0442",
                }),
                _jsx(Button, {
                  fullWidth: true,
                  variant: "default",
                  onClick: onNone,
                  children: "\u0421\u043D\u044F\u0442\u044C \u0432\u0441\u0435",
                }),
              ],
            }),
          ],
        }),
        _jsxs(SimpleGrid, {
          cols: 2,
          spacing: "sm",
          children: [
            _jsxs(Stack, {
              gap: 6,
              children: [
                _jsx(Tile, {
                  pressed: hints,
                  color: "orange",
                  onClick: onToggleHints,
                  children: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438",
                }),
                _jsx(Text, {
                  size: "sm",
                  c: "dimmed",
                  children:
                    '\u041D\u0430 \u0437\u0430\u0434\u0430\u043D\u0438\u0438 \u043F\u043E\u044F\u0432\u0438\u0442\u0441\u044F \u043A\u043D\u043E\u043F\u043A\u0430 "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430". \u0422\u0430\u0439\u043C\u0435\u0440\u044B \u0438\u0434\u0443\u0442, \u0431\u0430\u043B\u043B \u043D\u0435 \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F.',
                }),
              ],
            }),
            _jsxs(Stack, {
              gap: 6,
              children: [
                _jsx(Tile, {
                  pressed: explanations,
                  color: "orange",
                  onClick: onToggleExplanations,
                  children:
                    "\u041F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u044F \u043A \u043E\u0442\u0432\u0435\u0442\u0443",
                }),
                _jsx(Text, {
                  size: "sm",
                  c: "dimmed",
                  children:
                    "\u041D\u0430 \u0438\u0442\u043E\u0433\u0435 \u043F\u043E\u0434 \u0432\u0435\u0440\u043D\u044B\u043C \u043E\u0442\u0432\u0435\u0442\u043E\u043C \u0431\u0443\u0434\u0435\u0442 \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u0435 \u043F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u0435.",
                }),
              ],
            }),
          ],
        }),
        _jsx(Button, {
          fullWidth: true,
          size: "md",
          color: "teal",
          disabled: blocked,
          onClick: onStart,
          children: "\u041D\u0430\u0447\u0430\u0442\u044C",
        }),
        bankIssues.length > 0
          ? _jsx(Paper, {
              withBorder: true,
              p: "md",
              radius: "md",
              children: _jsx(Stack, {
                gap: 4,
                children: bankIssues.map((issue) => _jsx(Text, { c: "red", size: "sm", children: issue }, issue)),
              }),
            })
          : null,
        assembleError ? _jsx(Text, { c: "red", size: "sm", children: assembleError }) : null,
      ],
    }),
  });
}
