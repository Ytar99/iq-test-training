import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Button, Group, Text, UnstyledButton } from "@mantine/core";
import { formatClock } from "../domain/format.ts";
import classes from "./Shell.module.css";
const stripColor = {
  current: "orange",
  answered: "green",
  timed: "gray.5",
  missed: "red",
};
function Segment({ children, onClick, current, edge, grow }) {
  const className = [
    classes.seg,
    edge === "start" ? classes.segStart : "",
    edge === "end" ? classes.segEnd : "",
    grow ? classes.segGrow : "",
    current ? classes.segCurrent : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (onClick) {
    return _jsx(UnstyledButton, { className: className, onClick: onClick, children: children });
  }
  return _jsx("div", { className: className, "aria-current": current ? "page" : undefined, children: children });
}
function HomeLabel({ onHome }) {
  if (!onHome) return _jsx(Text, { fw: 700, children: "\u0422\u0440\u0435\u043D\u0430\u0436\u0435\u0440" });
  return _jsx(UnstyledButton, {
    className: classes.home,
    onClick: onHome,
    children: "\u0422\u0440\u0435\u043D\u0430\u0436\u0435\u0440",
  });
}
function BlockLabel({ label, seconds, onBlock }) {
  const body = _jsxs(_Fragment, {
    children: [
      _jsx(Text, { size: "sm", children: label }),
      seconds != null
        ? _jsx(Text, { className: classes.clock, c: "teal", size: "sm", children: formatClock(seconds) })
        : null,
    ],
  });
  if (!onBlock) {
    return _jsx(Group, { gap: 6, wrap: "nowrap", "aria-current": "page", children: body });
  }
  return _jsx(UnstyledButton, { className: classes.blockLink, onClick: onBlock, children: body });
}
export function Shell({
  center,
  blockLabel,
  blockSeconds,
  itemSeconds,
  strip,
  onHome,
  onBlock,
  menu,
  left,
  right,
  bottom,
  children,
}) {
  const task = Boolean(left || right);
  const attempt = Boolean(blockLabel);
  const segments = [
    {
      id: "home",
      onClick: onHome,
      grow: false,
      children: _jsx(Text, { fw: 700, children: "\u0422\u0440\u0435\u043D\u0430\u0436\u0435\u0440" }),
    },
    {
      id: "block",
      onClick: onBlock,
      current: !onBlock,
      grow: false,
      children: _jsxs(_Fragment, {
        children: [
          _jsx(Text, { size: "sm", children: blockLabel }),
          blockSeconds != null
            ? _jsx(Text, { className: classes.clock, c: "teal", size: "sm", children: formatClock(blockSeconds) })
            : null,
        ],
      }),
    },
  ];
  if (center) {
    segments.push({
      id: "center",
      grow: true,
      children: _jsx(Text, { fw: 600, size: "sm", ta: "center", children: center }),
    });
  }
  if (itemSeconds != null) {
    segments.push({
      id: "item",
      grow: false,
      children: _jsx(Text, { className: classes.clock, c: "orange", size: "sm", children: formatClock(itemSeconds) }),
    });
  }
  return _jsx(Box, {
    className: classes.page,
    children: _jsxs(Box, {
      className: [classes.sheet, attempt ? classes.sheetAttempt : ""].filter(Boolean).join(" "),
      children: [
        attempt
          ? _jsxs(Box, {
              className: `${classes.header} no-print`,
              children: [
                _jsx(Box, {
                  className: classes.chevron,
                  children: segments.map((segment, index) =>
                    _jsx(
                      Segment,
                      {
                        onClick: segment.onClick,
                        current: segment.current,
                        grow: segment.grow,
                        edge: index === 0 ? "start" : index === segments.length - 1 ? "end" : undefined,
                        children: segment.children,
                      },
                      segment.id,
                    ),
                  ),
                }),
                _jsxs(Box, {
                  className: classes.compactAttempt,
                  children: [
                    _jsxs(Group, {
                      justify: "space-between",
                      wrap: "nowrap",
                      gap: "xs",
                      align: "center",
                      children: [
                        _jsxs(Group, {
                          gap: "xs",
                          wrap: "nowrap",
                          align: "center",
                          children: [
                            menu,
                            _jsx(HomeLabel, { onHome: onHome }),
                            blockLabel
                              ? _jsx(BlockLabel, { label: blockLabel, seconds: blockSeconds, onBlock: onBlock })
                              : null,
                          ],
                        }),
                        itemSeconds != null
                          ? _jsx(Text, {
                              className: classes.clock,
                              c: "orange",
                              size: "sm",
                              children: formatClock(itemSeconds),
                            })
                          : null,
                      ],
                    }),
                    center
                      ? _jsx(Text, {
                          className: classes.phoneMeta,
                          size: "sm",
                          fw: 600,
                          ta: "center",
                          children: center,
                        })
                      : null,
                  ],
                }),
              ],
            })
          : null,
        strip
          ? _jsx(Group, {
              className: classes.strip,
              gap: 6,
              grow: true,
              wrap: "nowrap",
              "aria-hidden": "true",
              children: strip.map((cell, index) =>
                _jsx(
                  Box,
                  {
                    className: cell.tone === "empty" ? classes.stripEmpty : undefined,
                    h: 8,
                    bg: cell.tone === "empty" ? undefined : stripColor[cell.tone],
                    style: { borderRadius: 99 },
                  },
                  index,
                ),
              ),
            })
          : null,
        _jsxs(Box, {
          className: task ? classes.taskBody : undefined,
          children: [
            left,
            _jsx(Box, {
              className:
                [task ? classes.content : "", bottom ? classes.contentPad : ""].filter(Boolean).join(" ") || undefined,
              children: children,
            }),
            right,
          ],
        }),
        bottom ? _jsx(Box, { className: `${classes.bottom} no-print`, children: bottom }) : null,
      ],
    }),
  });
}
export function SideButtons({ place, children }) {
  return _jsx(Box, {
    className: `${place === "left" ? classes.railLeft : classes.railRight} no-print`,
    children: children,
  });
}
function HexIcon({ name, filled }) {
  const mark = filled ? "white" : "currentColor";
  return _jsxs("svg", {
    className: classes.hexSvg,
    viewBox: "0 0 72 80",
    "aria-hidden": "true",
    children: [
      _jsx("polygon", {
        points: "36,4 66,21 66,59 36,76 6,59 6,21",
        fill: filled ? "currentColor" : "white",
        stroke: "currentColor",
        strokeWidth: "2.5",
      }),
      name === "menu"
        ? _jsxs("g", {
            stroke: mark,
            strokeWidth: "2.6",
            strokeLinecap: "round",
            children: [
              _jsx("line", { x1: "24", y1: "32", x2: "48", y2: "32" }),
              _jsx("line", { x1: "24", y1: "40", x2: "48", y2: "40" }),
              _jsx("line", { x1: "24", y1: "48", x2: "48", y2: "48" }),
            ],
          })
        : null,
      name === "back"
        ? _jsx("path", {
            d: "M44 28 L30 40 L44 52 M30 40 H50",
            fill: "none",
            stroke: mark,
            strokeWidth: "2.6",
            strokeLinecap: "round",
            strokeLinejoin: "round",
          })
        : null,
      name === "next"
        ? _jsx("path", {
            d: "M28 28 L42 40 L28 52 M42 40 H22",
            fill: "none",
            stroke: mark,
            strokeWidth: "2.6",
            strokeLinecap: "round",
            strokeLinejoin: "round",
          })
        : null,
      name === "info"
        ? _jsx("text", {
            x: "36",
            y: "50",
            textAnchor: "middle",
            fontSize: "28",
            fontWeight: "700",
            fill: mark,
            children: "i",
          })
        : null,
      name === "hint"
        ? _jsx("text", {
            x: "36",
            y: "50",
            textAnchor: "middle",
            fontSize: "26",
            fontWeight: "700",
            fill: mark,
            children: "?",
          })
        : null,
    ],
  });
}
export function NavButton(props) {
  return _jsx(Button, {
    variant: "subtle",
    color: props.color ?? "teal",
    className: classes.navButton,
    disabled: props.disabled,
    onClick: props.onClick,
    "aria-pressed": props.pressed,
    children: _jsxs("span", {
      className: classes.navInner,
      children: [
        _jsx(HexIcon, { name: props.icon, filled: props.filled }),
        _jsx(Text, { className: classes.navLabel, size: "xs", children: props.children }),
      ],
    }),
  });
}
