import prisma from '../../database/prisma.js';
import logger from '../../utils/logger.js';

/**
 * Buat transaksi baru. Menggunakan Prisma transaction untuk atomicity.
 * @param {number} userId - Internal DB user ID
 * @param {object} data
 * @param {string} data.type - 'INCOME' atau 'EXPENSE'
 * @param {bigint} data.amount - Nominal dalam satuan rupiah (BigInt)
 * @param {string} data.category
 * @param {string} data.description
 * @param {Date} data.transactionDate
 * @returns {Promise<object>} Created transaction
 */
export async function createTransaction(userId, { type, amount, category, description, transactionDate }) {
  try {
    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId,
          type,
          amount: BigInt(amount),
          category: category || 'lain-lain',
          description,
          transactionDate: transactionDate || new Date(),
        },
      });
      return created;
    });

    logger.debug(`Transaksi dibuat: #${transaction.id} (user: ${userId}, type: ${type}, amount: ${amount})`);
    return transaction;
  } catch (error) {
    logger.error(`Gagal createTransaction untuk user ${userId}: ${error.message}`);
    throw error;
  }
}

/**
 * Ambil daftar transaksi user dengan paginasi.
 * @param {number} userId - Internal DB user ID
 * @param {object} options
 * @param {number} options.page - Halaman (default 1)
 * @param {number} options.limit - Jumlah per halaman (default 5)
 * @returns {Promise<{transactions: object[], total: number, page: number, totalPages: number}>}
 */
export async function getTransactions(userId, { page = 1, limit = 5 } = {}) {
  try {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, isDeleted: false },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({
        where: { userId, isDeleted: false },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return { transactions, total, page, totalPages };
  } catch (error) {
    logger.error(`Gagal getTransactions untuk user ${userId}: ${error.message}`);
    throw error;
  }
}

/**
 * Ambil satu transaksi berdasarkan ID. Verifikasi kepemilikan.
 * @param {number} id - Transaction ID
 * @param {number} userId - Internal DB user ID
 * @returns {Promise<object|null>}
 */
export async function getTransactionById(id, userId) {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId, isDeleted: false },
    });
    return transaction;
  } catch (error) {
    logger.error(`Gagal getTransactionById #${id} untuk user ${userId}: ${error.message}`);
    throw error;
  }
}

/**
 * Update transaksi. Hanya field yang diizinkan: amount, category, description, transactionDate.
 * @param {number} id - Transaction ID
 * @param {number} userId - Internal DB user ID
 * @param {object} data - Fields yang akan diupdate
 * @returns {Promise<object|null>} Updated transaction, atau null jika tidak ditemukan
 */
export async function updateTransaction(id, userId, data) {
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id, userId, isDeleted: false },
    });

    if (!existing) {
      return null;
    }

    const allowedFields = {};
    if (data.amount !== undefined) allowedFields.amount = BigInt(data.amount);
    if (data.category !== undefined) allowedFields.category = data.category;
    if (data.description !== undefined) allowedFields.description = data.description;
    if (data.transactionDate !== undefined) allowedFields.transactionDate = data.transactionDate;

    const updated = await prisma.transaction.update({
      where: { id },
      data: allowedFields,
    });

    logger.debug(`Transaksi diupdate: #${id} (user: ${userId})`);
    return updated;
  } catch (error) {
    logger.error(`Gagal updateTransaction #${id} untuk user ${userId}: ${error.message}`);
    throw error;
  }
}

/**
 * Soft delete transaksi (set isDeleted = true). Verifikasi kepemilikan.
 * @param {number} id - Transaction ID
 * @param {number} userId - Internal DB user ID
 * @returns {Promise<object|null>} Deleted transaction, atau null jika tidak ditemukan
 */
export async function deleteTransaction(id, userId) {
  try {
    const existing = await prisma.transaction.findFirst({
      where: { id, userId, isDeleted: false },
    });

    if (!existing) {
      return null;
    }

    const deleted = await prisma.transaction.update({
      where: { id },
      data: { isDeleted: true },
    });

    logger.debug(`Transaksi dihapus (soft): #${id} (user: ${userId})`);
    return deleted;
  } catch (error) {
    logger.error(`Gagal deleteTransaction #${id} untuk user ${userId}: ${error.message}`);
    throw error;
  }
}

/**
 * Ambil semua transaksi user dalam rentang tanggal.
 * @param {number} userId - Internal DB user ID
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<object[]>}
 */
export async function getTransactionsByDateRange(userId, startDate, endDate) {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        isDeleted: false,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { transactionDate: 'desc' },
    });
    return transactions;
  } catch (error) {
    logger.error(`Gagal getTransactionsByDateRange untuk user ${userId}: ${error.message}`);
    throw error;
  }
}

/**
 * Breakdown pengeluaran per kategori dalam rentang tanggal.
 * Hanya menghitung transaksi bertipe EXPENSE.
 * @param {number} userId - Internal DB user ID
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Array<{category: string, total: bigint, count: number}>>}
 */
export async function getCategoryBreakdown(userId, startDate, endDate) {
  try {
    const breakdown = await prisma.transaction.groupBy({
      by: ['category'],
      where: {
        userId,
        type: 'EXPENSE',
        isDeleted: false,
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    return breakdown.map((row) => ({
      category: row.category,
      total: row._sum.amount || 0n,
      count: row._count.id,
    }));
  } catch (error) {
    logger.error(`Gagal getCategoryBreakdown untuk user ${userId}: ${error.message}`);
    throw error;
  }
}
