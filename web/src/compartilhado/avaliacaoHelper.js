/**
 * ========================================================
 * ⭐ HELPER DE AVALIAÇÃO AUTOMÁTICA NO GOOGLE
 * ========================================================
 * Gerencia a persistência de pedidos do cliente na sessão local,
 * checagem de elegibilidade (conclusão <= 1h) e controle de exibição única.
 */

const CHAVE_PEDIDOS_CLIENTE = 'trailer94_pedidos_cliente';
const CHAVE_AVALIACOES_EXIBIDAS = 'trailer94_avaliacoes_exibidas';

/**
 * Registra um token de acesso de pedido na sessão local (localStorage)
 */
export function registrarPedidoSessao(acessoToken) {
  if (!acessoToken || typeof acessoToken !== 'string') return;
  try {
    const tokens = obterPedidosSessao();
    if (!tokens.includes(acessoToken)) {
      tokens.push(acessoToken);
      localStorage.setItem(CHAVE_PEDIDOS_CLIENTE, JSON.stringify(tokens));
    }
  } catch (err) {
    console.error('Falha ao registrar pedido na sessão:', err);
  }
}

/**
 * Retorna os tokens de pedidos registrados na sessão
 */
export function obterPedidosSessao() {
  try {
    const dados = localStorage.getItem(CHAVE_PEDIDOS_CLIENTE);
    return dados ? JSON.parse(dados) : [];
  } catch {
    return [];
  }
}

/**
 * Registra que a solicitação de avaliação já foi exibida para determinado token de pedido
 */
export function marcarAvaliacaoComoExibida(acessoToken) {
  if (!acessoToken) return;
  try {
    const exibidas = obterAvaliacoesExibidas();
    if (!exibidas.includes(acessoToken)) {
      exibidas.push(acessoToken);
      localStorage.setItem(CHAVE_AVALIACOES_EXIBIDAS, JSON.stringify(exibidas));
    }
  } catch (err) {
    console.error('Falha ao marcar avaliação exibida:', err);
  }
}

/**
 * Verifica se a avaliação já foi exibida para este token de pedido
 */
export function foiAvaliacaoExibida(acessoToken) {
  if (!acessoToken) return false;
  try {
    const exibidas = obterAvaliacoesExibidas();
    return exibidas.includes(acessoToken);
  } catch {
    return false;
  }
}

export function obterAvaliacoesExibidas() {
  try {
    const dados = localStorage.getItem(CHAVE_AVALIACOES_EXIBIDAS);
    return dados ? JSON.parse(dados) : [];
  } catch {
    return [];
  }
}

/**
 * Valida se uma data de conclusão foi dentro das últimas X horas (padrão: 1 hora)
 */
export function foiConcluidoNasUltimasHoras(dataStr, limiteHoras = 1) {
  if (!dataStr) return false;
  try {
    let iso = String(dataStr).trim();
    if (!iso.includes('T') && iso.includes(' ')) {
      iso = iso.replace(' ', 'T') + 'Z';
    }
    const dataConclusao = new Date(iso);
    if (isNaN(dataConclusao.getTime())) return false;

    const diffMs = Date.now() - dataConclusao.getTime();
    const limiteMs = limiteHoras * 60 * 60 * 1000;
    
    // Deve ter sido entregue no passado (diffMs >= 0) e há no máximo 1h (limiteMs)
    return diffMs >= 0 && diffMs <= limiteMs;
  } catch {
    return false;
  }
}

/**
 * Verifica se existe algum pedido elegível concluído recentemente para exibir a avaliação
 */
export async function buscarPedidoElegivelParaAvaliacao() {
  const tokens = obterPedidosSessao();
  if (!tokens || tokens.length === 0) return null;

  for (const token of tokens) {
    if (foiAvaliacaoExibida(token)) continue;

    try {
      const res = await fetch(`/api/pedidos/${token}`);
      if (!res.ok) continue;

      const pedido = await res.json();
      if (!pedido) continue;

      // Regra 1: O pedido precisa estar com status ENTREGUE / FINALIZADO
      if (pedido.status === 'entregue') {
        // Regra 2: Concluído dentro da última 1 hora
        const dataReferencia = pedido.entregue_em || pedido.criado_em;
        if (foiConcluidoNasUltimasHoras(dataReferencia, 1)) {
          return pedido;
        }
      }
    } catch (err) {
      // Falhas de rede ou backend não devem interromper o uso normal do cardápio
      console.warn('Verificação de avaliação falhou silenciosamente:', err);
    }
  }

  return null;
}
