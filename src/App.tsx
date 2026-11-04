import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import { assembleAttempt } from "./domain/assemble.ts";
import { createAttempt, reduceAttempt, type AttemptAction, type AttemptState } from "./domain/attempt.ts";
import { bankItems } from "./domain/bank.ts";
import { SCALE_ORDER, type ScaleId } from "./domain/types.ts";
import { ResultScreen } from "./ui/ResultScreen.tsx";
import { StartScreen } from "./ui/StartScreen.tsx";
import { Trainer } from "./ui/Trainer.tsx";

export default function App() {
  const [selected, setSelected] = useState<ScaleId[]>([...SCALE_ORDER]);
  const [hints, setHints] = useState(false);
  const [explanations, setExplanations] = useState(false);
  const [preferReal, setPreferReal] = useState(false);
  const [assembleError, setAssembleError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [confirm, setConfirm] = useState<"menu" | "result" | null>(null);

  const ticking =
    attempt != null &&
    (attempt.phase.kind === "task" || (attempt.phase.kind === "instruction" && attempt.phase.mode === "return"));

  useEffect(() => {
    if (!ticking) return;
    const timer = window.setInterval(() => {
      setAttempt((current) => (current ? reduceAttempt(current, { type: "tick" }) : current));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [ticking]);

  const dispatch = (action: AttemptAction) => {
    setAttempt((current) => (current ? reduceAttempt(current, action) : current));
  };

  if (!attempt) {
    return (
      <StartScreen
        selected={selected}
        hints={hints}
        explanations={explanations}
        preferReal={preferReal}
        assembleError={assembleError}
        onToggleScale={(scaleId) =>
          setSelected((current) =>
            current.includes(scaleId) ? current.filter((id) => id !== scaleId) : [...current, scaleId],
          )
        }
        onToggleHints={() => setHints((value) => !value)}
        onToggleExplanations={() => setExplanations((value) => !value)}
        onTogglePreferReal={() => setPreferReal((value) => !value)}
        onAll={() => setSelected([...SCALE_ORDER])}
        onNone={() => setSelected([])}
        onStart={() => {
          const ordered = SCALE_ORDER.filter((scaleId) => selected.includes(scaleId));
          const assembled = assembleAttempt(ordered, bankItems, Math.random, preferReal);
          if (!assembled.ok) {
            setAssembleError(assembled.error);
            return;
          }
          setAssembleError(null);
          setAttempt(createAttempt(assembled.blocks, hints, explanations));
        }}
      />
    );
  }

  const leave = () => {
    setConfirm(null);
    setAttempt(null);
  };

  return (
    <>
      {attempt.phase.kind === "result" ? (
        <ResultScreen state={attempt} onPrint={() => window.print()} onRestart={() => setConfirm("result")} />
      ) : (
        <Trainer state={attempt} dispatch={dispatch} onMenu={() => setConfirm("menu")} />
      )}
      <Modal opened={confirm != null} onClose={() => setConfirm(null)} centered title="Подтверждение">
        <Stack>
          <Text>
            {confirm === "result"
              ? "Вернуться на старт? Результат этой попытки пропадет, если его не сохранить."
              : "Выйти на старт? Результат этой попытки пропадет."}
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setConfirm(null)}>
              Остаться
            </Button>
            <Button color="orange" onClick={leave}>
              {confirm === "result" ? "Вернуться" : "Выйти"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
