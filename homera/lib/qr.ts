/**
 * Générateur de QR code — implémentation interne, sans dépendance externe.
 *
 * Pourquoi ce fichier existe : l’affichage d’un QR code de vérification ne
 * justifie pas un paquet tiers, et une dépendance externe a déjà cassé un build
 * (« Module not found: Can't resolve 'qrcode.react' »). Le code ci-dessous suit
 * la norme ISO/IEC 18004 : encodage mode octet, niveau de correction M, choix du
 * masque par pénalités, information de format en code BCH (15,5), information de
 * version BCH (18,6) à partir de la version 7.
 *
 * La sortie est une matrice de modules (booléens) que le composant React rend en
 * SVG : aucune image binaire, aucun réseau, rendu identique côté serveur et
 * côté navigateur (donc aucun risque d’hydratation).
 *
 * Note : « QR Code » est une marque de DENSO WAVE INCORPORATED.
 */

export type QrMatrix = {
  /** Version ISO du symbole (1 à 40). */
  version: number;
  /** Taille du symbole en modules (version × 4 + 17). */
  size: number;
  /** Masque retenu (0 à 7). */
  mask: number;
  /** `modules[row][col] === true` pour un module sombre. */
  modules: boolean[][];
};

/* ------------------------------------------------------------------ *
 * Tables normalisées
 * ------------------------------------------------------------------ */

/** Nombre de codewords (données + correction) par version, index 0 = version 1. */
const TOTAL_CODEWORDS = [
  26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
  404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
  1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185,
  2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706,
];

/** Nombre de blocs de correction par version et niveau (colonnes L, M, Q, H). */
const EC_BLOCKS = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 2, 2, 4,
  1, 2, 4, 4, 2, 4, 4, 4, 2, 4, 6, 5, 2, 4, 6, 6,
  2, 5, 8, 8, 4, 5, 8, 8, 4, 5, 8, 11, 4, 8, 10, 11,
  4, 9, 12, 16, 4, 9, 16, 16, 6, 10, 12, 18, 6, 10, 17, 16,
  6, 11, 16, 19, 6, 13, 18, 21, 7, 14, 21, 25, 8, 16, 20, 25,
  8, 17, 23, 25, 9, 17, 23, 34, 9, 18, 25, 30, 10, 20, 27, 32,
  12, 21, 29, 35, 12, 23, 34, 37, 12, 25, 34, 40, 13, 26, 35, 42,
  14, 28, 38, 45, 15, 29, 40, 48, 16, 31, 43, 51, 17, 33, 45, 54,
  18, 35, 48, 57, 19, 37, 51, 60, 19, 38, 53, 63, 20, 40, 56, 66,
  21, 43, 59, 70, 22, 45, 62, 74, 24, 47, 65, 77, 25, 49, 68, 81,
];

/** Nombre de codewords de correction par version et niveau (colonnes L, M, Q, H). */
const EC_CODEWORDS = [
  7, 10, 13, 17, 10, 16, 22, 28, 15, 26, 36, 44, 20, 36, 52, 64,
  26, 48, 72, 88, 36, 64, 96, 112, 40, 72, 108, 130, 48, 88, 132, 156,
  60, 110, 160, 192, 72, 130, 192, 224, 80, 150, 224, 264, 96, 176, 260, 308,
  104, 198, 288, 352, 120, 216, 320, 384, 132, 240, 360, 432, 144, 280, 408, 480,
  168, 308, 448, 532, 180, 338, 504, 588, 196, 364, 546, 650, 224, 416, 600, 700,
  224, 442, 644, 750, 252, 476, 690, 816, 270, 504, 750, 900, 300, 560, 810, 960,
  312, 588, 870, 1050, 336, 644, 952, 1110, 360, 700, 1020, 1200, 390, 728, 1050, 1260,
  420, 784, 1140, 1350, 450, 812, 1200, 1440, 480, 868, 1290, 1530, 510, 924, 1350, 1620,
  540, 980, 1440, 1710, 570, 1036, 1530, 1800, 570, 1064, 1590, 1890, 600, 1120, 1680, 1980,
  630, 1204, 1770, 2100, 660, 1260, 1860, 2220, 720, 1316, 1950, 2310, 750, 1372, 2040, 2430,
];

/**
 * Niveau de correction M : 15 % de la surface, bon compromis lisibilité/solidité.
 * `EC_LEVEL_INDEX` désigne la colonne des tables (L, M, Q, H) ;
 * `EC_LEVEL_BIT` est la valeur inscrite dans l’information de format (L=1, M=0, Q=3, H=2).
 */
const EC_LEVEL_INDEX = 1;
const EC_LEVEL_BIT = 0;

/* ------------------------------------------------------------------ *
 * Corps de Galois GF(256), polynôme primitif 0x11D
 * ------------------------------------------------------------------ */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

for (let i = 0, x = 1; i < 255; i += 1) {
  EXP[i] = x;
  LOG[x] = i;
  x <<= 1;
  if (x & 0x100) x ^= 0x11d;
}
for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];

function gmul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}

/** Reste de la division polynomiale (coefficients de poids fort en tête). */
function polyMod(dividend: number[], divisor: number[]): number[] {
  const rest = dividend.slice();
  for (let i = 0; i < rest.length - divisor.length + 1; i += 1) {
    const factor = rest[i];
    if (factor === 0) continue;
    for (let j = 0; j < divisor.length; j += 1) {
      rest[i + j] ^= gmul(divisor[j], factor);
    }
  }
  return rest.slice(rest.length - (divisor.length - 1));
}

const generatorCache = new Map<number, number[]>();

/** Polynôme générateur de degré `degree`. */
function generatorPoly(degree: number): number[] {
  const cached = generatorCache.get(degree);
  if (cached) return cached;
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array<number>(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gmul(poly[j], EXP[i]);
    }
    poly = next;
  }
  generatorCache.set(degree, poly);
  return poly;
}

/** Codewords de correction Reed-Solomon pour un bloc de données. */
export function reedSolomonRemainder(data: number[], degree: number): number[] {
  const padded = data.concat(new Array<number>(degree).fill(0));
  return polyMod(padded, generatorPoly(degree));
}

/* ------------------------------------------------------------------ *
 * Utilitaires
 * ------------------------------------------------------------------ */

/** Alignement : centres des motifs d’alignement (coordonnées identiques en ligne et colonne). */
function alignmentCoords(version: number): number[] {
  if (version === 1) return [];
  const count = Math.floor(version / 7) + 2;
  const size = version * 4 + 17;
  const step = size === 145 ? 26 : Math.ceil((size - 13) / (2 * count - 2)) * 2;
  const coords = [size - 7];
  for (let i = 1; i < count - 1; i += 1) coords[i] = coords[i - 1] - step;
  coords.push(6);
  return coords.reverse();
}

function ecBlocks(version: number): number {
  return EC_BLOCKS[(version - 1) * 4 + EC_LEVEL_INDEX];
}

function ecCodewords(version: number): number {
  return EC_CODEWORDS[(version - 1) * 4 + EC_LEVEL_INDEX];
}

function dataCodewords(version: number): number {
  return TOTAL_CODEWORDS[version - 1] - ecCodewords(version);
}

/** Information de format : 5 bits de données + 10 bits BCH, masquée par 0x5412. */
export function formatInfoBits(mask: number): number {
  const data = (EC_LEVEL_BIT << 3) | mask;
  let d = data << 10;
  while (bitLength(d) - bitLength(0x537) >= 0) d ^= 0x537 << (bitLength(d) - bitLength(0x537));
  return ((data << 10) | d) ^ 0x5412;
}

/** Information de version : 6 bits de données + 12 bits BCH (versions 7 et suivantes). */
export function versionInfoBits(version: number): number {
  let d = version << 12;
  while (bitLength(d) - bitLength(0x1f25) >= 0) d ^= 0x1f25 << (bitLength(d) - bitLength(0x1f25));
  return (version << 12) | d;
}

function bitLength(value: number): number {
  let digit = 0;
  let v = value;
  while (v !== 0) {
    digit += 1;
    v >>>= 1;
  }
  return digit;
}

/** Nombre de bits de l’indicateur de longueur en mode octet. */
function charCountBits(version: number): number {
  return version < 10 ? 8 : 16;
}

/** Version minimale capable de contenir `length` octets en mode octet, niveau M. */
export function bestVersion(length: number): number {
  for (let version = 1; version <= 40; version += 1) {
    const capacityBits = dataCodewords(version) * 8;
    const needed = 4 + charCountBits(version) + length * 8;
    if (needed <= capacityBits) return version;
  }
  throw new Error("Données trop longues pour un QR code (maximum 2 331 octets en mode octet, niveau M).");
}

/* ------------------------------------------------------------------ *
 * Encodage des données
 * ------------------------------------------------------------------ */

function utf8Bytes(text: string): number[] {
  if (typeof TextEncoder !== "undefined") return Array.from(new TextEncoder().encode(text));
  const encoded = unescape(encodeURIComponent(text));
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i += 1) bytes.push(encoded.charCodeAt(i) & 0xff);
  return bytes;
}

/** Flux de codewords de données, prêt pour le découpage en blocs. */
export function dataCodewordStream(text: string, version: number): number[] {
  const bytes = utf8Bytes(text);
  const capacity = dataCodewords(version) * 8;
  const bits: number[] = [];
  const push = (value: number, length: number) => {
    for (let i = length - 1; i >= 0; i -= 1) bits.push((value >>> i) & 1);
  };

  push(0b0100, 4); // mode octet
  push(bytes.length, charCountBits(version));
  for (const byte of bytes) push(byte, 8);

  // Terminateur puis alignement sur l’octet.
  const terminator = Math.min(4, capacity - bits.length);
  for (let i = 0; i < terminator; i += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }

  // Octets de remplissage 0xEC / 0x11 en alternance.
  let pad = 0;
  while (codewords.length < dataCodewords(version)) {
    codewords.push(pad % 2 === 0 ? 0xec : 0x11);
    pad += 1;
  }
  return codewords;
}

/** Découpe en blocs, calcule la correction et entrelace données puis corrections. */
export function interleavedCodewords(text: string, version: number): number[] {
  const stream = dataCodewordStream(text, version);
  const blocks = ecBlocks(version);
  const total = TOTAL_CODEWORDS[version - 1];
  const dataTotal = dataCodewords(version);
  const blocksInGroup2 = total % blocks;
  const blocksInGroup1 = blocks - blocksInGroup2;
  const codewordsInGroup1 = Math.floor(total / blocks);
  const dataInGroup1 = Math.floor(dataTotal / blocks);
  const dataInGroup2 = dataInGroup1 + 1;
  const ecCount = codewordsInGroup1 - dataInGroup1;

  const dataBlocks: number[][] = [];
  const ecBlocksData: number[][] = [];
  let offset = 0;
  let maxData = 0;

  for (let b = 0; b < blocks; b += 1) {
    const size = b < blocksInGroup1 ? dataInGroup1 : dataInGroup2;
    const block = stream.slice(offset, offset + size);
    dataBlocks.push(block);
    ecBlocksData.push(reedSolomonRemainder(block, ecCount));
    offset += size;
    maxData = Math.max(maxData, size);
  }

  const out: number[] = [];
  for (let i = 0; i < maxData; i += 1) {
    for (const block of dataBlocks) if (i < block.length) out.push(block[i]);
  }
  for (let i = 0; i < ecCount; i += 1) {
    for (const block of ecBlocksData) out.push(block[i]);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Construction de la matrice
 * ------------------------------------------------------------------ */

type Grid = { size: number; data: Uint8Array; reserved: Uint8Array };

function createGrid(size: number): Grid {
  return { size, data: new Uint8Array(size * size), reserved: new Uint8Array(size * size) };
}

function setModule(grid: Grid, row: number, col: number, dark: boolean, reserved = false): void {
  const index = row * grid.size + col;
  grid.data[index] = dark ? 1 : 0;
  if (reserved) grid.reserved[index] = 1;
}

function isReserved(grid: Grid, row: number, col: number): boolean {
  return grid.reserved[row * grid.size + col] === 1;
}

function setupFinderPatterns(grid: Grid, version: number): void {
  const size = version * 4 + 17;
  const centers: Array<[number, number]> = [
    [0, 0],
    [0, size - 7],
    [size - 7, 0],
  ];
  for (const [row, col] of centers) {
    for (let r = -1; r <= 7; r += 1) {
      if (row + r < 0 || row + r >= size) continue;
      for (let c = -1; c <= 7; c += 1) {
        if (col + c < 0 || col + c >= size) continue;
        const inRing =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4);
        setModule(grid, row + r, col + c, inRing, true);
      }
    }
  }
}

function setupTimingPatterns(grid: Grid): void {
  for (let r = 8; r < grid.size - 8; r += 1) {
    const value = r % 2 === 0;
    setModule(grid, r, 6, value, true);
    setModule(grid, 6, r, value, true);
  }
}

function setupAlignmentPatterns(grid: Grid, version: number): void {
  const coords = alignmentCoords(version);
  const last = coords.length - 1;
  for (let i = 0; i < coords.length; i += 1) {
    for (let j = 0; j < coords.length; j += 1) {
      // Les trois coins occupés par les motifs de repérage sont ignorés.
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
      const row = coords[i];
      const col = coords[j];
      for (let r = -2; r <= 2; r += 1) {
        for (let c = -2; c <= 2; c += 1) {
          const dark = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
          setModule(grid, row + r, col + c, dark, true);
        }
      }
    }
  }
}

function setupFormatInfo(grid: Grid, mask: number): void {
  const size = grid.size;
  const bits = formatInfoBits(mask);
  for (let i = 0; i < 15; i += 1) {
    const dark = ((bits >> i) & 1) === 1;
    // Colonne verticale, sous le repère supérieur gauche puis verticalement à droite.
    if (i < 6) setModule(grid, i, 8, dark, true);
    else if (i < 8) setModule(grid, i + 1, 8, dark, true);
    else setModule(grid, size - 15 + i, 8, dark, true);

    // Ligne horizontale.
    if (i < 8) setModule(grid, 8, size - i - 1, dark, true);
    else if (i < 9) setModule(grid, 8, 15 - i, dark, true);
    else setModule(grid, 8, 15 - i - 1, dark, true);
  }
  // Module sombre fixe.
  setModule(grid, size - 8, 8, true, true);
}

function setupVersionInfo(grid: Grid, version: number): void {
  if (version < 7) return;
  const size = grid.size;
  const bits = versionInfoBits(version);
  for (let i = 0; i < 18; i += 1) {
    const row = Math.floor(i / 3);
    const col = (i % 3) + size - 8 - 3;
    const dark = ((bits >> i) & 1) === 1;
    setModule(grid, row, col, dark, true);
    setModule(grid, col, row, dark, true);
  }
}

function setupData(grid: Grid, codewords: number[]): void {
  const size = grid.size;
  let bitIndex = 7;
  let byteIndex = 0;
  let direction = -1;
  let row = size - 1;

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (;;) {
      for (let c = 0; c < 2; c += 1) {
        const currentCol = col - c;
        if (!isReserved(grid, row, currentCol)) {
          let dark = false;
          if (byteIndex < codewords.length) {
            dark = ((codewords[byteIndex] >>> bitIndex) & 1) === 1;
          }
          setModule(grid, row, currentCol, dark);
          bitIndex -= 1;
          if (bitIndex < 0) {
            byteIndex += 1;
            bitIndex = 7;
          }
        }
      }
      row += direction;
      if (row < 0 || row >= size) {
        row -= direction;
        direction = -direction;
        break;
      }
    }
  }
}

/** Masque de données (motif élémentaire) pour un masque et une position donnés. */
export function maskAt(mask: number, row: number, col: number): boolean {
  switch (mask) {
    case 0: return (row + col) % 2 === 0;
    case 1: return row % 2 === 0;
    case 2: return col % 3 === 0;
    case 3: return (row + col) % 3 === 0;
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    default: return (((row * col) % 3) + ((row + col) % 2)) % 2 === 0;
  }
}

function applyMask(grid: Grid, mask: number): void {
  for (let row = 0; row < grid.size; row += 1) {
    for (let col = 0; col < grid.size; col += 1) {
      if (isReserved(grid, row, col)) continue;
      if (maskAt(mask, row, col)) grid.data[row * grid.size + col] ^= 1;
    }
  }
}

/** Pénalité du masque, selon les quatre règles de la norme (N1 à N4). */
export function maskPenalty(grid: Grid): number {
  const size = grid.size;
  const at = (row: number, col: number) => grid.data[row * size + col];
  let points = 0;

  // N1 : séries de 5 modules identiques ou plus.
  for (let row = 0; row < size; row += 1) {
    let countCol = 0;
    let countRow = 0;
    let lastCol: number | null = null;
    let lastRow: number | null = null;
    for (let col = 0; col < size; col += 1) {
      const value = at(row, col);
      if (value === lastCol) countCol += 1;
      else {
        if (countCol >= 5) points += 3 + (countCol - 5);
        lastCol = value;
        countCol = 1;
      }
      const other = at(col, row);
      if (other === lastRow) countRow += 1;
      else {
        if (countRow >= 5) points += 3 + (countRow - 5);
        lastRow = other;
        countRow = 1;
      }
    }
    if (countCol >= 5) points += 3 + (countCol - 5);
    if (countRow >= 5) points += 3 + (countRow - 5);
  }

  // N2 : blocs 2 × 2 de même couleur.
  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const total = at(row, col) + at(row, col + 1) + at(row + 1, col) + at(row + 1, col + 1);
      if (total === 0 || total === 4) points += 3;
    }
  }

  // N3 : motif 1:1:3:1:1 (0x5D0 ou 0x05D sur 11 modules).
  for (let row = 0; row < size; row += 1) {
    let bitsCol = 0;
    let bitsRow = 0;
    for (let col = 0; col < size; col += 1) {
      bitsCol = ((bitsCol << 1) & 0x7ff) | at(row, col);
      if (col >= 10 && (bitsCol === 0x5d0 || bitsCol === 0x05d)) points += 40;
      bitsRow = ((bitsRow << 1) & 0x7ff) | at(col, row);
      if (col >= 10 && (bitsRow === 0x5d0 || bitsRow === 0x05d)) points += 40;
    }
  }

  // N4 : écart à 50 % de modules sombres.
  let dark = 0;
  for (let i = 0; i < grid.data.length; i += 1) dark += grid.data[i];
  const ratio = (dark * 100) / grid.data.length;
  points += Math.abs(Math.ceil(ratio / 5) - 10) * 10;

  return points;
}

function buildGrid(text: string, version: number, mask: number, applyBest: boolean): Grid {
  const grid = createGrid(version * 4 + 17);
  setupFinderPatterns(grid, version);
  setupTimingPatterns(grid);
  setupAlignmentPatterns(grid, version);
  setupFormatInfo(grid, 0); // réserve la zone d’information de format
  setupVersionInfo(grid, version);
  setupData(grid, interleavedCodewords(text, version));

  if (applyBest) {
    let best = 0;
    let lowest = Number.POSITIVE_INFINITY;
    for (let candidate = 0; candidate < 8; candidate += 1) {
      setupFormatInfo(grid, candidate);
      applyMask(grid, candidate);
      const penalty = maskPenalty(grid);
      applyMask(grid, candidate);
      if (penalty < lowest) {
        lowest = penalty;
        best = candidate;
      }
    }
    setupFormatInfo(grid, best);
    applyMask(grid, best);
    return grid;
  }

  setupFormatInfo(grid, mask);
  applyMask(grid, mask);
  return grid;
}

/**
 * Construit un QR code complet.
 *
 * @param text Contenu à encoder (URL de vérification, référence, etc.).
 * @param options `version` et `mask` ne sont utiles que pour les tests.
 */
export function createQrMatrix(text: string, options: { version?: number; mask?: number } = {}): QrMatrix {
  if (text.length === 0) throw new Error("Le contenu du QR code ne peut pas être vide.");
  const version = options.version ?? bestVersion(utf8Bytes(text).length);
  if (version < 1 || version > 40) throw new Error("Version de QR code hors bornes (1 à 40).");

  const mask = options.mask;
  const grid = buildGrid(text, version, mask ?? 0, mask === undefined);

  const modules: boolean[][] = [];
  for (let row = 0; row < grid.size; row += 1) {
    const line: boolean[] = [];
    for (let col = 0; col < grid.size; col += 1) line.push(grid.data[row * grid.size + col] === 1);
    modules.push(line);
  }

  return { version, size: grid.size, mask: mask ?? detectMask(grid), modules };
}

/** Retrouve le masque inscrit dans l’information de format du symbole. */
function detectMask(grid: Grid): number {
  const size = grid.size;
  const readVertical = () => {
    let bits = 0;
    for (let i = 0; i < 15; i += 1) {
      let row: number;
      if (i < 6) row = i;
      else if (i < 8) row = i + 1;
      else row = size - 15 + i;
      bits |= grid.data[row * size + 8] << i;
    }
    return bits;
  };
  // 0x5412 masqué : on démasque puis on garde les 3 bits de masque.
  return ((readVertical() ^ 0x5412) >> 10) & 0x7;
}

/**
 * Rend la matrice en lignes de « 0 » et « 1 » (1 = module sombre).
 * Utilisé par les tests et par les outils qui ont besoin d’un texte.
 */
export function qrToRows(matrix: QrMatrix): string[] {
  return matrix.modules.map((line) => line.map((dark) => (dark ? "1" : "0")).join(""));
}

/* ------------------------------------------------------------------ *
 * Décodeur minimal — sert aux tests de relecture du symbole produit.
 * ------------------------------------------------------------------ */

/** Extrait la chaîne encodée dans un symbole produit par `createQrMatrix`. */
export function decodeQrMatrix(matrix: QrMatrix): string {
  const size = matrix.size;
  const reserved: boolean[][] = Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  const dummy = createGrid(size);
  setupFinderPatterns(dummy, matrix.version);
  setupTimingPatterns(dummy);
  setupAlignmentPatterns(dummy, matrix.version);
  setupFormatInfo(dummy, matrix.mask);
  if (matrix.version >= 7) setupVersionInfo(dummy, matrix.version);
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) reserved[row][col] = isReserved(dummy, row, col);
  }

  // Lecture serpentine, identique à l’écriture.
  const bits: number[] = [];
  let direction = -1;
  let row = size - 1;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col -= 1;
    for (;;) {
      for (let c = 0; c < 2; c += 1) {
        const currentCol = col - c;
        if (!reserved[row][currentCol]) {
          const value = matrix.modules[row][currentCol] ? 1 : 0;
          bits.push(maskAt(matrix.mask, row, currentCol) ? value ^ 1 : value);
        }
      }
      row += direction;
      if (row < 0 || row >= size) {
        row -= direction;
        direction = -direction;
        break;
      }
    }
  }

  const codewords: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) byte = (byte << 1) | bits[i + j];
    codewords.push(byte);
  }

  // Désentrelacement.
  const blocks = ecBlocks(matrix.version);
  const total = TOTAL_CODEWORDS[matrix.version - 1];
  const dataTotal = dataCodewords(matrix.version);
  const blocksInGroup2 = total % blocks;
  const blocksInGroup1 = blocks - blocksInGroup2;
  const dataInGroup1 = Math.floor(dataTotal / blocks);
  const dataInGroup2 = dataInGroup1 + 1;
  const blockSizes: number[] = [];
  for (let b = 0; b < blocks; b += 1) blockSizes.push(b < blocksInGroup1 ? dataInGroup1 : dataInGroup2);

  const streams: number[][] = blockSizes.map(() => []);
  let index = 0;
  const maxData = dataInGroup2;
  for (let i = 0; i < maxData; i += 1) {
    for (let b = 0; b < blocks; b += 1) {
      if (i < blockSizes[b]) streams[b].push(codewords[index++]);
    }
  }
  const dataBytes: number[] = [];
  for (const stream of streams) dataBytes.push(...stream);

  // Analyse de l’en-tête (mode octet uniquement).
  let bitIndex = 0;
  const read = (length: number): number => {
    let value = 0;
    for (let i = 0; i < length; i += 1) {
      const byte = dataBytes[bitIndex >> 3];
      const bit = (byte >> (7 - (bitIndex & 7))) & 1;
      value = (value << 1) | bit;
      bitIndex += 1;
    }
    return value;
  };

  const mode = read(4);
  if (mode !== 0b0100) throw new Error(`Mode QR inattendu : ${mode.toString(2)} (mode octet attendu).`);
  const length = read(charCountBits(matrix.version));
  const bytes: number[] = [];
  for (let i = 0; i < length; i += 1) bytes.push(read(8));
  return new TextDecoder().decode(new Uint8Array(bytes));
}
