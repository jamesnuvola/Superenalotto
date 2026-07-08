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
