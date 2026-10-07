import React, { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Bike, Home, MapPin } from 'lucide-react';

// Coordenadas centrais dos principais bairros de Cascavel - PR
const BAIRROS_CASCAVEL = [
  { nome: 'centro', lat: -24.9555, lng: -53.4610, distKm: 1.4, tempoMin: 5 },
  { nome: 'cancelli', lat: -24.9430, lng: -53.4720, distKm: 2.6, tempoMin: 8 },
  { nome: 'neva', lat: -24.9680, lng: -53.4510, distKm: 2.2, tempoMin: 7 },
  { nome: 'coqueiral', lat: -24.9520, lng: -53.4850, distKm: 3.8, tempoMin: 11 },
  { nome: 'parque são paulo', lat: -24.9750, lng: -53.4420, distKm: 4.1, tempoMin: 12 },
  { nome: 'alto alegre', lat: -24.9450, lng: -53.4350, distKm: 3.5, tempoMin: 10 },
  { nome: 'santa cruz', lat: -24.9650, lng: -53.5010, distKm: 5.4, tempoMin: 15 },
  { nome: 'fag', lat: -24.9800, lng: -53.5180, distKm: 6.8, tempoMin: 18 },
  { nome: 'maria luiza', lat: -24.9620, lng: -53.4380, distKm: 2.9, tempoMin: 9 },
  { nome: 'country', lat: -24.9410, lng: -53.4550, distKm: 2.7, tempoMin: 8 },
  { nome: 'são cristóvão', lat: -24.9460, lng: -53.4210, distKm: 4.5, tempoMin: 13 },
  { nome: 'floresta', lat: -24.9350, lng: -53.4050, distKm: 6.2, tempoMin: 17 },
  { nome: 'cascavel velho', lat: -24.9890, lng: -53.4180, distKm: 5.8, tempoMin: 16 }
];

// Ponto de saída fixo: Trailer 94 (Foz do Iguaçu - PR)
const ORIGEM_TRAILER = {
  lat: -25.5167,
  lng: -54.5833,
  nome: 'Trailer 94'
};

export function MiniMapaRotaPreview({ endereco, idPedido }) {
  const containerRef = useRef(null);
  const mapaRef = useRef(null);

  // Determinar coordenadas e distância baseado no endereço do pedido
  const destinoInfo = useMemo(() => {
    const endNorm = (endereco || '').toLowerCase();
    const match = BAIRROS_CASCAVEL.find(b => endNorm.includes(b.nome));

    if (match) {
      return {
        lat: match.lat,
        lng: match.lng,
        distKm: match.distKm,
        tempoMin: match.tempoMin
      };
    }

    // Default se não bater nenhum bairro específico
    return {
      lat: -24.9620,
      lng: -53.4750,
      distKm: 3.2,
      tempoMin: 10
    };
  }, [endereco]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapaRef.current) {
      const mapa = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false
      });

      // TileLayer OpenStreetMap França (100% gratuito, sem chave de API, sem marcas d'água)
      L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap France'
      }).addTo(mapa);

      // Ícone Loja Trailer 94
      const iconeLoja = L.divIcon({
        className: 'custom-pin-loja',
        html: `<div style="background: #f59e0b; color: #020617; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; border: 2px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">🍔</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      // Ícone Casa Cliente
      const iconeCasa = L.divIcon({
        className: 'custom-pin-casa',
        html: `<div style="background: #10b981; color: #ffffff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 15px; border: 2px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">🏠</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      L.marker([ORIGEM_TRAILER.lat, ORIGEM_TRAILER.lng], { icon: iconeLoja }).addTo(mapa);
      L.marker([destinoInfo.lat, destinoInfo.lng], { icon: iconeCasa }).addTo(mapa);

      // Linha conectando os dois pontos
      const linhaRota = L.polyline([
        [ORIGEM_TRAILER.lat, ORIGEM_TRAILER.lng],
        [destinoInfo.lat, destinoInfo.lng]
      ], {
        color: '#f59e0b',
        weight: 3.5,
        dashArray: '6, 8',
        opacity: 0.9
      }).addTo(mapa);

      // Ajustar enquadramento nos 2 pontos
      mapa.fitBounds(linhaRota.getBounds(), { padding: [25, 25] });

      mapaRef.current = mapa;
    }

    return () => {
      if (mapaRef.current) {
        mapaRef.current.remove();
        mapaRef.current = null;
      }
    };
  }, [destinoInfo]);

  const urlGoogleMaps = `https://www.google.com/maps/dir/?api=1&origin=${ORIGEM_TRAILER.lat},${ORIGEM_TRAILER.lng}&destination=${encodeURIComponent((endereco || 'Foz do Iguaçu') + ', Foz do Iguaçu - PR')}`;

  return (
    <div className="space-y-2 mt-2">
      {/* Mini Mapa do OpenStreetMap com Leaflet */}
      <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-700/80 shadow-inner bg-slate-950">
        <div ref={containerRef} className="w-full h-full" />

        {/* Badge Flutuante de Distância e Tempo */}
        <div className="absolute top-2 left-2 z-[400] bg-slate-900/90 backdrop-blur-md border border-amber-400/60 px-2.5 py-1 rounded-lg text-[11px] font-black text-white flex items-center gap-1.5 shadow-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{destinoInfo.distKm} km</span>
          <span className="text-slate-400">•</span>
          <span className="text-amber-400">~{destinoInfo.tempoMin} min</span>
        </div>
      </div>

      {/* Linha com Efeito de Animação da Moto Indo até a Casa */}
      <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
          <span className="flex items-center gap-1 text-amber-400">
            <span>🍔 Trailer 94 Cozinha</span>
          </span>
          <span className="text-slate-500 font-mono text-[10px]">Trajeto em Cascavel</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span>🏠 Casa do Cliente</span>
          </span>
        </div>

        {/* Trilho Animado com a Motinho se Movendo */}
        <div className="relative w-full h-4 bg-slate-900 rounded-full border border-slate-800 overflow-hidden flex items-center">
          {/* Linha pontilhada no fundo */}
          <div className="absolute inset-0 flex items-center justify-around opacity-30">
            <span className="w-1.5 h-1 bg-amber-400 rounded-full" />
            <span className="w-1.5 h-1 bg-amber-400 rounded-full" />
            <span className="w-1.5 h-1 bg-amber-400 rounded-full" />
            <span className="w-1.5 h-1 bg-amber-400 rounded-full" />
            <span className="w-1.5 h-1 bg-amber-400 rounded-full" />
          </div>

          {/* Moto Animada deslizando de 0% a 92% */}
          <div 
            className="absolute flex items-center text-sm"
            style={{
              animation: 'deslocarMoto 4.5s ease-in-out infinite'
            }}
          >
            <span className="filter drop-shadow(0 2px 4px rgba(0,0,0,0.5))">🏍️</span>
          </div>
        </div>
      </div>

      {/* Botão para Abrir Rota Direta no Google Maps */}
      <a
        href={urlGoogleMaps}
        target="_blank"
        rel="noreferrer"
        className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95"
      >
        <Navigation className="w-4 h-4" />
        <span>Ver Rota Direta no Google Maps ({destinoInfo.distKm} km) ➔</span>
      </a>

      {/* Estilo CSS da Animação da Moto */}
      <style>{`
        @keyframes deslocarMoto {
          0% {
            left: 2%;
            transform: scaleX(1);
          }
          48% {
            left: 90%;
            transform: scaleX(1);
          }
          50% {
            left: 90%;
            transform: scaleX(-1);
          }
          98% {
            left: 2%;
            transform: scaleX(-1);
          }
          100% {
            left: 2%;
            transform: scaleX(1);
          }
        }
      `}</style>
    </div>
  );
}
