import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SceneView } from "../scenes/SceneView.tsx";
import { Stack, Text } from "@mantine/core";
export function StimulusView({ stimulus }) {
  return _jsxs(Stack, {
    gap: "sm",
    w: "100%",
    miw: 0,
    children: [
      stimulus.text ? _jsx(Text, { style: { whiteSpace: "pre-wrap" }, children: stimulus.text }) : null,
      stimulus.scene ? _jsx(SceneView, { scene: stimulus.scene }) : null,
    ],
  });
}
export function AnswerView({ option }) {
  if (!option) return _jsx(Text, { children: "\u043F\u0440\u043E\u043F\u0443\u0441\u043A" });
  return _jsxs(Stack, {
    gap: 4,
    w: "100%",
    miw: 0,
    children: [
      option.text ? _jsx(Text, { style: { whiteSpace: "pre-wrap" }, children: option.text }) : null,
      option.scene ? _jsx(SceneView, { scene: option.scene }) : null,
    ],
  });
}
