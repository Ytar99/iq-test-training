import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Button, Group, Stack, Text } from '@mantine/core';
import { formatClock } from '../domain/format.ts';
import classes from './Shell.module.css';
export function Shell({ center, blockLabel, blockSeconds, itemSeconds, strip, menu, left, right, bottom, children }) {
    const task = Boolean(left || right);
    const phoneLine = [blockLabel, center].filter(Boolean).join(' · ');
    return (_jsx(Box, { className: classes.page, children: _jsxs(Box, { className: classes.sheet, children: [_jsxs(Box, { className: `${classes.header} no-print`, children: [_jsxs(Group, { className: classes.headerStart, gap: "xs", wrap: "nowrap", children: [menu, _jsx(Text, { fw: 700, children: "\u0422\u0440\u0435\u043D\u0430\u0436\u0435\u0440" }), blockLabel ? (_jsx(Text, { size: "sm", visibleFrom: "md", children: blockLabel })) : null] }), center ? (_jsx(Text, { className: classes.centerTitle, fw: 600, size: "sm", visibleFrom: "md", children: center })) : null, _jsxs(Group, { className: classes.headerEnd, gap: "xs", wrap: "nowrap", children: [blockSeconds != null ? (_jsx(Text, { className: classes.clock, c: "teal", size: "sm", children: formatClock(blockSeconds) })) : null, itemSeconds != null ? (_jsx(Text, { className: classes.clock, c: "orange", size: "sm", children: formatClock(itemSeconds) })) : null] }), phoneLine ? (_jsx(Text, { className: classes.phoneMeta, hiddenFrom: "md", size: "sm", fw: 600, ta: "center", children: phoneLine })) : null] }), strip ? (_jsx(Group, { gap: 6, grow: true, wrap: "nowrap", "aria-hidden": "true", children: strip.map((cell, index) => (_jsx(Box, { h: 8, bg: cell.current ? 'orange' : cell.opened ? 'teal' : 'gray.3', style: { borderRadius: 99 } }, index))) })) : null, _jsxs(Box, { className: task ? classes.taskBody : undefined, children: [left, _jsx(Box, { className: bottom ? classes.contentPad : undefined, children: children }), right] }), bottom ? _jsx(Box, { className: `${classes.bottom} no-print`, children: bottom }) : null] }) }));
}
export function SideButtons({ children }) {
    return (_jsx(Stack, { gap: "xs", visibleFrom: "md", className: "no-print", children: children }));
}
export function NavButton(props) {
    return (_jsx(Button, { fullWidth: true, variant: props.variant ?? 'default', color: props.color, disabled: props.disabled, onClick: props.onClick, "aria-pressed": props.pressed, children: props.children }));
}
