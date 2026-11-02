import { SCALES, formOf } from "./catalog.ts";
import { SCALE_ORDER, TOPICS, type Item, type ScaleId } from "./types.ts";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export type BankBucket = "invented" | "demo" | "example";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sceneKind(scene: unknown): string | null {
  if (!isRecord(scene) || typeof scene.kind !== "string") return null;
  return scene.kind;
}

function sceneDrawn(kind: string): boolean {
  return SCALE_ORDER.some((scale) => SCALES[scale].scenes.includes(kind));
}

function stimulusEmpty(stimulus: unknown): boolean {
  if (!isRecord(stimulus)) return true;
  const text = typeof stimulus.text === "string" ? stimulus.text.trim() : "";
  return text.length === 0 && stimulus.scene == null;
}

export function validateBank(files: { scale: ScaleId; bucket: BankBucket; items: unknown }[]): string[] {
  const issues: string[] = [];
  const seenIds = new Set<string>();
  const accepted = new Map<ScaleId, Item[]>();

  for (const scale of SCALE_ORDER) accepted.set(scale, []);

  for (const file of files) {
    if (!Array.isArray(file.items)) {
      issues.push(`${SCALES[file.scale].name}: файл банка не является массивом.`);
      continue;
    }

    file.items.forEach((raw, index) => {
      const label = `${file.scale}[${index}]`;
      if (!isRecord(raw)) {
        issues.push(`${label}: запись не является объектом.`);
        return;
      }

      const id = typeof raw.id === "string" && raw.id.trim() ? raw.id : label;
      if (typeof raw.id !== "string" || raw.id.trim() === "") {
        issues.push(`${label}: пустой id.`);
      } else if (seenIds.has(raw.id)) {
        issues.push(`Дублируется id ${raw.id}.`);
      } else {
        seenIds.add(raw.id);
      }

      if (raw.scale !== file.scale) {
        issues.push(`${id}: шкала не совпадает с файлом.`);
      }

      const originalFile = file.bucket !== "invented";
      const typeName = typeof raw.type === "string" ? raw.type.trim() : "";
      const knownType = typeName ? formOf(file.scale, typeName) : null;
      const typeExists = typeName !== "" && SCALE_ORDER.some((scale) => formOf(scale, typeName));
      if (!typeName || (!knownType && (!originalFile || typeExists))) {
        issues.push(`${id}: неизвестный тип.`);
      }

      if (file.scale === "erudition") {
        if (typeof raw.topic !== "string" || !TOPICS.includes(raw.topic as (typeof TOPICS)[number])) {
          issues.push(`${id}: у эрудиции нужна одна из семи тем.`);
        }
      } else if (raw.topic != null) {
        issues.push(`${id}: тема допустима только у эрудиции.`);
      }

      if (originalFile) {
        if (raw.original !== true) {
          issues.push(`${id}: нужно поле original: true.`);
        }
        if (raw.difficulty != null) {
          issues.push(`${id}: у оригинального задания нет сложности.`);
        }
        const prefix = file.bucket === "demo" ? "demo-" : "example-";
        if (typeof raw.id === "string" && raw.id.trim() !== "" && !raw.id.startsWith(prefix)) {
          issues.push(`${id}: id начинается с ${prefix}.`);
        }
      } else if (raw.original != null) {
        issues.push(`${id}: поле original допустимо только в файле data/original.`);
      } else if (
        typeof raw.difficulty !== "string" ||
        !DIFFICULTIES.includes(raw.difficulty as (typeof DIFFICULTIES)[number])
      ) {
        issues.push(`${id}: неизвестная сложность.`);
      }

      if (stimulusEmpty(raw.stimulus)) {
        issues.push(`${id}: пустой стимул.`);
      }

      const allowed = new Set(SCALES[file.scale].scenes);
      const stimulus = isRecord(raw.stimulus) ? raw.stimulus : null;
      const sceneIssue = (scene: unknown, label: string) => {
        const kind = sceneKind(scene);
        const novel = kind != null && !sceneDrawn(kind);
        if ((!kind || !allowed.has(kind)) && (!originalFile || !novel)) {
          issues.push(`${id}: ${label} ${kind ?? "без вида"}.`);
        }
      };
      if (stimulus?.scene != null) sceneIssue(stimulus.scene, "шкала не рисует сцену");

      if (!Array.isArray(raw.options)) {
        issues.push(`${id}: нет списка вариантов.`);
      } else {
        if (raw.options.length !== SCALES[file.scale].optionCount) {
          issues.push(
            `${id}: число вариантов ${raw.options.length}, для шкалы нужно ${SCALES[file.scale].optionCount}.`,
          );
        }
        const optionIds: string[] = [];
        raw.options.forEach((option, optionIndex) => {
          if (!isRecord(option) || typeof option.id !== "string" || option.id === "") {
            issues.push(`${id}: пустой id варианта ${optionIndex + 1}.`);
            return;
          }
          optionIds.push(option.id);
          const text = typeof option.text === "string" ? option.text.trim() : "";
          if (!text && option.scene == null) {
            issues.push(`${id}: пустой вариант ${option.id}.`);
          }
          if (option.scene != null) sceneIssue(option.scene, "шкала не рисует сцену варианта");
        });
        if (new Set(optionIds).size !== optionIds.length) {
          issues.push(`${id}: повторяется id варианта.`);
        }
        if (typeof raw.correctOptionId !== "string" || !optionIds.includes(raw.correctOptionId)) {
          issues.push(`${id}: верный ответ не совпадает ни с одним вариантом.`);
        }
      }

      if (typeof raw.hint !== "string" || raw.hint.trim() === "") {
        issues.push(`${id}: пустая подсказка.`);
      }
      if (typeof raw.explanation !== "string" || raw.explanation.trim() === "") {
        issues.push(`${id}: пустой разбор.`);
      }
      if (typeof raw.shuffle !== "boolean") {
        issues.push(`${id}: поле shuffle должно быть логическим.`);
      }

      if (
        !originalFile &&
        raw.scale === file.scale &&
        knownType &&
        typeof raw.id === "string" &&
        isRecord(raw.stimulus) &&
        Array.isArray(raw.options)
      ) {
        accepted.get(file.scale)?.push(raw as Item);
      }
    });
  }

  for (const scale of SCALE_ORDER) {
    const info = SCALES[scale];
    const items = accepted.get(scale) ?? [];
    const name = info.name;

    if (items.length < 48) {
      issues.push(`${name}: всего ${items.length} заданий, нужно не меньше 48.`);
    }

    for (const difficulty of DIFFICULTIES) {
      const count = items.filter((item) => item.difficulty === difficulty).length;
      if (count < 12) {
        issues.push(`${name}: заданий сложности ${difficulty} меньше 12.`);
      }
    }

    if (scale === "erudition") {
      for (const topic of TOPICS) {
        const count = items.filter((item) => item.topic === topic).length;
        if (count < 8) {
          issues.push(`${name}: заданий темы ${topic} меньше 8.`);
        }
      }
    }

    for (const form of info.forms) {
      const count = items.filter((item) => item.type === form.type).length;
      const minimum = form.quota * 4;
      if (count < minimum) {
        issues.push(`${name}: заданий типа ${form.type} меньше ${minimum}.`);
      }
    }
  }

  return issues;
}
