// Syntax check - verifikasi semua module bisa di-import
// Jalankan tanpa environment variables untuk tes syntax saja

const modules = [
  '../src/config/constants.js',
  '../src/utils/currency.js',
  '../src/utils/date.js',
  '../src/utils/format.js',
  '../src/bot/keyboards/index.js',
];

async function check() {
  let pass = 0;
  let fail = 0;

  for (const mod of modules) {
    try {
      await import(mod);
      console.log(`✅ ${mod}`);
      pass++;
    } catch (err) {
      console.log(`❌ ${mod}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

check();
