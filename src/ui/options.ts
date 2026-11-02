import type { Option } from "../domain/types.ts";

export const LETTERS = ["А", "Б", "В", "Г", "Д"];

export function optionsInColumn(options: Option[]): boolean {
  if (options.every((option) => option.scene && !option.text)) return false;
  return options.some((option) => {
    const text = option.text ?? "";
    if (text.length > 24 || text.endsWith(".")) return true;
    const compact = text.replace(/\s/g, "");
    return compact.length >= 5 && /^\d+$/.test(compact);
  });
}
