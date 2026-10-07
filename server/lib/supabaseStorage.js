import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

export const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

const BUCKET = 'produtos';

export async function subirImagemProduto(buffer, nomeOriginal, mimetype) {
  // Converter qualquer formato enviado (PNG, JPG, HEIC) para WebP otimizado em alta velocidade
  const webpBuffer = await sharp(buffer)
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const baseNome = (nomeOriginal || 'foto').replace(/\.[^/.]+$/, '');
  const nomeArquivo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

  if (supabase) {
    const { error } = await supabase.storage.from(BUCKET).upload(nomeArquivo, webpBuffer, {
      contentType: 'image/webp',
      upsert: false
    });

    if (error) throw error;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(nomeArquivo);
    return { arquivo: data.publicUrl, nomeArquivo };
  }

  // Fallback local se Supabase não estiver configurado: salva na pasta public/imagens/produtos/uploads
  const localDir = path.resolve(process.cwd(), '../web/public/imagens/produtos/uploads');
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  const localFilePath = path.join(localDir, nomeArquivo);
  fs.writeFileSync(localFilePath, webpBuffer);

  return { arquivo: `/imagens/produtos/uploads/${nomeArquivo}`, nomeArquivo };
}

export async function listarImagensProdutos() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.storage.from(BUCKET).list('', {
      limit: 200,
      sortBy: { column: 'created_at', order: 'desc' }
    });
    if (error) return [];

    return (data || [])
      .filter(item => item.name && !item.name.endsWith('/'))
      .map(item => ({
        nome: item.name,
        url: supabase.storage.from(BUCKET).getPublicUrl(item.name).data.publicUrl,
        criadoEm: item.created_at
      }));
  } catch {
    return [];
  }
}

export async function apagarImagemProduto(nomeArquivo) {
  if (!supabase) return;
  const { error } = await supabase.storage.from(BUCKET).remove([nomeArquivo]);
  if (error) throw error;
}
