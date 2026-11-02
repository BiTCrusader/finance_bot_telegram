/**
 * Utility untuk format dan parsing nilai mata uang Rupiah.
 * Semua nilai disimpan sebagai BigInt dalam satuan Rupiah (bukan sen).
 */

/**
 * Format BigInt rupiah ke string yang mudah dibaca
 * Contoh: 1500000n -> "Rp1.500.000"
 */
export function formatRupiah(amount) {
  const num = Number(amount);
  return 'Rp' + num.toLocaleString('id-ID');
}

/**
 * Parse string nominal ke BigInt.
 * Mendukung format:
 * - "15000" -> 15000n
 * - "15.000" -> 15000n
 * - "15rb" / "15ribu" -> 15000n
 * - "1.5jt" / "1,5juta" / "1.5 juta" -> 1500000n
 * - "2m" / "2 mili" -> 2000000n (alias juta dalam bahasa sehari-hari)
 * - "Rp15.000" -> 15000n
 * - "Rp 1.500.000" -> 1500000n
 */
export function parseAmount(text) {
  if (!text || typeof text !== 'string') return null;

  // Bersihkan spasi berlebih dan lowercase
  let cleaned = text.trim().toLowerCase();

  // Hapus prefix "rp" atau "rp."
  cleaned = cleaned.replace(/^rp\.?\s*/i, '');

  // Hapus spasi
  cleaned = cleaned.replace(/\s+/g, '');

  // Cek apakah ada penanda juta/ribu
  let multiplier = 1n;

  if (/(\d)[,.](\d+)\s*(jt|juta|jut)/i.test(cleaned)) {
    // Format: 1,5juta / 1.5jt
    const match = cleaned.match(/(\d+)[,.](\d+)/);
    if (match) {
      const whole = match[1];
      const decimal = match[2].padEnd(6 - whole.length > 0 ? 6 - whole.length : 0, '0');
      const combined = whole + decimal.slice(0, 6 - whole.length);
      const val = BigInt(whole) * 1000000n + BigInt(decimal.slice(0, 6).padEnd(6, '0').slice(whole.length));
      // recalculate properly
      const wholeNum = BigInt(whole) * 1000000n;
      const fracStr = match[2].padEnd(6, '0').slice(0, 6);
      const fracNum = BigInt(fracStr);
      return wholeNum + fracNum;
    }
  }

  if (/(\d)[,.](\d+)\s*(rb|ribu|rib)/i.test(cleaned)) {
    // Format: 1,5ribu / 2.5rb
    const match = cleaned.match(/(\d+)[,.](\d+)/);
    if (match) {
      const wholeNum = BigInt(match[1]) * 1000n;
      const fracStr = match[2].padEnd(3, '0').slice(0, 3);
      return wholeNum + BigInt(fracStr);
    }
  }

  // Format: 15juta / 2jt / 100ribu / 50rb
  if (/(\d+)\s*(jt|juta|jut)/i.test(cleaned)) {
    const match = cleaned.match(/(\d+)\s*(jt|juta|jut)/i);
    return BigInt(match[1]) * 1000000n;
  }

  if (/(\d+)\s*(m)\b/i.test(cleaned) && !/(\d+)\s*(mili)/i.test(cleaned)) {
    // "2m" -> 2 juta (konteks keuangan Indonesia)
    // Tapi hindari "mili" yang berarti miliar
    const match = cleaned.match(/(\d+)\s*m\b/i);
    if (match) return BigInt(match[1]) * 1000000n;
  }

  if (/(\d+)\s*(rb|ribu|rib)/i.test(cleaned)) {
    const match = cleaned.match(/(\d+)\s*(rb|ribu|rib)/i);
    return BigInt(match[1]) * 1000n;
  }

  if (/(\d+)\s*(miliar|milyar|mil)/i.test(cleaned)) {
    const match = cleaned.match(/(\d+)\s*(miliar|milyar|mil)/i);
    return BigInt(match[1]) * 1000000000n;
  }

  // Format angka biasa: "15000" atau "15.000" atau "1.500.000"
  // Hapus titik sebagai pemisah ribuan
  cleaned = cleaned.replace(/\./g, '');
  // Hapus koma jika diikuti 3 digit (pemisah ribuan)
  cleaned = cleaned.replace(/,(\d{3})/g, '$1');

  // Hapus karakter non-digit
  cleaned = cleaned.replace(/[^\d]/g, '');

  if (!cleaned || cleaned === '0') return null;

  try {
    const result = BigInt(cleaned);
    return result > 0n ? result : null;
  } catch {
    return null;
  }
}

/**
 * Validasi apakah nominal dalam range yang wajar
 */
export function isValidAmount(amount) {
  if (amount === null || amount === undefined) return false;
  const val = BigInt(amount);
  return val >= 1n && val <= 999999999999n;
}
