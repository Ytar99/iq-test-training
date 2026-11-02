import { Box, Button, Group, Text, UnstyledButton } from "@mantine/core";
import type { ReactNode } from "react";
import { formatClock } from "../domain/format.ts";
import classes from "./Shell.module.css";

export type StripTone = "current" | "answered" | "timed" | "missed" | "empty";

type StripCell = {
  tone: StripTone;
};

const stripColor: Record<Exclude<StripTone, "empty">, string> = {
  current: "orange",
  answered: "green",
  timed: "gray.5",
  missed: "red",
};

type ShellProps = {
  center?: string;
  blockLabel?: string;
  blockSeconds?: number;
  itemSeconds?: number | null;
  strip?: StripCell[];
  onHome?: () => void;
  onBlock?: () => void;
  menu?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  bottom?: ReactNode;
  children: ReactNode;
};

type SegmentProps = {
  children?: ReactNode;
  onClick?: () => void;
  current?: boolean;
  edge?: "start" | "end";
  grow?: boolean;
};

function Segment({ children, onClick, current, edge, grow }: SegmentProps) {
  const className = [
    classes.seg,
    edge === "start" ? classes.segStart : "",
    edge === "end" ? classes.segEnd : "",
    grow ? classes.segGrow : "",
    current ? classes.segCurrent : "",
  ]
    .filter(Boolean)
    .join(" ");
  if (onClick) {
    return (
      <UnstyledButton className={className} onClick={onClick}>
        {children}
      </UnstyledButton>
    );
  }
  return (
    <div className={className} aria-current={current ? "page" : undefined}>
      {children}
    </div>
  );
}

function HomeLabel({ onHome }: { onHome?: () => void }) {
  if (!onHome) return <Text fw={700}>Тренажер</Text>;
  return (
    <UnstyledButton className={classes.home} onClick={onHome}>
      Тренажер
    </UnstyledButton>
  );
}

function BlockLabel({ label, seconds, onBlock }: { label: string; seconds?: number; onBlock?: () => void }) {
  const body = (
    <>
      <Text size="sm">{label}</Text>
      {seconds != null ? (
        <Text className={classes.clock} c="teal" size="sm">
          {formatClock(seconds)}
        </Text>
      ) : null}
    </>
  );
  if (!onBlock) {
    return (
      <Group gap={6} wrap="nowrap" aria-current="page">
        {body}
      </Group>
    );
  }
  return (
    <UnstyledButton className={classes.blockLink} onClick={onBlock}>
      {body}
    </UnstyledButton>
  );
}

export function Shell({
  center,
  blockLabel,
  blockSeconds,
  itemSeconds,
  strip,
  onHome,
  onBlock,
  menu,
  left,
  right,
  bottom,
  children,
}: ShellProps) {
  const task = Boolean(left || right);
  const attempt = Boolean(blockLabel);
  const segments: (SegmentProps & { id: string })[] = [
    { id: "home", onClick: onHome, grow: false, children: <Text fw={700}>Тренажер</Text> },
    {
      id: "block",
      onClick: onBlock,
      current: !onBlock,
      grow: false,
      children: (
        <>
          <Text size="sm">{blockLabel}</Text>
          {blockSeconds != null ? (
            <Text className={classes.clock} c="teal" size="sm">
              {formatClock(blockSeconds)}
            </Text>
          ) : null}
        </>
      ),
    },
  ];
  if (center) {
    segments.push({
      id: "center",
      grow: true,
      children: (
        <Text fw={600} size="sm" ta="center">
          {center}
        </Text>
      ),
    });
  }
  if (itemSeconds != null) {
    segments.push({
      id: "item",
      grow: false,
      children: (
        <Text className={classes.clock} c="orange" size="sm">
          {formatClock(itemSeconds)}
        </Text>
      ),
    });
  }

  return (
    <Box className={classes.page}>
      <Box className={[classes.sheet, attempt ? classes.sheetAttempt : ""].filter(Boolean).join(" ")}>
        {attempt ? (
          <Box className={`${classes.header} no-print`}>
            <Box className={classes.chevron}>
              {segments.map((segment, index) => (
                <Segment
                  key={segment.id}
                  onClick={segment.onClick}
                  current={segment.current}
                  grow={segment.grow}
                  edge={index === 0 ? "start" : index === segments.length - 1 ? "end" : undefined}
                >
                  {segment.children}
                </Segment>
              ))}
            </Box>
            <Box className={classes.compactAttempt}>
              <Group justify="space-between" wrap="nowrap" gap="xs" align="center">
                <Group gap="xs" wrap="nowrap" align="center">
                  {menu}
                  <HomeLabel onHome={onHome} />
                  {blockLabel ? <BlockLabel label={blockLabel} seconds={blockSeconds} onBlock={onBlock} /> : null}
                </Group>
                {itemSeconds != null ? (
                  <Text className={classes.clock} c="orange" size="sm">
                    {formatClock(itemSeconds)}
                  </Text>
                ) : null}
              </Group>
              {center ? (
                <Text className={classes.phoneMeta} size="sm" fw={600} ta="center">
                  {center}
                </Text>
              ) : null}
            </Box>
          </Box>
        ) : null}
        {strip ? (
          <Group className={classes.strip} gap={6} grow wrap="nowrap" aria-hidden="true">
            {strip.map((cell, index) => (
              <Box
                key={index}
                className={cell.tone === "empty" ? classes.stripEmpty : undefined}
                h={8}
                bg={cell.tone === "empty" ? undefined : stripColor[cell.tone]}
                style={{ borderRadius: 99 }}
              />
            ))}
          </Group>
        ) : null}
        <Box className={task ? classes.taskBody : undefined}>
          {left}
          <Box
            className={
              [task ? classes.content : "", bottom ? classes.contentPad : ""].filter(Boolean).join(" ") || undefined
            }
          >
            {children}
          </Box>
          {right}
        </Box>
        {bottom ? <Box className={`${classes.bottom} no-print`}>{bottom}</Box> : null}
      </Box>
    </Box>
  );
}

export function SideButtons({ place, children }: { place: "left" | "right"; children: ReactNode }) {
  return <Box className={`${place === "left" ? classes.railLeft : classes.railRight} no-print`}>{children}</Box>;
}

type HexName = "menu" | "back" | "info" | "hint" | "next";

function HexIcon({ name, filled }: { name: HexName; filled?: boolean }) {
  const mark = filled ? "white" : "currentColor";
  return (
    <svg className={classes.hexSvg} viewBox="0 0 72 80" aria-hidden="true">
      <polygon
        points="36,4 66,21 66,59 36,76 6,59 6,21"
        fill={filled ? "currentColor" : "white"}
        stroke="currentColor"
        strokeWidth="2.5"
      />
      {name === "menu" ? (
        <g stroke={mark} strokeWidth="2.6" strokeLinecap="round">
          <line x1="24" y1="32" x2="48" y2="32" />
          <line x1="24" y1="40" x2="48" y2="40" />
          <line x1="24" y1="48" x2="48" y2="48" />
        </g>
      ) : null}
      {name === "back" ? (
        <path
          d="M44 28 L30 40 L44 52 M30 40 H50"
          fill="none"
          stroke={mark}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {name === "next" ? (
        <path
          d="M28 28 L42 40 L28 52 M42 40 H22"
          fill="none"
          stroke={mark}
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
      {name === "info" ? (
        <text x="36" y="50" textAnchor="middle" fontSize="28" fontWeight="700" fill={mark}>
          i
        </text>
      ) : null}
      {name === "hint" ? (
        <text x="36" y="50" textAnchor="middle" fontSize="26" fontWeight="700" fill={mark}>
          ?
        </text>
      ) : null}
    </svg>
  );
}

export function NavButton(props: {
  children: string;
  icon: HexName;
  onClick?: () => void;
  disabled?: boolean;
  color?: string;
  filled?: boolean;
  pressed?: boolean;
}) {
  return (
    <Button
      variant="subtle"
      color={props.color ?? "teal"}
      className={classes.navButton}
      disabled={props.disabled}
      onClick={props.onClick}
      aria-pressed={props.pressed}
    >
      <span className={classes.navInner}>
        <HexIcon name={props.icon} filled={props.filled} />
        <Text className={classes.navLabel} size="xs">
          {props.children}
        </Text>
      </span>
    </Button>
  );
}
