import { MediaFile, PrismaClient, Slide } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@restaurant.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });
  console.log(`Admin user ready: ${admin.email}`);

  const branchDowntown = await prisma.branch.upsert({
    where: { id: 'seed-branch-downtown' },
    update: {},
    create: {
      id: 'seed-branch-downtown',
      name: 'Sucursal Centro',
      address: 'Av. Principal 123',
    },
  });

  const branchMall = await prisma.branch.upsert({
    where: { id: 'seed-branch-mall' },
    update: {},
    create: {
      id: 'seed-branch-mall',
      name: 'Sucursal Mall Plaza',
      address: 'Centro Comercial Mall Plaza, Local 45',
    },
  });
  console.log(`Branches ready: ${branchDowntown.name}, ${branchMall.name}`);

  // Placeholder media (no real binary is uploaded by the seed script — the
  // records simply demonstrate the data shape; replace with real uploads
  // through the admin UI, which stores the file in MinIO/S3).
  const mediaSamples = [
    { name: 'promo-burger.jpg', title: 'Promo Hamburguesa' },
    { name: 'promo-pizza.jpg', title: 'Promo Pizza Familiar' },
    { name: 'menu-bebidas.jpg', title: 'Menu de Bebidas' },
  ];

  const mediaRecords: { media: MediaFile; title: string }[] = [];
  for (const sample of mediaSamples) {
    const objectKey = `seed/${sample.name}`;
    const media = await prisma.mediaFile.upsert({
      where: { id: `seed-media-${sample.name}` },
      update: {},
      create: {
        id: `seed-media-${sample.name}`,
        fileName: objectKey,
        originalName: sample.name,
        mimeType: 'image/jpeg',
        type: 'IMAGE',
        sizeBytes: 0,
        bucket: process.env.S3_BUCKET ?? 'signage-media',
        objectKey,
        url: `${process.env.S3_PUBLIC_URL ?? 'http://localhost:9000'}/${process.env.S3_BUCKET ?? 'signage-media'}/${objectKey}`,
      },
    });
    mediaRecords.push({ media, title: sample.title });
  }
  console.log(`Media files ready: ${mediaRecords.length}`);

  const slides: Slide[] = [];
  for (const { media, title } of mediaRecords) {
    const slide = await prisma.slide.upsert({
      where: { id: `seed-slide-${media.id}` },
      update: {},
      create: {
        id: `seed-slide-${media.id}`,
        title,
        mediaId: media.id,
        durationSecs: 10,
        backgroundColor: '#000000',
      },
    });
    slides.push(slide);
  }
  console.log(`Slides ready: ${slides.length}`);

  const playlist = await prisma.playlist.upsert({
    where: { id: 'seed-playlist-main' },
    update: {},
    create: {
      id: 'seed-playlist-main',
      name: 'Playlist Principal',
      branchId: branchDowntown.id,
      isActive: true,
    },
  });

  for (let i = 0; i < slides.length; i++) {
    await prisma.playlistItem.upsert({
      where: { id: `seed-item-${slides[i].id}` },
      update: { order: i },
      create: {
        id: `seed-item-${slides[i].id}`,
        playlistId: playlist.id,
        slideId: slides[i].id,
        order: i,
      },
    });
  }
  console.log(`Playlist ready: ${playlist.name} (${slides.length} items)`);

  const device = await prisma.device.upsert({
    where: { id: 'seed-device-tv-1' },
    update: {},
    create: {
      id: 'seed-device-tv-1',
      name: 'TV Entrada - Centro',
      pairingCode: 'DEMO01',
      deviceKey: randomUUID(),
      status: 'ONLINE',
      branchId: branchDowntown.id,
      playlistId: playlist.id,
      pairedAt: new Date(),
      lastSeenAt: new Date(),
    },
  });
  console.log(`Device ready: ${device.name} (pairing code: ${device.pairingCode})`);

  console.log('\nSeed completed.');
  console.log(`Login with: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
