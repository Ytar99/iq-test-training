import { Box, Button, Group, Stack, Text } from '@mantine/core'
import type { ReactNode } from 'react'
import { formatClock } from '../domain/format.ts'
import classes from './Shell.module.css'

type StripCell = {
  opened: boolean
  current: boolean
}

type ShellProps = {
  center?: string
  blockLabel?: string
  blockSeconds?: number
  itemSeconds?: number | null
  strip?: StripCell[]
  menu?: ReactNode
  left?: ReactNode
  right?: ReactNode
  bottom?: ReactNode
  children: ReactNode
}

export function Shell({ center, blockLabel, blockSeconds, itemSeconds, strip, menu, left, right, bottom, children }: ShellProps) {
  const task = Boolean(left || right)
  const phoneLine = [blockLabel, center].filter(Boolean).join(' · ')
  return (
    <Box className={classes.page}>
      <Box className={classes.sheet}>
        <Box className={`${classes.header} no-print`}>
          <Group className={classes.headerStart} gap="xs" wrap="nowrap">
            {menu}
            <Text fw={700}>Тренажер</Text>
            {blockLabel ? (
              <Text size="sm" visibleFrom="md">
                {blockLabel}
              </Text>
            ) : null}
          </Group>
          {center ? (
            <Text className={classes.centerTitle} fw={600} size="sm" visibleFrom="md">
              {center}
            </Text>
          ) : null}
          <Group className={classes.headerEnd} gap="xs" wrap="nowrap">
            {blockSeconds != null ? (
              <Text className={classes.clock} c="teal" size="sm">
                {formatClock(blockSeconds)}
              </Text>
            ) : null}
            {itemSeconds != null ? (
              <Text className={classes.clock} c="orange" size="sm">
                {formatClock(itemSeconds)}
              </Text>
            ) : null}
          </Group>
          {phoneLine ? (
            <Text className={classes.phoneMeta} hiddenFrom="md" size="sm" fw={600} ta="center">
              {phoneLine}
            </Text>
          ) : null}
        </Box>
        {strip ? (
          <Group gap={6} grow wrap="nowrap" aria-hidden="true">
            {strip.map((cell, index) => (
              <Box
                key={index}
                h={8}
                bg={cell.current ? 'orange' : cell.opened ? 'teal' : 'gray.3'}
                style={{ borderRadius: 99 }}
              />
            ))}
          </Group>
        ) : null}
        <Box className={task ? classes.taskBody : undefined}>
          {left}
          <Box className={bottom ? classes.contentPad : undefined}>{children}</Box>
          {right}
        </Box>
        {bottom ? <Box className={`${classes.bottom} no-print`}>{bottom}</Box> : null}
      </Box>
    </Box>
  )
}

export function SideButtons({ children }: { children: ReactNode }) {
  return (
    <Stack gap="xs" visibleFrom="md" className="no-print">
      {children}
    </Stack>
  )
}

export function NavButton(props: {
  children: string
  onClick?: () => void
  disabled?: boolean
  color?: string
  variant?: 'default' | 'filled' | 'light' | 'outline' | 'subtle'
  pressed?: boolean
}) {
  return (
    <Button
      fullWidth
      variant={props.variant ?? 'default'}
      color={props.color}
      disabled={props.disabled}
      onClick={props.onClick}
      aria-pressed={props.pressed}
    >
      {props.children}
    </Button>
  )
}
