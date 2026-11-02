import { createTheme } from "@mantine/core";
export const theme = createTheme({
  primaryColor: "teal",
  cursorType: "pointer",
});
export const colorSchemeManager = {
  get: (defaultValue) => defaultValue,
  set: () => {},
  subscribe: () => {},
  unsubscribe: () => {},
  clear: () => {},
};
