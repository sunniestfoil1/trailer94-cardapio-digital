import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { CategoriaTabs } from './CategoriaTabs';
import { CardProduto } from './CardProduto';
import { ModalProduto } from './ModalProduto';
import { BotaoSacolaFlutuante } from './BotaoSacolaFlutuante';
import { GavetaCarrinho } from './GavetaCarrinho';
import { CheckoutModal } from './CheckoutModal';
import { AcompanhamentoPedido } from './AcompanhamentoPedido';
import { RaspadinhaSorte } from './RaspadinhaSorte';
import { ModalAvaliacaoGoogle } from './ModalAvaliacaoGoogle';
import { Flame, RefreshCw, Gift } from 'lucide-react';
import { EMPRESA_CONFIG } from '../empresa.config';
import { 
  registrarPedidoSessao, 
  buscarPedidoElegivelParaAvaliacao, 
  marcarAvaliacaoComoExibida 
} from '../compartilhado/avaliacaoHelper';

function InstagramIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

export function LojaPage({ initialPedidoId = null }) {
  const [infoLoja, setInfoLoja] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [destaques, setDestaques] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  const [checkoutAberto, setCheckoutAberto] = useState(false);
  const [pedidoAcompanhandoId, setPedidoAcompanhandoId] = useState(initialPedidoId);
  const [raspadinhaAberta, setRaspadinhaAberta] = useState(false);
  const [cupomAtivo, setCupomAtivo] = useState(null);

  // Controle do Modal de Avaliação no Google
  const [pedidoElegivelAvaliacao, setPedidoElegivelAvaliacao] = useState(null);
  const [modalAvaliacaoExibido, setModalAvaliacaoExibido] = useState(false);

  useEffect(() => {
    if (initialPedidoId) {
      setPedidoAcompanhandoId(initialPedidoId);
      registrarPedidoSessao(initialPedidoId);
    }
  }, [initialPedidoId]);

  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/\/pedido\/([a-f0-9]+)/i);
      const idEncontrado = match ? match[1] : null;
      setPedidoAcompanhandoId(idEncontrado);
      if (idEncontrado) {
        registrarPedidoSessao(idEncontrado);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Checagem automática de pedidos concluídos nas últimas 1h para solicitação neutra de avaliação no Google
  useEffect(() => {
    if (!pedidoAcompanhandoId) {
      buscarPedidoElegivelParaAvaliacao()
        .then((pedido) => {
          if (pedido) {
            setPedidoElegivelAvaliacao(pedido);
            setModalAvaliacaoExibido(true);
          }
        })
        .catch((err) => {
          console.warn('Falha silenciosa na consulta de avaliação:', err);
        });
    }
  }, [pedidoAcompanhandoId]);

  useEffect(() => {
    async function carregarDados() {
      try {
        const [resCardapio, resInfo] = await Promise.all([
          fetch('/api/cardapio'),
          fetch('/api/loja/info')
        ]);

        if (resCardapio.ok && resInfo.ok) {
          const cardapioData = await resCardapio.json();
          const infoData = await resInfo.json();

          setCategorias(cardapioData.categorias || []);
          setDestaques(cardapioData.destaques || []);
          setInfoLoja(infoData);
          if (cardapioData.categorias?.length > 0) {
            setCategoriaAtiva(cardapioData.categorias[0].id);
          }
        }
      } catch (err) {
        console.error('Falha ao carregar cardápio:', err);
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, []);

  function handleSelecionarCategoria(catId) {
    setCategoriaAtiva(catId);
    const elemento = document.getElementById(`cat-${catId}`);
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  if (pedidoAcompanhandoId) {
    return (
      <AcompanhamentoPedido 
        pedidoId={pedidoAcompanhandoId} 
        onVoltarLoja={() => {
          window.history.pushState(null, '', '/');
          setPedidoAcompanhandoId(null);
        }} 
      />
    );
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 text-white">
        <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mb-4" />
        <p className="font-bold text-base">Preparando o cardápio do Trailer 94...</p>
      </div>
    );
  }

  // Filtragem pela busca
  const categoriasFiltradas = categorias.map(cat => ({
    ...cat,
    produtos: cat.produtos.filter(p => {
      if (!busca.trim()) return true;
      const termo = busca.toLowerCase();
      return (
        p.nome.toLowerCase().includes(termo) ||
        (p.descricao && p.descricao.toLowerCase().includes(termo)) ||
        (p.ingredientes && p.ingredientes.toLowerCase().includes(termo))
      );
    })
  })).filter(cat => cat.produtos.length > 0);

  return (
    <div 
      className="min-h-screen pb-28 text-slate-100 relative bg-[#0a0d14]"
      style={{
        backgroundImage: "url('/imagens/origem/instagram/269.jpg')",
        backgroundRepeat: 'repeat',
        backgroundSize: '420px',
      }}
    >
      {/* Overlay sutil para garantir legibilidade de alto contraste sobre o pattern */}
      <div className="absolute inset-0 bg-slate-950/75 pointer-events-none" />

      {/* Conteúdo da Loja */}
      <div className="relative z-10">
        {/* Topo / Header */}
        <Header infoLoja={infoLoja} busca={busca} setBusca={setBusca} />

        {/* Navegação Sticky de Categorias */}
        {!busca && (
          <CategoriaTabs 
            categorias={categorias} 
            categoriaAtiva={categoriaAtiva} 
            onSelecionarCategoria={handleSelecionarCategoria} 
          />
        )}

        {/* Conteúdo Principal */}
        <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
          {/* Banner de Destaques / Mais Pedidos (apenas se não houver busca ativa) */}
          {!busca && destaques.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-400">
                  <Flame className="w-5 h-5 fill-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Mais Pedidos do Trailer 94
                  </h2>
                  <div className="h-1 w-16 bg-amber-400 rounded-full mt-1"></div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {destaques.slice(0, 4).map((produto) => (
                  <CardProduto 
                    key={`destaque-${produto.id}`}
                    produto={produto}
                    onAbrirDetalhes={(p) => setProdutoSelecionado(p)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Seções por Categoria */}
          {categoriasFiltradas.length === 0 ? (
            <div className="bg-slate-900/90 rounded-2xl p-8 text-center text-slate-400 border-2 border-slate-800 shadow-xl">
              <p className="font-bold text-lg text-white">Nenhum produto encontrado</p>
              <p className="text-sm text-slate-400 mt-1">Tente pesquisar por outro termo ou ingrediente.</p>
            </div>
          ) : (
            categoriasFiltradas.map((cat) => (
              <section key={cat.id} id={`cat-${cat.id}`} className="space-y-4 scroll-mt-20">
                <div className="border-b-2 border-slate-800/90 pb-2.5 flex items-baseline justify-between">
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-white tracking-wide">
                      {cat.nome}
                    </h2>
                    <div className="h-1 w-12 bg-amber-400 rounded-full mt-1.5"></div>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">
                    {cat.produtos.length} {cat.produtos.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cat.produtos.map((produto) => (
                    <CardProduto 
                      key={produto.id}
                      produto={produto}
                      onAbrirDetalhes={(p) => setProdutoSelecionado(p)}
                    />
                  ))}
                </div>
              </section>
            ))
          )}

          {/* Seção Instagram @trailer94_ Decorada como um Hambúrguer (Tampa + Recheio + Base) */}
          <section className="mt-14 mb-8 max-w-[340px] mx-auto px-2 relative flex flex-col items-center">
            {/* Pão de Cima (Tampa - On Top) */}
            <div className="w-full flex justify-center -mb-14 z-20 relative pointer-events-none">
              <img 
                src="/far-tampa.webp" 
                alt="Pão de Cima" 
                className="w-full object-contain filter drop-shadow-2xl scale-105"
              />
            </div>

            {/* Recheio / Card do Instagram */}
            <div className="w-full bg-slate-900/95 border-2 border-amber-400/50 rounded-3xl p-4 text-center shadow-2xl backdrop-blur-md relative z-10 pt-16 pb-16">
              <p className="text-xs text-amber-300 font-bold mb-4 leading-relaxed">
                Acompanhe nossas novidades, fotos dos lanches e promoções exclusivas!
              </p>

              <a 
                href="https://www.instagram.com/trailer94_/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 shadow-inner hover:border-amber-400/60 transition-all">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
                        <img src="/logo.jpg" alt="@trailer94_" className="w-full h-full object-cover rounded-full" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-black text-white block group-hover:text-amber-400 transition-colors">@trailer94_</span>
                        <span className="text-[10px] text-slate-400 font-medium">Instagram Oficial</span>
                      </div>
                    </div>
                    <InstagramIcon className="w-5 h-5 text-amber-400" />
                  </div>

                  {/* Grid Visual de Fotos dos Lanches do Instagram */}
                  <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                    <img src="/imagens/produtos/trailer94/anota_prod_1.jpg" alt="Trailer 94 1" className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                    <img src="/imagens/produtos/trailer94/anota_prod_2.jpg" alt="Trailer 94 2" className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                    <img src="/imagens/produtos/trailer94/anota_prod_3.jpg" alt="Trailer 94 3" className="w-full h-20 object-cover group-hover:scale-105 transition-transform" />
                  </div>
                </div>
              </a>
            </div>

            {/* Pão de Baixo (Base - On Bottom) */}
            <div className="w-full flex justify-center -mt-14 z-20 relative pointer-events-none">
              <img 
                src="/far-base.webp" 
                alt="Pão de Baixo" 
                className="w-full object-contain filter drop-shadow-2xl scale-105"
              />
            </div>
          </section>
        </main>
      </div>

      {/* Modal de Detalhes do Produto Selecionado */}
      {produtoSelecionado && (
        <ModalProduto 
          produto={produtoSelecionado} 
          onClose={() => setProdutoSelecionado(null)} 
        />
      )}

      {/* Botão Flutuante da Raspadinha da Sorte */}
      <button
        onClick={() => setRaspadinhaAberta(true)}
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-slate-950 px-3.5 py-2.5 rounded-full shadow-2xl shadow-amber-500/40 border-2 border-white hover:scale-105 transition-transform active:scale-95 group cursor-pointer"
        title="Raspe e Ganhe seu Prêmio de Hoje!"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-600 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-600" />
        </span>
        <Gift className="w-4 h-4 text-slate-950 animate-bounce shrink-0" />
        <span className="font-black text-xs text-slate-950 tracking-tight">
          {cupomAtivo ? `Cupom: ${cupomAtivo.codigo}` : 'Raspadinha Trailer 94'}
        </span>
      </button>

      {/* Botão Flutuante da Sacola */}
      <BotaoSacolaFlutuante />

      {/* Gaveta Lateral da Sacola com Upsell Inteligente e Cupons */}
      <GavetaCarrinho 
        infoLoja={infoLoja}
        produtosDisponiveis={categorias.flatMap(c => c.produtos || [])}
        onIrParaCheckout={() => setCheckoutAberto(true)}
        onAbrirRaspadinha={() => setRaspadinhaAberta(true)}
        cupomAtivo={cupomAtivo}
        onAplicarCupom={(c) => setCupomAtivo(c)}
      />

      {/* Modal de Checkout */}
      {checkoutAberto && (
        <CheckoutModal 
          infoLoja={infoLoja}
          cupomAtivo={cupomAtivo}
          onClose={() => setCheckoutAberto(false)}
          onPedidoCriado={(id) => {
            setCheckoutAberto(false);
            window.history.pushState(null, '', `/pedido/${id}`);
            setPedidoAcompanhandoId(id);
          }}
        />
      )}

      {/* Modal Interativo da Raspadinha da Sorte */}
      {raspadinhaAberta && (
        <RaspadinhaSorte
          onFechar={() => setRaspadinhaAberta(false)}
          onAplicarCupom={(cod) => {
            // Aplica instantaneamente o cupom sorteado
            if (cod === 'TRAILER10' || cod === 'BULLS10') {
              setCupomAtivo({
                codigo: 'TRAILER10',
                desconto: 1000,
                tipo: 'valor_fixo',
                descricao: 'R$ 10,00 OFF'
              });
            } else if (cod === 'FRETEFREE') {
              setCupomAtivo({
                codigo: 'FRETEFREE',
                desconto: 0,
                tipo: 'frete_gratis',
                descricao: 'Frete Grátis'
              });
            } else {
              setCupomAtivo({
                codigo: 'TRAILER5',
                desconto: 500,
                tipo: 'valor_fixo',
                descricao: 'R$ 5,00 OFF'
              });
            }
          }}
        />
      )}

      {/* Modal de Avaliação Neutra no Google (Para pedidos entregues nas últimas 1h) */}
      {modalAvaliacaoExibido && pedidoElegivelAvaliacao && (
        <ModalAvaliacaoGoogle 
          pedido={pedidoElegivelAvaliacao}
          onFechar={() => {
            marcarAvaliacaoComoExibida(pedidoElegivelAvaliacao.acesso_token || pedidoElegivelAvaliacao.codigo);
            setModalAvaliacaoExibido(false);
            setPedidoElegivelAvaliacao(null);
          }}
          onAvaliar={() => {
            marcarAvaliacaoComoExibida(pedidoElegivelAvaliacao.acesso_token || pedidoElegivelAvaliacao.codigo);
            setModalAvaliacaoExibido(false);
            setPedidoElegivelAvaliacao(null);
          }}
        />
      )}
    </div>
  );
}
