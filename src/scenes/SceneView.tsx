import { Table } from '@mantine/core'
import { useId } from 'react'
import type { CardContent, CardElement, FaceMark, Scene } from '../domain/types.ts'
import classes from './SceneView.module.css'

const pieceColors = [
  'var(--mantine-color-teal-6)',
  'var(--mantine-color-orange-6)',
  'var(--mantine-color-blue-6)',
  'var(--mantine-color-grape-6)',
]

const ink = 'var(--mantine-color-gray-8)'
const teal = 'var(--mantine-color-teal-6)'
const orange = 'var(--mantine-color-orange-6)'

function CardElementView({ element }: { element: CardElement }) {
  const style = {
    left: `${element.x * 100}%`,
    top: `${element.y * 100}%`,
    width: `${element.size * 100}%`,
    height: element.shape === 'line' ? 4 : `${element.size * 100}%`,
  }
  if (element.shape === 'line') {
    return <span className={classes.element} style={{ ...style, background: 'var(--mantine-color-gray-7)' }} />
  }
  const points = element.dir === 'down' ? '4,8 96,8 50,94' : '50,6 96,94 4,94'
  return (
    <svg className={classes.element} style={style} viewBox="0 0 100 100" aria-hidden="true">
      {element.shape === 'circle' ? <circle cx="50" cy="50" r="38" fill="none" stroke={teal} strokeWidth="10" /> : null}
      {element.shape === 'dot' ? <circle cx="50" cy="50" r="46" fill={teal} /> : null}
      {element.shape === 'square' ? <rect x="2" y="2" width="96" height="96" fill={orange} /> : null}
      {element.shape === 'diamond' ? <polygon points="50,4 96,50 50,96 4,50" fill="var(--mantine-color-teal-7)" /> : null}
      {element.shape === 'triangle' ? <polygon points={points} fill={orange} /> : null}
    </svg>
  )
}

export function CardFrame({ content }: { content: CardContent | null }) {
  return (
    <div className={classes.frame}>
      {content == null ? <span className={classes.mark}>?</span> : null}
      {content?.elements.map((element, index) => (
        <CardElementView key={`${element.shape}-${index}`} element={element} />
      ))}
    </div>
  )
}

function FaceMarkShape({ mark }: { mark: FaceMark }) {
  if (mark === 'blank') return null
  if (mark === 'circle') return <circle r="12" fill="none" stroke={teal} strokeWidth="4" />
  if (mark === 'square') return <rect x="-11" y="-11" width="22" height="22" fill={orange} />
  if (mark === 'line') return <line x1="-14" y1="0" x2="14" y2="0" stroke="var(--mantine-color-gray-7)" strokeWidth="4" />
  return <polygon points="0,-14 13,12 -13,12" fill={orange} />
}

function FaceGlyph({ mark }: { mark: FaceMark }) {
  if (mark === 'blank') return null
  return (
    <svg viewBox="-20 -20 40 40" className={classes.glyph} aria-hidden="true">
      <FaceMarkShape mark={mark} />
    </svg>
  )
}

function CellBoard({ cols, rows, filled, color }: { cols: number; rows: number; filled: number[][]; color?: string }) {
  const set = new Set(filled.map(([x, y]) => `${x},${y}`))
  return (
    <div
      className={classes.cells}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, width: `min(100%, calc(${cols} * 1.55rem))` }}
    >
      {Array.from({ length: rows }, (_, y) =>
        Array.from({ length: cols }, (_, x) => (
          <div
            key={`${x}-${y}`}
            className={set.has(`${x},${y}`) ? `${classes.cell} ${classes.filled}` : classes.cell}
            style={color && set.has(`${x},${y}`) ? { background: color, borderColor: color } : undefined}
          />
        )),
      )}
    </div>
  )
}

function pieceFrame(cells: number[][]) {
  if (cells.length === 0) return { cols: 1, rows: 1, filled: [] as number[][] }
  const minX = Math.min(...cells.map((cell) => cell[0]))
  const minY = Math.min(...cells.map((cell) => cell[1]))
  const maxX = Math.max(...cells.map((cell) => cell[0]))
  const maxY = Math.max(...cells.map((cell) => cell[1]))
  return {
    cols: maxX - minX + 1,
    rows: maxY - minY + 1,
    filled: cells.map(([x, y]) => [x - minX, y - minY]),
  }
}

function gridBox(cells: number[][]) {
  const cols = Math.max(1, ...cells.map((cell) => cell[0] + 1))
  const rows = Math.max(1, ...cells.map((cell) => cell[1] + 1))
  return { cols, rows }
}

function ChartView({ labels, values, variant }: { labels: string[]; values: number[]; variant: 'bar' | 'line' }) {
  const width = 360
  const height = 210
  const padX = 18
  const base = 162
  const plotTop = 28
  const plotH = base - plotTop
  const max = Math.max(...values, 1)
  const slot = (width - padX * 2) / Math.max(values.length, 1)
  const labelSize = labels.some((label) => label.length > 6) ? 11 : 13
  const points = values.map((value, index) => ({
    x: padX + slot * index + slot / 2,
    y: base - (value / max) * plotH,
    value,
    label: labels[index] ?? '',
  }))
  return (
    <svg className={classes.chart} viewBox={`0 0 ${width} ${height}`} role="img">
      <line x1={padX} y1={base} x2={width - padX} y2={base} stroke="var(--mantine-color-gray-4)" />
      {variant === 'bar'
        ? points.map((point, index) => {
            const barWidth = Math.min(slot * 0.62, slot - 8)
            const barHeight = base - point.y
            return (
              <g key={`${point.label}-${index}`}>
                <rect x={point.x - barWidth / 2} y={point.y} width={barWidth} height={barHeight} fill={teal} />
                <text x={point.x} y={point.y - 6} textAnchor="middle" fontSize="13" fill={ink}>
                  {point.value}
                </text>
                <text x={point.x} y={base + 20} textAnchor="middle" fontSize={labelSize} fill={ink}>
                  {point.label}
                </text>
              </g>
            )
          })
        : points.map((point, index) => (
            <g key={`${point.label}-${index}`}>
              {index > 0 ? (
                <line
                  x1={points[index - 1]?.x}
                  y1={points[index - 1]?.y}
                  x2={point.x}
                  y2={point.y}
                  stroke={orange}
                  strokeWidth="3"
                />
              ) : null}
              <circle cx={point.x} cy={point.y} r="4.5" fill={orange} />
              <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize="13" fill={ink}>
                {point.value}
              </text>
              <text x={point.x} y={base + 20} textAnchor="middle" fontSize={labelSize} fill={ink}>
                {point.label}
              </text>
            </g>
          ))}
    </svg>
  )
}

function StackIso({ heights }: { heights: number[][] }) {
  const halfW = 18
  const halfH = 10
  const cubeH = 16
  const rows = heights.length
  const cols = heights[0]?.length ?? 1
  const maxH = Math.max(1, ...heights.flat(), 1)
  const originX = (rows - 1) * halfW + halfW + 4
  const originY = maxH * cubeH + 6
  const width = originX + (cols - 1) * halfW + halfW + 6
  const height = originY + (cols + rows - 2) * halfH + halfH * 2 + cubeH + 6
  const order: { row: number; col: number; level: number }[] = []
  for (let sum = 0; sum < rows + cols; sum += 1) {
    for (let row = 0; row < rows; row += 1) {
      const col = sum - row
      if (col < 0 || col >= cols) continue
      const count = heights[row]?.[col] ?? 0
      for (let level = 0; level < count; level += 1) order.push({ row, col, level })
    }
  }
  return (
    <svg className={classes.iso} viewBox={`0 0 ${width} ${height}`} role="img">
      {order.map(({ row, col, level }) => {
        const x = originX + (col - row) * halfW
        const y = originY + (col + row) * halfH - (level + 1) * cubeH
        const top = `${x},${y} ${x + halfW},${y + halfH} ${x},${y + halfH * 2} ${x - halfW},${y + halfH}`
        const left = `${x - halfW},${y + halfH} ${x},${y + halfH * 2} ${x},${y + halfH * 2 + cubeH} ${x - halfW},${y + halfH + cubeH}`
        const right = `${x + halfW},${y + halfH} ${x},${y + halfH * 2} ${x},${y + halfH * 2 + cubeH} ${x + halfW},${y + halfH + cubeH}`
        return (
          <g key={`${row}-${col}-${level}`}>
            <polygon points={top} fill="var(--mantine-color-teal-3)" stroke="var(--mantine-color-teal-8)" />
            <polygon points={left} fill="var(--mantine-color-teal-5)" stroke="var(--mantine-color-teal-8)" />
            <polygon points={right} fill="var(--mantine-color-teal-7)" stroke="var(--mantine-color-teal-8)" />
          </g>
        )
      })}
    </svg>
  )
}

function CubeView({ front, top, right }: { front: FaceMark; top: FaceMark; right: FaceMark }) {
  const id = useId().replace(/:/g, '')
  const mark = (face: 'top' | 'front' | 'right', value: FaceMark, x: number, y: number) =>
    value === 'blank' ? null : (
      <g clipPath={`url(#${id}-${face})`}>
        <g transform={`translate(${x} ${y}) scale(0.62)`}>
          <FaceMarkShape mark={value} />
        </g>
      </g>
    )
  return (
    <svg className={classes.cube} viewBox="32 20 92 100" role="img">
      <defs>
        <clipPath id={`${id}-top`}>
          <polygon points="40,48 78,28 116,48 78,68" />
        </clipPath>
        <clipPath id={`${id}-front`}>
          <polygon points="40,48 78,68 78,112 40,92" />
        </clipPath>
        <clipPath id={`${id}-right`}>
          <polygon points="78,68 116,48 116,92 78,112" />
        </clipPath>
      </defs>
      <polygon points="40,48 78,28 116,48 78,68" fill="var(--mantine-color-gray-1)" stroke="var(--mantine-color-gray-7)" />
      <polygon points="40,48 78,68 78,112 40,92" fill="white" stroke="var(--mantine-color-gray-7)" />
      <polygon points="78,68 116,48 116,92 78,112" fill="var(--mantine-color-gray-0)" stroke="var(--mantine-color-gray-7)" />
      {mark('front', front, 59, 80)}
      {mark('top', top, 78, 48)}
      {mark('right', right, 97, 80)}
    </svg>
  )
}

function isNumeric(value: string) {
  return /^-?\d+(?:[.,]\d+)?$/.test(value.trim())
}

function TableView({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className={classes.tableWrap}>
      <Table withTableBorder withColumnBorders tabularNums horizontalSpacing="sm" verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            {headers.map((header, index) => (
              <Table.Th key={`${header}-${index}`}>{header}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row, index) => (
            <Table.Tr key={index}>
              {row.map((cell, cellIndex) => (
                <Table.Td key={cellIndex} className={isNumeric(cell) ? classes.numberCell : undefined}>
                  {cell}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </div>
  )
}

function compassPoint(deg: number, radius: number) {
  const rad = (deg * Math.PI) / 180
  return { x: 50 + radius * Math.sin(rad), y: 50 - radius * Math.cos(rad) }
}

function CompassView({ arrow, label, labelAt }: { arrow: number; label: string; labelAt: number }) {
  const rad = (arrow * Math.PI) / 180
  const forward = { x: Math.sin(rad), y: -Math.cos(rad) }
  const side = { x: Math.cos(rad), y: Math.sin(rad) }
  const tip = { x: 50 + forward.x * 27, y: 50 + forward.y * 27 }
  const neck = { x: 50 + forward.x * 16, y: 50 + forward.y * 16 }
  const left = { x: neck.x + side.x * 4.2, y: neck.y + side.y * 4.2 }
  const right = { x: neck.x - side.x * 4.2, y: neck.y - side.y * 4.2 }
  const letter = compassPoint(labelAt, 42)
  return (
    <svg viewBox="0 0 100 100" className={classes.compass} role="img" aria-label={`Компас, буква ${label}`}>
      <circle cx="50" cy="50" r="30" fill="white" stroke={ink} strokeWidth="1.75" />
      <line x1="50" y1="50" x2={neck.x} y2={neck.y} stroke={orange} strokeWidth="3" strokeLinecap="round" />
      <polygon points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`} fill={orange} />
      <circle cx="50" cy="50" r="2.2" fill={orange} />
      <text x={letter.x} y={letter.y} textAnchor="middle" dominantBaseline="central" className={classes.compassLetter}>
        {label}
      </text>
    </svg>
  )
}

function renderScene(scene: Scene) {
  if (scene.kind === 'card') return <CardFrame content={{ elements: scene.elements }} />
  if (scene.kind === 'matrix') {
    const columns = scene.cells[0]?.length ?? 1
    return (
      <div className={classes.matrix} style={{ gridTemplateColumns: `repeat(${columns}, 4.5rem)` }}>
        {scene.cells.flat().map((cell, index) => (
          <CardFrame key={index} content={cell} />
        ))}
      </div>
    )
  }
  if (scene.kind === 'sequence') {
    return (
      <div className={classes.rowScroll}>
        {scene.steps.map((step, index) => (
          <CardFrame key={index} content={step} />
        ))}
        <CardFrame content={null} />
      </div>
    )
  }
  if (scene.kind === 'analogy') {
    return (
      <div className={classes.analogy}>
        <div className={classes.pair}>
          <CardFrame content={scene.pair[0]} />
          <span aria-hidden="true">→</span>
          <CardFrame content={scene.pair[1]} />
        </div>
        <span className={classes.like}>как</span>
        <div className={classes.pair}>
          <CardFrame content={scene.given} />
          <span aria-hidden="true">→</span>
          <CardFrame content={null} />
        </div>
      </div>
    )
  }
  if (scene.kind === 'group') {
    return (
      <div className={classes.layout}>
        {scene.cards.map((card, index) => (
          <CardFrame key={index} content={card} />
        ))}
      </div>
    )
  }
  if (scene.kind === 'cells') {
    if (scene.pieces) {
      return (
        <div className={classes.pieces}>
          {scene.pieces.map((piece, index) => {
            const box = pieceFrame(piece)
            return <CellBoard key={index} cols={box.cols} rows={box.rows} filled={box.filled} color={pieceColors[index % pieceColors.length]} />
          })}
        </div>
      )
    }
    const filled = scene.filled ?? []
    const box = scene.cols && scene.rows ? { cols: scene.cols, rows: scene.rows } : gridBox(filled)
    return <CellBoard cols={box.cols} rows={box.rows} filled={filled} />
  }
  if (scene.kind === 'net') {
    const columns = Math.max(...scene.layout.map((row) => row.length))
    return (
      <div className={classes.net} style={{ gridTemplateColumns: `repeat(${columns}, 2.6rem)` }}>
        {scene.layout.flat().map((face, index) => (
          <div key={index} className={face == null ? classes.faceHole : classes.face}>
            {face ? <FaceGlyph mark={face} /> : null}
          </div>
        ))}
      </div>
    )
  }
  if (scene.kind === 'cube') return <CubeView front={scene.front} top={scene.top} right={scene.right} />
  if (scene.kind === 'chart') return <ChartView labels={scene.labels} values={scene.values} variant={scene.variant} />
  if (scene.kind === 'table') return <TableView headers={scene.headers} rows={scene.rows} />
  if (scene.kind === 'compass') return <CompassView arrow={scene.arrow} label={scene.label} labelAt={scene.labelAt} />
  if (scene.view === 'top') {
    const columns = scene.heights[0]?.length ?? 1
    return (
      <div
        className={classes.heights}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, width: `min(100%, calc(${columns} * 1.9rem))` }}
      >
        {scene.heights.flat().map((value, index) => (
          <div key={index} className={classes.height}>
            {value}
          </div>
        ))}
      </div>
    )
  }
  return <StackIso heights={scene.heights} />
}

export function SceneView({ scene }: { scene: Scene }) {
  return <div className={classes.scene}>{renderScene(scene)}</div>
}
