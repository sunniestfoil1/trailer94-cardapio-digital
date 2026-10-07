import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseKey) 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

/**
 * Inscreve no canal em tempo real do Supabase Realtime
 */
export function inscreverCanal(nomeCanal, onMensagem) {
  if (!supabase) {
    // Retorna função no-op limpa caso o Supabase ainda não esteja configurado
    return () => {};
  }

  try {
    const canal = supabase.channel(nomeCanal, { config: { broadcast: { self: false } } });
    canal.on('broadcast', { event: '*' }, ({ payload }) => {
      onMensagem(payload);
    });
    canal.subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  } catch (err) {
    console.warn('Erro ao conectar ao canal Supabase Realtime:', err);
    return () => {};
  }
}
