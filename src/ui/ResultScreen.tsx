import { Button, Group, Paper, SegmentedControl, SimpleGrid, Stack, Table, Text, Title } from "@mantine/core";
import { useState } from "react";
import { SCALES, TYPE_LABEL } from "../domain/catalog.ts";
import { grade, type AttemptState, type ItemSlot } from "../domain/attempt.ts";
import { formatClock } from "../domain/format.ts";
import { SCALE_ORDER, type ScaleId } from "../domain/types.ts";
import { AnswerView, StimulusView } from "./content.tsx";
import { Shell } from "./Shell.tsx";
import classes from "./ResultScreen.module.css";

type FilterId = "all" | "correct" | "wrong";

const filterLabel: Record<FilterId, string> = {
  all: "Все",
  correct: "Правильные",
  wrong: "Ошибки",
};

type Row = {
  key: string;
  scaleId: ScaleId;
  number: number;
  slot: ItemSlot;
  mark: "correct" | "wrong" | "skip";
};

function tally(slots: ItemSlot[]) {
  const counts = { correct: 0, wrong: 0, skip: 0 };
  for (const slot of slots) counts[grade(slot)] += 1;
  return counts;
}

function optionOf(slot: ItemSlot, optionId: string | null) {
  if (!optionId) return null;
  return slot.item.options.find((option) => option.id === optionId) ?? null;
}

export function ResultScreen({
  state,
  onPrint,
  onRestart,
}: {
  state: AttemptState;
  onPrint: () => void;
  onRestart: () => void;
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const rows: Row[] = state.blocks.flatMap((block) =>
    block.slots.map((slot, index) => ({
      key: slot.item.id,
      scaleId: block.scaleId,
      number: index + 1,
      slot,
      mark: grade(slot),
    })),
  );
  const counts = {
    all: rows.length,
    correct: rows.filter((row) => row.mark === "correct").length,
    wrong: rows.filter((row) => row.mark !== "correct").length,
  };
  const visible = rows.filter((row) => {
    if (filter === "correct") return row.mark === "correct";
    if (filter === "wrong") return row.mark !== "correct";
    return true;
  });
  const scaleNames =
    state.blocks.length === SCALE_ORDER.length
      ? "Полный тест"
      : state.blocks.map((block) => SCALES[block.scaleId].name).join(", ");
  const typeOrder = SCALE_ORDER.flatMap((scaleId) => SCALES[scaleId].forms.map((form) => form.type));
  const typeRows = typeOrder
    .map((type) => {
      const slots = rows.filter((row) => row.slot.item.type === type).map((row) => row.slot);
      return { type, ...tally(slots), count: slots.length };
    })
    .filter((row) => row.count > 0);

  const scaleBody = state.blocks.map((block) => {
    const countsForScale = tally(block.slots);
    const spent = block.spentSec ?? block.limitSec - block.remainingSec;
    return { block, countsForScale, spent };
  });

  return (
    <Shell>
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>Итог</Title>
          {state.finishedAt != null ? <Text>{new Date(state.finishedAt).toLocaleString("ru-RU")}</Text> : null}
          <Text>{scaleNames}</Text>
          <Text className="print-only">Задания: {filterLabel[filter]}</Text>
        </Stack>

        <div className={`${classes.summaryTable} keep-together`}>
          <Table withTableBorder withColumnBorders tabularNums>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Шкала</Table.Th>
                <Table.Th>Верно</Table.Th>
                <Table.Th>Неверно</Table.Th>
                <Table.Th>Пропуск</Table.Th>
                <Table.Th>Время</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {scaleBody.map(({ block, countsForScale, spent }) => (
                <Table.Tr key={block.scaleId}>
                  <Table.Td>{SCALES[block.scaleId].name}</Table.Td>
                  <Table.Td>{countsForScale.correct}</Table.Td>
                  <Table.Td>{countsForScale.wrong}</Table.Td>
                  <Table.Td>{countsForScale.skip}</Table.Td>
                  <Table.Td>{formatClock(spent)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
        <div className={classes.summaryCards}>
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            {scaleBody.map(({ block, countsForScale, spent }) => (
              <Paper key={block.scaleId} withBorder p="sm" radius="md" className="keep-together">
                <Text fw={700}>{SCALES[block.scaleId].name}</Text>
                <Text size="sm">Верно: {countsForScale.correct}</Text>
                <Text size="sm">Неверно: {countsForScale.wrong}</Text>
                <Text size="sm">Пропуск: {countsForScale.skip}</Text>
                <Text size="sm">Время: {formatClock(spent)}</Text>
              </Paper>
            ))}
          </SimpleGrid>
        </div>

        <div className="keep-together">
          <Table withTableBorder withColumnBorders tabularNums>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Тип</Table.Th>
                <Table.Th>Верно</Table.Th>
                <Table.Th>Неверно</Table.Th>
                <Table.Th>Пропуск</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {typeRows.map((row) => (
                <Table.Tr key={row.type}>
                  <Table.Td>{TYPE_LABEL[row.type] ?? row.type}</Table.Td>
                  <Table.Td>{row.correct}</Table.Td>
                  <Table.Td>{row.wrong}</Table.Td>
                  <Table.Td>{row.skip}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>

        <Stack gap="sm">
          <SegmentedControl
            className="no-print"
            fullWidth
            color="teal"
            value={filter}
            onChange={(value) => setFilter(value as FilterId)}
            data={[
              { value: "all", label: `Все (${counts.all})` },
              { value: "correct", label: `Правильные (${counts.correct})` },
              { value: "wrong", label: `Ошибки (${counts.wrong})` },
            ]}
          />
          {visible.length === 0 ? <Text>Таких заданий нет</Text> : null}
          {visible.map((row) => {
            const chosen = row.slot.outcome.kind === "answer" ? optionOf(row.slot, row.slot.outcome.optionId) : null;
            const correct = optionOf(row.slot, row.slot.item.correctOptionId);
            const markText = row.mark === "correct" ? "верно" : row.mark === "wrong" ? "неверно" : "пропуск";
            return (
              <Paper key={row.key} withBorder p="md" radius="md" className="keep-together">
                <Stack gap="xs">
                  <Text fw={700}>
                    {SCALES[row.scaleId].name}, задание {row.number}
                  </Text>
                  <StimulusView stimulus={row.slot.item.stimulus} type={row.slot.item.type} />
                  <Text fw={600}>Ваш ответ</Text>
                  <AnswerView option={chosen} chip={row.slot.item.type === "calc-grid"} />
                  <Text fw={600}>Верный ответ</Text>
                  <AnswerView option={correct} chip={row.slot.item.type === "calc-grid"} />
                  {state.explanations ? <Text size="sm">{row.slot.item.explanation}</Text> : null}
                  <Text c={row.mark === "correct" ? "teal" : row.mark === "wrong" ? "orange" : "dimmed"}>
                    {markText}
                  </Text>
                </Stack>
              </Paper>
            );
          })}
        </Stack>

        <Group className="no-print">
          <Button color="teal" onClick={onPrint}>
            Сохранить отчет в PDF
          </Button>
          <Button variant="default" onClick={onRestart}>
            На старт
          </Button>
        </Group>
      </Stack>
    </Shell>
  );
}
