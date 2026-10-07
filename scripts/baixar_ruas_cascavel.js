import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function baixarRuas() {
  console.log('Buscando dados de logradouros de Cascavel - PR via Overpass API...');

  // Bounding box aproximado da mancha urbana de Cascavel:
  // Sul: -25.04, Norte: -24.88, Oeste: -53.55, Leste: -53.38
  const query = `
    [out:json][timeout:60];
    (
      way["highway"]["name"](-25.04, -53.55, -24.88, -53.38);
    );
    out tags center;
  `;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'BullsBurgerDelivery/1.0 (contato@bullsburger.com.br)'
      },
      body: 'data=' + encodeURIComponent(query)
    });

    if (!res.ok) {
      throw new Error(`Status HTTP: ${res.status}`);
    }

    const data = await res.json();
    console.log(`Recebidos ${data.elements?.length || 0} segmentos do OpenStreetMap.`);

    const mapaRuas = new Map();

    for (const el of data.elements || []) {
      const nome = el.tags?.name?.trim();
      if (!nome) continue;

      // Filtrar apenas nomes válidos (descartar BRs de longa distância se não aplicável ou padronizar)
      if (nome.length < 3) continue;

      const lat = el.center?.lat || (el.lat ? el.lat : null);
      const lng = el.center?.lon || (el.lon ? el.lon : null);
      const bairro = el.tags?.['addr:suburb'] || el.tags?.suburb || el.tags?.neighbourhood || '';

      const chave = nome.toLowerCase();
      if (!mapaRuas.has(chave)) {
        mapaRuas.set(chave, {
          nome,
          bairro: bairro || 'Cascavel',
          lat: lat ? Number(lat.toFixed(6)) : -24.9578,
          lng: lng ? Number(lng.toFixed(6)) : -53.4595,
          tipo: nome.startsWith('Av') ? 'Avenida' : (nome.startsWith('Rod') ? 'Rodovia' : 'Rua')
        });
      } else if (bairro && mapaRuas.get(chave).bairro === 'Cascavel') {
        mapaRuas.get(chave).bairro = bairro;
      }
    }

    const listaRuas = Array.from(mapaRuas.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    console.log(`Total de ruas únicas processadas: ${listaRuas.length}`);

    const dirDestino = path.resolve(__dirname, '..', 'server', 'data');
    if (!fs.existsSync(dirDestino)) {
      fs.mkdirSync(dirDestino, { recursive: true });
    }

    const arquivoSaida = path.resolve(dirDestino, 'ruas_cascavel.json');
    fs.writeFileSync(arquivoSaida, JSON.stringify(listaRuas, null, 2), 'utf-8');
    console.log(`Salvo com sucesso em: ${arquivoSaida}`);
  } catch (err) {
    console.error('Falha ao baixar ruas:', err.message);
  }
}

baixarRuas();
