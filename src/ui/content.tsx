import type { Option, Stimulus } from '../domain/types.ts'
import { NumberGrid, SceneView } from '../scenes/SceneView.tsx'
import { Stack, Text } from '@mantine/core'

export function StimulusView({ stimulus }: { stimulus: Stimulus }) {
  return (
    <Stack gap="sm">
      {stimulus.text ? (
        <Text style={{ whiteSpace: 'pre-wrap' }}>{stimulus.text}</Text>
      ) : null}
      {stimulus.rows ? <NumberGrid rows={stimulus.rows} /> : null}
      {stimulus.scene ? <SceneView scene={stimulus.scene} /> : null}
    </Stack>
  )
}

export function AnswerView({ option }: { option: Option | null }) {
  if (!option) return <Text>пропуск</Text>
  return (
    <Stack gap={4}>
      {option.text ? <Text style={{ whiteSpace: 'pre-wrap' }}>{option.text}</Text> : null}
      {option.scene ? <SceneView scene={option.scene} /> : null}
    </Stack>
  )
}
