import prisma from '../../database/prisma.js';
import logger from '../../utils/logger.js';

/**
 * Hitung saldo user saat ini dari database.
 * currentBalance = initialBalance + totalIncome - totalExpense
 * @param {number} userId - Internal DB user ID
 * @returns {Promise<{initialBalance: bigint, totalIncome: bigint, totalExpense: bigint, currentBalance: bigint}>}
 */
export async function getBalance(userId) {
  try {
    const [user, incomeAgg, expenseAgg] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { initialBalance: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          isDeleted: false,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          isDeleted: false,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    if (!user) {
      throw new Error(`User dengan ID ${userId} tidak ditemukan`);
    }

    const initialBalance = user.initialBalance;
    const totalIncome = incomeAgg._sum.amount || 0n;
    const totalExpense = expenseAgg._sum.amount || 0n;
    const currentBalance = initialBalance + totalIncome - totalExpense;

    return { initialBalance, totalIncome, totalExpense, currentBalance };
  } catch (error) {
    logger.error(`Gagal getBalance untuk user ${userId}: ${error.message}`);
    throw error;
  }
}

/**
 * Convenience function: ambil ringkasan saldo berdasarkan telegram ID.
 * @param {bigint} telegramId
 * @returns {Promise<{initialBalance: bigint, totalIncome: bigint, totalExpense: bigint, currentBalance: bigint}>}
 */
export async function getBalanceSummary(telegramId) {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    if (!user) {
      throw new Error(`User dengan telegram ID ${telegramId} tidak ditemukan`);
    }

    return getBalance(user.id);
  } catch (error) {
    logger.error(`Gagal getBalanceSummary untuk telegram ID ${telegramId}: ${error.message}`);
    throw error;
  }
}
