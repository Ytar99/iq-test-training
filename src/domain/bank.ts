import calculationJson from '../../data/calculation.json' with { type: 'json' }
import vocabularyJson from '../../data/vocabulary.json' with { type: 'json' }
import eruditionJson from '../../data/erudition.json' with { type: 'json' }
import spatialJson from '../../data/spatial.json' with { type: 'json' }
import nonverbalJson from '../../data/nonverbal.json' with { type: 'json' }
import verbalJson from '../../data/verbal.json' with { type: 'json' }
import attentionJson from '../../data/attention.json' with { type: 'json' }
import { validateBank } from './validate.ts'
import type { Item, ScaleId } from './types.ts'

const files: { scale: ScaleId; items: unknown }[] = [
  { scale: 'calculation', items: calculationJson },
  { scale: 'vocabulary', items: vocabularyJson },
  { scale: 'erudition', items: eruditionJson },
  { scale: 'spatial', items: spatialJson },
  { scale: 'nonverbal', items: nonverbalJson },
  { scale: 'verbal', items: verbalJson },
  { scale: 'attention', items: attentionJson },
]

export const bankIssues = validateBank(files)

export const bankItems: Item[] = bankIssues.length === 0 ? files.flatMap((file) => file.items as Item[]) : []
