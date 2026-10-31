import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Group, Paper, Radio, SimpleGrid, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { SCALES } from '../domain/catalog.ts';
import { formatClock } from '../domain/format.ts';
import { StimulusView } from './content.tsx';
import { LETTERS, optionsInColumn } from './options.ts';
import { NavButton, Shell, SideButtons } from './Shell.tsx';
import classes from './Shell.module.css';
export function Trainer({ state, dispatch, onMenu }) {
    const phase = state.phase;
    const scaleIndex = phase.kind === 'result' ? 0 : phase.scaleIndex;
    const block = state.blocks[scaleIndex];
    const itemIndex = phase.kind === 'task' ? phase.itemIndex : phase.kind === 'instruction' && phase.mode === 'return' ? phase.itemIndex : null;
    const slot = itemIndex == null || !block ? null : block.slots[itemIndex];
    const [hintFor, setHintFor] = useState(null);
    if (!block || phase.kind === 'result')
        return null;
    const info = SCALES[block.scaleId];
    const onTask = phase.kind === 'task';
    const returned = phase.kind === 'instruction' && phase.mode === 'return';
    const hintOpen = Boolean(slot && hintFor === slot.item.id && state.hints);
    const column = slot ? optionsInColumn(slot.item.options) : true;
    const strip = block.slots.map((item, index) => ({
        opened: item.opened,
        current: itemIndex === index,
    }));
    const menu = (_jsx(Button, { hiddenFrom: "md", variant: "subtle", color: "teal", size: "compact-sm", onClick: onMenu, children: "\u041C\u0435\u043D\u044E" }));
    const hintButton = state.hints && slot ? (_jsx(NavButton, { color: "orange", variant: hintOpen ? 'filled' : 'light', pressed: hintOpen, onClick: () => setHintFor(hintOpen ? null : slot.item.id), children: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430" })) : null;
    const backDisabled = !onTask || phase.itemIndex === 0;
    const instructionDisabled = !onTask;
    const left = (_jsxs(SideButtons, { children: [_jsx(NavButton, { onClick: onMenu, children: "\u041C\u0435\u043D\u044E" }), _jsx(NavButton, { disabled: backDisabled, onClick: () => dispatch({ type: 'back' }), children: "\u041D\u0430\u0437\u0430\u0434" }), _jsx(NavButton, { disabled: instructionDisabled, onClick: () => dispatch({ type: 'instruction' }), children: "\u0418\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F" }), hintButton] }));
    const right = (_jsx(SideButtons, { children: _jsx(NavButton, { color: "teal", variant: "filled", onClick: () => dispatch({ type: 'next' }), children: "\u0414\u0430\u043B\u0435\u0435" }) }));
    const bottom = (_jsxs(Group, { className: classes.phoneBar, hiddenFrom: "md", grow: true, gap: 4, wrap: "nowrap", children: [_jsx(Button, { size: "compact-xs", variant: "default", disabled: backDisabled, onClick: () => dispatch({ type: 'back' }), children: "\u041D\u0430\u0437\u0430\u0434" }), _jsx(Button, { size: "compact-xs", variant: "default", disabled: instructionDisabled, onClick: () => dispatch({ type: 'instruction' }), children: "\u0418\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u044F" }), state.hints && slot ? (_jsx(Button, { size: "compact-xs", color: "orange", variant: hintOpen ? 'filled' : 'light', "aria-pressed": hintOpen, onClick: () => setHintFor(hintOpen ? null : slot.item.id), children: "\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430" })) : null, _jsx(Button, { size: "compact-xs", color: "teal", onClick: () => dispatch({ type: 'next' }), children: "\u0414\u0430\u043B\u0435\u0435" })] }));
    return (_jsx(Shell, { center: onTask && slot ? `Задание ${itemIndex + 1} / 12` : 'Инструкция к блоку', blockLabel: `Блок ${scaleIndex + 1} / ${state.blocks.length}`, blockSeconds: block.remainingSec, itemSeconds: returned || onTask ? slot?.remainingSec ?? null : null, strip: strip, menu: menu, left: left, right: right, bottom: bottom, children: onTask && slot ? (_jsxs(Stack, { gap: "md", className: classes.content, children: [_jsx(StimulusView, { stimulus: slot.item.stimulus }), hintOpen ? (_jsx(Paper, { withBorder: true, p: "sm", radius: "md", bg: "orange.0", children: _jsx(Text, { size: "sm", children: slot.item.hint }) })) : null, _jsx(Radio.Group, { value: slot.selection, onChange: (value) => dispatch({ type: 'select', optionId: value }), disabled: slot.remainingSec === 0, children: _jsx("div", { className: column ? classes.options : `${classes.options} ${classes.optionsInline}`, children: slot.item.options.map((option, index) => (_jsx(Radio.Card, { value: option.id, withBorder: true, p: "sm", radius: "md", children: _jsxs(Group, { className: classes.optionLine, align: "flex-start", wrap: "nowrap", gap: "sm", children: [_jsx(Radio.Indicator, {}), _jsx(Text, { fw: 700, c: "teal", children: LETTERS[index] }), _jsxs(Stack, { className: classes.optionScene, gap: 4, children: [option.text ? _jsx(Text, { style: { whiteSpace: 'pre-wrap' }, children: option.text }) : null, option.scene ? _jsx(StimulusView, { stimulus: { scene: option.scene } }) : null] })] }) }, option.id))) }) })] })) : (_jsxs(Stack, { gap: "md", maw: 760, children: [_jsx(Text, { fw: 700, size: "xl", children: info.name }), _jsx(Text, { children: info.instruction }), _jsx(Text, { children: "\u0412 \u0431\u043B\u043E\u043A\u0435 12 \u0437\u0430\u0434\u0430\u043D\u0438\u0439." }), _jsxs(SimpleGrid, { cols: { base: 1, md: 3 }, spacing: "sm", children: [_jsxs(Paper, { withBorder: true, p: "md", radius: "md", children: [_jsx(Text, { ta: "center", fw: 700, size: "xl", c: "teal", children: "12" }), _jsx(Text, { ta: "center", size: "sm", c: "dimmed", children: "\u0437\u0430\u0434\u0430\u043D\u0438\u0439" })] }), _jsxs(Paper, { withBorder: true, p: "md", radius: "md", children: [_jsx(Text, { ta: "center", fw: 700, size: "xl", c: "teal", children: info.itemSec }), _jsx(Text, { ta: "center", size: "sm", c: "dimmed", children: "\u0441\u0435\u043A\u0443\u043D\u0434 \u043D\u0430 \u0437\u0430\u0434\u0430\u043D\u0438\u0435" })] }), _jsxs(Paper, { withBorder: true, p: "md", radius: "md", children: [_jsx(Text, { ta: "center", fw: 700, size: "xl", c: "orange", children: formatClock(info.blockSec) }), _jsx(Text, { ta: "center", size: "sm", c: "dimmed", children: "\u043D\u0430 \u0431\u043B\u043E\u043A" })] })] }), _jsxs(Text, { children: ["\u0412\u044B\u0431\u043E\u0440 \u0432\u0435\u0440\u043D\u043E\u0433\u043E \u043E\u0442\u0432\u0435\u0442\u0430 \u0438\u0437 ", info.optionCount, " \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u043E\u0432."] }), hintOpen && slot ? (_jsx(Paper, { withBorder: true, p: "sm", radius: "md", bg: "orange.0", children: _jsx(Text, { size: "sm", children: slot.item.hint }) })) : null] })) }));
}
