import { createTheme, type MantineColorSchemeManager } from "@mantine/core";

export const theme = createTheme({
  primaryColor: "teal",
  cursorType: "pointer",
});

export const colorSchemeManager: MantineColorSchemeManager = {
  get: (defaultValue) => defaultValue,
  set: () => {},
  subscribe: () => {},
  unsubscribe: () => {},
  clear: () => {},
};
