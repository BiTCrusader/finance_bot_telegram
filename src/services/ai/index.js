import { GeminiProvider } from './gemini.js';
import { parseAmount } from '../../utils/currency.js';

/**
 * Regex-based fallback parser for when AI quota is exhausted.
 * Handles basic Indonesian finance keywords without calling any API.
 */
class FallbackParser {
  constructor() {
    this.incomeKeywords = [
      { word: 'gaji', category: 'gaji' },
      { word: 'penghasilan', category: 'gaji' },
      { word: 'pemasukan', category: 'lain-lain' },
      { word: 'terima', category: 'lain-lain' },
      { word: 'dapat', category: 'lain-lain' },
      { word: 'jual', category: 'penjualan' },
      { word: 'freelance', category: 'freelance' },
      { word: 'bonus', category: 'hadiah' },
      { word: 'hadiah', category: 'hadiah' },
      { word: 'transfer masuk', category: 'lain-lain' },
      { word: 'investasi', category: 'investasi' },
      { word: 'dividen', category: 'investasi' },
    ];

    this.expenseKeywords = [
      { word: 'beli', category: 'belanja' },
      { word: 'bayar', category: 'tagihan' },
      { word: 'nongkrong', category: 'makanan' },
      { word: 'makan', category: 'makanan' },
      { word: 'minum', category: 'makanan' },
      { word: 'kopi', category: 'makanan' },
      { word: 'jajan', category: 'makanan' },
      { word: 'sarapan', category: 'makanan' },
      { word: 'bensin', category: 'transportasi' },
      { word: 'parkir', category: 'transportasi' },
      { word: 'ojol', category: 'transportasi' },
      { word: 'ojek', category: 'transportasi' },
      { word: 'grab', category: 'transportasi' },
      { word: 'gojek', category: 'transportasi' },
      { word: 'taksi', category: 'transportasi' },
      { word: 'angkot', category: 'transportasi' },
      { word: 'tol', category: 'transportasi' },
      { word: 'listrik', category: 'tagihan' },
      { word: 'wifi', category: 'tagihan' },
      { word: 'internet', category: 'tagihan' },
      { word: 'pulsa', category: 'tagihan' },
      { word: 'paket data', category: 'tagihan' },
      { word: 'pdam', category: 'tagihan' },
      { word: 'air', category: 'tagihan' },
      { word: 'sewa', category: 'tagihan' },
      { word: 'kos', category: 'tagihan' },
      { word: 'kontrakan', category: 'tagihan' },
      { word: 'obat', category: 'kesehatan' },
      { word: 'dokter', category: 'kesehatan' },
      { word: 'rumah sakit', category: 'kesehatan' },
      { word: 'rs', category: 'kesehatan' },
      { word: 'apotek', category: 'kesehatan' },
      { word: 'nonton', category: 'hiburan' },
      { word: 'game', category: 'hiburan' },
      { word: 'bioskop', category: 'hiburan' },
      { word: 'netflix', category: 'hiburan' },
      { word: 'spotify', category: 'hiburan' },
      { word: 'buku', category: 'pendidikan' },
      { word: 'kursus', category: 'pendidikan' },
      { word: 'les', category: 'pendidikan' },
      { word: 'sekolah', category: 'pendidikan' },
      { word: 'kuliah', category: 'pendidikan' },
      { word: 'spp', category: 'pendidikan' },
    ];

    // Sub-categorization: if "beli" is found alongside a food word, override to 'makanan'
    this.foodWords = [
      'makan', 'nasi', 'ayam', 'bakso', 'mie', 'sate', 'soto',
      'gorengan', 'roti', 'kue', 'snack', 'cemilan', 'buah',
      'sayur', 'lauk', 'rendang', 'nasi goreng', 'indomie',
    ];
  }

  /**
   * Detect if text looks like a transaction and parse it.
   */
  parseTransaction(text) {
    const lower = text.toLowerCase().trim();

    // Try to find income keywords
    for (const { word, category } of this.incomeKeywords) {
      if (lower.includes(word)) {
        const amount = parseAmount(text);
        return {
          type: 'INCOME',
          amount,
          category,
          description: text.trim(),
          date: null,
          confidence: amount ? 0.6 : 0.3,
        };
      }
    }

    // Try to find expense keywords
    for (const { word, category } of this.expenseKeywords) {
      if (lower.includes(word)) {
        const amount = parseAmount(text);
        let finalCategory = category;

        // Sub-categorize "beli" + food
        if (word === 'beli' && this.foodWords.some(fw => lower.includes(fw))) {
          finalCategory = 'makanan';
        }

        return {
          type: 'EXPENSE',
          amount,
          category: finalCategory,
          description: text.trim(),
          date: null,
          confidence: amount ? 0.6 : 0.3,
        };
      }
    }

    // Last resort: if text has a recognizable amount, default to expense
    const amount = parseAmount(text);
    if (amount) {
      return {
        type: 'EXPENSE',
        amount,
        category: 'lain-lain',
        description: text.trim(),
        date: null,
        confidence: 0.2,
      };
    }

    return null;
  }

  /**
   * Detect if text is setting a balance.
   */
  parseBalanceSetting(text) {
    const lower = text.toLowerCase().trim();
    const balanceWords = ['saldo', 'saldo awal', 'set saldo', 'uang saya', 'tabungan saya', 'dompet saya'];

    for (const word of balanceWords) {
      if (lower.includes(word)) {
        const amount = parseAmount(text);
        return {
          isBalanceSetting: true,
          amount,
        };
      }
    }

    return {
      isBalanceSetting: false,
      amount: null,
    };
  }

  /**
   * Detect intent with simple keyword matching.
   */
  detectIntent(text) {
    const lower = text.toLowerCase().trim();

    // Greeting
    const greetings = ['halo', 'hai', 'hi', 'hey', 'hei', 'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam', 'pagi', 'siang', 'sore', 'malam', 'assalamualaikum', 'permisi'];
    if (greetings.some(g => lower === g || lower.startsWith(g + ' '))) {
      return { intent: 'greeting', data: {} };
    }

    // Help
    const helpWords = ['help', 'bantuan', 'bantu', 'cara pakai', 'cara', 'panduan', 'tutorial', 'menu', 'fitur'];
    if (helpWords.some(h => lower.includes(h))) {
      return { intent: 'help', data: {} };
    }

    // Balance check
    const balanceCheckWords = ['saldo', 'sisa uang', 'berapa uang', 'cek saldo', 'uang saya berapa'];
    const balanceSetWords = ['saldo awal', 'set saldo', 'atur saldo', 'saldo saya'];
    // Check balance_setting first (more specific)
    if (balanceSetWords.some(w => lower.includes(w)) && parseAmount(text)) {
      return { intent: 'balance_setting', data: {} };
    }
    if (balanceCheckWords.some(w => lower.includes(w))) {
      return { intent: 'balance_check', data: {} };
    }

    // Report
    const reportWords = ['laporan', 'ringkasan', 'rekap', 'rangkuman', 'summary', 'report'];
    if (reportWords.some(w => lower.includes(w))) {
      let period = null;
      if (lower.includes('hari')) period = 'hari';
      else if (lower.includes('minggu')) period = 'minggu';
      else if (lower.includes('bulan')) period = 'bulan';
      else if (lower.includes('tahun')) period = 'tahun';
      return { intent: 'report', data: { period } };
    }

    // Savings
    const savingsWords = ['tabung', 'nabung', 'target', 'saving', 'celengan'];
    if (savingsWords.some(w => lower.includes(w))) {
      return { intent: 'savings', data: {} };
    }

    // Reminder
    const reminderWords = ['ingatkan', 'reminder', 'pengingat', 'alarm', 'jadwal bayar'];
    if (reminderWords.some(w => lower.includes(w))) {
      return { intent: 'reminder', data: {} };
    }

    // Analysis
    const analysisWords = ['analisis', 'analisa', 'kenapa', 'mengapa', 'kemana', 'tips', 'saran', 'insight'];
    if (analysisWords.some(w => lower.includes(w))) {
      return { intent: 'analysis', data: {} };
    }

    // Transaction - check if it matches any transaction keyword
    const allIncomeWords = ['gaji', 'dapat', 'pemasukan', 'terima', 'jual', 'penghasilan', 'freelance', 'bonus', 'hadiah'];
    const allExpenseWords = ['beli', 'bayar', 'nongkrong', 'makan', 'bensin', 'parkir', 'ojol', 'listrik', 'pulsa', 'obat', 'kopi', 'jajan', 'taksi', 'tol', 'sewa'];
    if (allIncomeWords.some(w => lower.includes(w))) {
      return { intent: 'transaction', data: { type: 'INCOME', hasAmount: parseAmount(text) !== null } };
    }
    if (allExpenseWords.some(w => lower.includes(w))) {
      return { intent: 'transaction', data: { type: 'EXPENSE', hasAmount: parseAmount(text) !== null } };
    }

    // If there's an amount, guess transaction
    if (parseAmount(text)) {
      return { intent: 'transaction', data: { type: 'EXPENSE', hasAmount: true } };
    }

    return { intent: 'unknown', data: {} };
  }
}

/**
 * AI service that wraps the primary provider with fallback parsing.
 * Tries Gemini first, falls back to regex-based FallbackParser on error.
 */
class AIService {
  constructor() {
    this.provider = new GeminiProvider();
    this.fallback = new FallbackParser();
  }

  /**
   * Parse a transaction from natural language.
   * Falls back to regex-based parser on AI error.
   */
  async parseTransaction(text) {
    try {
      return await this.provider.parseTransaction(text);
    } catch (error) {
      console.error(`[AIService] parseTransaction error (${error.code || 'UNKNOWN'}):`, error.message);
      return this.fallback.parseTransaction(text);
    }
  }

  /**
   * Parse balance setting intent from natural language.
   * Falls back to keyword matching on AI error.
   */
  async parseBalanceSetting(text) {
    try {
      return await this.provider.parseBalanceSetting(text);
    } catch (error) {
      console.error(`[AIService] parseBalanceSetting error (${error.code || 'UNKNOWN'}):`, error.message);
      return this.fallback.parseBalanceSetting(text);
    }
  }

  /**
   * Detect user intent from message.
   * Falls back to keyword-based detection on AI error.
   */
  async detectIntent(text) {
    try {
      return await this.provider.detectIntent(text);
    } catch (error) {
      console.error(`[AIService] detectIntent error (${error.code || 'UNKNOWN'}):`, error.message);
      return this.fallback.detectIntent(text);
    }
  }

  /**
   * Generate financial analysis from user data.
   * Returns error message if AI is unavailable (no regex fallback for analysis).
   */
  async generateAnalysis(question, financialData) {
    try {
      return await this.provider.generateAnalysis(question, financialData);
    } catch (error) {
      console.error(`[AIService] generateAnalysis error (${error.code || 'UNKNOWN'}):`, error.message);
      if (error.code === 'QUOTA_EXCEEDED') {
        return '⚠️ Maaf, layanan AI sedang tidak tersedia (kuota habis). Silakan coba lagi nanti.';
      }
      return '⚠️ Maaf, terjadi kesalahan saat menganalisis data keuangan kamu. Silakan coba lagi.';
    }
  }

  /**
   * Process receipt image via OCR.
   * Returns empty result if AI is unavailable (no regex fallback for vision).
   */
  async processReceipt(imageBuffer) {
    try {
      return await this.provider.processReceipt(imageBuffer);
    } catch (error) {
      console.error(`[AIService] processReceipt error (${error.code || 'UNKNOWN'}):`, error.message);
      return {
        storeName: null,
        date: null,
        total: null,
        items: [],
        error: error.code === 'QUOTA_EXCEEDED'
          ? 'Kuota AI habis. Silakan input struk secara manual.'
          : 'Gagal memproses gambar struk. Silakan coba lagi.',
      };
    }
  }
}

/** Singleton AI service instance */
export const aiService = new AIService();
export default aiService;