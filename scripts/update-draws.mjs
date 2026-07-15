// Script di aggiornamento automatico delle estrazioni SuperEnalotto.
// Fonte primaria: superenalotto.it (sito ufficiale Sisal)
// Fonte di verifica: tuttosuperenalotto.it (portale indipendente)
// Se le due fonti non coincidono sull'ultima estrazione, lo script si ferma
// SENZA modificare draws.js (fail-safe: meglio non aggiornare che pubblicare dati sbagliati).

import fs from 'fs'
import path from 'path'

const DRAWS_PATH = path.resolve('src/data/draws.js')

const MESI = {
  gennaio: '01', febbraio: '02', marzo: '03', aprile: '04',
  maggio: '05', giugno: '06', luglio: '07', agosto: '08',
  settembre: '09', ottobre: '10', novembre: '11', dicembre: '12'
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&egrave;/gi, 'è')
    .replace(/&eacute;/gi, 'é')
    .replace(/&agrave;/gi, 'à')
    .replace(/&ograve;/gi, 'ò')
    .replace(/&ugrave;/gi, 'ù')
    .replace(/&igrave;/gi, 'ì')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SONAR-SuperEnalotto-Bot/1.0)'
    }
  })
  if (!res.ok) throw new Error(`Errore ${res.status} su ${url}`)
  return stripHtml(await res.text())
}

// --- Fonte primaria: superenalotto.it ---
// Estrae tutte le occorrenze "Concorso N° X del D Mese YYYY ... 6 numeri ... Jolly Y ... SuperStar Z"
async function fetchPrimary() {
  const text = await fetchText('https://www.superenalotto.it/archivio-estrazioni')

  const re = /Concorso\s*N[°º]\s*(\d+)\s*del\s*(\d{1,2})\s*(Gennaio|Febbraio|Marzo|Aprile|Maggio|Giugno|Luglio|Agosto|Settembre|Ottobre|Novembre|Dicembre)\s*(\d{4})\s*((?:\d{1,2}\s*){6})Jolly\s*(\d{1,2})\s*SuperStar\s*(\d{1,2})/gi

  const results = []
  let match
  while ((match = re.exec(text)) !== null) {
    const [, concorso, giorno, mese, anno, numeriRaw, jolly, superstar] = match
    const numeri = numeriRaw.trim().split(/\s+/).map(Number)
    const data = `${giorno.padStart(2, '0')}/${MESI[mese.toLowerCase()]}/${anno}`
    results.push({
      concorso: Number(concorso),
      data,
      numeri,
      jolly: Number(jolly),
      superstar: Number(superstar)
    })
  }
  return results
}

// --- Fonte di verifica: tuttosuperenalotto.it ---
// Estrae solo l'ultima estrazione, per confronto incrociato.
async function fetchSecondary() {
  const text = await fetchText('https://www.tuttosuperenalotto.it/ultima-estrazione-superenalotto.asp')

  const dataMatch = text.match(/estrazione del Superenalotto[^\d]*(\d{2}\/\d{2}\/\d{4})/i)
  const numeriMatch = text.match(/seguenti numeri\s*:\s*([\d,\s]+?)\s*che determinano/i)
  const jollyMatch = text.match(/numero\s*:?\s*(\d{1,2})\s*è invece il numero jolly/i)
  const superstarMatch = text.match(/superstar[^\d]*sorteggiato[^\d]*è il numero\s*(\d{1,2})/i)

  if (!dataMatch || !numeriMatch || !jollyMatch || !superstarMatch) {
    console.error('Diagnostica parsing fonte di verifica:')
    console.error('  dataMatch:', dataMatch ? 'OK' : 'FALLITO')
    console.error('  numeriMatch:', numeriMatch ? 'OK' : 'FALLITO')
    console.error('  jollyMatch:', jollyMatch ? 'OK' : 'FALLITO')
    console.error('  superstarMatch:', superstarMatch ? 'OK' : 'FALLITO')
    const idx = text.indexOf('ultimo concorso Superenalotto')
    console.error('  Estratto testo intorno al punto chiave:', text.slice(Math.max(0, idx - 50), idx + 300))
    throw new Error('Impossibile interpretare la fonte di verifica (formato pagina cambiato?)')
  }

  const [gg, mm, yyyy] = dataMatch[1].split('/')
  const numeri = numeriMatch[1].split(',').map(n => Number(n.trim()))

  return {
    data: `${gg}/${mm}/${yyyy}`,
    numeri,
    jolly: Number(jollyMatch[1]),
    superstar: Number(superstarMatch[1])
  }
}

function sameCombination(a, b) {
  if (a.data !== b.data) return false
  if (a.jolly !== b.jolly) return false
  const setA = [...a.numeri].sort((x, y) => x - y).join(',')
  const setB = [...b.numeri].sort((x, y) => x - y).join(',')
  return setA === setB
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

async function main() {
  console.log('Recupero dati dalla fonte primaria (superenalotto.it)...')
  let primaryDraws
  try {
    primaryDraws = await fetchPrimary()
  } catch (err) {
    console.error('Fonte primaria non raggiungibile:', err.message, err.cause ? `(${err.cause.code || err.cause.message})` : '')
    console.log('Provo comunque la fonte di verifica per capire se è un blocco specifico o generale...')
    try {
      await fetchSecondary()
      console.log('La fonte di verifica invece risponde: probabile blocco specifico su superenalotto.it (es. geo-restrizione).')
    } catch (err2) {
      console.error('Anche la fonte di verifica non risponde:', err2.message, err2.cause ? `(${err2.cause.code || err2.cause.message})` : '')
      console.log('Probabile blocco generale dal runner GitHub Actions (rete/DNS), non specifico di un sito.')
    }
    throw new Error('Impossibile procedere senza la fonte primaria.')
  }
  if (primaryDraws.length === 0) {
    throw new Error('Nessun concorso estratto dalla fonte primaria: verificare il parsing.')
  }

  console.log('Recupero dati dalla fonte di verifica (tuttosuperenalotto.it)...')
  const secondaryLatest = await fetchSecondary()

  const primaryLatest = primaryDraws.reduce((max, d) => (d.concorso > max.concorso ? d : max), primaryDraws[0])

  console.log(`Fonte primaria - ultimo concorso: N.${primaryLatest.concorso} del ${primaryLatest.data}`)
  console.log(`Fonte di verifica - ultima estrazione: ${secondaryLatest.data}`)

  if (!sameCombination(primaryLatest, secondaryLatest)) {
    console.error('ATTENZIONE: le due fonti NON coincidono sull\'ultima estrazione.')
    console.error('Primaria:', JSON.stringify(primaryLatest))
    console.error('Verifica:', JSON.stringify(secondaryLatest))
    console.error('Nessuna modifica applicata a draws.js. Verificare manualmente.')
    process.exit(1)
  }

  console.log('Le due fonti coincidono. Procedo con l\'aggiornamento.')

  const { raw, SEED_DRAWS } = loadExistingDraws()
  const existingConcorsi = new Set(SEED_DRAWS.map(d => d[1]))

  const nuovi = primaryDraws
    .filter(d => !existingConcorsi.has(d.concorso))
    .sort((a, b) => a.concorso - b.concorso)

  if (nuovi.length === 0) {
    console.log('Nessuna nuova estrazione da aggiungere. draws.js è già aggiornato.')
    return
  }

  const updatedDraws = [
    ...SEED_DRAWS,
    ...nuovi.map(d => [d.data, d.concorso, d.numeri, d.jolly])
  ]

  writeDraws(raw, updatedDraws)
  console.log(`Aggiunte ${nuovi.length} nuove estrazioni (concorsi: ${nuovi.map(d => d.concorso).join(', ')}).`)
}

main().catch(err => {
  console.error('Errore durante l\'aggiornamento:', err.message)
  if (err.cause) {
    console.error('Causa di rete:', err.cause.code || err.cause.message || err.cause)
  }
  process.exit(1)
})
