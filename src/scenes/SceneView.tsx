import { useId } from 'react'
import type { CardContent, CardElement, FaceMark, Scene } from '../domain/types.ts'
import classes from './SceneView.module.css'

const pieceColors = [
  'var(--mantine-color-teal-6)',
  'var(--mantine-color-orange-6)',
  'var(--mantine-color-blue-6)',
  'var(--mantine-color-grape-6)',
]

function CardElementView({ element }: { element: CardElement }) {
  const style = {
    left: `${element.x * 100}%`,
    top: `${element.y * 100}%`,
    width: `${element.size * 100}%`,
    height: `${element.size * 100}%`,
  }
  if (element.shape === 'circle' || element.shape === 'dot') {
    return <span className={classes.element} style={{ ...style, borderRadius: '50%', background: 'var(--mantine-color-teal-6)' }} />
  }
  if (element.shape === 'square') {
    return <span className={classes.element} style={{ ...style, background: 'var(--mantine-color-orange-6)' }} />
  }
  if (element.shape === 'diamond') {
    return (
      <span
        className={classes.element}
        style={{ ...style, background: 'var(--mantine-color-teal-7)', transform: 'translate(-50%, -50%) rotate(45deg)' }}
      />
    )
  }
  if (element.shape === 'line') {
    return (
      <span
        className={classes.element}
        style={{ ...style, height: 3, background: 'var(--mantine-color-gray-7)' }}
      />
    )
  }
  const points = element.dir === 'down' ? '10,16 90,16 50,88' : '50,12 90,84 10,84'
  return (
    <svg className={classes.element} style={style} viewBox="0 0 100 100" aria-hidden="true">
      <polygon points={points} fill="var(--mantine-color-orange-6)" />
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

function FaceGlyph({ mark }: { mark: FaceMark }) {
  if (mark === 'blank') return null
  if (mark === 'circle') return <svg width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="var(--mantine-color-orange-6)" /></svg>
  if (mark === 'square') return <svg width="22" height="22" aria-hidden="true"><rect x="5" y="5" width="12" height="12" fill="var(--mantine-color-teal-6)" /></svg>
  if (mark === 'line') return <svg width="22" height="22" aria-hidden="true"><line x1="4" y1="11" x2="18" y2="11" stroke="var(--mantine-color-gray-7)" strokeWidth="3" /></svg>
  return (
    <svg width="22" height="22" viewBox="0 0 100 100" aria-hidden="true">
      <polygon points="50,16 88,82 12,82" fill="var(--mantine-color-orange-6)" />
    </svg>
  )
}

function CellBoard({ cols, rows, filled, color }: { cols: number; rows: number; filled: number[][]; color?: string }) {
  const set = new Set(filled.map(([x, y]) => `${x},${y}`))
  return (
    <div className={classes.cells} style={{ gridTemplateColumns: `repeat(${cols}, 1.15rem)` }}>
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

function bounds(cells: number[][]) {
  const cols = Math.max(1, ...cells.map((cell) => cell[0] + 1))
  const rows = Math.max(1, ...cells.map((cell) => cell[1] + 1))
  return { cols, rows }
}

function SchemeView({ parts }: { parts: Extract<Scene, { kind: 'scheme' }>['parts'] }) {
  const markerId = useId().replace(/:/g, '')
  const arrow = { up: [110, 40], down: [110, 180], left: [40, 110], right: [180, 110] } as const
  const labelAt = { top: [110, 22], right: [198, 114], bottom: [110, 206], left: [22, 114] } as const
  return (
    <svg className={classes.chart} viewBox="0 0 220 220" role="img">
      {parts.map((part, index) => {
        if (part.type === 'circle') {
          return <circle key={index} cx="110" cy="110" r="68" fill="none" stroke="var(--mantine-color-teal-7)" strokeWidth="3" />
        }
        if (part.type === 'rect') {
          return (
            <g key={index}>
              <rect x="55" y="70" width="110" height="70" fill="none" stroke="var(--mantine-color-teal-7)" strokeWidth="3" />
              <text x="110" y="64" textAnchor="middle" fontSize="14">{part.labels?.top}</text>
              <text x="110" y="158" textAnchor="middle" fontSize="14">{part.labels?.bottom}</text>
              <text x="42" y="110" textAnchor="end" fontSize="14">{part.labels?.left}</text>
              <text x="178" y="110" fontSize="14">{part.labels?.right}</text>
            </g>
          )
        }
        if (part.type === 'label') {
          const [x, y] = labelAt[part.place]
          return (
            <text key={index} x={x} y={y} textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--mantine-color-orange-7)">
              {part.text}
            </text>
          )
        }
        const [x, y] = arrow[part.dir]
        return <line key={index} x1="110" y1="110" x2={x} y2={y} stroke="var(--mantine-color-orange-6)" strokeWidth="4" markerEnd={`url(#${markerId})`} />
      })}
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" fill="var(--mantine-color-orange-6)" />
        </marker>
      </defs>
    </svg>
  )
}

function ChartView({ labels, values, variant }: { labels: string[]; values: number[]; variant: 'bar' | 'line' }) {
  const width = 320
  const height = 180
  const max = Math.max(...values, 1)
  const slot = width / values.length
  const points = values.map((value, index) => {
    const x = slot * index + slot / 2
    const y = 24 + (1 - value / max) * 120
    return `${x},${y}`
  })
  return (
    <svg className={classes.chart} viewBox={`0 0 ${width} ${height}`} role="img">
      {variant === 'bar'
        ? values.map((value, index) => {
            const barHeight = (value / max) * 120
            return (
              <g key={labels[index] ?? index}>
                <rect x={slot * index + 10} y={144 - barHeight} width={slot - 20} height={barHeight} fill="var(--mantine-color-teal-6)" />
                <text x={slot * index + slot / 2} y="166" textAnchor="middle" fontSize="12">
                  {labels[index]}
                </text>
              </g>
            )
          })
        : <polyline points={points.join(' ')} fill="none" stroke="var(--mantine-color-orange-6)" strokeWidth="3" />}
    </svg>
  )
}

function StackIso({ heights }: { heights: number[][] }) {
  const cellW = 34
  const cellH = 18
  const depth = 14
  const maxH = Math.max(1, ...heights.flat())
  const rows = heights.length
  const cols = heights[0]?.length ?? 1
  const width = cols * cellW + rows * depth + 24
  const height = maxH * cellH + rows * depth + 28
  return (
    <svg className={classes.chart} viewBox={`0 0 ${width} ${height}`} role="img">
      {heights.map((row, rowIndex) =>
        row.map((count, colIndex) => {
          const x = 12 + colIndex * cellW + (rows - rowIndex) * 6
          const base = 16 + maxH * cellH + rowIndex * 10
          return Array.from({ length: count }, (_, level) => {
            const top = base - level * cellH
            return (
              <g key={`${rowIndex}-${colIndex}-${level}`}>
                <polygon points={`${x},${top} ${x + cellW},${top} ${x + cellW + depth},${top - depth} ${x + depth},${top - depth}`} fill="var(--mantine-color-teal-3)" stroke="var(--mantine-color-teal-8)" />
                <polygon points={`${x},${top} ${x + depth},${top - depth} ${x + depth},${top - depth + cellH} ${x},${top + cellH}`} fill="var(--mantine-color-teal-5)" stroke="var(--mantine-color-teal-8)" />
                <polygon points={`${x + cellW},${top} ${x + cellW + depth},${top - depth} ${x + cellW + depth},${top - depth + cellH} ${x + cellW},${top + cellH}`} fill="var(--mantine-color-teal-7)" stroke="var(--mantine-color-teal-8)" />
              </g>
            )
          })
        }),
      )}
    </svg>
  )
}

function CubeView({ front, top, right }: { front: FaceMark; top: FaceMark; right: FaceMark }) {
  return (
    <svg width="150" height="130" viewBox="0 0 150 130" role="img" aria-hidden="true">
      <polygon points="40,48 78,28 116,48 78,68" fill="var(--mantine-color-gray-1)" stroke="var(--mantine-color-gray-7)" />
      <polygon points="40,48 78,68 78,112 40,92" fill="white" stroke="var(--mantine-color-gray-7)" />
      <polygon points="78,68 116,48 116,92 78,112" fill="var(--mantine-color-gray-0)" stroke="var(--mantine-color-gray-7)" />
      <g transform="translate(49,78)"><FaceGlyph mark={front} /></g>
      <g transform="translate(67,34)"><FaceGlyph mark={top} /></g>
      <g transform="translate(88,68)"><FaceGlyph mark={right} /></g>
    </svg>
  )
}

export function SceneView({ scene }: { scene: Scene }) {
  if (scene.kind === 'card') return <CardFrame content={{ elements: scene.elements }} />
  if (scene.kind === 'matrix') {
    return (
      <div className={classes.layout}>
        <div className={classes.net} style={{ gridTemplateColumns: `repeat(${scene.cells[0]?.length ?? 1}, 4.5rem)` }}>
          {scene.cells.flat().map((cell, index) => (
            <CardFrame key={index} content={cell} />
          ))}
        </div>
      </div>
    )
  }
  if (scene.kind === 'sequence') {
    return (
      <div className={classes.layout}>
        {scene.steps.map((step, index) => (
          <CardFrame key={index} content={step} />
        ))}
        <CardFrame content={null} />
      </div>
    )
  }
  if (scene.kind === 'analogy') {
    return (
      <div className={classes.layout}>
        <CardFrame content={scene.pair[0]} />
        <span>→</span>
        <CardFrame content={scene.pair[1]} />
        <span>как</span>
        <CardFrame content={scene.given} />
        <span>→</span>
        <CardFrame content={null} />
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
            const box = bounds(piece)
            return <CellBoard key={index} cols={box.cols} rows={box.rows} filled={piece} color={pieceColors[index % pieceColors.length]} />
          })}
        </div>
      )
    }
    const filled = scene.filled ?? []
    const box = scene.cols && scene.rows ? { cols: scene.cols, rows: scene.rows } : bounds(filled)
    return <CellBoard cols={box.cols} rows={box.rows} filled={filled} />
  }
  if (scene.kind === 'scheme') return <SchemeView parts={scene.parts} />
  if (scene.kind === 'net') {
    const columns = Math.max(...scene.layout.map((row) => row.length))
    return (
      <div className={classes.net} style={{ gridTemplateColumns: `repeat(${columns}, 2.6rem)` }}>
        {scene.layout.flat().map((face, index) => (
          <div key={index} className={classes.face} style={face == null ? { borderColor: 'transparent' } : undefined}>
            {face ? <FaceGlyph mark={face} /> : null}
          </div>
        ))}
      </div>
    )
  }
  if (scene.kind === 'cube') return <CubeView front={scene.front} top={scene.top} right={scene.right} />
  if (scene.kind === 'chart') return <ChartView labels={scene.labels} values={scene.values} variant={scene.variant} />
  if (scene.kind === 'table') {
    return (
      <table>
        <thead>
          <tr>
            {scene.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scene.rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  if (scene.view === 'top') {
    return (
      <div className={classes.heights} style={{ gridTemplateColumns: `repeat(${scene.heights[0]?.length ?? 1}, 1.8rem)` }}>
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

export function NumberGrid({ rows }: { rows: (string | null)[][] }) {
  const columns = Math.max(...rows.map((row) => row.length))
  return (
    <div className={classes.numberGrid} style={{ gridTemplateColumns: `repeat(${columns}, minmax(2.2rem, auto))` }}>
      {rows.flat().map((cell, index) => (
        <div key={index} className={classes.numberCell}>
          {cell ?? '?'}
        </div>
      ))}
    </div>
  )
}
