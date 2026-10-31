import { Button, Group, Paper, Radio, SimpleGrid, Stack, Text } from '@mantine/core'
import { useState } from 'react'
import { SCALES } from '../domain/catalog.ts'
import type { AttemptAction, AttemptState } from '../domain/attempt.ts'
import { formatClock } from '../domain/format.ts'
import { StimulusView } from './content.tsx'
import { LETTERS, optionsInColumn } from './options.ts'
import { NavButton, Shell, SideButtons } from './Shell.tsx'
import classes from './Shell.module.css'

type TrainerProps = {
  state: AttemptState
  dispatch: (action: AttemptAction) => void
  onMenu: () => void
}

export function Trainer({ state, dispatch, onMenu }: TrainerProps) {
  const phase = state.phase
  const scaleIndex = phase.kind === 'result' ? 0 : phase.scaleIndex
  const block = state.blocks[scaleIndex]
  const itemIndex = phase.kind === 'task' ? phase.itemIndex : phase.kind === 'instruction' && phase.mode === 'return' ? phase.itemIndex : null
  const slot = itemIndex == null || !block ? null : block.slots[itemIndex]
  const [hintFor, setHintFor] = useState<string | null>(null)
  if (!block || phase.kind === 'result') return null

  const info = SCALES[block.scaleId]
  const onTask = phase.kind === 'task'
  const returned = phase.kind === 'instruction' && phase.mode === 'return'
  const hintOpen = Boolean(slot && hintFor === slot.item.id && state.hints)
  const column = slot ? optionsInColumn(slot.item.options) : true
  const strip = block.slots.map((item, index) => ({
    opened: item.opened,
    current: itemIndex === index,
  }))

  const menu = (
    <Button hiddenFrom="md" variant="subtle" color="teal" size="compact-sm" onClick={onMenu}>
      Меню
    </Button>
  )
  const hintButton = state.hints && slot ? (
    <NavButton
      color="orange"
      variant={hintOpen ? 'filled' : 'light'}
      pressed={hintOpen}
      onClick={() => setHintFor(hintOpen ? null : slot.item.id)}
    >
      Подсказка
    </NavButton>
  ) : null
  const backDisabled = !onTask || phase.itemIndex === 0
  const instructionDisabled = !onTask

  const left = (
    <SideButtons>
      <NavButton onClick={onMenu}>Меню</NavButton>
      <NavButton disabled={backDisabled} onClick={() => dispatch({ type: 'back' })}>
        Назад
      </NavButton>
      <NavButton disabled={instructionDisabled} onClick={() => dispatch({ type: 'instruction' })}>
        Инструкция
      </NavButton>
      {hintButton}
    </SideButtons>
  )
  const right = (
    <SideButtons>
      <NavButton color="teal" variant="filled" onClick={() => dispatch({ type: 'next' })}>
        Далее
      </NavButton>
    </SideButtons>
  )
  const bottom = (
    <Group className={classes.phoneBar} hiddenFrom="md" grow gap={4} wrap="nowrap">
      <Button size="compact-xs" variant="default" disabled={backDisabled} onClick={() => dispatch({ type: 'back' })}>
        Назад
      </Button>
      <Button size="compact-xs" variant="default" disabled={instructionDisabled} onClick={() => dispatch({ type: 'instruction' })}>
        Инструкция
      </Button>
      {state.hints && slot ? (
        <Button
          size="compact-xs"
          color="orange"
          variant={hintOpen ? 'filled' : 'light'}
          aria-pressed={hintOpen}
          onClick={() => setHintFor(hintOpen ? null : slot.item.id)}
        >
          Подсказка
        </Button>
      ) : null}
      <Button size="compact-xs" color="teal" onClick={() => dispatch({ type: 'next' })}>
        Далее
      </Button>
    </Group>
  )

  return (
    <Shell
      center={onTask && slot ? `Задание ${itemIndex! + 1} / 12` : 'Инструкция к блоку'}
      blockLabel={`Блок ${scaleIndex + 1} / ${state.blocks.length}`}
      blockSeconds={block.remainingSec}
      itemSeconds={returned || onTask ? slot?.remainingSec ?? null : null}
      strip={strip}
      menu={menu}
      left={left}
      right={right}
      bottom={bottom}
    >
      {onTask && slot ? (
        <Stack gap="md" className={classes.content}>
          <StimulusView stimulus={slot.item.stimulus} />
          {hintOpen ? (
            <Paper withBorder p="sm" radius="md" bg="orange.0">
              <Text size="sm">{slot.item.hint}</Text>
            </Paper>
          ) : null}
          <Radio.Group
            value={slot.selection}
            onChange={(value) => dispatch({ type: 'select', optionId: value })}
            disabled={slot.remainingSec === 0}
          >
            <div className={column ? classes.options : `${classes.options} ${classes.optionsInline}`}>
              {slot.item.options.map((option, index) => (
                <Radio.Card key={option.id} value={option.id} withBorder p="sm" radius="md">
                  <Group className={classes.optionLine} align="flex-start" wrap="nowrap" gap="sm">
                    <Radio.Indicator />
                    <Text fw={700} c="teal">
                      {LETTERS[index]}
                    </Text>
                    <Stack className={classes.optionScene} gap={4}>
                      {option.text ? <Text style={{ whiteSpace: 'pre-wrap' }}>{option.text}</Text> : null}
                      {option.scene ? <StimulusView stimulus={{ scene: option.scene }} /> : null}
                    </Stack>
                  </Group>
                </Radio.Card>
              ))}
            </div>
          </Radio.Group>
        </Stack>
      ) : (
        <Stack gap="md" maw={760}>
          <Text fw={700} size="xl">
            {info.name}
          </Text>
          <Text>{info.instruction}</Text>
          <Text>В блоке 12 заданий.</Text>
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
            <Paper withBorder p="md" radius="md">
              <Text ta="center" fw={700} size="xl" c="teal">
                12
              </Text>
              <Text ta="center" size="sm" c="dimmed">
                заданий
              </Text>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Text ta="center" fw={700} size="xl" c="teal">
                {info.itemSec}
              </Text>
              <Text ta="center" size="sm" c="dimmed">
                секунд на задание
              </Text>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Text ta="center" fw={700} size="xl" c="orange">
                {formatClock(info.blockSec)}
              </Text>
              <Text ta="center" size="sm" c="dimmed">
                на блок
              </Text>
            </Paper>
          </SimpleGrid>
          <Text>Выбор верного ответа из {info.optionCount} вариантов.</Text>
          {hintOpen && slot ? (
            <Paper withBorder p="sm" radius="md" bg="orange.0">
              <Text size="sm">{slot.item.hint}</Text>
            </Paper>
          ) : null}
        </Stack>
      )}
    </Shell>
  )
}
