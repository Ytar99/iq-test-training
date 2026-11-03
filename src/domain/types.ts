export const SCALE_ORDER = [
  "calculation",
  "vocabulary",
  "erudition",
  "spatial",
  "nonverbal",
  "verbal",
  "attention",
] as const;

export type ScaleId = (typeof SCALE_ORDER)[number];

export const TOPICS = ["geography", "history", "science", "culture", "economy", "nature", "sport"] as const;

export type EruditionTopic = (typeof TOPICS)[number];

export type Difficulty = "easy" | "medium" | "hard";

export type CardShape = "square" | "circle" | "triangle" | "diamond" | "line" | "dot" | "stroke" | "ring";

export type CardElement = {
  shape: CardShape;
  x: number;
  y: number;
  size: number;
  dir?: "up" | "down";
  x2?: number;
  y2?: number;
};

export type CardContent = {
  elements: CardElement[];
};

export type FaceMark = "blank" | "circle" | "triangle" | "square" | "line";

export type Scene =
  | {
      kind: "cells";
      cols?: number;
      rows?: number;
      filled?: number[][];
      pieces?: number[][][];
      mode?: "rotate" | "mirror";
    }
  | { kind: "card"; elements: CardElement[]; portrait?: true }
  | { kind: "matrix"; cells: (CardContent | null)[][]; portrait?: true }
  | { kind: "sequence"; steps: CardContent[]; portrait?: true }
  | { kind: "analogy"; pair: [CardContent, CardContent]; given: CardContent; portrait?: true }
  | { kind: "group"; cards: CardContent[]; portrait?: true }
  | { kind: "net"; layout: (FaceMark | null)[][] }
  | { kind: "cube"; front: FaceMark; top: FaceMark; right: FaceMark }
  | { kind: "chart"; variant: "bar" | "line"; labels: string[]; values: number[] }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "stack"; heights: number[][]; view: "iso" | "top" }
  | { kind: "compass"; arrow: number; label: string; labelAt: number }
  | { kind: "shelf"; volumes: number[] };

export type Stimulus = {
  text?: string;
  scene?: Scene;
};

export type Option = {
  id: string;
  text?: string;
  scene?: Scene;
};

export type Item = {
  id: string;
  scale: ScaleId;
  type: string;
  topic?: EruditionTopic;
  difficulty?: Difficulty;
  original?: true;
  stimulus: Stimulus;
  options: Option[];
  correctOptionId: string;
  shuffle: boolean;
  hint: string;
  explanation: string;
};
