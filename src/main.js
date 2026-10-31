import { jsx as _jsx } from "react/jsx-runtime";
import { MantineProvider } from '@mantine/core';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { theme } from './theme.ts';
import '@mantine/core/styles.css';
import './print.css';
const colorSchemeManager = {
    get: (defaultValue) => defaultValue,
    set: () => { },
    subscribe: () => { },
    unsubscribe: () => { },
    clear: () => { },
};
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(MantineProvider, { theme: theme, forceColorScheme: "light", colorSchemeManager: colorSchemeManager, children: _jsx(App, {}) }) }));
