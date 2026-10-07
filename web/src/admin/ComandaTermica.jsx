import React from 'react';
import { Printer, X, Check, Scissors, AlertCircle, FileText } from 'lucide-react';
import { formatarPreco } from '../compartilhado/formatadores';

/**
 * Utilitário para disparar impressão automática silenciosa via iframe
 * 100% Preto e Branco Puro para bobinas térmicas de 80mm e 58mm
 */
export async function dispararImpressaoAutomatica(pedido, opcoes = {}) {
  const largura = opcoes.largura || localStorage.getItem('bulls_largura_comanda') || '80mm';
  const vias = opcoes.vias || Number(localStorage.getItem('bulls_vias_comanda') || 1);

  // 1. Tentar acionar o backend ESC/POS (caso haja impressora de rede configurada)
  try {
    const token = localStorage.getItem('bulls_admin_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    fetch(`/api/admin/pedidos/${pedido.id}/imprimir`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ largura, via: 'COZINHA', ipImpressora: opcoes.ipImpressora })
    }).catch(() => {});
  } catch {}

  // 2. Disparar impressão do navegador via iframe invisível (ideal com --kiosk-printing)
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';

  document.body.appendChild(iframe);

  const html = gerarHtmlComanda(pedido, largura, vias);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow.focus();
  setTimeout(() => {
    try {
      iframe.contentWindow.print();
    } catch (err) {
      console.warn('Impressão automática:', err);
    }
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 250);
}

/**
 * Gera o documento HTML especializado para impressão em bobina térmica de 58mm ou 80mm
 * 100% PRETO E BRANCO PURO (MONOCROMÁTICO DE ALTO CONTRASTE TÉRMICO)
 */
export function gerarHtmlComanda(pedido, largura = '80mm', vias = 1) {
  const larguraMm = largura === '58mm' ? '50mm' : '76mm';
  const fontSize = largura === '58mm' ? '11px' : '13px';
  const itens = pedido.itens || [];

  const dataHora = pedido.criado_em 
    ? new Date(pedido.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) 
    : new Date().toLocaleString('pt-BR');

  let viasHtml = '';

  for (let v = 1; v <= vias; v++) {
    const nomeVia = v === 1 ? 'COZINHA / PRODUÇÃO' : 'ENTREGA / MOTOBOY';
    viasHtml += `
      <div class="comanda-via">
        <div class="border-top-double"></div>
        <div class="center bold title">TRAILER 94 — FOZ DO IGUAÇU</div>
        <div class="center small font-mono">Hamburgueria & Cardápio Digital</div>
        <div class="center small font-mono">Foz do Iguaçu - PR</div>
        <div class="center small font-mono">WhatsApp: (45) 99999-9494</div>
        <div class="border-top-double"></div>
        
        <div class="center bold fiscal-alert">DOCUMENTO AUXILIAR DE VENDA (NÃO FISCAL)</div>
        <div class="center bold via-header">*** VIA ${v} — ${nomeVia} ***</div>
        <div class="divider"></div>

        <div class="center bold order-code">${pedido.codigo || `#T94-${pedido.id}`}</div>
        <div class="center small font-mono">EMISSÃO: ${dataHora}</div>
        <div class="divider"></div>

        <div class="section-title">IDENTIFICAÇÃO DO DESTINATÁRIO</div>
        <div class="bold">${(pedido.cliente_nome || 'Cliente Final').toUpperCase()}</div>
        <div class="font-mono">FONE: ${pedido.cliente_telefone || 'Não informado'}</div>
        ${pedido.cliente_endereco ? `
          <div class="mt-1 bold">ENDEREÇO DE ENTREGA:</div>
          <div>${pedido.cliente_endereco}</div>
          ${pedido.complemento ? `<div>COMPL: ${pedido.complemento}</div>` : ''}
          ${pedido.referencia ? `<div>REF: ${pedido.referencia}</div>` : ''}
        ` : `
          <div class="mt-1 bold center">*** RETIRADA NO BALCÃO ***</div>
        `}
        <div class="divider"></div>

        <div class="section-title">DISCRIMINAÇÃO DOS ITENS</div>
        <table class="table-itens">
          <thead>
            <tr class="header-table">
              <th align="left" style="width: 75%;">[QTD] DESCRIÇÃO</th>
              <th align="right" style="width: 25%;">TOTAL (R$)</th>
            </tr>
          </thead>
          <tbody>
            ${itens.map(it => {
              const qtd = it.quantidade || 1;
              const precoUnit = it.preco_unitario || it.preco || 0;
              const sub = formatarPreco(precoUnit * qtd);
              return `
                <tr class="item-linha">
                  <td class="bold item-nome">${qtd}x ${(it.nome_produto || it.nome || 'Lanche').toUpperCase()}</td>
                  <td align="right" class="bold">${sub}</td>
                </tr>
                ${it.opcionais && it.opcionais.length > 0 ? `
                  <tr>
                    <td colspan="2" class="opcionais-cell">
                      ${it.opcionais.map(op => `• ${(op.nome_opcional || op.nome || '').toUpperCase()}${op.preco_adicional > 0 ? ` (+${formatarPreco(op.preco_adicional)})` : ''}`).join('<br/>')}
                    </td>
                  </tr>
                ` : ''}
                ${it.observacoes ? `
                  <tr>
                    <td colspan="2" class="obs-item bold">OBS ITEM: ${it.observacoes.toUpperCase()}</td>
                  </tr>
                ` : ''}
              `;
            }).join('')}
          </tbody>
        </table>

        ${pedido.observacoes ? `
          <div class="divider"></div>
          <div class="bold">OBSERVAÇÕES DO PEDIDO:</div>
          <div class="obs-box">${pedido.observacoes.toUpperCase()}</div>
        ` : ''}

        <div class="divider"></div>
        <table class="table-totais">
          ${pedido.subtotal ? `
            <tr>
              <td>Subtotal dos Itens:</td>
              <td align="right" class="font-mono">${formatarPreco(pedido.subtotal)}</td>
            </tr>
          ` : ''}
          ${pedido.taxa_entrega > 0 ? `
            <tr>
              <td>Taxa de Entrega:</td>
              <td align="right" class="font-mono">${formatarPreco(pedido.taxa_entrega)}</td>
            </tr>
          ` : `
            <tr>
              <td>Taxa de Entrega:</td>
              <td align="right" class="font-mono bold">GRÁTIS (R$ 0,00)</td>
            </tr>
          `}
          ${pedido.desconto > 0 ? `
            <tr>
              <td>Desconto Aplicado:</td>
              <td align="right" class="font-mono bold">- ${formatarPreco(pedido.desconto)}</td>
            </tr>
          ` : ''}
          <tr class="total-row">
            <td class="bold font-large">TOTAL A PAGAR:</td>
            <td align="right" class="bold font-large">${formatarPreco(pedido.total || 0)}</td>
          </tr>
          <tr>
            <td colspan="2" class="bold mt-1">FORMA PAGTO: ${(pedido.forma_pagamento || 'pix').toUpperCase()}</td>
          </tr>
          ${pedido.troco_para ? `
            <tr>
              <td colspan="2" class="font-mono">Troco para: ${formatarPreco(pedido.troco_para)} (Troco: ${formatarPreco(pedido.troco_para - pedido.total)})</td>
            </tr>
          ` : ''}
        </table>

        <div class="border-top-double mt-2"></div>
        <div class="center small footer font-mono">
          CONTROLE DE EXPEDIÇÃO E COZINHA<br/>
          OBRIGADO PELA PREFERÊNCIA!<br/>
          www.bullsburger.com.br
        </div>
        <div class="border-top-double mt-1"></div>
        <div class="cut-line">-- - - - - - - - - - [ CORTE DA BOBINA ] - - - - - - - - - --</div>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Comanda ${pedido.codigo || pedido.id}</title>
      <style>
        @page {
          margin: 0;
          size: ${larguraMm} auto;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          margin: 0;
          padding: 8px 6px;
          width: ${larguraMm};
          font-family: 'Courier New', Courier, Consolas, Monaco, monospace;
          font-size: ${fontSize};
          line-height: 1.25;
          color: #000000 !important;
          background: #ffffff !important;
        }
        .center { text-align: center; }
        .bold { font-weight: 900; }
        .small { font-size: 0.88em; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        .title { font-size: 1.35em; letter-spacing: 0.5px; margin-bottom: 2px; }
        .fiscal-alert { font-size: 0.78em; margin: 4px 0 2px 0; }
        .via-header { font-size: 0.95em; margin: 2px 0; }
        .order-code { font-size: 1.9em; margin: 4px 0; letter-spacing: 1px; }
        .font-large { font-size: 1.25em; }
        .divider { border-top: 1px dashed #000000; margin: 6px 0; }
        .border-top-double { border-top: 2px solid #000000; margin: 6px 0; }
        .section-title { font-size: 0.88em; font-weight: 900; margin-bottom: 3px; text-decoration: underline; }
        .mt-1 { margin-top: 4px; }
        .mt-2 { margin-top: 8px; }
        .table-itens, .table-totais { width: 100%; border-collapse: collapse; }
        .header-table th { border-bottom: 1px solid #000000; padding: 3px 0; font-size: 0.88em; }
        .item-linha td { padding: 3px 0 1px 0; }
        .opcionais-cell { font-size: 0.88em; padding-left: 10px !important; padding-bottom: 3px; }
        .obs-item { font-size: 0.85em; padding-left: 10px !important; }
        .obs-box { border: 1.5px solid #000000; padding: 4px; margin-top: 3px; font-size: 0.95em; font-weight: bold; }
        .total-row td { padding: 5px 0; font-size: 1.2em; border-top: 1px dashed #000000; border-bottom: 1px dashed #000000; }
        .footer { margin-top: 6px; }
        .cut-line { text-align: center; font-size: 0.72em; margin-top: 12px; margin-bottom: 16px; }
        .comanda-via { page-break-after: always; }
        
        @media print {
          body {
            color: #000000 !important;
            background: #ffffff !important;
          }
          * {
            color: #000000 !important;
            text-shadow: none !important;
            box-shadow: none !important;
          }
        }
      </style>
    </head>
    <body>
      ${viasHtml}
    </body>
    </html>
  `;
}

/**
 * Modal Interativo de Visualização e Impressão de Comanda no KDS
 * 100% PRETO E BRANCO PURO
 */
export function ModalComandaTermica({ pedido, onFechar }) {
  const [largura, setLargura] = React.useState(localStorage.getItem('bulls_largura_comanda') || '80mm');
  const [vias, setVias] = React.useState(Number(localStorage.getItem('bulls_vias_comanda') || 1));

  if (!pedido) return null;

  function handleImprimir() {
    dispararImpressaoAutomatica(pedido, { largura, vias });
    onFechar();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border-2 border-slate-700 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo do Modal */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white text-black flex items-center justify-center font-black shadow">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Comanda Térmica B&W (Nota Delivery)</h3>
              <p className="text-xs text-amber-400 font-bold">{pedido.codigo || `#BB-${pedido.id}`}</p>
            </div>
          </div>

          <button 
            onClick={onFechar}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controles de Configuração de Impressão */}
        <div className="p-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap gap-3 items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Largura:</span>
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => {
                  setLargura('80mm');
                  localStorage.setItem('bulls_largura_comanda', '80mm');
                }}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  largura === '80mm' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                80mm (Padrão)
              </button>
              <button
                onClick={() => {
                  setLargura('58mm');
                  localStorage.setItem('bulls_largura_comanda', '58mm');
                }}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  largura === '58mm' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                58mm (Mini)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-semibold">Vias:</span>
            <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
              <button
                onClick={() => {
                  setVias(1);
                  localStorage.setItem('bulls_vias_comanda', 1);
                }}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  vias === 1 ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                1 Via
              </button>
              <button
                onClick={() => {
                  setVias(2);
                  localStorage.setItem('bulls_vias_comanda', 2);
                }}
                className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                  vias === 2 ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                2 Vias
              </button>
            </div>
          </div>
        </div>

        {/* Pré-visualização da Bobina Térmica em Preto e Branco Puro */}
        <div className="p-4 flex-1 overflow-y-auto bg-slate-950/80 flex justify-center">
          <div 
            className="bg-white text-black p-4 rounded-xl shadow-2xl font-mono text-xs border-2 border-slate-300 select-none"
            style={{ width: largura === '58mm' ? '250px' : '320px' }}
            dangerouslySetInnerHTML={{ __html: gerarHtmlComanda(pedido, largura, vias) }}
          />
        </div>

        {/* Rodapé com Botão de Impressão */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button 
            onClick={onFechar}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-bold"
          >
            Fechar
          </button>

          <button 
            onClick={handleImprimir}
            className="flex-1 py-3 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Imprimir Preto & Branco ({vias} {vias === 1 ? 'Via' : 'Vias'})</span>
          </button>
        </div>
      </div>
    </div>
  );
}
