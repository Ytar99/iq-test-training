import { MantineProvider } from "@mantine/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ItemPreview } from "./ui/ItemPreview.tsx";
import { colorSchemeManager, theme } from "./theme.ts";
import "@mantine/core/styles.css";

const itemId = new URLSearchParams(window.location.search).get("item") ?? "";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme} forceColorScheme="light" colorSchemeManager={colorSchemeManager}>
      <ItemPreview itemId={itemId} />
    </MantineProvider>
  </StrictMode>,
);
