// Mini-grafico a linea, disegnato a mano in SVG (nessuna libreria esterna).
// Usato per mostrare piccole serie temporali (rank, numeri) in poco spazio.

export default function Sparkline({
  values,       // array di numeri
  labels,       // array di stringhe (date), stessa lunghezza di values
  height = 80,
  color = '#00d4ff',
  invertY = false, // true per il rank: 1 (ottimo) deve stare IN ALTO
  yMin = null,
  yMax = null,
  showValues = true
}) {
  const width = 300
  const padding = 14
  const n = values.length
  if (n === 0) return null

  const min = yMin ?? Math.min(...values)
  const max = yMax ?? Math.max(...values)
  const range = max - min || 1

  const points = values.map((v, i) => {
    const x = padding + (i / (n - 1 || 1)) * (width - padding * 2)
    const normalized = (v - min) / range
    const yFrac = invertY ? normalized : 1 - normalized
    const y = padding + yFrac * (height - padding * 2)
    return { x, y, v }
  })

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="sparkline" preserveAspectRatio="none">
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" />
      {points.map((p, i) => {
        // Se il punto e' vicino al bordo superiore, l'etichetta va sotto; altrimenti sopra.
        const labelBelow = p.y < padding + 10
        const labelY = labelBelow ? p.y + 12 : p.y - 7
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="2.5" fill={color} />
            {showValues && (
              <text
                x={p.x}
                y={labelY}
                fontSize="9"
                fill={color}
                textAnchor="middle"
                fontWeight="600"
              >
                {p.v}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
