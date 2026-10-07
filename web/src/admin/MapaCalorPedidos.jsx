import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, Flame, DollarSign, Navigation, RefreshCw, 
  Layers, Info, Award, BarChart3, TrendingUp 
} from 'lucide-react';
import { formatarPreco } from '../compartilhado/formatadores';

export function MapaCalorPedidos() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const circlesLayerRef = useRef(null);

  const [periodo, setPeriodo] = useState('todos'); // 'hoje' | '15dias' | 'mes' | 'todos'
  const [dadosMapa, setDadosMapa] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [ruaFocada, setRuaFocada] = useState(null);

  // Inicializar o Mapa OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const mapa = L.map(mapContainerRef.current, {
        center: [-25.5167, -54.5833], // Foz do Iguaçu - PR
        zoom: 13,
        zoomControl: true,
        attributionControl: true
      });

      // TileLayer Esri Dark Gray (100% gratuito, sem chave de API, sem marcas d'água)
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
      }).addTo(mapa);

      circlesLayerRef.current = L.layerGroup().addTo(mapa);
      mapInstanceRef.current = mapa;
    }

    return () => {
      // Cleanup ao desmontar
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Carregar dados da API
  async function carregarDados(periodoParam) {
    setCarregando(true);
    try {
      const p = periodoParam || periodo;
      const token = localStorage.getItem('bulls_admin_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const res = await fetch(`/api/admin/mapa-calor?periodo=${p}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDadosMapa(data);
        renderizarCirculosCalor(data);
      }
    } catch (err) {
      console.error('Falha ao carregar mapa de calor:', err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados(periodo);
  }, [periodo]);

  // Renderizar os Círculos de Calor proporcionais
  function renderizarCirculosCalor(data) {
    if (!mapInstanceRef.current || !circlesLayerRef.current) return;

    circlesLayerRef.current.clearLayers();

    if (!data.pontos || data.pontos.length === 0) return;

    const bounds = [];

    data.pontos.forEach((pt) => {
      if (!pt.lat || !pt.lng) return;

      bounds.push([pt.lat, pt.lng]);

      // Cor do calor baseada na densidade de pedidos
      let corBorda = '#f59e0b'; // Amarelo
      let corPreenchimento = '#fbbf24';
      if (pt.intensidade >= 0.7) {
        corBorda = '#dc2626'; // Vermelho forte
        corPreenchimento = '#ef4444';
      } else if (pt.intensidade >= 0.4) {
        corBorda = '#ea580c'; // Laranja
        corPreenchimento = '#f97316';
      }

      // Círculo térmico de raio de rua
      const circulo = L.circle([pt.lat, pt.lng], {
        radius: pt.raio_metros,
        color: corBorda,
        fillColor: corPreenchimento,
        fillOpacity: Math.min(0.65, 0.25 + pt.intensidade * 0.4),
        weight: 2
      });

      // Marcador central pequeno
      const centroMarker = L.circleMarker([pt.lat, pt.lng], {
        radius: 4,
        color: '#ffffff',
        fillColor: corBorda,
        fillOpacity: 1,
        weight: 2
      });

      // Conteúdo rico do Popup ao clicar no raio
      const popupHtml = `
        <div style="font-family: inherit; min-width: 200px; color: #0f172a;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="font-size: 14px;">🔥</span>
            <strong style="font-size: 13px; color: #0f172a;">${pt.rua}</strong>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            Bairro: <b>${pt.bairro}</b> • Cascavel - PR
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 8px; font-size: 11px; line-height: 1.5;">
            <div>📦 Total de Pedidos: <b>${pt.total_pedidos}</b></div>
            <div>💰 Faturamento Total: <b style="color: #b45309;">${formatarPreco(pt.valor_total)}</b></div>
            <div>🏷️ Ticket Médio: <b>${formatarPreco(pt.ticket_medio)}</b></div>
            <div>🎯 Raio de Área: <b>${pt.raio_metros}m</b></div>
          </div>
        </div>
      `;

      circulo.bindPopup(popupHtml);
      centroMarker.bindPopup(popupHtml);

      circlesLayerRef.current.addLayer(circulo);
      circlesLayerRef.current.addLayer(centroMarker);
    });

    if (bounds.length > 0) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }

  function focarPonto(pt) {
    setRuaFocada(pt.rua);
    if (mapInstanceRef.current && pt.lat && pt.lng) {
      mapInstanceRef.current.flyTo([pt.lat, pt.lng], 15, {
        duration: 1.2
      });
    }
  }

  const estatisticas = dadosMapa?.estatisticas || {};

  return (
    <div className="space-y-6">
      {/* Topo com título e seletor de período */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-400 text-slate-950">
              <Flame className="w-5 h-5 fill-slate-950" />
            </span>
            <span>Mapa de Calor de Pedidos — Cascavel</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Visualização de densidade e raio geográfico baseado nas coordenadas e faturamento por rua
          </p>
        </div>

        {/* Filtros de período */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 self-stretch sm:self-auto overflow-x-auto">
          {[
            { id: 'hoje', label: 'Hoje' },
            { id: '15dias', label: '15 Dias' },
            { id: 'mes', label: 'Este Mês' },
            { id: 'todos', label: 'Histórico Total' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriodo(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                periodo === item.id
                  ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards de Métricas do Mapa */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Pedidos Mapeados</span>
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white">
            {estatisticas.total_pedidos_mapeados || 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Distribuídos em {estatisticas.total_pontos_geograficos || 0} logradouros
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Faturamento Mapeado</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">
            {formatarPreco(estatisticas.faturamento_total || 0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Receita gerada na região
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Bairro Mais Forte</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg font-black text-white truncate">
            {estatisticas.bairro_campeao || 'Centro'}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Maior volume de clientes
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Raio Máximo</span>
            <Navigation className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">
            {estatisticas.raio_maximo_metros || 0} m
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Área de maior concentração
          </p>
        </div>
      </div>

      {/* Grid Principal: Mapa OpenStreetMap + Sidebar de Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Container do Mapa */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-3 sm:p-4 shadow-2xl relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-2 py-1 mb-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-300">OpenStreetMap Live View</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400" /> Alta
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-400" /> Média
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-yellow-400/80 border border-yellow-300" /> Normal
              </span>
            </div>
          </div>

          {/* Elemento DOM onde o Leaflet injeta o mapa */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-[450px] sm:h-[550px] rounded-2xl overflow-hidden border border-slate-800 shadow-inner z-10"
          />

          {carregando && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-20 flex items-center justify-center gap-2 text-white">
              <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
              <span className="text-sm font-bold">Calculando raios de calor...</span>
            </div>
          )}
        </div>

        {/* Sidebar com Ranking de Ruas e Bairros */}
        <div className="space-y-6">
          {/* Top Ruas */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Ruas de Maior Faturamento</span>
            </h3>

            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {(!dadosMapa?.pontos || dadosMapa.pontos.length === 0) ? (
                <p className="text-xs text-slate-400 py-4 text-center">Nenhum pedido no período selecionado.</p>
              ) : (
                dadosMapa.pontos.slice(0, 7).map((pt, idx) => (
                  <div
                    key={idx}
                    onClick={() => focarPonto(pt)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      ruaFocada === pt.rua
                        ? 'bg-amber-400/15 border-amber-400 ring-1 ring-amber-400'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-amber-400">
                          #{idx + 1}
                        </span>
                        <p className="text-xs font-bold text-white truncate max-w-[150px]">
                          {pt.rua}
                        </p>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {pt.bairro} • Raio: {pt.raio_metros}m
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-black text-amber-400">
                        {formatarPreco(pt.valor_total)}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {pt.total_pedidos} {pt.total_pedidos === 1 ? 'pedido' : 'pedidos'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ranking por Bairro */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Bairros Mais Atendidos</span>
            </h3>

            <div className="space-y-2">
              {(!estatisticas?.ranking_bairros || estatisticas.ranking_bairros.length === 0) ? (
                <p className="text-xs text-slate-400 py-2 text-center">Sem dados de bairros.</p>
              ) : (
                estatisticas.ranking_bairros.slice(0, 5).map((b, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/80 last:border-0">
                    <span className="text-slate-300 font-medium">
                      {idx + 1}. {b.bairro}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[11px]">{b.total_pedidos} ped.</span>
                      <span className="font-bold text-amber-400">{formatarPreco(b.valor_total)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
