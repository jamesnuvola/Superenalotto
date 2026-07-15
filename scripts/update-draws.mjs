// Script di aggiornamento automatico delle estrazioni SuperEnalotto.
// Fonte: tuttosuperenalotto.it, tabella dell'anno in corso (concorso, data,
// 6 numeri, jolly, superstar). Recupera automaticamente tutte le estrazioni
// mancanti dell'anno in corso, non solo l'ultima.
//
// Nota tecnica: la tabella HTML del sito spezza ogni riga logica in più
// righe tecniche (celle annidate), quindi non ci affidiamo ai confini di
// riga: trattiamo la pagina come un unico flusso di testo e cerchiamo
// sequenze ripetute nell'ordine noto (concorso, data, 8 numeri).

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

function stripHtml(html) {
  const noTags = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
  return decodeEntities(noTags).replace(/\s+/g, ' ').trim()
}

async function fetchYearTable() {
  const res = await fetch(TABLE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SONAR-SuperEnalotto-Bot/1.0)' }
  })
  if (!res.ok) throw new Error(`Errore ${res.status} su ${TABLE_URL}`)
  const html = await res.text()

  // Isoliamo solo la sezione della tabella per evitare falsi positivi
  // altrove nella pagina (es. il menu con l'elenco degli anni).
  const startIdx = html.indexOf('Risultati estrazione Superenalotto per l\'anno')
  const section = startIdx >= 0 ? html.slice(startIdx, startIdx + 200000) : html
  const text = stripHtml(section)

  console.log(`Diagnostica: sezione tabella isolata, ${text.length} caratteri.`)

  // Ogni record: concorso (1-3 cifre), una data gg/mm/aaaa, poi 8 numeri
  // (6 della sestina + jolly + superstar).
  const recordRegex = /(\d{1,3})\D+?(\d{2}\/\d{2}\/\d{4})((?:\D*\d{1,2}){8})/g
  const draws = []
  let match

  while ((match = recordRegex.exec(text)) !== null) {
    const concorso = Number(match[1])
    const data = match[2]
    const nums = (match[3].match(/\d{1,2}/g) || []).map(Number)
    if (nums.length < 8) continue
    if (concorso < 1 || concorso > 400) continue
    draws.push({
      concorso,
      data,
      numeri: nums.slice(0, 6),
      jolly: nums[6]
      // superstar (nums[7]) non è nello schema attuale di draws.js, non lo salviamo.
    })
  }

  console.log(`Diagnostica: ${draws.length} record grezzi trovati (prima della deduplica).`)
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

  // Rimuoviamo eventuali duplicati (stessa data trovata più volte nel testo)
  const uniqueByDate = new Map()
  for (const d of tableDraws) uniqueByDate.set(d.data, d)
  const tableDrawsUnique = [...uniqueByDate.values()]

  const nuovi = tableDrawsUnique
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
