import { Blockquote, Stack, Text } from "@mantine/core";
import type { Option, Stimulus } from "../domain/types.ts";
import { SceneView } from "../scenes/SceneView.tsx";
import { CalcGridView, NumberToken } from "./CalcGrid.tsx";
import { SignChain, SignExpression } from "./SignKeys.tsx";
import classes from "./content.module.css";

export function StimulusView({ stimulus, type }: { stimulus: Stimulus; type?: string }) {
  const grid = type === "calc-grid" && stimulus.text;
  const signs = type === "calc-signs" && stimulus.text;
  const parts = !grid && !signs && stimulus.text ? stimulus.text.split("\n") : null;
  const quoted = parts && parts.length > 1 && parts.slice(1).some((part) => part.trim() !== "");
  return (
    <Stack gap="sm" w="100%" miw={0}>
      {grid ? <CalcGridView text={stimulus.text ?? ""} /> : null}
      {signs ? <SignExpression text={stimulus.text ?? ""} /> : null}
      {parts && quoted ? (
        <>
          <Text style={{ whiteSpace: "pre-wrap" }}>{parts[0]}</Text>
          <Blockquote color="teal" radius="md">
            {parts.slice(1).join("\n")}
          </Blockquote>
        </>
      ) : null}
      {parts && !quoted ? <Text style={{ whiteSpace: "pre-wrap" }}>{stimulus.text}</Text> : null}
      {stimulus.scene ? <SceneView scene={stimulus.scene} /> : null}
    </Stack>
  );
}

export function AnswerView({
  option,
  type,
  centered,
}: {
  option: Option | null;
  type?: string;
  centered?: boolean;
}) {
  if (!option) return <Text>пропуск</Text>;
  return (
    <Stack gap={4} w="100%" miw={0} className={centered ? classes.answerCentered : undefined}>
      {option.text ? (
        type === "calc-grid" ? (
          <NumberToken value={option.text} />
        ) : type === "calc-signs" ? (
          <SignChain text={option.text} />
        ) : (
          <Text style={{ whiteSpace: "pre-wrap" }}>{option.text}</Text>
        )
      ) : null}
      {option.scene ? <SceneView scene={option.scene} centered={centered} /> : null}
    </Stack>
  );
}
