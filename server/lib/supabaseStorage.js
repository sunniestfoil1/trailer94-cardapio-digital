import { createClient } from '@supabase/supabase-js';

export const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

const BUCKET = 'produtos';

export async function subirImagemProduto(buffer, nomeOriginal, mimetype) {
  const extensao = nomeOriginal.split('.').pop() || 'jpg';
  const nomeArquivo = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensao}`;

  const { error } = await supabase.storage.from(BUCKET).upload(nomeArquivo, buffer, {
    contentType: mimetype,
    upsert: false
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(nomeArquivo);
  return { arquivo: data.publicUrl, nomeArquivo };
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
  const { error } = await supabase.storage.from(BUCKET).remove([nomeArquivo]);
  if (error) throw error;
}
