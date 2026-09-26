# SONAR — CROWD-BACHECA

Esperimento indipendente per misurare la relazione statistica tra i sistemi pubblicamente osservabili nella Bacheca dei Sistemi e le estrazioni successive.

## Protocollo
- Acquisire ogni snapshot prima della chiusura utile del concorso.
- Non modificare uno snapshot dopo l'estrazione.
- Misurare i sistemi osservabili, non assumere che rappresentino tutti i giocatori.
- Conservare separatamente dati di sistema, dimensione del sistema e eventuali basi/varianti.

## Metriche
Per ogni sistema:
- hit grezzi;
- expected hit condizionato alla dimensione k: 6*k/90;
- excess rispetto all'atteso;
- z-score ipergeometrico;
- percentile rispetto alla distribuzione casuale con la stessa dimensione.

Per il gruppo:
- frequenza di ogni numero 1–90;
- quota dei sistemi che contiene ogni numero;
- rank di popolarità dei numeri estratti;
- numeri vincenti esclusi da molti sistemi;
- top-N del gruppo contro la sestina estratta;
- coppie e triple ricorrenti.

## Ipotesi "manca uno o due numeri"
Va testata, non assunta. Cerchiamo eventuali numeri sistematicamente sotto-rappresentati nei sistemi ma presenti nelle estrazioni e verifichiamo se il fenomeno supera il caso.

## Ridotti e Basi/Varianti
La sola unione dei numeri misura la copertura dell'universo scelto, ma non sempre la migliore combinazione effettivamente sviluppata. Queste strutture devono quindi essere trattate separatamente quando le combinazioni generate sono disponibili.

## Criterio di promozione
Nessun segnale entra nel motore SONAR senza evidenza prospettica, replicata, stabile per blocchi e senza look-ahead.
