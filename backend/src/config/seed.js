require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { syncDatabase, User } = require('../models');

async function seed() {
  await syncDatabase();

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fisheries.gov.vu';
  const existing = await User.findOne({ where: { email: adminEmail } });

  if (!existing) {
    await User.create({
      firstName: 'Admin',
      lastName: 'Fisheries',
      email: adminEmail,
      password: process.env.ADMIN_PASSWORD || 'Admin@CBFM2024',
      role: 'admin',
      organization: 'Vanuatu Department of Fisheries',
      province: 'Efate',
    });
    console.log(`Admin user created: ${adminEmail}`);
  } else {
    console.log('Admin user already exists.');
  }

  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
