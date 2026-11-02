// Kategori pengeluaran yang tersedia
export const EXPENSE_CATEGORIES = [
  'makanan',
  'transportasi',
  'pendidikan',
  'hiburan',
  'tagihan',
  'kesehatan',
  'belanja',
  'lain-lain',
];

// Kategori pemasukan yang tersedia
export const INCOME_CATEGORIES = [
  'gaji',
  'freelance',
  'bisnis',
  'investasi',
  'hadiah',
  'penjualan',
  'lain-lain',
];

// Jumlah transaksi per halaman riwayat
export const TRANSACTIONS_PER_PAGE = 5;

// Batas minimal dan maksimal nominal transaksi
export const MIN_AMOUNT = 1;
export const MAX_AMOUNT = 999_999_999_999; // 999 miliar

// Format emoji untuk kategori
export const CATEGORY_EMOJIS = {
  'makanan': '🍽️',
  'transportasi': '🚗',
  'pendidikan': '📚',
  'hiburan': '🎮',
  'tagihan': '📋',
  'kesehatan': '🏥',
  'belanja': '🛒',
  'gaji': '💰',
  'freelance': '💻',
  'bisnis': '🏢',
  'investasi': '📈',
  'hadiah': '🎁',
  'penjualan': '🏷️',
  'lain-lain': '📦',
};

// Bulan dalam bahasa Indonesia
export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

// Hari dalam bahasa Indonesia
export const DAY_NAMES = [
  'Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu',
];
