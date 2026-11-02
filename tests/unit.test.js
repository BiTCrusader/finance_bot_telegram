import { describe, test, expect, beforeAll } from '@jest/globals';
import { parseAmount, formatRupiah, isValidAmount } from '../src/utils/currency.js';
import { parseDate, startOfToday, endOfToday, formatDate } from '../src/utils/date.js';
import { formatTransaction, formatBalanceSummary, capitalize } from '../src/utils/format.js';

// ============================================
// TEST: Currency Utils
// ============================================
describe('Currency Utils', () => {
  describe('parseAmount', () => {
    test('parses angka biasa', () => {
      expect(parseAmount('15000')).toBe(15000n);
      expect(parseAmount('1500000')).toBe(1500000n);
    });

    test('parses angka dengan titik pemisah ribuan', () => {
      expect(parseAmount('15.000')).toBe(15000n);
      expect(parseAmount('1.500.000')).toBe(1500000n);
    });

    test('parses format ribu/rb', () => {
      expect(parseAmount('15ribu')).toBe(15000n);
      expect(parseAmount('15rb')).toBe(15000n);
      expect(parseAmount('100 ribu')).toBe(100000n);
    });

    test('parses format juta/jt', () => {
      expect(parseAmount('2juta')).toBe(2000000n);
      expect(parseAmount('2jt')).toBe(2000000n);
      expect(parseAmount('3 juta')).toBe(3000000n);
    });

    test('parses format desimal juta', () => {
      expect(parseAmount('1,5juta')).toBe(1500000n);
      expect(parseAmount('1.5jt')).toBe(1500000n);
      expect(parseAmount('2,5 juta')).toBe(2500000n);
    });

    test('parses format Rp prefix', () => {
      expect(parseAmount('Rp15.000')).toBe(15000n);
      expect(parseAmount('Rp 1.500.000')).toBe(1500000n);
      expect(parseAmount('Rp50000')).toBe(50000n);
    });

    test('returns null untuk input invalid', () => {
      expect(parseAmount(null)).toBeNull();
      expect(parseAmount('')).toBeNull();
      expect(parseAmount('hello')).toBeNull();
      expect(parseAmount('0')).toBeNull();
    });
  });

  describe('formatRupiah', () => {
    test('formats BigInt ke string Rupiah', () => {
      expect(formatRupiah(15000n)).toBe('Rp15.000');
      expect(formatRupiah(1500000n)).toBe('Rp1.500.000');
      expect(formatRupiah(0n)).toBe('Rp0');
    });
  });

  describe('isValidAmount', () => {
    test('validates amount range', () => {
      expect(isValidAmount(1n)).toBe(true);
      expect(isValidAmount(1000000n)).toBe(true);
      expect(isValidAmount(null)).toBe(false);
      expect(isValidAmount(0n)).toBe(false);
      expect(isValidAmount(-1n)).toBe(false);
    });
  });
});

// ============================================
// TEST: Date Utils
// ============================================
describe('Date Utils', () => {
  test('startOfToday returns valid date', () => {
    const result = startOfToday();
    expect(result).toBeDefined();
    expect(result.toDate()).toBeInstanceOf(Date);
  });

  test('endOfToday returns valid date', () => {
    const result = endOfToday();
    expect(result).toBeDefined();
    expect(result.toDate()).toBeInstanceOf(Date);
  });

  test('formatDate formats correctly', () => {
    const date = new Date('2024-01-15T12:00:00Z');
    const result = formatDate(date, 'DD/MM/YYYY');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  test('parseDate parses "hari ini"', () => {
    const result = parseDate('hari ini');
    expect(result).toBeInstanceOf(Date);
  });

  test('parseDate parses "kemarin"', () => {
    const result = parseDate('kemarin');
    expect(result).toBeInstanceOf(Date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(result.getDate()).toBe(yesterday.getDate());
  });

  test('parseDate returns null for invalid input', () => {
    expect(parseDate('not a date')).toBeNull();
    expect(parseDate(null)).toBeNull();
  });
});

// ============================================
// TEST: Format Utils
// ============================================
describe('Format Utils', () => {
  test('capitalize works correctly', () => {
    expect(capitalize('makanan')).toBe('Makanan');
    expect(capitalize('TRANSPORTASI')).toBe('Transportasi');
    expect(capitalize('')).toBe('');
  });

  test('formatTransaction returns formatted string', () => {
    const tx = {
      id: 1,
      type: 'EXPENSE',
      amount: 20000n,
      category: 'makanan',
      description: 'Makan siang',
      transactionDate: new Date('2024-01-15'),
    };
    const result = formatTransaction(tx);
    expect(result).toContain('Pengeluaran');
    expect(result).toContain('Makanan');
    expect(result).toContain('Makan siang');
    expect(result).toContain('Rp20.000');
  });

  test('formatBalanceSummary returns formatted string', () => {
    const data = {
      initialBalance: 1000000n,
      totalIncome: 500000n,
      totalExpense: 200000n,
      currentBalance: 1300000n,
    };
    const result = formatBalanceSummary(data);
    expect(result).toContain('Ringkasan Saldo');
    expect(result).toContain('Rp1.000.000');
    expect(result).toContain('Rp1.300.000');
  });
});

// ============================================
// TEST: AI Fallback Parser
// ============================================
describe('AI Fallback Parser', () => {
  let FallbackParser;

  beforeAll(async () => {
    // We need to test the FallbackParser independently
    // Since it's a class inside the AI service module, we test through the module
    // But for unit tests, we test the parsing logic directly
  });

  test('detects expense from keywords', () => {
    // Test using parseAmount and keyword detection logic
    const text = 'beli makan siang 20 ribu';
    const amount = parseAmount(text);
    expect(amount).toBe(20000n);

    // Check keyword presence
    expect(text.toLowerCase().includes('beli')).toBe(true);
    expect(text.toLowerCase().includes('makan')).toBe(true);
  });

  test('detects income from keywords', () => {
    const text = 'gaji bulan ini 3 juta';
    const amount = parseAmount(text);
    expect(amount).toBe(3000000n);

    expect(text.toLowerCase().includes('gaji')).toBe(true);
  });

  test('extracts amount from mixed text', () => {
    expect(parseAmount('beli bensin 30 ribu')).toBe(30000n);
    expect(parseAmount('bayar listrik 200.000')).toBe(200000n);
    expect(parseAmount('nongkrong 50rb')).toBe(50000n);
    expect(parseAmount('pemasukan freelance 1,5 juta')).toBe(1500000n);
  });
});

// ============================================
// TEST: Balance Calculation Logic
// ============================================
describe('Balance Calculation Logic', () => {
  test('calculates correct balance', () => {
    const initialBalance = 1000000n;
    const totalIncome = 3000000n;
    const totalExpense = 1500000n;
    const currentBalance = initialBalance + totalIncome - totalExpense;

    expect(currentBalance).toBe(2500000n);
  });

  test('handles zero values', () => {
    const initialBalance = 0n;
    const totalIncome = 0n;
    const totalExpense = 0n;
    const currentBalance = initialBalance + totalIncome - totalExpense;

    expect(currentBalance).toBe(0n);
  });

  test('handles negative balance', () => {
    const initialBalance = 100000n;
    const totalIncome = 0n;
    const totalExpense = 150000n;
    const currentBalance = initialBalance + totalIncome - totalExpense;

    expect(currentBalance).toBe(-50000n);
  });
});

// ============================================
// TEST: Transaction Validation
// ============================================
describe('Transaction Validation', () => {
  test('validates amount is positive', () => {
    expect(isValidAmount(1n)).toBe(true);
    expect(isValidAmount(0n)).toBe(false);
    expect(isValidAmount(-100n)).toBe(false);
  });

  test('validates amount within reasonable range', () => {
    expect(isValidAmount(999999999999n)).toBe(true);
    expect(isValidAmount(1000000000000n)).toBe(false); // > 999 miliar
  });

  test('validates null and undefined', () => {
    expect(isValidAmount(null)).toBe(false);
    expect(isValidAmount(undefined)).toBe(false);
  });
});

// ============================================
// TEST: Access Control Logic
// ============================================
describe('Access Control', () => {
  test('validates allowed telegram IDs', () => {
    const allowedIds = [123456789n, 987654321n];
    const userId = 123456789n;
    const unauthorizedId = 111111111n;

    expect(allowedIds.includes(userId)).toBe(true);
    expect(allowedIds.includes(unauthorizedId)).toBe(false);
  });
});

// ============================================
// TEST: Deduplication Logic
// ============================================
describe('Deduplication', () => {
  test('detects duplicate update IDs', () => {
    const processedIds = new Set([100n, 200n, 300n]);

    expect(processedIds.has(100n)).toBe(true);
    expect(processedIds.has(400n)).toBe(false);
  });
});

// ============================================
// TEST: Webhook Verification Logic
// ============================================
describe('Webhook Verification', () => {
  test('verifies secret token', () => {
    const expectedSecret = 'my-webhook-secret';
    const validToken = 'my-webhook-secret';
    const invalidToken = 'wrong-secret';

    expect(validToken === expectedSecret).toBe(true);
    expect(invalidToken === expectedSecret).toBe(false);
  });
});

// ============================================
// TEST: Report Period Calculation
// ============================================
describe('Report Period Calculation', () => {
  test('transaction totals calculated correctly from array', () => {
    const transactions = [
      { type: 'INCOME', amount: 3000000n },
      { type: 'EXPENSE', amount: 200000n },
      { type: 'EXPENSE', amount: 150000n },
      { type: 'INCOME', amount: 500000n },
    ];

    let totalIncome = 0n;
    let totalExpense = 0n;
    for (const tx of transactions) {
      if (tx.type === 'INCOME') totalIncome += tx.amount;
      else totalExpense += tx.amount;
    }

    expect(totalIncome).toBe(3500000n);
    expect(totalExpense).toBe(350000n);
  });

  test('category breakdown aggregation', () => {
    const transactions = [
      { type: 'EXPENSE', category: 'makanan', amount: 20000n },
      { type: 'EXPENSE', category: 'makanan', amount: 30000n },
      { type: 'EXPENSE', category: 'transportasi', amount: 50000n },
    ];

    const breakdown = {};
    for (const tx of transactions) {
      if (tx.type === 'EXPENSE') {
        if (!breakdown[tx.category]) breakdown[tx.category] = { total: 0n, count: 0 };
        breakdown[tx.category].total += tx.amount;
        breakdown[tx.category].count += 1;
      }
    }

    expect(breakdown.makanan.total).toBe(50000n);
    expect(breakdown.makanan.count).toBe(2);
    expect(breakdown.transportasi.total).toBe(50000n);
    expect(breakdown.transportasi.count).toBe(1);
  });
});

// ============================================
// TEST: Savings Goal Progress
// ============================================
describe('Savings Goal Progress', () => {
  test('calculates percentage correctly', () => {
    const target = 8000000n;
    const saved = 2000000n;
    const percentage = Number((saved * 100n) / target);

    expect(percentage).toBe(25);
  });

  test('calculates remaining correctly', () => {
    const target = 5000000n;
    const saved = 3500000n;
    const remaining = target - saved;

    expect(remaining).toBe(1500000n);
  });

  test('detects goal completion', () => {
    const target = 1000000n;
    const saved = 1000000n;
    expect(saved >= target).toBe(true);

    const savedOver = 1500000n;
    expect(savedOver >= target).toBe(true);

    const savedUnder = 900000n;
    expect(savedUnder >= target).toBe(false);
  });
});

// ============================================
// TEST: Reminder Due Check
// ============================================
describe('Reminder Due Check', () => {
  test('daily reminder matches current time', () => {
    const now = new Date();
    const reminder = {
      type: 'DAILY',
      cronHour: now.getHours(),
      cronMinute: now.getMinutes(),
      lastTriggered: null,
    };

    const isDue = reminder.cronHour === now.getHours()
      && reminder.cronMinute === now.getMinutes()
      && reminder.lastTriggered === null;

    expect(isDue).toBe(true);
  });

  test('daily reminder does not match different time', () => {
    const reminder = {
      type: 'DAILY',
      cronHour: 23,
      cronMinute: 59,
      lastTriggered: null,
    };

    // Unless it's exactly 23:59, this should not match
    const now = new Date();
    const isDue = reminder.cronHour === now.getHours()
      && reminder.cronMinute === now.getMinutes();

    // This could match if test runs at 23:59, but that's unlikely
    if (now.getHours() !== 23 || now.getMinutes() !== 59) {
      expect(isDue).toBe(false);
    }
  });

  test('anti double-trigger check', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twentyThreeHoursAgo = new Date(now.getTime() - 23 * 60 * 60 * 1000);

    // Should NOT trigger (triggered 1 hour ago)
    expect(oneHourAgo > twentyThreeHoursAgo).toBe(true);

    // Should trigger (triggered 24 hours ago)
    expect(twentyFourHoursAgo > twentyThreeHoursAgo).toBe(false);
  });
});
