import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Table } from '@mantine/core';
import { useId } from 'react';
import classes from './SceneView.module.css';
const pieceColors = [
    'var(--mantine-color-teal-6)',
    'var(--mantine-color-orange-6)',
    'var(--mantine-color-blue-6)',
    'var(--mantine-color-grape-6)',
];
const ink = 'var(--mantine-color-gray-8)';
const teal = 'var(--mantine-color-teal-6)';
const orange = 'var(--mantine-color-orange-6)';
function CardElementView({ element }) {
    const style = {
        left: `${element.x * 100}%`,
        top: `${element.y * 100}%`,
        width: `${element.size * 100}%`,
        height: element.shape === 'line' ? 4 : `${element.size * 100}%`,
    };
    if (element.shape === 'line') {
        return _jsx("span", { className: classes.element, style: { ...style, background: 'var(--mantine-color-gray-7)' } });
    }
    const points = element.dir === 'down' ? '4,8 96,8 50,94' : '50,6 96,94 4,94';
    return (_jsxs("svg", { className: classes.element, style: style, viewBox: "0 0 100 100", "aria-hidden": "true", children: [element.shape === 'circle' ? _jsx("circle", { cx: "50", cy: "50", r: "38", fill: "none", stroke: teal, strokeWidth: "10" }) : null, element.shape === 'dot' ? _jsx("circle", { cx: "50", cy: "50", r: "46", fill: teal }) : null, element.shape === 'square' ? _jsx("rect", { x: "2", y: "2", width: "96", height: "96", fill: orange }) : null, element.shape === 'diamond' ? _jsx("polygon", { points: "50,4 96,50 50,96 4,50", fill: "var(--mantine-color-teal-7)" }) : null, element.shape === 'triangle' ? _jsx("polygon", { points: points, fill: orange }) : null] }));
}
export function CardFrame({ content }) {
    return (_jsxs("div", { className: classes.frame, children: [content == null ? _jsx("span", { className: classes.mark, children: "?" }) : null, content?.elements.map((element, index) => (_jsx(CardElementView, { element: element }, `${element.shape}-${index}`)))] }));
}
function FaceMarkShape({ mark }) {
    if (mark === 'blank')
        return null;
    if (mark === 'circle')
        return _jsx("circle", { r: "12", fill: "none", stroke: teal, strokeWidth: "4" });
    if (mark === 'square')
        return _jsx("rect", { x: "-11", y: "-11", width: "22", height: "22", fill: orange });
    if (mark === 'line')
        return _jsx("line", { x1: "-14", y1: "0", x2: "14", y2: "0", stroke: "var(--mantine-color-gray-7)", strokeWidth: "4" });
    return _jsx("polygon", { points: "0,-14 13,12 -13,12", fill: orange });
}
function FaceGlyph({ mark }) {
    if (mark === 'blank')
        return null;
    return (_jsx("svg", { viewBox: "-20 -20 40 40", className: classes.glyph, "aria-hidden": "true", children: _jsx(FaceMarkShape, { mark: mark }) }));
}
function CellBoard({ cols, rows, filled, color }) {
    const set = new Set(filled.map(([x, y]) => `${x},${y}`));
    return (_jsx("div", { className: classes.cells, style: { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, width: `min(100%, calc(${cols} * 1.55rem))` }, children: Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) => (_jsx("div", { className: set.has(`${x},${y}`) ? `${classes.cell} ${classes.filled}` : classes.cell, style: color && set.has(`${x},${y}`) ? { background: color, borderColor: color } : undefined }, `${x}-${y}`)))) }));
}
function pieceFrame(cells) {
    if (cells.length === 0)
        return { cols: 1, rows: 1, filled: [] };
    const minX = Math.min(...cells.map((cell) => cell[0]));
    const minY = Math.min(...cells.map((cell) => cell[1]));
    const maxX = Math.max(...cells.map((cell) => cell[0]));
    const maxY = Math.max(...cells.map((cell) => cell[1]));
    return {
        cols: maxX - minX + 1,
        rows: maxY - minY + 1,
        filled: cells.map(([x, y]) => [x - minX, y - minY]),
    };
}
function gridBox(cells) {
    const cols = Math.max(1, ...cells.map((cell) => cell[0] + 1));
    const rows = Math.max(1, ...cells.map((cell) => cell[1] + 1));
    return { cols, rows };
}
function ChartView({ labels, values, variant }) {
    const width = 360;
    const height = 210;
    const padX = 18;
    const base = 162;
    const plotTop = 28;
    const plotH = base - plotTop;
    const max = Math.max(...values, 1);
    const slot = (width - padX * 2) / Math.max(values.length, 1);
    const labelSize = labels.some((label) => label.length > 6) ? 11 : 13;
    const points = values.map((value, index) => ({
        x: padX + slot * index + slot / 2,
        y: base - (value / max) * plotH,
        value,
        label: labels[index] ?? '',
    }));
    return (_jsxs("svg", { className: classes.chart, viewBox: `0 0 ${width} ${height}`, role: "img", children: [_jsx("line", { x1: padX, y1: base, x2: width - padX, y2: base, stroke: "var(--mantine-color-gray-4)" }), variant === 'bar'
                ? points.map((point, index) => {
                    const barWidth = Math.min(slot * 0.62, slot - 8);
                    const barHeight = base - point.y;
                    return (_jsxs("g", { children: [_jsx("rect", { x: point.x - barWidth / 2, y: point.y, width: barWidth, height: barHeight, fill: teal }), _jsx("text", { x: point.x, y: point.y - 6, textAnchor: "middle", fontSize: "13", fill: ink, children: point.value }), _jsx("text", { x: point.x, y: base + 20, textAnchor: "middle", fontSize: labelSize, fill: ink, children: point.label })] }, `${point.label}-${index}`));
                })
                : points.map((point, index) => (_jsxs("g", { children: [index > 0 ? (_jsx("line", { x1: points[index - 1]?.x, y1: points[index - 1]?.y, x2: point.x, y2: point.y, stroke: orange, strokeWidth: "3" })) : null, _jsx("circle", { cx: point.x, cy: point.y, r: "4.5", fill: orange }), _jsx("text", { x: point.x, y: point.y - 10, textAnchor: "middle", fontSize: "13", fill: ink, children: point.value }), _jsx("text", { x: point.x, y: base + 20, textAnchor: "middle", fontSize: labelSize, fill: ink, children: point.label })] }, `${point.label}-${index}`)))] }));
}
function StackIso({ heights }) {
    const cellW = 32;
    const depth = 14;
    const cellH = 16;
    const rows = heights.length;
    const cols = heights[0]?.length ?? 1;
    const maxH = Math.max(1, ...heights.flat(), 1);
    const originX = depth + 6;
    const originY = maxH * cellH + depth + 6;
    const width = originX + (cols - 1) * cellW + (rows - 1) * depth + cellW + depth + 8;
    const height = originY + (rows - 1) * depth + cellH + 8;
    return (_jsx("svg", { className: classes.chart, viewBox: `0 0 ${width} ${height}`, role: "img", children: heights.map((row, rowIndex) => row.map((count, colIndex) => Array.from({ length: count }, (_, level) => {
            const x = originX + colIndex * cellW + rowIndex * depth;
            const topY = originY + rowIndex * depth - (level + 1) * cellH;
            const top = `${x},${topY} ${x + cellW},${topY} ${x + cellW - depth},${topY - depth} ${x - depth},${topY - depth}`;
            const front = `${x},${topY} ${x + cellW},${topY} ${x + cellW},${topY + cellH} ${x},${topY + cellH}`;
            const right = `${x + cellW},${topY} ${x + cellW - depth},${topY - depth} ${x + cellW - depth},${topY - depth + cellH} ${x + cellW},${topY + cellH}`;
            return (_jsxs("g", { children: [_jsx("polygon", { points: top, fill: "var(--mantine-color-teal-3)", stroke: "var(--mantine-color-teal-8)" }), _jsx("polygon", { points: right, fill: "var(--mantine-color-teal-7)", stroke: "var(--mantine-color-teal-8)" }), _jsx("polygon", { points: front, fill: "var(--mantine-color-teal-5)", stroke: "var(--mantine-color-teal-8)" })] }, `${rowIndex}-${colIndex}-${level}`));
        }))) }));
}
function CubeView({ front, top, right }) {
    const id = useId().replace(/:/g, '');
    const mark = (face, value, x, y) => value === 'blank' ? null : (_jsx("g", { clipPath: `url(#${id}-${face})`, transform: `translate(${x} ${y}) scale(0.85)`, children: _jsx(FaceMarkShape, { mark: value }) }));
    return (_jsxs("svg", { className: classes.cube, viewBox: "0 0 150 130", role: "img", children: [_jsxs("defs", { children: [_jsx("clipPath", { id: `${id}-top`, children: _jsx("polygon", { points: "40,48 78,28 116,48 78,68" }) }), _jsx("clipPath", { id: `${id}-front`, children: _jsx("polygon", { points: "40,48 78,68 78,112 40,92" }) }), _jsx("clipPath", { id: `${id}-right`, children: _jsx("polygon", { points: "78,68 116,48 116,92 78,112" }) })] }), _jsx("polygon", { points: "40,48 78,28 116,48 78,68", fill: "var(--mantine-color-gray-1)", stroke: "var(--mantine-color-gray-7)" }), _jsx("polygon", { points: "40,48 78,68 78,112 40,92", fill: "white", stroke: "var(--mantine-color-gray-7)" }), _jsx("polygon", { points: "78,68 116,48 116,92 78,112", fill: "var(--mantine-color-gray-0)", stroke: "var(--mantine-color-gray-7)" }), mark('front', front, 59, 80), mark('top', top, 78, 48), mark('right', right, 97, 80)] }));
}
function isNumeric(value) {
    return /^-?\d+(?:[.,]\d+)?$/.test(value.trim());
}
function TableView({ headers, rows }) {
    return (_jsx("div", { className: classes.tableWrap, children: _jsxs(Table, { withTableBorder: true, withColumnBorders: true, tabularNums: true, horizontalSpacing: "sm", verticalSpacing: "xs", className: classes.dataTable, children: [_jsx(Table.Thead, { children: _jsx(Table.Tr, { children: headers.map((header, index) => (_jsx(Table.Th, { children: header }, `${header}-${index}`))) }) }), _jsx(Table.Tbody, { children: rows.map((row, index) => (_jsx(Table.Tr, { children: row.map((cell, cellIndex) => (_jsx(Table.Td, { className: isNumeric(cell) ? classes.numberCell : undefined, children: cell }, cellIndex))) }, index))) })] }) }));
}
function renderScene(scene) {
    if (scene.kind === 'card')
        return _jsx(CardFrame, { content: { elements: scene.elements } });
    if (scene.kind === 'matrix') {
        const columns = scene.cells[0]?.length ?? 1;
        return (_jsx("div", { className: classes.matrix, style: { gridTemplateColumns: `repeat(${columns}, 4.5rem)` }, children: scene.cells.flat().map((cell, index) => (_jsx(CardFrame, { content: cell }, index))) }));
    }
    if (scene.kind === 'sequence') {
        return (_jsxs("div", { className: classes.rowScroll, children: [scene.steps.map((step, index) => (_jsx(CardFrame, { content: step }, index))), _jsx(CardFrame, { content: null })] }));
    }
    if (scene.kind === 'analogy') {
        return (_jsxs("div", { className: classes.analogy, children: [_jsxs("div", { className: classes.pair, children: [_jsx(CardFrame, { content: scene.pair[0] }), _jsx("span", { "aria-hidden": "true", children: "\u2192" }), _jsx(CardFrame, { content: scene.pair[1] })] }), _jsx("span", { className: classes.like, children: "\u043A\u0430\u043A" }), _jsxs("div", { className: classes.pair, children: [_jsx(CardFrame, { content: scene.given }), _jsx("span", { "aria-hidden": "true", children: "\u2192" }), _jsx(CardFrame, { content: null })] })] }));
    }
    if (scene.kind === 'group') {
        return (_jsx("div", { className: classes.layout, children: scene.cards.map((card, index) => (_jsx(CardFrame, { content: card }, index))) }));
    }
    if (scene.kind === 'cells') {
        if (scene.pieces) {
            return (_jsx("div", { className: classes.pieces, children: scene.pieces.map((piece, index) => {
                    const box = pieceFrame(piece);
                    return _jsx(CellBoard, { cols: box.cols, rows: box.rows, filled: box.filled, color: pieceColors[index % pieceColors.length] }, index);
                }) }));
        }
        const filled = scene.filled ?? [];
        const box = scene.cols && scene.rows ? { cols: scene.cols, rows: scene.rows } : gridBox(filled);
        return _jsx(CellBoard, { cols: box.cols, rows: box.rows, filled: filled });
    }
    if (scene.kind === 'net') {
        const columns = Math.max(...scene.layout.map((row) => row.length));
        return (_jsx("div", { className: classes.net, style: { gridTemplateColumns: `repeat(${columns}, 2.6rem)` }, children: scene.layout.flat().map((face, index) => (_jsx("div", { className: face == null ? classes.faceHole : classes.face, children: face ? _jsx(FaceGlyph, { mark: face }) : null }, index))) }));
    }
    if (scene.kind === 'cube')
        return _jsx(CubeView, { front: scene.front, top: scene.top, right: scene.right });
    if (scene.kind === 'chart')
        return _jsx(ChartView, { labels: scene.labels, values: scene.values, variant: scene.variant });
    if (scene.kind === 'table')
        return _jsx(TableView, { headers: scene.headers, rows: scene.rows });
    if (scene.view === 'top') {
        const columns = scene.heights[0]?.length ?? 1;
        return (_jsx("div", { className: classes.heights, style: { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, width: `min(100%, calc(${columns} * 1.9rem))` }, children: scene.heights.flat().map((value, index) => (_jsx("div", { className: classes.height, children: value }, index))) }));
    }
    return _jsx(StackIso, { heights: scene.heights });
}
export function SceneView({ scene }) {
    return _jsx("div", { className: classes.scene, children: renderScene(scene) });
}
