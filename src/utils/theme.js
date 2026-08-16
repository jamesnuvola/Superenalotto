// Palette e stili estratti dalla versione compilata dell'app (il vecchio
// index.html) per riprodurne fedelmente l'aspetto grafico. Fonte unica dei
// colori: tutti i componenti importano da qui invece di ridefinirli.

export const v = {
  bg: '#03080f',
  surface: '#070f1a',
  card: '#0a1625',
  border: '#12263d',
  borderHi: '#1e3d5c',
  accent: '#00d4ff',
  gold: '#f0c040',
  hot: '#ff4566',
  cold: '#4488ff',
  green: '#00e59a',
  purple: '#9d7fff',
  warm: '#ff8c42',
  text: '#ddeeff',
  muted: '#4d7a9a',
  dim: '#1a3050'
}

// Colori per posizione P1..P6 (le palline).
export const P = ['#ff4566', '#ff8c42', '#f0c040', '#00e59a', '#00d4ff', '#9d7fff']

// Colore per il Jolly (usiamo l'accento cyan, coerente con il tema).
export const JOLLY_COLOR = v.accent

export const FONT = 'system-ui, -apple-system, sans-serif'
export const MONO = 'monospace'

// Helper di stile riutilizzabili, identici al vecchio look.
export const styles = {
  h2: { fontSize: 15, color: v.muted, fontWeight: 500, margin: '0 0 4px' },
  caption: { fontSize: 12, color: v.dim, margin: '0 0 12px', lineHeight: 1.5 },
  card: { background: v.card, border: `1px solid ${v.border}`, borderRadius: 8, padding: 14 },
  section: { marginBottom: 28 }
}

// Pallina outline traslucida (numero) — dimensione configurabile.
// color = colore posizione (da P) o JOLLY_COLOR.
export function ballStyle(color, size = 34, fontSize = 14) {
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    background: color + '22',
    border: `${size >= 44 ? 2 : 1.5}px solid ${color}`,
    color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: MONO,
    fontWeight: 700,
    fontSize
  }
}
