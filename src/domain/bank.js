import calculationJson from "../../data/calculation.json" with { type: "json" };
import vocabularyJson from "../../data/vocabulary.json" with { type: "json" };
import eruditionJson from "../../data/erudition.json" with { type: "json" };
import spatialJson from "../../data/spatial.json" with { type: "json" };
import nonverbalJson from "../../data/nonverbal.json" with { type: "json" };
import verbalJson from "../../data/verbal.json" with { type: "json" };
import attentionJson from "../../data/attention.json" with { type: "json" };
import demoCalculationJson from "../../data/original/demo/calculation.json" with { type: "json" };
import demoVocabularyJson from "../../data/original/demo/vocabulary.json" with { type: "json" };
import demoEruditionJson from "../../data/original/demo/erudition.json" with { type: "json" };
import demoSpatialJson from "../../data/original/demo/spatial.json" with { type: "json" };
import demoNonverbalJson from "../../data/original/demo/nonverbal.json" with { type: "json" };
import demoVerbalJson from "../../data/original/demo/verbal.json" with { type: "json" };
import demoAttentionJson from "../../data/original/demo/attention.json" with { type: "json" };
import exampleCalculationJson from "../../data/original/examples/calculation.json" with { type: "json" };
import exampleVocabularyJson from "../../data/original/examples/vocabulary.json" with { type: "json" };
import exampleEruditionJson from "../../data/original/examples/erudition.json" with { type: "json" };
import exampleSpatialJson from "../../data/original/examples/spatial.json" with { type: "json" };
import exampleNonverbalJson from "../../data/original/examples/nonverbal.json" with { type: "json" };
import exampleVerbalJson from "../../data/original/examples/verbal.json" with { type: "json" };
import exampleAttentionJson from "../../data/original/examples/attention.json" with { type: "json" };
import { validateBank } from "./validate.ts";
const files = [
  { scale: "calculation", bucket: "invented", items: calculationJson },
  { scale: "vocabulary", bucket: "invented", items: vocabularyJson },
  { scale: "erudition", bucket: "invented", items: eruditionJson },
  { scale: "spatial", bucket: "invented", items: spatialJson },
  { scale: "nonverbal", bucket: "invented", items: nonverbalJson },
  { scale: "verbal", bucket: "invented", items: verbalJson },
  { scale: "attention", bucket: "invented", items: attentionJson },
  { scale: "calculation", bucket: "demo", items: demoCalculationJson },
  { scale: "vocabulary", bucket: "demo", items: demoVocabularyJson },
  { scale: "erudition", bucket: "demo", items: demoEruditionJson },
  { scale: "spatial", bucket: "demo", items: demoSpatialJson },
  { scale: "nonverbal", bucket: "demo", items: demoNonverbalJson },
  { scale: "verbal", bucket: "demo", items: demoVerbalJson },
  { scale: "attention", bucket: "demo", items: demoAttentionJson },
  { scale: "calculation", bucket: "example", items: exampleCalculationJson },
  { scale: "vocabulary", bucket: "example", items: exampleVocabularyJson },
  { scale: "erudition", bucket: "example", items: exampleEruditionJson },
  { scale: "spatial", bucket: "example", items: exampleSpatialJson },
  { scale: "nonverbal", bucket: "example", items: exampleNonverbalJson },
  { scale: "verbal", bucket: "example", items: exampleVerbalJson },
  { scale: "attention", bucket: "example", items: exampleAttentionJson },
];
export const bankIssues = validateBank(files);
export const bankItems = bankIssues.length === 0 ? files.flatMap((file) => file.items) : [];
export const bankFiles = files.map((file) => ({
  scale: file.scale,
  bucket: file.bucket,
  items: Array.isArray(file.items) ? file.items : [],
}));
