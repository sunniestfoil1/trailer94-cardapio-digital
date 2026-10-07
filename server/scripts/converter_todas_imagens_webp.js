import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const publicDir = path.resolve(rootDir, 'web/public');

async function converter() {
  console.log('🖼️ [CONVERSÃO WEBP] Iniciando otimização de todas as imagens para WebP...');

  // 1. Converter FUNDO.jpg na raiz do projeto -> web/public/fundo.webp
  const fundoJpgPath = path.resolve(rootDir, 'FUNDO.jpg');
  if (fs.existsSync(fundoJpgPath)) {
    const destFundoWebp = path.resolve(publicDir, 'fundo.webp');
    await sharp(fundoJpgPath)
      .webp({ quality: 80, effort: 4 })
      .toFile(destFundoWebp);
    console.log(`✅ FUNDO.jpg convertido com sucesso -> ${destFundoWebp}`);
  }

  // 2. Escanear recursivamente web/public para converter todos os JPG/PNG restantes em WebP
  function escanearEConverter(dir) {
    const arquivos = fs.readdirSync(dir);
    for (const item of arquivos) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        escanearEConverter(fullPath);
      } else if (/\.(jpg|jpeg|png)$/i.test(item) && !item.includes('icon-')) {
        const webpPath = fullPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        if (!fs.existsSync(webpPath)) {
          sharp(fullPath)
            .webp({ quality: 82, effort: 4 })
            .toFile(webpPath)
            .then(() => console.log(`✅ Convertido: ${item} -> ${path.basename(webpPath)}`))
            .catch(err => console.error(`❌ Erro em ${item}:`, err.message));
        }
      }
    }
  }

  escanearEConverter(publicDir);
  console.log('🎉 [CONVERSÃO WEBP] Concluída com sucesso!');
}

converter().catch(console.error);
