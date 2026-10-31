import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { assembleAttempt } from './domain/assemble.ts';
import { createAttempt, reduceAttempt } from './domain/attempt.ts';
import { bankItems } from './domain/bank.ts';
import { SCALE_ORDER } from './domain/types.ts';
import { ResultScreen } from './ui/ResultScreen.tsx';
import { StartScreen } from './ui/StartScreen.tsx';
import { Trainer } from './ui/Trainer.tsx';
export default function App() {
    const [selected, setSelected] = useState([...SCALE_ORDER]);
    const [hints, setHints] = useState(false);
    const [explanations, setExplanations] = useState(false);
    const [assembleError, setAssembleError] = useState(null);
    const [attempt, setAttempt] = useState(null);
    const [confirm, setConfirm] = useState(null);
    const ticking = attempt != null &&
        (attempt.phase.kind === 'task' || (attempt.phase.kind === 'instruction' && attempt.phase.mode === 'return'));
    useEffect(() => {
        if (!ticking)
            return;
        const timer = window.setInterval(() => {
            setAttempt((current) => (current ? reduceAttempt(current, { type: 'tick' }) : current));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [ticking]);
    const dispatch = (action) => {
        setAttempt((current) => (current ? reduceAttempt(current, action) : current));
    };
    if (!attempt) {
        return (_jsx(StartScreen, { selected: selected, hints: hints, explanations: explanations, assembleError: assembleError, onToggleScale: (scaleId) => setSelected((current) => (current.includes(scaleId) ? current.filter((id) => id !== scaleId) : [...current, scaleId])), onToggleHints: () => setHints((value) => !value), onToggleExplanations: () => setExplanations((value) => !value), onAll: () => setSelected([...SCALE_ORDER]), onNone: () => setSelected([]), onStart: () => {
                const ordered = SCALE_ORDER.filter((scaleId) => selected.includes(scaleId));
                const assembled = assembleAttempt(ordered, bankItems);
                if (!assembled.ok) {
                    setAssembleError(assembled.error);
                    return;
                }
                setAssembleError(null);
                setAttempt(createAttempt(assembled.blocks, hints, explanations));
            } }));
    }
    const leave = () => {
        setConfirm(null);
        setAttempt(null);
    };
    return (_jsxs(_Fragment, { children: [attempt.phase.kind === 'result' ? (_jsx(ResultScreen, { state: attempt, onPrint: () => window.print(), onRestart: () => setConfirm('result') })) : (_jsx(Trainer, { state: attempt, dispatch: dispatch, onMenu: () => setConfirm('menu') })), _jsx(Modal, { opened: confirm != null, onClose: () => setConfirm(null), centered: true, title: "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u0435", children: _jsxs(Stack, { children: [_jsx(Text, { children: confirm === 'result'
                                ? 'Вернуться на старт? Результат этой попытки пропадет, если его не сохранить.'
                                : 'Выйти на старт? Результат этой попытки пропадет.' }), _jsxs(Group, { justify: "flex-end", children: [_jsx(Button, { variant: "default", onClick: () => setConfirm(null), children: "\u041E\u0441\u0442\u0430\u0442\u044C\u0441\u044F" }), _jsx(Button, { color: "orange", onClick: leave, children: confirm === 'result' ? 'Вернуться' : 'Выйти' })] })] }) })] }));
}
