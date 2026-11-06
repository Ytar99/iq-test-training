import { Blockquote, Stack, Text } from "@mantine/core";
import type { Option, Stimulus } from "../domain/types.ts";
import { SceneView } from "../scenes/SceneView.tsx";
import { CalcGridView, NumberToken } from "./CalcGrid.tsx";
import { SignChain, SignExpression } from "./SignKeys.tsx";
import classes from "./content.module.css";

// Цитата держит только материал для ознакомления: посылки, пары аналогий,
// тексты для сверки. Вне её остаются вопрос и инструкция — строка с вопросом,
// повелительная строка, вводная строка с двоеточием и итоговый prompt про
// вывод. Пара аналогии со знаком вопроса ("нога" – ?) — материал, а не вопрос.
const PAIR_LINE = /^"[^"]*"\s*[-–]\s*(\?|"[^"]*")$/;
const IMPERATIVE =
  /^(решите|выберите|подберите|укажите|найдите|представьте|расшифруйте|вставьте|расставьте|продолжите|определите|восстановите|сосчитайте|посчитайте)$/i;
const CONCLUSION_PROMPT = /вывод[.]?$/;

function isFraming(line: string, isLast: boolean): boolean {
  const trimmed = line.trim();
  if (trimmed.endsWith(":")) return true;
  if (trimmed.endsWith("?") && !PAIR_LINE.test(trimmed)) return true;
  const firstWord = (trimmed.split(/[\s,(]/, 1)[0] ?? "").replace(/[.,:;!?»"]+$/, "");
  if (IMPERATIVE.test(firstWord)) return true;
  if (isLast && CONCLUSION_PROMPT.test(trimmed)) return true;
  return false;
}

type QuoteLayout = { head: string[]; quote: string[]; tail: string[] };

function quoteLayout(lines: string[]): QuoteLayout {
  const framing = lines.map((line, index) => isFraming(line, index === lines.length - 1));
  const material = (index: number) => lines[index]!.trim() !== "" && !framing[index];
  const indexes = lines.map((_, index) => index).filter(material);
  if (indexes.length === 0) return { head: [], quote: [], tail: lines.filter((line) => line.trim() !== "") };
  const first = indexes[0]!;
  const last = indexes[indexes.length - 1]!;
  return {
    head: lines.slice(0, first).filter((_, index) => framing[index]),
    quote: lines.slice(first, last + 1).filter((line) => line.trim() !== ""),
    tail: lines.slice(last + 1).filter((_, index) => framing[last + 1 + index]),
  };
}

export function StimulusView({ stimulus, type }: { stimulus: Stimulus; type?: string }) {
  const grid = type === "calc-grid" && stimulus.text;
  const signs = type === "calc-signs" && stimulus.text;
  const lines = !grid && !signs && stimulus.text ? stimulus.text.split("\n") : null;
  const multi = lines !== null && lines.length > 1 && lines.slice(1).some((line) => line.trim() !== "");
  const layout = multi && lines ? quoteLayout(lines) : null;
  return (
    <Stack gap="sm" w="100%" miw={0}>
      {grid ? <CalcGridView text={stimulus.text ?? ""} /> : null}
      {signs ? <SignExpression text={stimulus.text ?? ""} /> : null}
      {layout ? (
        <>
          {layout.head.map((line, index) => (
            <Text key={index} style={{ whiteSpace: "pre-wrap" }}>
              {line}
            </Text>
          ))}
          {layout.quote.length > 0 ? (
            <Blockquote color="teal" radius="md">
              <Stack gap={4}>
                {layout.quote.map((line, index) => (
                  <Text key={index} style={{ whiteSpace: "pre-wrap" }}>
                    {line}
                  </Text>
                ))}
              </Stack>
            </Blockquote>
          ) : null}
          {layout.tail.map((line, index) => (
            <Text key={index} style={{ whiteSpace: "pre-wrap" }}>
              {line}
            </Text>
          ))}
        </>
      ) : null}
      {!grid && !signs && stimulus.text && !multi ? (
        <Text style={{ whiteSpace: "pre-wrap" }}>{stimulus.text}</Text>
      ) : null}
      {stimulus.scene ? <SceneView scene={stimulus.scene} /> : null}
    </Stack>
  );
}

export function AnswerView({ option, type, centered }: { option: Option | null; type?: string; centered?: boolean }) {
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
