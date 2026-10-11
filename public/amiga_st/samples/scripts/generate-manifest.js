import fs from 'fs';
import path from 'path';

const disksDir = path.join(process.cwd(), 'public/amiga_st/samples');
if (fs.existsSync(disksDir)) {
  const entries = fs.readdirSync(disksDir);
  const disks = entries
    .filter((f) => {
      try {
        return fs.statSync(path.join(disksDir, f)).isDirectory() && (f.startsWith('ST-') || f.startsWith('st-'));
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

  const manifest = [];
  for (const disk of disks) {
    const diskPath = path.join(disksDir, disk);
    const files = fs.readdirSync(diskPath);
    const samples = files
      .filter((f) => {
        const lower = f.toLowerCase();
        return lower.endsWith('.aiff') || lower.endsWith('.aif') || lower.endsWith('.wav') || lower.endsWith('.mp3') || lower.endsWith('.ogg');
      })
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    manifest.push({
      id: disk,
      name: disk,
      count: samples.length,
      samples: samples,
    });
  }

  const manifestPath = path.join(disksDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Generated manifest with ${manifest.length} disks and ${manifest.reduce((acc, d) => acc + d.count, 0)} samples.`);
} else {
  console.warn(`Directory not found: ${disksDir}`);
}
