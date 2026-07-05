import express from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import sharp from 'sharp';
import { GeminiService } from '../src/GeminiService';

const app = express();
const PORT = 3000;
const upload = multer({ dest: os.tmpdir(), limits: { fileSize: 20 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function cleanup(filePath: string) {
  await fs.unlink(filePath).catch(() => {});
}

app.post('/api/generate-catalog', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

  try {
    const inputBuffer = await fs.readFile(req.file.path);
    await cleanup(req.file.path);

    const gemini = new GeminiService();
    const preprocessed = await sharp(inputBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();

    const result = await gemini.generateCatalogImage(preprocessed, 'image/jpeg');
    const finalImage = await sharp(result)
      .resize(1200, 1200, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();

    res.json({ image: finalImage.toString('base64') });
  } catch (e: any) {
    await cleanup(req.file!.path);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/change-color', upload.single('image'), async (req, res) => {
  const { hexColor, colorName } = req.body;
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

  if (!hexColor || !/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
    await cleanup(req.file.path);
    return res.status(400).json({ error: `Cor hex inválida: "${hexColor}"` });
  }
  if (!colorName?.trim()) {
    await cleanup(req.file.path);
    return res.status(400).json({ error: 'Nome da cor obrigatório' });
  }

  try {
    const inputBuffer = await fs.readFile(req.file.path);
    await cleanup(req.file.path);

    const gemini = new GeminiService();
    const preprocessed = await sharp(inputBuffer)
      .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 100 })
      .toBuffer();

    const result = await gemini.changeColor(preprocessed, hexColor, 'image/png');
    const finalImage = await sharp(result)
      .resize(2048, 2048, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();

    res.json({ image: finalImage.toString('base64'), name: colorName.trim() });
  } catch (e: any) {
    await cleanup(req.file!.path);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/change-color-batch', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhuma imagem enviada' });

  let colors: { hex: string; name: string }[];
  try {
    colors = JSON.parse(req.body.colors ?? '[]');
  } catch {
    await cleanup(req.file.path);
    return res.status(400).json({ error: 'Lista de cores inválida' });
  }

  if (!Array.isArray(colors) || colors.length === 0) {
    await cleanup(req.file.path);
    return res.status(400).json({ error: 'Adicione ao menos uma cor' });
  }

  const invalid = colors.filter(c => !/^#[0-9A-Fa-f]{6}$/.test(c.hex));
  if (invalid.length > 0) {
    await cleanup(req.file.path);
    return res.status(400).json({ error: `Cores hex inválidas: ${invalid.map(c => c.hex).join(', ')}` });
  }

  try {
    const inputBuffer = await fs.readFile(req.file.path);
    await cleanup(req.file.path);

    const gemini = new GeminiService();
    const preprocessed = await sharp(inputBuffer)
      .resize(1536, 1536, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 100 })
      .toBuffer();

    const results = [];
    for (const color of colors) {
      try {
        const result = await gemini.changeColor(preprocessed, color.hex, 'image/png');
        const finalImage = await sharp(result)
          .resize(2048, 2048, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
          .png({ quality: 100, compressionLevel: 9 })
          .toBuffer();
        results.push({ hex: color.hex, name: color.name, ok: true, image: finalImage.toString('base64') });
      } catch (e: any) {
        results.push({ hex: color.hex, name: color.name, ok: false, error: e.message });
      }
    }

    res.json({ results });
  } catch (e: any) {
    await cleanup(req.file!.path);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`\nEditor de Fotos — interface web`);
  console.log(`Abra no browser: http://localhost:${PORT}\n`);
});
