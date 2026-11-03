import { Kbd, Stack, Text } from "@mantine/core";
import classes from "./SignKeys.module.css";

function SignKey({ symbol }: { symbol?: string }) {
  return (
    <Kbd className={classes.key} size="md" aria-label={symbol ? undefined : "пропуск"}>
      {symbol}
    </Kbd>
  );
}

export function SignChain({ text }: { text: string }) {
  const noteAt = text.indexOf("(");
  const signs = (noteAt === -1 ? text : text.slice(0, noteAt)).trim();
  const note = noteAt === -1 ? "" : text.slice(noteAt).trim();
  const symbols = signs.split(/\s+/).filter((symbol) => symbol.length > 0);
  return (
    <span className={classes.row}>
      {symbols.map((symbol, index) => (
        <SignKey key={`${symbol}-${index}`} symbol={symbol} />
      ))}
      {note ? <span>{note}</span> : null}
    </span>
  );
}

export function SignExpression({ text }: { text: string }) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const prompt = lines.find((line) => !line.includes("_")) ?? "";
  const expression = lines.find((line) => line.includes("_")) ?? "";
  const tokens = expression.split(/\s+/).filter((token) => token.length > 0);
  return (
    <Stack gap="sm" align="center">
      {prompt ? <Text ta="center">{prompt}</Text> : null}
      <span className={`${classes.row} ${classes.expression}`}>
        {tokens.map((token, index) =>
          token === "_" ? <SignKey key={`gap-${index}`} /> : <Text key={`${token}-${index}`}>{token}</Text>,
        )}
      </span>
    </Stack>
  );
}
