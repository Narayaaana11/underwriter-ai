/**
 * seed-passwords.js — One-time script to bcrypt hash all demo passwords
 * Run: node scripts/seed-passwords.js
 */
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../backend/data/store.json');

async function seedPasswords() {
  console.log('[Seed] Reading store.json...');
  
  if (!fs.existsSync(DB_FILE)) {
    console.log('[Seed] store.json not found. Start the server first to initialize the database.');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  
  let changed = 0;
  for (const user of data.users) {
    if (!user.passwordHash) {
      const plain = user.plainPasswordForSeed || 'password123';
      user.passwordHash = await bcrypt.hash(plain, 12);
      delete user.plainPasswordForSeed;
      changed++;
      console.log(`[Seed] Hashed password for ${user.email} (${user.role})`);
    }
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[Seed] Done. ${changed} password(s) hashed.`);
}

seedPasswords().catch(console.error);
