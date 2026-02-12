// Tiyatro salonu oluşturma scripti
const TOKEN = process.env.TOKEN;
const BASE = 'https://showbiz.onrender.com/api';

function range(start, end, step = 2) {
  const seats = [];
  for (let n = start; n <= end; n += step) seats.push(n);
  return seats;
}

function makeSeats(rowDefs) {
  // rowDefs: [[rowLabel, [numbers]], ...]
  const seats = [];
  for (const [row, numbers] of rowDefs) {
    for (const n of numbers) {
      seats.push({ row, number: n });
    }
  }
  return seats;
}

// Upper Floor (1. Balkon): Rows Z,Y,V,U,T,S,R,P,O,N,M,L,K,J
// Format: [row, lwStart, lwEnd, coMax, ceMax, rwStart, rwEnd]
// null means no wing; center odds = 1..coMax step 2, center evens = 2..ceMax step 2
const upper = [
  ['Z',  null,null, 15, 22, null,null],
  ['Y',  null,null, 21, 24, null,null],
  ['V',  null,null, 25, 26, null,null],
  ['U',  null,null, 27, 28, null,null],
  ['T',  null,null, 25, 30, null,null],
  ['S',  null,null, 25, 28, null,null],
  ['R',  null,null, 25, 28, null,null],
  ['P',  27, 27,    25, 26, 28, 28],
  ['O',  25, 27,    23, 26, 28, 30],
  ['N',  25, 29,    23, 24, 26, 30],
  ['M',  25, 31,    23, 24, 26, 32],
  ['L',  23, 31,    21, 24, 26, 34],
  ['K',  23, 33,    21, 22, 24, 34],
  ['J',  21, 31,    19, 22, 24, 34],
];

// Lower Floor (Zemin Kat): Rows AA,BB,CC,DD,A,B,C,D,E,F,G,H,I
const lower = [
  ['AA', 11, 27,    9,  10, 12, 28],
  ['BB', 11, 33,    9,  12, 14, 36],
  ['CC', 13, 35,    11, 10, 12, 34],
  ['DD', 13, 35,    11, 12, 14, 36],
  ['A',  13, 35,    11, 14, 16, 38],
  ['B',  15, 37,    13, 14, 16, 38],
  ['C',  15, 37,    13, 14, 16, 38],
  ['D',  17, 37,    15, 14, 16, 36],
  ['E',  17, 37,    15, 16, 18, 38],
  ['F',  17, 35,    15, 18, 20, 38],
  ['G',  19, 37,    17, 16, 18, 36],
  ['H',  19, 35,    17, 18, 20, 36],
  ['I',  19, 35,    17, 20, 22, 38],
];

function buildSections(rows) {
  const lwSeats = [];
  const cSeats = [];
  const rwSeats = [];

  for (const [row, lwS, lwE, coMax, ceMax, rwS, rwE] of rows) {
    // Left wing (odd, step=2)
    if (lwS != null) {
      for (const n of range(lwS, lwE, 2)) lwSeats.push({ row, number: n });
    }
    // Center odds
    for (const n of range(1, coMax, 2)) cSeats.push({ row, number: n });
    // Center evens
    for (const n of range(2, ceMax, 2)) cSeats.push({ row, number: n });
    // Right wing (even, step=2)
    if (rwS != null) {
      for (const n of range(rwS, rwE, 2)) rwSeats.push({ row, number: n });
    }
  }

  const sections = [];
  if (lwSeats.length) sections.push({ name: 'Sol Kanat', type: 'left_wing', seats: lwSeats });
  sections.push({ name: 'Orta', type: 'center', seats: cSeats });
  if (rwSeats.length) sections.push({ name: 'Sağ Kanat', type: 'right_wing', seats: rwSeats });
  return sections;
}

const payload = {
  name: 'Tiyatro Salonu',
  address: 'İstanbul',
  description: 'Tiyatro tarzı salon - Sol Kanat / Orta / Sağ Kanat düzeni',
  floors: [
    {
      name: 'Zemin Kat',
      level: 0,
      sections: buildSections(lower),
    },
    {
      name: '1. Balkon',
      level: 1,
      sections: buildSections(upper),
    },
  ],
};

// Count seats
let total = 0;
for (const f of payload.floors) {
  for (const s of f.sections) {
    console.log(`${f.name} - ${s.name}: ${s.seats.length} koltuk`);
    total += s.seats.length;
  }
}
console.log(`Toplam: ${total} koltuk`);

// Send API request
async function send() {
  const res = await fetch(`${BASE}/venues`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (res.ok) {
    console.log('Salon oluşturuldu! ID:', data.id);
  } else {
    console.error('Hata:', res.status, data);
  }
}

send();
