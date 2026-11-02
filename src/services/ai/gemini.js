import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider } from './provider.js';
import config from '../../config/index.js';
import { parseAmount } from '../../utils/currency.js';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../../config/constants.js';

/**
 * Google Gemini AI provider implementation.
 */
export class GeminiProvider extends AIProvider {
  constructor() {
    super('gemini');

    this.genAI = new GoogleGenerativeAI(config.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({
      model: config.geminiModel,
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });
    this.visionModel = this.genAI.getGenerativeModel({
      model: config.geminiModel,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
      },
    });
  }

  /**
   * Extract JSON from a Gemini response that may be wrapped in markdown code fences.
   * @param {string} raw
   * @returns {object}
   */
  _extractJSON(raw) {
    let cleaned = raw.trim();
    // Strip markdown code fences like ```json ... ```
    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      cleaned = fenceMatch[1].trim();
    }
    return JSON.parse(cleaned);
  }

  /**
   * Parse natural language input into a structured transaction.
   */
  async parseTransaction(text) {
    const prompt = `Kamu adalah parser transaksi keuangan berbahasa Indonesia. Tugasmu adalah mengubah pesan pengguna menjadi data transaksi terstruktur.

Kategori pengeluaran yang tersedia: ${EXPENSE_CATEGORIES.join(', ')}
Kategori pemasukan yang tersedia: ${INCOME_CATEGORIES.join(', ')}

ATURAN PENTING:
- JANGAN PERNAH mengarang nominal. Jika nominal tidak jelas dari pesan, kembalikan amount: null.
- Tentukan type: "INCOME" jika pemasukan/pendapatan, "EXPENSE" jika pengeluaran.
- Pilih category dari daftar di atas yang paling cocok.
- description: deskripsi singkat bersih dari transaksi.
- date: tanggal jika disebutkan dalam format "YYYY-MM-DD", jika tidak disebutkan kembalikan null. "kemarin" berarti tanggal kemarin, "tadi" berarti hari ini.
- confidence: angka 0-1 seberapa yakin kamu dengan parsing ini.
- Jika pesan BUKAN transaksi keuangan sama sekali, kembalikan: {"isTransaction": false}

Tanggal hari ini: ${new Date().toLocaleDateString('id-ID', { timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-')}

Kembalikan HANYA JSON valid tanpa penjelasan tambahan.

Format output jika transaksi:
{"isTransaction": true, "type": "INCOME" atau "EXPENSE", "amount": angka atau null, "category": "kategori", "description": "deskripsi", "date": "YYYY-MM-DD" atau null, "confidence": 0.0-1.0}

Pesan pengguna: "${text}"`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const parsed = this._extractJSON(response);

      if (!parsed.isTransaction) {
        return null;
      }

      let amount = null;
      if (parsed.amount !== null && parsed.amount !== undefined) {
        amount = BigInt(Math.round(Number(parsed.amount)));
      }
      // Fallback: try parsing the amount from the original text if AI returned null
      if (amount === null || amount <= 0n) {
        amount = parseAmount(text);
      }

      const validExpense = EXPENSE_CATEGORIES.includes(parsed.category);
      const validIncome = INCOME_CATEGORIES.includes(parsed.category);
      let category = parsed.category || 'lain-lain';
      if (parsed.type === 'EXPENSE' && !validExpense) {
        category = 'lain-lain';
      } else if (parsed.type === 'INCOME' && !validIncome) {
        category = 'lain-lain';
      }

      return {
        type: parsed.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
        amount,
        category,
        description: parsed.description || text,
        date: parsed.date || null,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      };
    } catch (error) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        const quotaError = new Error('Kuota AI habis. Coba lagi nanti.');
        quotaError.code = 'QUOTA_EXCEEDED';
        throw quotaError;
      }
      throw error;
    }
  }

  /**
   * Parse natural language for initial balance setting.
   */
  async parseBalanceSetting(text) {
    const prompt = `Kamu adalah asisten keuangan. Tentukan apakah pesan pengguna bermaksud mengatur saldo awal/saldo saat ini.

Contoh pesan yang bermaksud mengatur saldo:
- "saldo saya 5 juta"
- "saldo awal 1.500.000"
- "set saldo 2jt"
- "uang saya sekarang 500rb"
- "tabungan saya 10 juta"

Jika pengguna BERMAKSUD mengatur saldo, kembalikan:
{"isBalanceSetting": true, "amount": angka}

Jika TIDAK, kembalikan:
{"isBalanceSetting": false, "amount": null}

JANGAN mengarang nominal. Jika nominal tidak jelas, kembalikan amount: null.
Kembalikan HANYA JSON valid tanpa penjelasan.

Pesan pengguna: "${text}"`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const parsed = this._extractJSON(response);

      let amount = null;
      if (parsed.amount !== null && parsed.amount !== undefined) {
        amount = BigInt(Math.round(Number(parsed.amount)));
      }
      if (amount === null || amount <= 0n) {
        amount = parseAmount(text);
      }

      return {
        isBalanceSetting: Boolean(parsed.isBalanceSetting),
        amount,
      };
    } catch (error) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        const quotaError = new Error('Kuota AI habis. Coba lagi nanti.');
        quotaError.code = 'QUOTA_EXCEEDED';
        throw quotaError;
      }
      throw error;
    }
  }

  /**
   * Determine user intent from message.
   */
  async detectIntent(text) {
    const prompt = `Kamu adalah asisten keuangan pribadi berbahasa Indonesia. Klasifikasikan maksud/intent dari pesan pengguna.

Intent yang tersedia:
- "transaction": pengguna mencatat transaksi pengeluaran atau pemasukan (contoh: "beli makan 20rb", "gaji bulan ini 5jt")
- "balance_check": pengguna ingin cek saldo/sisa uang (contoh: "berapa saldo saya", "sisa uang berapa")
- "balance_setting": pengguna ingin set/atur saldo awal (contoh: "saldo saya 5jt", "set saldo 1000000")
- "report": pengguna minta laporan/ringkasan keuangan (contoh: "laporan bulan ini", "ringkasan pengeluaran")
- "savings": terkait tabungan/target menabung (contoh: "target nabung 10jt", "progres tabungan")
- "reminder": pengguna minta diingatkan/set pengingat (contoh: "ingatkan bayar listrik", "reminder tagihan")
- "analysis": pengguna bertanya soal analisis/insight keuangan (contoh: "kemana uang saya habis", "tips hemat")
- "greeting": sapaan (contoh: "halo", "hi", "selamat pagi")
- "help": minta bantuan/panduan (contoh: "cara pakai", "bantuan", "help")
- "unknown": tidak jelas / tidak terkait keuangan

Kembalikan HANYA JSON valid:
{"intent": "nama_intent", "data": {}}

Untuk intent "transaction", isi data dengan info singkat yang terdeteksi:
{"intent": "transaction", "data": {"type": "INCOME atau EXPENSE", "hasAmount": true/false}}

Untuk intent "report", isi data dengan periode jika disebutkan:
{"intent": "report", "data": {"period": "hari/minggu/bulan/tahun" atau null}}

Pesan pengguna: "${text}"`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      const parsed = this._extractJSON(response);

      const validIntents = [
        'transaction', 'balance_check', 'balance_setting', 'report',
        'savings', 'reminder', 'analysis', 'greeting', 'help', 'unknown',
      ];

      return {
        intent: validIntents.includes(parsed.intent) ? parsed.intent : 'unknown',
        data: parsed.data || {},
      };
    } catch (error) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        const quotaError = new Error('Kuota AI habis. Coba lagi nanti.');
        quotaError.code = 'QUOTA_EXCEEDED';
        throw quotaError;
      }
      throw error;
    }
  }

  /**
   * Generate financial analysis/summary based on user data.
   */
  async generateAnalysis(question, financialData) {
    const prompt = `Kamu adalah asisten keuangan pribadi yang cerdas dan ramah. Jawab pertanyaan pengguna berdasarkan DATA yang diberikan.

ATURAN PENTING:
- HANYA gunakan data yang diberikan. JANGAN mengarang angka atau data yang tidak ada.
- Jawab dalam Bahasa Indonesia yang natural dan mudah dipahami.
- Gunakan emoji secukupnya agar ramah.
- Berikan insight dan saran praktis jika relevan.
- Format nominal uang sebagai Rupiah (contoh: Rp1.500.000).
- Jika data tidak cukup untuk menjawab, katakan dengan jujur.

DATA KEUANGAN PENGGUNA:
${JSON.stringify(financialData, (key, value) => typeof value === 'bigint' ? Number(value) : value, 2)}

PERTANYAAN PENGGUNA: "${question}"

Jawab dengan ringkas, informatif, dan bermanfaat.`;

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        const quotaError = new Error('Kuota AI habis. Coba lagi nanti.');
        quotaError.code = 'QUOTA_EXCEEDED';
        throw quotaError;
      }
      throw error;
    }
  }

  /**
   * Process receipt image for OCR.
   */
  async processReceipt(imageBuffer) {
    const prompt = `Kamu adalah sistem OCR struk belanja. Analisis gambar struk/nota ini dan ekstrak informasi berikut.

Kembalikan HANYA JSON valid dengan format:
{
  "storeName": "nama toko" atau null jika tidak terbaca,
  "date": "YYYY-MM-DD" atau null jika tidak terbaca,
  "total": angka total belanja (tanpa titik/koma, dalam Rupiah) atau null,
  "items": [
    {"name": "nama item", "price": angka harga item dalam Rupiah}
  ]
}

ATURAN:
- Harga dalam satuan Rupiah penuh (bukan sen/desimal).
- Jika item tidak terbaca jelas, lewati.
- JANGAN mengarang data. Jika tidak terbaca, gunakan null.
- total adalah harga total akhir yang dibayar (setelah diskon, pajak, dll).`;

    try {
      const base64Image = imageBuffer.toString('base64');
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: 'image/jpeg',
        },
      };

      const result = await this.visionModel.generateContent([prompt, imagePart]);
      const response = result.response.text();
      const parsed = this._extractJSON(response);

      let total = null;
      if (parsed.total !== null && parsed.total !== undefined) {
        total = BigInt(Math.round(Number(parsed.total)));
        if (total <= 0n) total = null;
      }

      const items = Array.isArray(parsed.items)
        ? parsed.items.map(item => ({
          name: item.name || 'Item',
          price: item.price != null ? BigInt(Math.round(Number(item.price))) : 0n,
        }))
        : [];

      return {
        storeName: parsed.storeName || null,
        date: parsed.date || null,
        total,
        items,
      };
    } catch (error) {
      if (error.message?.includes('429') || error.message?.includes('quota')) {
        const quotaError = new Error('Kuota AI habis. Coba lagi nanti.');
        quotaError.code = 'QUOTA_EXCEEDED';
        throw quotaError;
      }
      throw error;
    }
  }
}
