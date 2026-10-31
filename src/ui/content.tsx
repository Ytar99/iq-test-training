import type { Option, Stimulus } from '../domain/types.ts'
import { SceneView } from '../scenes/SceneView.tsx'
import { Stack, Text } from '@mantine/core'

export function StimulusView({ stimulus }: { stimulus: Stimulus }) {
  return (
    <Stack gap="sm" w="100%" miw={0}>
      {stimulus.text ? (
        <Text style={{ whiteSpace: 'pre-wrap' }}>{stimulus.text}</Text>
      ) : null}
      {stimulus.scene ? <SceneView scene={stimulus.scene} /> : null}
    </Stack>
  )
}

export function AnswerView({ option }: { option: Option | null }) {
  if (!option) return <Text>пропуск</Text>
  return (
    <Stack gap={4} w="100%" miw={0}>
      {option.text ? <Text style={{ whiteSpace: 'pre-wrap' }}>{option.text}</Text> : null}
      {option.scene ? <SceneView scene={option.scene} /> : null}
    </Stack>
  )
}
