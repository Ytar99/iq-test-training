import { Box, Button, Divider, Flex, Group, Paper, SimpleGrid, Stack, Switch, Text, Title } from "@mantine/core";
import { SCALES } from "../domain/catalog.ts";
import { bankIssues } from "../domain/bank.ts";
import { SCALE_ORDER, type ScaleId } from "../domain/types.ts";
import { Shell } from "./Shell.tsx";
import classes from "./StartScreen.module.css";

type StartScreenProps = {
  selected: ScaleId[];
  hints: boolean;
  explanations: boolean;
  preferReal: boolean;
  assembleError: string | null;
  onToggleScale: (scaleId: ScaleId) => void;
  onToggleHints: () => void;
  onToggleExplanations: () => void;
  onTogglePreferReal: () => void;
  onAll: () => void;
  onNone: () => void;
  onStart: () => void;
};

function ColumnTitle({ children }: { children: string }) {
  return (
    <Group gap="xs" wrap="nowrap">
      <Box className={classes.mark} />
      <Text fw={700}>{children}</Text>
    </Group>
  );
}

export function StartScreen({
  selected,
  hints,
  explanations,
  preferReal,
  assembleError,
  onToggleScale,
  onToggleHints,
  onToggleExplanations,
  onTogglePreferReal,
  onAll,
  onNone,
  onStart,
}: StartScreenProps) {
  const blocked = selected.length === 0 || bankIssues.length > 0;
  return (
    <Shell>
      <Stack gap="lg" maw={720} mx="auto" w="100%">
        <Stack gap="xs">
          <Title order={2}>Тренажер</Title>
          <Text>Это тренировка по формату ТИПС, результат не является оценкой HT Lab.</Text>
        </Stack>
        <Paper withBorder radius="md" p="md">
          <Flex direction={{ base: "column", md: "row" }} gap="lg" align="stretch">
            <Stack gap="sm" flex={1}>
              <Group justify="space-between" align="center" wrap="nowrap">
                <ColumnTitle>Шкалы</ColumnTitle>
                <Text size="sm" c="dimmed">
                  Выбрано {selected.length} из 7
                </Text>
              </Group>
              <Stack gap={0}>
                {SCALE_ORDER.map((scaleId) => (
                  <Switch
                    key={scaleId}
                    checked={selected.includes(scaleId)}
                    onChange={() => onToggleScale(scaleId)}
                    color="teal"
                    size="md"
                    labelPosition="left"
                    label={SCALES[scaleId].name}
                    classNames={{ root: classes.scaleSwitch, body: classes.scaleBody }}
                  />
                ))}
              </Stack>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                <Button fullWidth variant="light" color="teal" onClick={onAll}>
                  Выбрать все
                </Button>
                <Button fullWidth variant="default" onClick={onNone}>
                  Снять все
                </Button>
              </SimpleGrid>
            </Stack>
            <Divider orientation="vertical" visibleFrom="md" />
            <Divider hiddenFrom="md" />
            <Stack gap="md" flex={1}>
              <ColumnTitle>Настройки тренировки</ColumnTitle>
              <Switch
                checked={preferReal}
                onChange={onTogglePreferReal}
                color="teal"
                size="md"
                label="Предпочтительно реальные"
              />
              <Switch checked={hints} onChange={onToggleHints} color="teal" size="md" label="Подсказки" />
              <Switch
                checked={explanations}
                onChange={onToggleExplanations}
                color="teal"
                size="md"
                label="Пояснения к ответу"
              />
            </Stack>
          </Flex>
        </Paper>
        <Button fullWidth size="lg" color="teal" disabled={blocked} onClick={onStart}>
          Начать
        </Button>
        {bankIssues.length > 0 ? (
          <Paper withBorder p="md" radius="md">
            <Stack gap={4}>
              {bankIssues.map((issue) => (
                <Text key={issue} c="red" size="sm">
                  {issue}
                </Text>
              ))}
            </Stack>
          </Paper>
        ) : null}
        {assembleError ? (
          <Text c="red" size="sm">
            {assembleError}
          </Text>
        ) : null}
      </Stack>
    </Shell>
  );
}
