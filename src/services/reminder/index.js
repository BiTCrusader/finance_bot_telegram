import prisma from '../../database/prisma.js';
import logger from '../../utils/logger.js';
import { dayjs } from '../../utils/date.js';

const WITA_TZ = 'Asia/Makassar';

/**
 * Buat pengingat baru.
 *
 * @param {number} userId
 * @param {object} opts
 * @param {string} opts.type         - 'DAILY' | 'MONTHLY'
 * @param {string} opts.title
 * @param {string|null} opts.description
 * @param {number} opts.hour         - Jam (0-23) dalam zona WITA
 * @param {number} opts.minute       - Menit (0-59)
 * @param {number|null} opts.dayOfMonth - Tanggal 1-31 (khusus MONTHLY)
 */
export async function createReminder(userId, { type, title, description, hour, minute, dayOfMonth }) {
  try {
    const reminder = await prisma.reminder.create({
      data: {
        userId,
        type,
        title,
        description: description ?? null,
        cronHour: hour,
        cronMinute: minute,
        cronDayOfMonth: type === 'MONTHLY' ? (dayOfMonth ?? null) : null,
      },
    });

    logger.info(`Pengingat dibuat: id=${reminder.id} user=${userId} type=${type} ${hour}:${String(minute).padStart(2, '0')}`);
    return reminder;
  } catch (error) {
    logger.error(`Gagal membuat pengingat: ${error.message}`);
    throw error;
  }
}

/**
 * Ambil semua pengingat aktif milik user.
 */
export async function getReminders(userId) {
  try {
    return await prisma.reminder.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    logger.error(`Gagal mengambil daftar pengingat: ${error.message}`);
    throw error;
  }
}

/**
 * Soft-delete pengingat. Verifikasi kepemilikan.
 */
export async function deleteReminder(id, userId) {
  try {
    const reminder = await prisma.reminder.findFirst({
      where: { id, userId, isActive: true },
    });

    if (!reminder) {
      return { success: false, message: 'Pengingat tidak ditemukan.' };
    }

    await prisma.reminder.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info(`Pengingat dihapus: id=${id} user=${userId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Gagal menghapus pengingat id=${id}: ${error.message}`);
    throw error;
  }
}

/**
 * Cari semua pengingat yang harus dipicu sekarang.
 *
 * Kriteria:
 *  - DAILY : jam dan menit saat ini (WITA) cocok dengan cronHour & cronMinute
 *  - MONTHLY: sama seperti DAILY, ditambah hari dalam bulan cocok dengan cronDayOfMonth
 *  - lastTriggered null ATAU sudah lebih dari 23 jam yang lalu (anti double-trigger)
 */
export async function getDueReminders() {
  try {
    const nowWita = dayjs().tz(WITA_TZ);
    const currentHour = nowWita.hour();
    const currentMinute = nowWita.minute();
    const currentDay = nowWita.date();

    const activeReminders = await prisma.reminder.findMany({
      where: { isActive: true },
      include: { user: true },
    });

    const twentyThreeHoursAgo = nowWita.subtract(23, 'hour').toDate();

    const dueReminders = activeReminders.filter((reminder) => {
      // Cek jam dan menit
      if (reminder.cronHour !== currentHour || reminder.cronMinute !== currentMinute) {
        return false;
      }

      // Untuk MONTHLY, cek hari dalam bulan
      if (reminder.type === 'MONTHLY' && reminder.cronDayOfMonth !== currentDay) {
        return false;
      }

      // Cek anti double-trigger: lastTriggered harus null atau > 23 jam yang lalu
      if (reminder.lastTriggered !== null && reminder.lastTriggered > twentyThreeHoursAgo) {
        return false;
      }

      return true;
    });

    return dueReminders;
  } catch (error) {
    logger.error(`Gagal mengambil pengingat yang jatuh tempo: ${error.message}`);
    throw error;
  }
}

/**
 * Tandai pengingat sudah dipicu — update lastTriggered ke waktu sekarang.
 */
export async function markTriggered(reminderId) {
  try {
    await prisma.reminder.update({
      where: { id: reminderId },
      data: { lastTriggered: new Date() },
    });

    logger.info(`Pengingat ditandai terpicu: id=${reminderId}`);
  } catch (error) {
    logger.error(`Gagal menandai pengingat terpicu id=${reminderId}: ${error.message}`);
    throw error;
  }
}
