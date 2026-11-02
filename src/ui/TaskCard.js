import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Group, Paper, Radio, Stack, Text } from "@mantine/core";
import { StimulusView } from "./content.tsx";
import { LETTERS, optionsInColumn } from "./options.ts";
import classes from "./Shell.module.css";
export function TaskCard({ item, selection, onSelect, hintOpen, expired }) {
  const column = optionsInColumn(item.options);
  return _jsxs(Stack, {
    gap: "md",
    children: [
      _jsx(StimulusView, { stimulus: item.stimulus }),
      hintOpen
        ? _jsx(Paper, {
            withBorder: true,
            p: "sm",
            radius: "md",
            bg: "orange.0",
            children: _jsx(Text, { size: "sm", children: item.hint }),
          })
        : null,
      expired
        ? _jsx(Alert, {
            color: "orange",
            radius: "md",
            children:
              "\u0412\u0440\u0435\u043C\u044F \u043E\u0442\u0432\u0435\u0442\u0430 \u0438\u0441\u0442\u0435\u043A\u043B\u043E",
          })
        : null,
      _jsx(Radio.Group, {
        value: selection,
        onChange: onSelect,
        disabled: expired,
        children: _jsx("div", {
          className: column ? classes.options : `${classes.options} ${classes.optionsInline}`,
          children: item.options.map((option, index) =>
            _jsx(
              Radio.Card,
              {
                value: option.id,
                withBorder: true,
                p: "sm",
                radius: "md",
                disabled: expired,
                children: _jsxs(Group, {
                  className: classes.optionLine,
                  align: "flex-start",
                  wrap: "nowrap",
                  gap: "sm",
                  children: [
                    _jsxs(Group, {
                      gap: 6,
                      wrap: "nowrap",
                      align: "center",
                      children: [
                        _jsx(Radio.Indicator, { disabled: expired }),
                        _jsx(Text, { fw: 700, c: "teal", children: LETTERS[index] }),
                      ],
                    }),
                    _jsxs(Stack, {
                      className: classes.optionScene,
                      gap: 4,
                      children: [
                        option.text ? _jsx(Text, { style: { whiteSpace: "pre-wrap" }, children: option.text }) : null,
                        option.scene ? _jsx(StimulusView, { stimulus: { scene: option.scene } }) : null,
                      ],
                    }),
                  ],
                }),
              },
              option.id,
            ),
          ),
        }),
      }),
    ],
  });
}
