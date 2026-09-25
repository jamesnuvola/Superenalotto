# SONAR — 1 → motivo → setting → performance

Dataset: 2924 draws; causal targets 600–2923. Setting and hits use only history before target.

## Discovery k=3
- 000|DDDDDA: n=14, mean hits10=1.0000, >=2=0.00%
- 000|BDDDDC: n=8, mean hits10=1.0000, >=2=0.00%
- 000|CDDDDC: n=12, mean hits10=0.0000, >=2=0.00%
- 000|CDDDDD: n=8, mean hits10=0.0000, >=2=0.00%
- 000|DDDDDC: n=8, mean hits10=0.0000, >=2=0.00%

### Block 2
- 000|DDDDDA: n=3, mean=1.0000, rest=1.8069, delta=-0.8069
- 000|BDDDDC: n=3, mean=1.0000, rest=1.8069, delta=-0.8069
- 000|CDDDDC: n=9, mean=0.0000, rest=1.8270, delta=-1.8270
- 000|CDDDDD: n=9, mean=0.0000, rest=1.8270, delta=-1.8270
- 000|DDDDDC: n=14, mean=0.0000, rest=1.8404, delta=-1.8404
### Block 3
- 000|DDDDDA: n=11, mean=1.0000, rest=1.8384, delta=-0.8384
- 000|BDDDDC: n=6, mean=1.0000, rest=1.8324, delta=-0.8324
- 000|CDDDDC: n=7, mean=0.0000, rest=1.8437, delta=-1.8437
- 000|CDDDDD: n=8, mean=0.0000, rest=1.8464, delta=-1.8464
- 000|DDDDDC: n=5, mean=0.0000, rest=1.8384, delta=-1.8384

## Discovery k=5
- 00000|DDDDDA: n=12, mean hits10=1.0000, >=2=0.00%
- 00000|BDDDDC: n=8, mean hits10=1.0000, >=2=0.00%
- 00000|CDDDDC: n=9, mean hits10=0.0000, >=2=0.00%

### Block 2
- 00000|CDDDDC: n=8, mean=0.0000, rest=1.8244, delta=-1.8244
### Block 3
- 00000|DDDDDA: n=8, mean=1.0000, rest=1.8348, delta=-0.8348
- 00000|BDDDDC: n=4, mean=1.0000, rest=1.8300, delta=-0.8300
- 00000|CDDDDC: n=7, mean=0.0000, rest=1.8437, delta=-1.8437

## Discovery k=7
- 0000000|DDDDDA: n=11, mean hits10=1.0000, >=2=0.00%
- 0000000|CDDDDC: n=8, mean hits10=0.0000, >=2=0.00%

### Block 2
- 0000000|CDDDDC: n=7, mean=0.0000, rest=1.8217, delta=-1.8217
### Block 3
- 0000000|DDDDDA: n=6, mean=1.0000, rest=1.8324, delta=-0.8324
- 0000000|CDDDDC: n=6, mean=0.0000, rest=1.8410, delta=-1.8410

## Unconditional block baselines
- B1: {"n":929,"meanHits10":1.8159311087190528,"rate2":0.5769644779332616,"rate3":0.25403659849300325}
- B2: {"n":697,"meanHits10":1.8034433285509326,"rate2":0.5738880918220947,"rate3":0.25251076040172166}
- B3: {"n":698,"meanHits10":1.825214899713467,"rate2":0.5888252148997135,"rate3":0.2621776504297994}

## Null: temporal permutation of motif labels
- k=3 000|DDDDDA: blind n=11, observed mean=1.0000, permutation p~0.5669
- k=3 000|BDDDDC: blind n=6, observed mean=1.0000, permutation p~0.5848
- k=3 000|CDDDDC: blind n=7, observed mean=0.0000, permutation p~0.2615
- k=3 000|CDDDDD: blind n=8, observed mean=0.0000, permutation p~0.1976
- k=3 000|DDDDDC: blind n=5, observed mean=0.0000, permutation p~0.6906
- k=5 00000|DDDDDA: blind n=8, observed mean=1.0000, permutation p~0.8643
- k=5 00000|BDDDDC: blind n=4, observed mean=1.0000, permutation p~0.8643
- k=5 00000|CDDDDC: blind n=7, observed mean=0.0000, permutation p~0.0938
- k=7 0000000|DDDDDA: blind n=6, observed mean=1.0000, permutation p~0.9481
- k=7 0000000|CDDDDC: blind n=6, observed mean=0.0000, permutation p~0.2076
