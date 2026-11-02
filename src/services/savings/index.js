import prisma from '../../database/prisma.js';
import logger from '../../utils/logger.js';

/**
 * Buat target tabungan baru.
 * @param {number} userId  - ID user (PK, bukan telegramId)
 * @param {string} name    - Nama target tabungan
 * @param {bigint} targetAmount - Nominal target (BigInt, satuan rupiah)
 */
export async function createGoal(userId, name, targetAmount) {
  try {
    const goal = await prisma.savingsGoal.create({
      data: {
        userId,
        name,
        targetAmount: BigInt(targetAmount),
      },
    });

    logger.info(`Target tabungan dibuat: id=${goal.id} user=${userId}`);
    return goal;
  } catch (error) {
    logger.error(`Gagal membuat target tabungan: ${error.message}`);
    throw error;
  }
}

/**
 * Ambil semua target tabungan aktif milik user beserta total kontribusi.
 */
export async function getGoals(userId) {
  try {
    const goals = await prisma.savingsGoal.findMany({
      where: { userId, isActive: true },
      include: { contributions: true },
      orderBy: { createdAt: 'desc' },
    });

    return goals.map((goal) => {
      const totalSaved = goal.contributions.reduce(
        (sum, c) => sum + c.amount,
        0n,
      );
      return {
        ...goal,
        totalSaved,
        remaining: goal.targetAmount - totalSaved > 0n
          ? goal.targetAmount - totalSaved
          : 0n,
        percentage: goal.targetAmount > 0n
          ? Number((totalSaved * 10000n) / goal.targetAmount) / 100
          : 0,
      };
    });
  } catch (error) {
    logger.error(`Gagal mengambil target tabungan: ${error.message}`);
    throw error;
  }
}

/**
 * Ambil satu target tabungan berdasarkan ID. Verifikasi kepemilikan.
 */
export async function getGoalById(id, userId) {
  try {
    const goal = await prisma.savingsGoal.findFirst({
      where: { id, userId, isActive: true },
      include: { contributions: { orderBy: { createdAt: 'desc' } } },
    });

    if (!goal) {
      return null;
    }

    const totalSaved = goal.contributions.reduce(
      (sum, c) => sum + c.amount,
      0n,
    );

    return {
      ...goal,
      totalSaved,
      remaining: goal.targetAmount - totalSaved > 0n
        ? goal.targetAmount - totalSaved
        : 0n,
      percentage: goal.targetAmount > 0n
        ? Number((totalSaved * 10000n) / goal.targetAmount) / 100
        : 0,
    };
  } catch (error) {
    logger.error(`Gagal mengambil target tabungan id=${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Tambah kontribusi ke target tabungan.
 * Verifikasi kepemilikan, lalu cek apakah target tercapai.
 *
 * @param {number} goalId
 * @param {number} userId
 * @param {bigint} amount  - Nominal kontribusi (BigInt, satuan rupiah)
 * @param {string|null} note
 */
export async function addContribution(goalId, userId, amount, note = null) {
  try {
    const goal = await prisma.savingsGoal.findFirst({
      where: { id: goalId, userId, isActive: true },
      include: { contributions: true },
    });

    if (!goal) {
      return { success: false, message: 'Target tabungan tidak ditemukan.' };
    }

    if (goal.isCompleted) {
      return { success: false, message: 'Target tabungan sudah tercapai.' };
    }

    const contribution = await prisma.savingsContribution.create({
      data: {
        goalId,
        amount: BigInt(amount),
        note,
      },
    });

    // Hitung total setelah kontribusi baru
    const previousTotal = goal.contributions.reduce(
      (sum, c) => sum + c.amount,
      0n,
    );
    const newTotal = previousTotal + BigInt(amount);
    const isCompleted = newTotal >= goal.targetAmount;

    // Tandai selesai jika target tercapai
    if (isCompleted) {
      await prisma.savingsGoal.update({
        where: { id: goalId },
        data: { isCompleted: true },
      });
    }

    logger.info(
      `Kontribusi tabungan: goal=${goalId} amount=${amount} total=${newTotal}${isCompleted ? ' (SELESAI)' : ''}`,
    );

    return {
      success: true,
      contribution,
      totalSaved: newTotal,
      remaining: goal.targetAmount - newTotal > 0n
        ? goal.targetAmount - newTotal
        : 0n,
      isCompleted,
    };
  } catch (error) {
    logger.error(`Gagal menambah kontribusi: ${error.message}`);
    throw error;
  }
}

/**
 * Soft-delete target tabungan. Set isActive = false.
 */
export async function deleteGoal(id, userId) {
  try {
    const goal = await prisma.savingsGoal.findFirst({
      where: { id, userId, isActive: true },
    });

    if (!goal) {
      return { success: false, message: 'Target tabungan tidak ditemukan.' };
    }

    await prisma.savingsGoal.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`Target tabungan dihapus: id=${id} user=${userId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Gagal menghapus target tabungan id=${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Ambil progres target tabungan.
 */
export async function getGoalProgress(goalId, userId) {
  try {
    const goal = await prisma.savingsGoal.findFirst({
      where: { id: goalId, userId, isActive: true },
      include: { contributions: true },
    });

    if (!goal) {
      return null;
    }

    const totalSaved = goal.contributions.reduce(
      (sum, c) => sum + c.amount,
      0n,
    );
    const remaining = goal.targetAmount - totalSaved > 0n
      ? goal.targetAmount - totalSaved
      : 0n;
    const percentage = goal.targetAmount > 0n
      ? Number((totalSaved * 10000n) / goal.targetAmount) / 100
      : 0;
    const isCompleted = totalSaved >= goal.targetAmount;

    return {
      goal,
      totalSaved,
      remaining,
      percentage,
      isCompleted,
    };
  } catch (error) {
    logger.error(`Gagal mengambil progres tabungan goalId=${goalId}: ${error.message}`);
    throw error;
  }
}
