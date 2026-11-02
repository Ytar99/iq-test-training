import { Badge, Box, Button, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { SCALES } from "../domain/catalog.ts";
import { bankFiles } from "../domain/bank.ts";
import type { Item } from "../domain/types.ts";
import type { BankBucket } from "../domain/validate.ts";
import { NavButton, Shell, SideButtons, type StripTone } from "./Shell.tsx";
import { TaskCard } from "./TaskCard.tsx";
import classes from "./Shell.module.css";

const strip: { tone: StripTone }[] = [
  { tone: "current" },
  ...Array.from({ length: 11 }, (): { tone: StripTone } => ({ tone: "empty" })),
];

const origin: Record<BankBucket, { label: string; color: string }> = {
  demo: { label: "Демо пример", color: "orange" },
  example: { label: "Реальный пример", color: "teal" },
  invented: { label: "Аналогичный пример", color: "blue" },
};

function findItem(itemId: string): { item: Item; bucket: BankBucket } | null {
  for (const file of bankFiles) {
    const item = file.items.find((entry) => entry.id === itemId);
    if (item) return { item, bucket: file.bucket };
  }
  return null;
}

export function ItemPreview({ itemId }: { itemId: string }) {
  const found = findItem(itemId);
  const [selection, setSelection] = useState<string | null>(null);
  if (!found) return <Text p="md">{itemId ? `Задание ${itemId} не найдено` : "Задание не найдено"}</Text>;

  const { item, bucket } = found;
  const info = SCALES[item.scale];
  return (
    <Shell
      center="Задание 1 / 12"
      blockLabel="Блок 1 / 1"
      blockSeconds={info.blockSec}
      itemSeconds={info.itemSec}
      strip={strip}
      onHome={() => {}}
      onBlock={() => {}}
      menu={
        <Button hiddenFrom="md" variant="subtle" color="teal" size="compact-sm">
          Меню
        </Button>
      }
      left={
        <SideButtons place="left">
          <NavButton icon="menu">Меню</NavButton>
          <Box className={classes.railMiddle}>
            <NavButton icon="back" disabled>
              Назад
            </NavButton>
          </Box>
        </SideButtons>
      }
      right={
        <SideButtons place="right">
          <NavButton icon="next" color="orange" filled>
            Далее
          </NavButton>
        </SideButtons>
      }
      bottom={
        <Group className={classes.phoneBar} hiddenFrom="md" grow gap={4} wrap="nowrap">
          <Button size="compact-xs" variant="default" disabled>
            Назад
          </Button>
          <Button size="compact-xs" color="teal">
            Далее
          </Button>
        </Group>
      }
    >
      <Stack gap="sm">
        <Badge variant="light" size="xl" color={origin[bucket].color} tt="none">
          {origin[bucket].label}
        </Badge>
        <TaskCard item={item} selection={selection} onSelect={setSelection} hintOpen={false} expired={false} />
      </Stack>
    </Shell>
  );
}
