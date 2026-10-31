export const SCALE_ORDER = [
  'calculation',
  'vocabulary',
  'erudition',
  'spatial',
  'nonverbal',
  'verbal',
  'attention',
] as const

export type ScaleId = (typeof SCALE_ORDER)[number]

export const TOPICS = [
  'geography',
  'history',
  'science',
  'culture',
  'economy',
  'nature',
  'sport',
] as const

export type EruditionTopic = (typeof TOPICS)[number]

export type Source = 'demo' | 'analog'
export type Difficulty = 'easy' | 'medium' | 'hard'

export type CardShape = 'square' | 'circle' | 'triangle' | 'diamond' | 'line' | 'dot'

export type CardElement = {
  shape: CardShape
  x: number
  y: number
  size: number
  dir?: 'up' | 'down'
}

export type CardContent = {
  elements: CardElement[]
}

export type FaceMark = 'blank' | 'circle' | 'triangle' | 'square' | 'line'

export type SchemePart =
  | { type: 'circle' }
  | { type: 'rect'; labels?: Partial<Record<'top' | 'right' | 'bottom' | 'left', string>> }
  | { type: 'label'; text: string; place: 'top' | 'right' | 'bottom' | 'left' }
  | { type: 'arrow'; dir: 'up' | 'down' | 'left' | 'right' }

export type Scene =
  | { kind: 'scheme'; parts: SchemePart[] }
  | {
      kind: 'cells'
      cols?: number
      rows?: number
      filled?: number[][]
      pieces?: number[][][]
      mode?: 'rotate' | 'mirror'
    }
  | { kind: 'card'; elements: CardElement[] }
  | { kind: 'matrix'; cells: (CardContent | null)[][] }
  | { kind: 'sequence'; steps: CardContent[] }
  | { kind: 'analogy'; pair: [CardContent, CardContent]; given: CardContent }
  | { kind: 'group'; cards: CardContent[] }
  | { kind: 'net'; layout: (FaceMark | null)[][] }
  | { kind: 'cube'; front: FaceMark; top: FaceMark; right: FaceMark }
  | { kind: 'chart'; variant: 'bar' | 'line'; labels: string[]; values: number[] }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'stack'; heights: number[][]; view: 'iso' | 'top' }

export type Stimulus = {
  text?: string
  scene?: Scene
  rows?: (string | null)[][]
}

export type Option = {
  id: string
  text?: string
  scene?: Scene
}

export type Item = {
  id: string
  scale: ScaleId
  type: string
  source: Source
  topic?: EruditionTopic
  difficulty: Difficulty
  stimulus: Stimulus
  options: Option[]
  correctOptionId: string
  shuffle: boolean
  hint: string
  explanation: string
}
