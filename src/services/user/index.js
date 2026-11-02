import prisma from '../../database/prisma.js';
import logger from '../../utils/logger.js';

/**
 * Cari user berdasarkan telegram ID, atau buat baru jika belum ada.
 * @param {bigint} telegramId
 * @param {string} firstName
 * @param {string|null} lastName
 * @param {string|null} username
 * @returns {Promise<object>} User object
 */
export async function findOrCreateUser(telegramId, firstName, lastName, username) {
  try {
    const user = await prisma.user.upsert({
      where: { telegramId: BigInt(telegramId) },
      update: {
        firstName,
        lastName: lastName || null,
        username: username || null,
      },
      create: {
        telegramId: BigInt(telegramId),
        firstName,
        lastName: lastName || null,
        username: username || null,
      },
    });

    logger.debug(`User upserted: ${user.id} (telegram: ${telegramId})`);
    return user;
  } catch (error) {
    logger.error(`Gagal findOrCreateUser untuk telegram ID ${telegramId}: ${error.message}`);
    throw error;
  }
}

/**
 * Set saldo awal user.
 * @param {bigint} telegramId
 * @param {bigint} amount - Saldo awal dalam satuan rupiah (BigInt)
 * @returns {Promise<object>} Updated user object
 */
export async function setInitialBalance(telegramId, amount) {
  try {
    const user = await prisma.user.update({
      where: { telegramId: BigInt(telegramId) },
      data: { initialBalance: BigInt(amount) },
    });

    logger.debug(`Saldo awal diatur untuk user telegram ${telegramId}: ${amount}`);
    return user;
  } catch (error) {
    logger.error(`Gagal setInitialBalance untuk telegram ID ${telegramId}: ${error.message}`);
    throw error;
  }
}

/**
 * Ambil user berdasarkan telegram ID.
 * @param {bigint} telegramId
 * @returns {Promise<object|null>}
 */
export async function getUser(telegramId) {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });
    return user;
  } catch (error) {
    logger.error(`Gagal getUser untuk telegram ID ${telegramId}: ${error.message}`);
    throw error;
  }
}

/**
 * Ambil user berdasarkan internal DB ID.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
export async function getUserById(id) {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user;
  } catch (error) {
    logger.error(`Gagal getUserById untuk ID ${id}: ${error.message}`);
    throw error;
  }
}
