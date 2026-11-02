import { Stack, Text } from "@mantine/core";
import type { Option, Stimulus } from "../domain/types.ts";
import { SceneView } from "../scenes/SceneView.tsx";
import { CalcGridView, NumberToken } from "./CalcGrid.tsx";

export function StimulusView({ stimulus, type }: { stimulus: Stimulus; type?: string }) {
  const grid = type === "calc-grid" && stimulus.text;
  return (
    <Stack gap="sm" w="100%" miw={0}>
      {grid ? <CalcGridView text={stimulus.text ?? ""} /> : null}
      {!grid && stimulus.text ? <Text style={{ whiteSpace: "pre-wrap" }}>{stimulus.text}</Text> : null}
      {stimulus.scene ? <SceneView scene={stimulus.scene} /> : null}
    </Stack>
  );
}

export function AnswerView({ option, chip = false }: { option: Option | null; chip?: boolean }) {
  if (!option) return <Text>пропуск</Text>;
  return (
    <Stack gap={4} w="100%" miw={0}>
      {option.text ? (
        chip ? (
          <NumberToken value={option.text} />
        ) : (
          <Text style={{ whiteSpace: "pre-wrap" }}>{option.text}</Text>
        )
      ) : null}
      {option.scene ? <SceneView scene={option.scene} /> : null}
    </Stack>
  );
}
