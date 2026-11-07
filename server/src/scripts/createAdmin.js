import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

const rl=readline.createInterface({input,output});
try {
  const [[existing]]=await pool.query("SELECT COUNT(*) AS total FROM users WHERE role='administrator'");
  if(existing.total>0){
    console.log('An administrator already exists. Use the existing administrator account to create additional staff.');
    process.exitCode=0;
  } else {
    const fullName=(await rl.question('Administrator full name: ')).trim();
    const email=(await rl.question('Administrator email: ')).trim().toLowerCase();
    const password=await rl.question('Administrator password (minimum 10 characters): ');
    if(fullName.length<2||!/^\\S+@\\S+\\.\\S+$/.test(email)||password.length<10){
      throw new Error('Invalid details. Name, email and a password of at least 10 characters are required.');
    }
    const hash=await bcrypt.hash(password,12);
    await pool.execute(
      "INSERT INTO users (full_name,email,password_hash,role) VALUES (?,?,?,'administrator')",
      [fullName,email,hash]
    );
    console.log('Administrator account created. You can now sign in through CampusMind.');
  }
} catch(err) {
  console.error(err.message);
  process.exitCode=1;
} finally {
  rl.close();
  await pool.end();
}
