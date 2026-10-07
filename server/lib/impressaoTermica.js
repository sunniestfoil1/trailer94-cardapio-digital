import net from 'node:net';

// Comandos padrão de protocolo ESC/POS (compatível com Epson, Elgin, Bematech, Daruma, Sunmi, etc.)
const ESC = '\x1b';
const GS = '\x1d';

export const COMANDOS = {
  RESET: `${ESC}@`,
  ALINHAR_ESQUERDA: `${ESC}a\x00`,
  ALINHAR_CENTRO: `${ESC}a\x01`,
  ALINHAR_DIREITA: `${ESC}a\x02`,
  NEGRITO_ON: `${ESC}E\x01`,
  NEGRITO_OFF: `${ESC}E\x00`,
  TEXTO_DUPLO: `${GS}!\x11`, // Largura e Altura duplas
  TEXTO_ALTURA_DUPLA: `${GS}!\x01`,
  TEXTO_NORMAL: `${GS}!\x00`,
  CORTAR_PAPEL: `${GS}V\x42\x00`, // Feed and cut
  BIP_BUZZER: `${ESC}B\x02\x02`, // Aciona o buzzer da impressora
  PULAR_LINHAS: (n = 3) => `${ESC}d${String.fromCharCode(n)}`
};

/**
 * Formata valor em centavos para moeda brasileira R$ 0,00
 */
function formatarMoeda(centavos = 0) {
  return `R$ ${(centavos / 100).toFixed(2).replace('.', ',')}`;
}

/**
 * Quebra ou preenche uma linha com 2 colunas (esquerda e direita)
 */
function linhaColunas(colEsq, colDir, largura = 48) {
  const espacos = Math.max(1, largura - colEsq.length - colDir.length);
  return colEsq + ' '.repeat(espacos) + colDir + '\n';
}

/**
 * Gera o Buffer bruto ESC/POS para impressão de comanda térmica
 * @param {object} pedido - Dados completos do pedido
 * @param {string} largura - '80mm' (48 cols) ou '58mm' (32 cols)
 * @param {string} via - 'COZINHA' | 'ENTREGA' | 'CLIENTE'
 */
export function gerarBufferComanda(pedido, largura = '80mm', via = 'COZINHA') {
  const numColunas = largura === '58mm' ? 32 : 48;
  const divisor = '-'.repeat(numColunas) + '\n';
  const divisorDuplo = '='.repeat(numColunas) + '\n';

  let raw = '';

  // 1. Inicialização e Aviso Sonoro
  raw += COMANDOS.RESET;
  raw += COMANDOS.BIP_BUZZER;

  // 2. Cabeçalho Centralizado
  raw += COMANDOS.ALINHAR_CENTRO;
  raw += COMANDOS.NEGRITO_ON;
  raw += 'BULLS BURGER CASCAVEL\n';
  raw += COMANDOS.TEXTO_NORMAL;
  raw += 'WhatsApp: (45) 98818-4380\n';
  raw += COMANDOS.ALINHAR_CENTRO;
  raw += `*** VIA DE ${via} ***\n`;
  raw += divisorDuplo;

  // 3. Código do Pedido em Destaque Gigante
  raw += COMANDOS.ALINHAR_CENTRO;
  raw += COMANDOS.TEXTO_DUPLO;
  raw += `${pedido.codigo || `#BB-${pedido.id}`}\n`;
  raw += COMANDOS.TEXTO_NORMAL;

  const dataFormatada = pedido.criado_em 
    ? new Date(pedido.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) 
    : new Date().toLocaleString('pt-BR');
  raw += `Data: ${dataFormatada}\n`;
  raw += divisor;

  // 4. Dados do Cliente e Entrega
  raw += COMANDOS.ALINHAR_ESQUERDA;
  raw += COMANDOS.NEGRITO_ON;
  raw += `CLIENTE: ${pedido.cliente_nome || 'Cliente'}\n`;
  if (pedido.cliente_telefone) {
    raw += `FONE: ${pedido.cliente_telefone}\n`;
  }
  raw += COMANDOS.NEGRITO_OFF;

  if (pedido.cliente_endereco) {
    raw += COMANDOS.NEGRITO_ON;
    raw += `ENDEREÇO:\n`;
    raw += COMANDOS.NEGRITO_OFF;
    raw += `${pedido.cliente_endereco}\n`;
    if (pedido.complemento) raw += `Compl: ${pedido.complemento}\n`;
    if (pedido.referencia) raw += `Ref: ${pedido.referencia}\n`;
  } else {
    raw += `*** RETIRADA NO BALCÃO ***\n`;
  }
  raw += divisor;

  // 5. Itens do Pedido
  raw += COMANDOS.ALINHAR_ESQUERDA;
  raw += COMANDOS.NEGRITO_ON;
  raw += linhaColunas('QTD ITEM', 'VALOR', numColunas);
  raw += COMANDOS.NEGRITO_OFF;
  raw += divisor;

  const itens = pedido.itens || [];
  for (const item of itens) {
    const qtd = item.quantidade || 1;
    const nome = item.nome_produto || item.nome || 'Produto';
    const preco = formatarMoeda((item.preco_unitario || item.preco || 0) * qtd);

    raw += COMANDOS.NEGRITO_ON;
    raw += linhaColunas(`${qtd}x ${nome}`, preco, numColunas);
    raw += COMANDOS.NEGRITO_OFF;

    // Opcionais
    if (item.opcionais && item.opcionais.length > 0) {
      for (const op of item.opcionais) {
        const nomeOp = op.nome_opcional || op.nome || '';
        const precoOp = op.preco_adicional > 0 ? ` (+${formatarMoeda(op.preco_adicional)})` : '';
        raw += `   + ${nomeOp}${precoOp}\n`;
      }
    }

    // Observação do item
    if (item.observacoes) {
      raw += COMANDOS.NEGRITO_ON;
      raw += `   OBS: ${item.observacoes.toUpperCase()}\n`;
      raw += COMANDOS.NEGRITO_OFF;
    }
  }

  // Observações gerais do pedido
  if (pedido.observacoes) {
    raw += divisor;
    raw += COMANDOS.NEGRITO_ON;
    raw += `OBSERVAÇÕES DO PEDIDO:\n`;
    raw += COMANDOS.TEXTO_NORMAL;
    raw += `${pedido.observacoes.toUpperCase()}\n`;
  }

  raw += divisor;

  // 6. Totais e Pagamento
  raw += COMANDOS.ALINHAR_ESQUERDA;
  if (pedido.subtotal) {
    raw += linhaColunas('Subtotal:', formatarMoeda(pedido.subtotal), numColunas);
  }
  if (pedido.taxa_entrega > 0) {
    raw += linhaColunas('Taxa de Entrega:', formatarMoeda(pedido.taxa_entrega), numColunas);
  }

  raw += COMANDOS.NEGRITO_ON;
  raw += COMANDOS.TEXTO_ALTURA_DUPLA;
  raw += linhaColunas('TOTAL:', formatarMoeda(pedido.total || 0), numColunas);
  raw += COMANDOS.TEXTO_NORMAL;

  const forma = (pedido.forma_pagamento || 'pix').toUpperCase();
  raw += `Pagamento: ${forma}\n`;

  if (pedido.troco_para) {
    const valorTroco = (pedido.troco_para - pedido.total);
    raw += `Troco para: ${formatarMoeda(pedido.troco_para)} (Troco: ${formatarMoeda(valorTroco)})\n`;
  }

  raw += divisorDuplo;

  // 7. Rodapé e Corte de Papel
  raw += COMANDOS.ALINHAR_CENTRO;
  raw += 'Agradecemos a preferência!\n';
  raw += 'www.bullsburger.com.br\n';
  raw += COMANDOS.PULAR_LINHAS(4);
  raw += COMANDOS.CORTAR_PAPEL;

  // Converter para Buffer binário
  return Buffer.from(raw, 'binary');
}

/**
 * Envia comando ESC/POS diretamente para impressora de rede (TCP/IP porta 9100)
 */
export function enviarParaImpressoraRede(ip, porta = 9100, buffer) {
  return new Promise((resolve, reject) => {
    if (!ip) {
      return reject(new Error('IP da impressora não configurado.'));
    }

    const socket = new net.Socket();
    socket.setTimeout(4000); // 4 segundos de timeout

    socket.connect(porta, ip, () => {
      socket.write(buffer, () => {
        socket.end();
        resolve({ sucesso: true, mensagem: `Comanda enviada para impressora ${ip}:${porta}` });
      });
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`Timeout ao conectar na impressora ${ip}:${porta}`));
    });

    socket.on('error', (err) => {
      socket.destroy();
      reject(new Error(`Falha de comunicação com a impressora ${ip}:${porta} — ${err.message}`));
    });
  });
}
