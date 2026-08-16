// Colori della palette
export const COLORS = {
  bg: '#03080f',
  bgLight: '#070f1a',
  bgLighter: '#0a1625',
  border: '#12263d',
  borderLight: '#1e3d5c',
  text: '#ddeeff',
  textMuted: '#4d7a9a',
  primary: '#00d4ff',
  secondary: '#9d7fff',
  accent: '#ff4566',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  muted: '#4d7a9a'
}

// Colori per le posizioni (6 palline)
export const POS_COLORS = [
  '#00d4ff',  // Posizione 1 - Cyan
  '#ff4566',  // Posizione 2 - Red
  '#4caf50',  // Posizione 3 - Green
  '#ffc107',  // Posizione 4 - Amber
  '#9d7fff',  // Posizione 5 - Purple
  '#ff6b9d'   // Posizione 6 - Pink
]

// Helper per localStorage
export const storage = {
  set: (key, value) => {
    try {
      localStorage.setItem(`sonar_${key}`, JSON.stringify(value))
    } catch (e) {
      console.warn('Storage write failed:', e)
    }
  },
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(`sonar_${key}`)
      return item ? JSON.parse(item) : defaultValue
    } catch (e) {
      console.warn('Storage read failed:', e)
      return defaultValue
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(`sonar_${key}`)
    } catch (e) {
      console.warn('Storage remove failed:', e)
    }
  }
}

// Configurazioni
export const CONFIG = {
  APP_NAME: 'SONAR SuperEnalotto',
  VERSION: '2.0.0',
  DRAWS_PER_PAGE: 20,
  MAX_NUMBERS: 90,
  NUMBERS_PER_DRAW: 6
}

// Utilità
export const utils = {
  formatDate: (dateStr) => {
    try {
      const [day, month, year] = dateStr.split('/')
      return new Date(year, month - 1, day).toLocaleDateString('it-IT', {
        weekday: 'short',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  },
  
  getFrequency: (draws, number) => {
    return draws.reduce((count, draw) => {
      return count + (draw[2].includes(number) ? 1 : 0)
    }, 0)
  },

  getTopNumbers: (draws, limit = 10) => {
    const freq = {}
    draws.forEach(draw => {
      draw[2].forEach(num => {
        freq[num] = (freq[num] || 0) + 1
      })
    })
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([num, count]) => ({ num: parseInt(num), count }))
  },

  getBottomNumbers: (draws, limit = 10) => {
    const freq = {}
    draws.forEach(draw => {
      draw[2].forEach(num => {
        freq[num] = (freq[num] || 0) + 1
      })
    })
    return Object.entries(freq)
      .sort((a, b) => a[1] - b[1])
      .slice(0, limit)
      .map(([num, count]) => ({ num: parseInt(num), count }))
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Tema grafico (palette estratta dalla versione compilata del vecchio index).
// Fonte unica dei colori/stili: i componenti importano questi da '../utils/constants'.
// ─────────────────────────────────────────────────────────────────────────

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

// Colore per il Jolly (accento cyan, coerente col tema).
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
