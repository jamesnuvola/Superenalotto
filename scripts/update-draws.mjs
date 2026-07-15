// Script di aggiornamento automatico delle estrazioni SuperEnalotto.
// Fonte: tuttosuperenalotto.it, tabella dell'anno in corso (concorso, data,
// 6 numeri, jolly, superstar). Recupera automaticamente tutte le estrazioni
// mancanti dell'anno in corso, non solo l'ultima.

import fs from 'fs'
import path from 'path'

const DRAWS_PATH = path.resolve('src/data/draws.js')
const TABLE_URL = 'https://www.tuttosuperenalotto.it/superenalotto-archivio-risultati-per-anno.asp'

function decodeEntities(html) {
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&egrave;/gi, 'è')
    .replace(/&eacute;/gi, 'é')
    .replace(/&agrave;/gi, 'à')
    .replace(/&ograve;/gi, 'ò')
    .replace(/&ugrave;/gi, 'ù')
    .replace(/&igrave;/gi, 'ì')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
}

// Converte l'HTML in righe di testo, una per riga di tabella (<tr>),
// cosi' i numeri di righe diverse non si mescolano tra loro.
function htmlToRows(html) {
  const withBreaks = html
    .replace(/<\/tr>/gi, '\n')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')

  return decodeEntities(withBreaks)
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .filter(line => line.length > 0)
}

async function fetchYearTable() {
  const res = await fetch(TABLE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SONAR-SuperEnalotto-Bot/1.0)' }
  })
  if (!res.ok) throw new Error(`Errore ${res.status} su ${TABLE_URL}`)
  const html = await res.text()
  const rows = htmlToRows(html)

  console.log(`Diagnostica: ${rows.length} righe totali dopo la conversione.`)
  const righeConDate = rows.filter(r => /\d{2}\/\d{2}\/\d{4}/.test(r))
  console.log(`Diagnostica: ${righeConDate.length} righe contengono una data.`)
  righeConDate.slice(0, 5).forEach((r, i) => {
    console.log(`  Riga esempio ${i + 1}: ${r.slice(0, 200)}`)
  })

  // Ogni riga valida: numero concorso, poi una data gg/mm/aaaa, poi 8 numeri
  // (6 della sestina + jolly + superstar).
  const rowRegex = /^(\d{1,3})\D+?(\d{2}\/\d{2}\/\d{4})\D+?((?:\d{1,2}\D+){7}\d{1,2})\D*$/
  const draws = []

  for (const line of rows) {
    const m = line.match(rowRegex)
    if (!m) continue
    const concorso = Number(m[1])
    const data = m[2]
    const numeriBlob = m[3].match(/\d{1,2}/g)
    if (!numeriBlob || numeriBlob.length < 8) continue
    const nums = numeriBlob.map(Number)
    const numeri = nums.slice(0, 6)
    const jolly = nums[6]
    // superstar (nums[7]) non è nello schema attuale di draws.js, non lo salviamo.
    if (concorso < 1 || concorso > 400) continue
    draws.push({ concorso, data, numeri, jolly })
  }

  return draws
}

function loadExistingDraws() {
  const raw = fs.readFileSync(DRAWS_PATH, 'utf8')
  const match = raw.match(/const SEED_DRAWS = (\[[\s\S]*?\n\])/)
  if (!match) throw new Error('Impossibile leggere SEED_DRAWS da draws.js')
  // eslint-disable-next-line no-eval
  const SEED_DRAWS = eval(match[1])
  return { raw, SEED_DRAWS }
}

function writeDraws(raw, draws) {
  const formatted = draws
    .map(([data, concorso, numeri, jolly]) =>
      `  ['${data}', ${concorso}, [${numeri.join(', ')}], ${jolly}]`)
    .join(',\n')
  const newBlock = `const SEED_DRAWS = [\n${formatted}\n]`
  const updated = raw.replace(/const SEED_DRAWS = \[[\s\S]*?\n\]/, newBlock)
  fs.writeFileSync(DRAWS_PATH, updated, 'utf8')
}

// Converte 'gg/mm/aaaa' in un numero ordinabile aaaammgg.
function dateSortKey(d) {
  const [gg, mm, aaaa] = d.split('/')
  return Number(`${aaaa}${mm}${gg}`)
}

async function main() {
  console.log('Recupero la tabella delle estrazioni dell\'anno in corso...')
  const tableDraws = await fetchYearTable()
  console.log(`Trovate ${tableDraws.length} estrazioni nella tabella.`)

  if (tableDraws.length === 0) {
    throw new Error('Nessuna estrazione estratta dalla tabella: verificare il parsing.')
  }

  const { raw, SEED_DRAWS } = loadExistingDraws()
  const existingDates = new Set(SEED_DRAWS.map(([data]) => data))

  const nuovi = tableDraws
    .filter(d => !existingDates.has(d.data))
    .sort((a, b) => dateSortKey(a.data) - dateSortKey(b.data))

  if (nuovi.length === 0) {
    console.log('Nessuna nuova estrazione da aggiungere. draws.js è già aggiornato.')
    return
  }

  const updatedDraws = [
    ...SEED_DRAWS,
    ...nuovi.map(d => [d.data, d.concorso, d.numeri, d.jolly])
  ]

  writeDraws(raw, updatedDraws)
  console.log(`Aggiunte ${nuovi.length} nuove estrazioni: ${nuovi.map(d => d.data).join(', ')}`)
}

main().catch(err => {
  console.error('Errore durante l\'aggiornamento:', err.message)
  if (err.cause) {
    console.error('Causa di rete:', err.cause.code || err.cause.message || err.cause)
  }
  process.exit(1)
})
