import { SCALES, typeSource } from './catalog.ts'
import { SCALE_ORDER, TOPICS, type Item, type ScaleId } from './types.ts'

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sceneKind(scene: unknown): string | null {
  if (!isRecord(scene) || typeof scene.kind !== 'string') return null
  return scene.kind
}

function stimulusEmpty(stimulus: unknown): boolean {
  if (!isRecord(stimulus)) return true
  const text = typeof stimulus.text === 'string' ? stimulus.text.trim() : ''
  const rows = Array.isArray(stimulus.rows) && stimulus.rows.length > 0
  return text.length === 0 && !rows && stimulus.scene == null
}

export function validateBank(files: { scale: ScaleId; items: unknown }[]): string[] {
  const issues: string[] = []
  const seenIds = new Set<string>()
  const accepted = new Map<ScaleId, Item[]>()

  for (const scale of SCALE_ORDER) accepted.set(scale, [])

  for (const file of files) {
    if (!Array.isArray(file.items)) {
      issues.push(`${SCALES[file.scale].name}: файл банка не является массивом.`)
      continue
    }

    file.items.forEach((raw, index) => {
      const label = `${file.scale}[${index}]`
      if (!isRecord(raw)) {
        issues.push(`${label}: запись не является объектом.`)
        return
      }

      const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : label
      if (typeof raw.id !== 'string' || raw.id.trim() === '') {
        issues.push(`${label}: пустой id.`)
      } else if (seenIds.has(raw.id)) {
        issues.push(`Дублируется id ${raw.id}.`)
      } else {
        seenIds.add(raw.id)
      }

      if (raw.scale !== file.scale) {
        issues.push(`${id}: шкала не совпадает с файлом.`)
      }

      const sourceOfType = typeof raw.type === 'string' ? typeSource(file.scale, raw.type) : null
      if (!sourceOfType) {
        issues.push(`${id}: неизвестный тип.`)
      } else if (raw.source !== sourceOfType) {
        issues.push(`${id}: источник не совпадает с типом.`)
      }

      if (file.scale === 'erudition') {
        if (typeof raw.topic !== 'string' || !TOPICS.includes(raw.topic as (typeof TOPICS)[number])) {
          issues.push(`${id}: у эрудиции нужна одна из семи тем.`)
        }
      } else if (raw.topic != null) {
        issues.push(`${id}: тема допустима только у эрудиции.`)
      }

      if (typeof raw.difficulty !== 'string' || !DIFFICULTIES.includes(raw.difficulty as (typeof DIFFICULTIES)[number])) {
        issues.push(`${id}: неизвестная сложность.`)
      }

      if (stimulusEmpty(raw.stimulus)) {
        issues.push(`${id}: пустой стимул.`)
      }

      const allowed = new Set(SCALES[file.scale].scenes)
      const stimulus = isRecord(raw.stimulus) ? raw.stimulus : null
      if (stimulus?.scene != null) {
        const kind = sceneKind(stimulus.scene)
        if (!kind || !allowed.has(kind)) {
          issues.push(`${id}: шкала не рисует сцену ${kind ?? 'без вида'}.`)
        }
      }

      if (!Array.isArray(raw.options)) {
        issues.push(`${id}: нет списка вариантов.`)
      } else {
        if (raw.options.length !== SCALES[file.scale].optionCount) {
          issues.push(
            `${id}: число вариантов ${raw.options.length}, для шкалы нужно ${SCALES[file.scale].optionCount}.`,
          )
        }
        const optionIds: string[] = []
        raw.options.forEach((option, optionIndex) => {
          if (!isRecord(option) || typeof option.id !== 'string' || option.id === '') {
            issues.push(`${id}: пустой id варианта ${optionIndex + 1}.`)
            return
          }
          optionIds.push(option.id)
          const text = typeof option.text === 'string' ? option.text.trim() : ''
          if (!text && option.scene == null) {
            issues.push(`${id}: пустой вариант ${option.id}.`)
          }
          if (option.scene != null) {
            const kind = sceneKind(option.scene)
            if (!kind || !allowed.has(kind)) {
              issues.push(`${id}: шкала не рисует сцену варианта ${kind ?? 'без вида'}.`)
            }
          }
        })
        if (new Set(optionIds).size !== optionIds.length) {
          issues.push(`${id}: повторяется id варианта.`)
        }
        if (typeof raw.correctOptionId !== 'string' || !optionIds.includes(raw.correctOptionId)) {
          issues.push(`${id}: верный ответ не совпадает ни с одним вариантом.`)
        }
      }

      if (typeof raw.hint !== 'string' || raw.hint.trim() === '') {
        issues.push(`${id}: пустая подсказка.`)
      }
      if (typeof raw.explanation !== 'string' || raw.explanation.trim() === '') {
        issues.push(`${id}: пустой разбор.`)
      }
      if (typeof raw.shuffle !== 'boolean') {
        issues.push(`${id}: поле shuffle должно быть логическим.`)
      }

      if (
        raw.scale === file.scale &&
        sourceOfType &&
        typeof raw.id === 'string' &&
        isRecord(raw.stimulus) &&
        Array.isArray(raw.options)
      ) {
        accepted.get(file.scale)?.push(raw as Item)
      }
    })
  }

  for (const scale of SCALE_ORDER) {
    const info = SCALES[scale]
    const items = accepted.get(scale) ?? []
    const name = info.name

    if (items.length < 24) {
      issues.push(`${name}: всего ${items.length} заданий, нужно не меньше 24.`)
    }

    for (const difficulty of DIFFICULTIES) {
      const count = items.filter((item) => item.difficulty === difficulty).length
      if (count < 4) {
        issues.push(`${name}: заданий сложности ${difficulty} меньше 4.`)
      }
    }

    if (scale === 'erudition') {
      for (const topic of TOPICS) {
        const count = items.filter((item) => item.topic === topic).length
        if (count < 3) {
          issues.push(`${name}: заданий темы ${topic} меньше 3.`)
        }
      }
      continue
    }

    for (const type of info.demo) {
      const count = items.filter((item) => item.type === type).length
      if (count < 6) {
        issues.push(`${name}: заданий типа ${type} меньше 6.`)
      }
    }
    for (const type of info.analog) {
      const count = items.filter((item) => item.type === type).length
      if (count < 3) {
        issues.push(`${name}: заданий типа ${type} меньше 3.`)
      }
    }
  }

  return issues
}
