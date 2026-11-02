import { Text } from "@mantine/core";
import classes from "./CalcGrid.module.css";

function parseCalcGrid(text: string): { prompt: string; rows: string[][] } | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return null;
  const rows = lines.slice(1).map((line) => line.split(/\s+/));
  if (rows.some((row) => row.length === 0)) return null;
  return { prompt: lines[0] ?? "", rows };
}

export function NumberToken({ value, gap = false }: { value: string; gap?: boolean }) {
  const name = [classes.token, gap ? classes.gap : ""].filter(Boolean).join(" ");
  return <span className={name}>{value}</span>;
}

export function CalcGridView({ text }: { text: string }) {
  const parsed = parseCalcGrid(text);
  if (!parsed) return <Text style={{ whiteSpace: "pre-wrap" }}>{text}</Text>;
  return (
    <div className={classes.grid}>
      <Text ta="center">{parsed.prompt}</Text>
      <div className={classes.rows}>
        {parsed.rows.map((row, rowIndex) => (
          <div className={classes.row} key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <NumberToken key={cellIndex} value={cell} gap={cell === "?"} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
