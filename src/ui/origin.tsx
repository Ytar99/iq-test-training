import { Badge } from "@mantine/core";
import type { Item } from "../domain/types.ts";
import type { BankBucket } from "../domain/validate.ts";

const origin: Record<BankBucket, { label: string; color: string }> = {
  demo: { label: "Демо пример", color: "orange" },
  example: { label: "Реальный пример", color: "teal" },
  invented: { label: "Вымышленный пример", color: "blue" },
};

function originOf(item: Item): BankBucket {
  if (item.id.startsWith("demo-")) return "demo";
  if (item.original) return "example";
  return "invented";
}

export function OriginBadge({ item }: { item: Item }) {
  const kind = origin[originOf(item)];
  return (
    <Badge variant="light" size="xl" color={kind.color} tt="none">
      {kind.label}
    </Badge>
  );
}
