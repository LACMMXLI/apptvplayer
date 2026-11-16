const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const readline = require('node:readline/promises');

const prisma = new PrismaClient();

function askHidden(question) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    if (!input.isTTY || typeof input.setRawMode !== 'function') {
      reject(new Error('Ejecuta este comando desde una terminal interactiva de Coolify.'));
      return;
    }

    process.stdout.write(question);
    input.setRawMode(true);
    input.resume();
    let value = '';
    const onData = (chunk) => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') {
          input.setRawMode(false);
          input.removeListener('data', onData);
          process.stdout.write('\n');
          reject(new Error('Operación cancelada.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          input.setRawMode(false);
          input.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
        else value += char;
      }
    };
    input.on('data', onData);
  });
}

async function main() {
  if (await prisma.user.count({ where: { role: 'ADMIN' } })) {
    throw new Error('Ya existe un administrador; no se creó otra cuenta.');
  }

  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  const name = (await terminal.question('Nombre: ')).trim();
  const email = (await terminal.question('Correo: ')).trim().toLowerCase();
  terminal.close();

  if (!name) throw new Error('El nombre es obligatorio.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('El correo no es válido.');

  const password = await askHidden('Contraseña (mínimo 12 caracteres): ');
  if (password.length < 12) throw new Error('La contraseña debe tener al menos 12 caracteres.');

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { name, email, passwordHash, role: 'ADMIN' },
  });
  console.log(`Administrador creado: ${email}`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
