import { Alert, Group, Paper, Radio, Stack, Text } from "@mantine/core";
import type { Item } from "../domain/types.ts";
import { NumberToken } from "./CalcGrid.tsx";
import { StimulusView } from "./content.tsx";
import { LETTERS, optionsInColumn } from "./options.ts";
import classes from "./Shell.module.css";

type TaskCardProps = {
  item: Item;
  selection: string | null;
  onSelect: (optionId: string) => void;
  hintOpen: boolean;
  expired: boolean;
};

export function TaskCard({ item, selection, onSelect, hintOpen, expired }: TaskCardProps) {
  const column = optionsInColumn(item.options);
  return (
    <Stack gap="md">
      <StimulusView stimulus={item.stimulus} type={item.type} />
      {hintOpen ? (
        <Paper withBorder p="sm" radius="md" bg="orange.0">
          <Text size="sm">{item.hint}</Text>
        </Paper>
      ) : null}
      {expired ? (
        <Alert color="orange" radius="md">
          Время ответа истекло
        </Alert>
      ) : null}
      <Radio.Group value={selection} onChange={onSelect} disabled={expired}>
        <div className={column ? classes.options : `${classes.options} ${classes.optionsInline}`}>
          {item.options.map((option, index) => (
            <Radio.Card key={option.id} value={option.id} withBorder p="sm" radius="md" disabled={expired}>
              <Group className={classes.optionLine} align="flex-start" wrap="nowrap" gap="sm">
                <Group gap={6} wrap="nowrap" align="center">
                  <Radio.Indicator disabled={expired} />
                  <Text fw={700} c="teal">
                    {LETTERS[index]}
                  </Text>
                </Group>
                <Stack className={classes.optionScene} gap={4}>
                  {option.text ? (
                    item.type === "calc-grid" ? (
                      <NumberToken value={option.text} />
                    ) : (
                      <Text style={{ whiteSpace: "pre-wrap" }}>{option.text}</Text>
                    )
                  ) : null}
                  {option.scene ? <StimulusView stimulus={{ scene: option.scene }} /> : null}
                </Stack>
              </Group>
            </Radio.Card>
          ))}
        </div>
      </Radio.Group>
    </Stack>
  );
}
