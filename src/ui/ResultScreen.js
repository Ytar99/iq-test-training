import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Group, Paper, SegmentedControl, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { useState } from 'react';
import { SCALES, TYPE_LABEL } from '../domain/catalog.ts';
import { grade } from '../domain/attempt.ts';
import { formatClock } from '../domain/format.ts';
import { SCALE_ORDER } from '../domain/types.ts';
import { AnswerView, StimulusView } from './content.tsx';
import { Shell } from './Shell.tsx';
import classes from './ResultScreen.module.css';
const filterLabel = {
    all: 'Все',
    correct: 'Правильные',
    wrong: 'Ошибки',
};
function tally(slots) {
    const counts = { correct: 0, wrong: 0, skip: 0 };
    for (const slot of slots)
        counts[grade(slot)] += 1;
    return counts;
}
function optionOf(slot, optionId) {
    if (!optionId)
        return null;
    return slot.item.options.find((option) => option.id === optionId) ?? null;
}
export function ResultScreen({ state, onPrint, onRestart }) {
    const [filter, setFilter] = useState('all');
    const rows = state.blocks.flatMap((block) => block.slots.map((slot, index) => ({
        key: slot.item.id,
        scaleId: block.scaleId,
        number: index + 1,
        slot,
        mark: grade(slot),
    })));
    const counts = {
        all: rows.length,
        correct: rows.filter((row) => row.mark === 'correct').length,
        wrong: rows.filter((row) => row.mark !== 'correct').length,
    };
    const visible = rows.filter((row) => {
        if (filter === 'correct')
            return row.mark === 'correct';
        if (filter === 'wrong')
            return row.mark !== 'correct';
        return true;
    });
    const scaleNames = state.blocks.length === SCALE_ORDER.length ? 'Полный тест' : state.blocks.map((block) => SCALES[block.scaleId].name).join(', ');
    const typeOrder = SCALE_ORDER.flatMap((scaleId) => SCALES[scaleId].forms.map((form) => form.type));
    const typeRows = typeOrder
        .map((type) => {
        const slots = rows.filter((row) => row.slot.item.type === type).map((row) => row.slot);
        return { type, ...tally(slots), count: slots.length };
    })
        .filter((row) => row.count > 0);
    const scaleBody = state.blocks.map((block) => {
        const countsForScale = tally(block.slots);
        const spent = block.spentSec ?? block.limitSec - block.remainingSec;
        return { block, countsForScale, spent };
    });
    return (_jsx(Shell, { children: _jsxs(Stack, { gap: "lg", children: [_jsxs(Stack, { gap: 4, children: [_jsx(Title, { order: 2, children: "\u0418\u0442\u043E\u0433" }), state.finishedAt != null ? _jsx(Text, { children: new Date(state.finishedAt).toLocaleString('ru-RU') }) : null, _jsx(Text, { children: scaleNames }), _jsxs(Text, { className: "print-only", children: ["\u0417\u0430\u0434\u0430\u043D\u0438\u044F: ", filterLabel[filter]] })] }), _jsx("div", { className: `${classes.summaryTable} keep-together`, children: _jsxs(Table, { withTableBorder: true, withColumnBorders: true, tabularNums: true, children: [_jsx(Table.Thead, { children: _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: "\u0428\u043A\u0430\u043B\u0430" }), _jsx(Table.Th, { children: "\u0412\u0435\u0440\u043D\u043E" }), _jsx(Table.Th, { children: "\u041D\u0435\u0432\u0435\u0440\u043D\u043E" }), _jsx(Table.Th, { children: "\u041F\u0440\u043E\u043F\u0443\u0441\u043A" }), _jsx(Table.Th, { children: "\u0412\u0440\u0435\u043C\u044F" })] }) }), _jsx(Table.Tbody, { children: scaleBody.map(({ block, countsForScale, spent }) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { children: SCALES[block.scaleId].name }), _jsx(Table.Td, { children: countsForScale.correct }), _jsx(Table.Td, { children: countsForScale.wrong }), _jsx(Table.Td, { children: countsForScale.skip }), _jsx(Table.Td, { children: formatClock(spent) })] }, block.scaleId))) })] }) }), _jsx("div", { className: classes.summaryCards, children: _jsx(SimpleGrid, { cols: { base: 1, sm: 2 }, spacing: "sm", children: scaleBody.map(({ block, countsForScale, spent }) => (_jsxs(Paper, { withBorder: true, p: "sm", radius: "md", className: "keep-together", children: [_jsx(Text, { fw: 700, children: SCALES[block.scaleId].name }), _jsxs(Text, { size: "sm", children: ["\u0412\u0435\u0440\u043D\u043E: ", countsForScale.correct] }), _jsxs(Text, { size: "sm", children: ["\u041D\u0435\u0432\u0435\u0440\u043D\u043E: ", countsForScale.wrong] }), _jsxs(Text, { size: "sm", children: ["\u041F\u0440\u043E\u043F\u0443\u0441\u043A: ", countsForScale.skip] }), _jsxs(Text, { size: "sm", children: ["\u0412\u0440\u0435\u043C\u044F: ", formatClock(spent)] })] }, block.scaleId))) }) }), _jsx("div", { className: "keep-together", children: _jsxs(Table, { withTableBorder: true, withColumnBorders: true, tabularNums: true, children: [_jsx(Table.Thead, { children: _jsxs(Table.Tr, { children: [_jsx(Table.Th, { children: "\u0422\u0438\u043F" }), _jsx(Table.Th, { children: "\u0412\u0435\u0440\u043D\u043E" }), _jsx(Table.Th, { children: "\u041D\u0435\u0432\u0435\u0440\u043D\u043E" }), _jsx(Table.Th, { children: "\u041F\u0440\u043E\u043F\u0443\u0441\u043A" })] }) }), _jsx(Table.Tbody, { children: typeRows.map((row) => (_jsxs(Table.Tr, { children: [_jsx(Table.Td, { children: TYPE_LABEL[row.type] ?? row.type }), _jsx(Table.Td, { children: row.correct }), _jsx(Table.Td, { children: row.wrong }), _jsx(Table.Td, { children: row.skip })] }, row.type))) })] }) }), _jsxs(Stack, { gap: "sm", children: [_jsx(SegmentedControl, { className: "no-print", fullWidth: true, color: "teal", value: filter, onChange: (value) => setFilter(value), data: [
                                { value: 'all', label: `Все (${counts.all})` },
                                { value: 'correct', label: `Правильные (${counts.correct})` },
                                { value: 'wrong', label: `Ошибки (${counts.wrong})` },
                            ] }), visible.length === 0 ? _jsx(Text, { children: "\u0422\u0430\u043A\u0438\u0445 \u0437\u0430\u0434\u0430\u043D\u0438\u0439 \u043D\u0435\u0442" }) : null, visible.map((row) => {
                            const chosen = row.slot.outcome.kind === 'answer' ? optionOf(row.slot, row.slot.outcome.optionId) : null;
                            const correct = optionOf(row.slot, row.slot.item.correctOptionId);
                            const markText = row.mark === 'correct' ? 'верно' : row.mark === 'wrong' ? 'неверно' : 'пропуск';
                            return (_jsx(Paper, { withBorder: true, p: "md", radius: "md", className: "keep-together", children: _jsxs(Stack, { gap: "xs", children: [_jsxs(Text, { fw: 700, children: [SCALES[row.scaleId].name, ", \u0437\u0430\u0434\u0430\u043D\u0438\u0435 ", row.number] }), _jsx(StimulusView, { stimulus: row.slot.item.stimulus }), _jsx(Text, { fw: 600, children: "\u0412\u0430\u0448 \u043E\u0442\u0432\u0435\u0442" }), _jsx(AnswerView, { option: chosen }), _jsx(Text, { fw: 600, children: "\u0412\u0435\u0440\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442" }), _jsx(AnswerView, { option: correct }), state.explanations ? _jsx(Text, { size: "sm", children: row.slot.item.explanation }) : null, _jsx(Text, { c: row.mark === 'correct' ? 'teal' : row.mark === 'wrong' ? 'orange' : 'dimmed', children: markText })] }) }, row.key));
                        })] }), _jsxs(Group, { className: "no-print", children: [_jsx(Button, { color: "teal", onClick: onPrint, children: "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043E\u0442\u0447\u0435\u0442 \u0432 PDF" }), _jsx(Button, { variant: "default", onClick: onRestart, children: "\u041D\u0430 \u0441\u0442\u0430\u0440\u0442" })] })] }) }));
}
