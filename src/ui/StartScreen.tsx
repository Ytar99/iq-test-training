import { Button, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { SCALES } from '../domain/catalog.ts'
import { bankIssues } from '../domain/bank.ts'
import { SCALE_ORDER, type ScaleId } from '../domain/types.ts'
import { Shell } from './Shell.tsx'

type StartScreenProps = {
  selected: ScaleId[]
  hints: boolean
  explanations: boolean
  assembleError: string | null
  onToggleScale: (scaleId: ScaleId) => void
  onToggleHints: () => void
  onToggleExplanations: () => void
  onAll: () => void
  onNone: () => void
  onStart: () => void
}

function Tile({
  pressed,
  color,
  children,
  onClick,
}: {
  pressed: boolean
  color: 'teal' | 'orange'
  children: string
  onClick: () => void
}) {
  return (
    <Button
      fullWidth
      size="md"
      variant={pressed ? 'filled' : 'outline'}
      color={color}
      aria-pressed={pressed}
      onClick={onClick}
      styles={{
        root: { height: 'auto', paddingBlock: '0.55rem' },
        label: { whiteSpace: 'normal', textAlign: 'center', lineHeight: 1.25 },
      }}
    >
      {children}
    </Button>
  )
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
}: StartScreenProps) {
  const blocked = selected.length === 0 || bankIssues.length > 0
  return (
    <Shell>
      <Stack gap="xl" maw={720} mx="auto" w="100%">
        <Stack gap="xs">
          <Title order={2}>Тренажер</Title>
          <Text>Это тренировка по формату ТИПС, результат не является оценкой HT Lab.</Text>
        </Stack>
        <Stack gap="sm">
          <Group justify="space-between" align="baseline" wrap="nowrap">
            <Text fw={700}>Шкалы</Text>
            <Text size="sm" c="dimmed">
              Выбрано {selected.length} из 7
            </Text>
          </Group>
          <SimpleGrid cols={2} spacing="sm">
            {SCALE_ORDER.map((scaleId) => (
              <Tile key={scaleId} pressed={selected.includes(scaleId)} color="teal" onClick={() => onToggleScale(scaleId)}>
                {SCALES[scaleId].name}
              </Tile>
            ))}
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
            <Button fullWidth variant="light" color="teal" onClick={onAll}>
              Полный тест
            </Button>
            <Button fullWidth variant="default" onClick={onNone}>
              Снять все
            </Button>
          </SimpleGrid>
        </Stack>
        <SimpleGrid cols={2} spacing="sm">
          <Stack gap={6}>
            <Tile pressed={hints} color="orange" onClick={onToggleHints}>
              Подсказки
            </Tile>
            <Text size="sm" c="dimmed">
              На задании появится кнопка "Подсказка". Таймеры идут, балл не меняется.
            </Text>
          </Stack>
          <Stack gap={6}>
            <Tile pressed={explanations} color="orange" onClick={onToggleExplanations}>
              Пояснения к ответу
            </Tile>
            <Text size="sm" c="dimmed">
              На итоге под верным ответом будет короткое пояснение.
            </Text>
          </Stack>
        </SimpleGrid>
        <Button fullWidth size="md" color="teal" disabled={blocked} onClick={onStart}>
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
  )
}
