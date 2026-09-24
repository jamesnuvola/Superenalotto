# SONAR — P6 fino in fondo: definizione delay e test finale
## 24 settembre 2026

### Definizione recuperata
Il segnale storico **P6 delay 20–40** non riguarda il numero P6 del draw target. La definizione causale recuperata è:

**delay del numero che occupa P6 nell'estrazione precedente, misurato immediatamente prima di quella precedente estrazione, compreso tra 20 e 40 concorsi.**

Quindi, per il target T:
- si guarda il P6 del draw T-1;
- si calcola da quanto tempo quel numero non usciva in P6 prima del draw T-1;
- si verifica se il delay è 20–40.

Questo è computabile senza conoscere il target T ed è quindi una vera feature pre-draw.

### Risultati su tre blocchi cronologici
Target 601–2923, tre blocchi da 774.

**P6 precedente rank <=1**
- B1: 46.15% top10 vs 47.62%, delta -1.47 pp
- B2: 50.00% vs 44.59%, delta +5.41 pp
- B3: 48.72% vs 40.95%, delta +7.77 pp

Conferma: il segnale P6<=1 resta positivo negli ultimi due blocchi, ma non nel primo.

**P6 precedente delay 20–40**
- B1: +3.52 pp top10
- B2: +4.79 pp
- B3: +4.54 pp

Questo è molto più interessante della combinazione con il rank: il delay 20–40 del P6 precedente ha mantenuto segno positivo in tutti e tre i blocchi.

### P3 DOWN + P6 precedente delay 20–40
- B1: -0.40 pp
- B2: +4.68 pp
- B3 blind: **+9.82 pp**

Il blind è interessante, ma il primo blocco è neutro e quindi non basta per promozione.

### P6<=1 + P6 precedente delay 20–40
La combinazione è risultata **vuota in tutti e tre i blocchi**.

Questo non è un fallimento statistico: significa che le due condizioni non convivono praticamente nel motore CORE. Non vanno quindi concatenate come se fossero due livelli indipendenti.

### Implicazione metodologica
La formulazione corretta del filone P6 diventa:

1. **P6 persistence:** precedente P6 rank <=1.
2. **P6 delay regime:** precedente P6 ha delay 20–40.
3. **P3 DOWN + P6 delay 20–40:** candidato separato.
4. Non usare automaticamente P6 rank<=1 + delay20–40, perché la combinazione è strutturalmente quasi vuota.

### Nota sul test diagnostico non causale
È stato anche verificato il significato alternativo 'delay del P6 che uscirà nel target'. Questa versione è post-draw e quindi non è utilizzabile per costruire una sestina senza leakage. È stata esclusa dal filone operativo.

### Stato
**P6 persistence <=1:** candidato da conservare.
**P6 previous-delay 20–40:** candidato da conservare; positivo in 3/3 blocchi.
**P3 DOWN + previous P6 delay 20–40:** candidato secondario, blind +9.82 pp ma da validare.
**P6 persistence + previous delay:** non utilizzabile come combinazione perché quasi mutuamente esclusiva.

Produzione invariata.
