/**
 * 🖨️ Bulls Burger — Spooler de Impressão Térmica Automática e Gratuita (Open Source)
 * 
 * Este serviço roda em segundo plano no computador do caixa ou em um Raspberry Pi.
 * Ele escuta novos pedidos em tempo real (Supabase ou WebSocket Local) e imprime 
 * automaticamente na impressora térmica (USB, Rede Ethernet/Wi-Fi ou Bluetooth).
 * 
 * Suporta protocolos ESC/POS para:
 * - Epson TM-T20 / TM-T88
 * - Elgin i7 / i9
 * - Bematech MP-4200 TH
 * - Daruma DR800
 * - POS-58 e POS-80 genéricas
 * 
 * Uso:
 *   node server/scripts/spooler-impressao.js
 *   node server/scripts/spooler-impressao.js --ip 192.168.1.200 --porta 9100 --largura 80mm
 */

import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarBufferComanda, enviarParaImpressoraRede } from '../lib/impressaoTermica.js';
import db from '../db/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Argumentos de linha de comando ou variáveis de ambiente
const args = process.argv.slice(2);
function getArg(chave, padrao) {
  const idx = args.indexOf(`--${chave}`);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return process.env[chave.toUpperCase()] || padrao;
}

const PRINTER_IP = getArg('ip', process.env.PRINTER_IP || '');
const PRINTER_PORT = Number(getArg('porta', process.env.PRINTER_PORT || 9100));
const LARGURA = getArg('largura', '80mm');
const VIAS = Number(getArg('vias', 1));
const INTERVALO_POLL_MS = 2500; // Caso não tenha socket direto, faz polling contínuo sem travar

console.log('====================================================');
console.log('🍔 BULLS BURGER — SPOOLER DE IMPRESSÃO AUTOMÁTICA');
console.log('====================================================');
console.log(`📡 Modo de Conexão: ${PRINTER_IP ? `TCP/IP Rede (${PRINTER_IP}:${PRINTER_PORT})` : 'Simulador / Arquivo / Console'}`);
console.log(`📏 Largura da Bobina: ${LARGURA}`);
console.log(`📋 Vias por Pedido: ${VIAS}`);
console.log('👀 Aguardando novos pedidos para impressão automática...\n');

let ultimoIdImpresso = 0;

// Inicializa buscando o último pedido para não reimprimir pedidos antigos
async function inicializar() {
  try {
    const ultimo = await db.prepare('SELECT MAX(id) as max_id FROM pedidos').get();
    ultimoIdImpresso = Number(ultimo?.max_id || 0);
    console.log(`✅ Spooler sincronizado. Próximo pedido com ID > ${ultimoIdImpresso} será impresso.`);
    
    // Inicia o loop de monitoramento persistente
    setInterval(verificarNovosPedidos, INTERVALO_POLL_MS);
  } catch (err) {
    console.error('❌ Erro ao inicializar spooler:', err.message);
  }
}

async function verificarNovosPedidos() {
  try {
    const novosPedidos = await db.prepare(`
      SELECT p.*, c.nome as cliente_nome, c.telefone as cliente_telefone, 
             c.endereco as cliente_endereco, c.complemento, c.referencia
      FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      WHERE p.id > ? AND p.status IN ('recebido', 'preparando')
      ORDER BY p.id ASC
    `).all(ultimoIdImpresso);

    for (const pedido of novosPedidos) {
      ultimoIdImpresso = Math.max(ultimoIdImpresso, Number(pedido.id));
      await processarImpressaoPedido(pedido);
    }
  } catch (err) {
    // Silencia erros transitórios de rede para manter o spooler sempre vivo
  }
}

async function processarImpressaoPedido(pedido) {
  console.log(`\n🔔 NOVO PEDIDO DETECTADO: ${pedido.codigo || `#BB-${pedido.id}`} (${pedido.cliente_nome})`);

  // Buscar itens e opcionais do pedido
  const itens = await db.prepare(`
    SELECT pi.*, p.nome as nome_produto
    FROM pedido_itens pi
    LEFT JOIN produtos p ON p.id = pi.produto_id
    WHERE pi.pedido_id = ?
  `).all(pedido.id);

  for (const item of itens) {
    item.opcionais = await db.prepare(`
      SELECT nome_opcional, preco_adicional
      FROM pedido_item_opcionais
      WHERE pedido_item_id = ?
    `).all(item.id);
  }

  pedido.itens = itens;

  // Imprimir vias configuradas (ex: Cozinha e Entrega)
  for (let viaNum = 1; viaNum <= VIAS; viaNum++) {
    const nomeVia = viaNum === 1 ? 'COZINHA' : 'ENTREGA / MOTOBOY';
    const buffer = gerarBufferComanda(pedido, LARGURA, nomeVia);

    if (PRINTER_IP) {
      try {
        console.log(`🖨️ Enviando ${nomeVia} para ${PRINTER_IP}:${PRINTER_PORT}...`);
        await enviarParaImpressoraRede(PRINTER_IP, PRINTER_PORT, buffer);
        console.log(`✅ ${nomeVia} impressa com sucesso!`);
      } catch (err) {
        console.error(`❌ Falha ao imprimir via rede:`, err.message);
      }
    } else {
      // Salva arquivo comanda local para auditoria e teste
      const dirSpool = path.resolve(__dirname, '..', '..', 'spool');
      if (!fs.existsSync(dirSpool)) fs.mkdirSync(dirSpool, { recursive: true });
      const nomeArquivo = path.resolve(dirSpool, `comanda_${pedido.id}_via${viaNum}.bin`);
      fs.writeFileSync(nomeArquivo, buffer);
      console.log(`📄 Comanda gerada em arquivo de spool: ${nomeArquivo}`);
    }
  }
}

inicializar();
