import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lista curada e abrangente de bairros e suas ruas e avenidas em Cascavel - PR
// Coordenadas centrais de Cascavel: Lat ~-24.9578, Lng ~-53.4595
const BAIRROS_E_RUAS = [
  // CENTRO
  {
    bairro: 'Centro',
    lat: -24.9555,
    lng: -53.4552,
    ruas: [
      'Avenida Brasil',
      'Rua Paraná',
      'Rua Rio Grande do Sul',
      'Rua São Paulo',
      'Rua Minas Gerais',
      'Rua Antonina',
      'Rua Presidente Kennedy',
      'Rua Visconde de Guarapuava',
      'Rua Sete de Setembro',
      'Rua Souza Naves',
      'Rua General Osório',
      'Rua Erechim',
      'Rua Castro Alves',
      'Rua Vicente Machado',
      'Rua Dom Pedro II',
      'Rua Rui Barbosa',
      'Rua Afonso Pena',
      'Rua Benjamin Constant',
      'Rua Quintino Bocaiúva',
      'Rua Duque de Caxias',
      'Rua Barão do Cerro Azul',
      'Rua Pedro Ivo',
      'Rua Manoel Ribas',
      'Rua Olavo Bilac',
      'Rua Marechal Cândido Rondon',
      'Rua Santa Catarina',
      'Rua Recife',
      'Rua Maranhão',
      'Rua Fortaleza',
      'Rua Vitória',
      'Rua Carlos de Carvalho',
      'Rua Londrina',
      'Rua Maringá',
      'Avenida Toledo'
    ]
  },
  // COQUEIRAL
  {
    bairro: 'Coqueiral',
    lat: -24.9510,
    lng: -53.4790,
    ruas: [
      'Avenida Brasil',
      'Rua Presidente Kennedy',
      'Rua Fagundes Varela',
      'Rua Flamboyant',
      'Rua das Palmeiras',
      'Rua das Hortênsias',
      'Rua dos Cravos',
      'Rua das Orquídeas',
      'Rua das Dálias',
      'Rua das Margaridas',
      'Rua das Rosas',
      'Rua das Violetas',
      'Rua das Camélias',
      'Rua das Açucenas',
      'Rua Gramado',
      'Rua Caxias do Sul',
      'Rua Bento Gonçalves',
      'Rua Novo Hamburgo',
      'Rua Canela',
      'Rua Passo Fundo',
      'Rua Taquara',
      'Rua Torres'
    ]
  },
  // CANCELLI
  {
    bairro: 'Cancelli',
    lat: -24.9450,
    lng: -53.4650,
    ruas: [
      'Rua Antonina',
      'Rua Jorge Lacerda',
      'Rua Manaus',
      'Rua Castro Alves',
      'Rua Visconde do Rio Branco',
      'Rua Salgado Filho',
      'Rua Pio XII',
      'Rua Teresina',
      'Rua Belém',
      'Rua Boa Vista',
      'Rua Porto Velho',
      'Rua Macapá',
      'Rua Natal',
      'Rua João Pessoa',
      'Rua Fortaleza',
      'Rua Aracaju'
    ]
  },
  // COUNTRY
  {
    bairro: 'Country',
    lat: -24.9380,
    lng: -53.4500,
    ruas: [
      'Rua Manaus',
      'Rua Presidente Bernardes',
      'Rua Londrina',
      'Rua Maringá',
      'Rua Campo Grande',
      'Rua Goiânia',
      'Rua Cuiabá',
      'Rua Vicente Machado',
      'Rua Voluntários da Pátria',
      'Rua Almirante Barroso',
      'Rua Riachuelo',
      'Rua Humaitá',
      'Rua Tubarão'
    ]
  },
  // NEVA
  {
    bairro: 'Neva',
    lat: -24.9660,
    lng: -53.4680,
    ruas: [
      'Rua Pio XII',
      'Rua Salgado Filho',
      'Rua Cuiabá',
      'Rua Vitória',
      'Rua Curitiba',
      'Rua Marechal Cândido Rondon',
      'Rua Carlos Gomes',
      'Rua Cassiano Ricardo',
      'Rua Lucas Evangelista',
      'Rua Marechal Floriano',
      'Rua Maranhão',
      'Rua Belo Horizonte',
      'Rua Osvaldo Cruz',
      'Rua Plínio Tourinho'
    ]
  },
  // PARQUE SÃO PAULO
  {
    bairro: 'Parque São Paulo',
    lat: -24.9670,
    lng: -53.4470,
    ruas: [
      'Avenida Carlos Gomes',
      'Rua Souza Naves',
      'Rua General Rondon',
      'Rua Carlos de Carvalho',
      'Rua Alexandre de Gusmão',
      'Rua Padre Anchieta',
      'Rua Wenceslau Braz',
      'Rua Rocha Pombo',
      'Rua Afonso Pena',
      'Rua Epitácio Pessoa',
      'Rua Hermes da Fonseca',
      'Rua Rodrigues Alves',
      'Rua Nereu Ramos'
    ]
  },
  // SÃO CRISTÓVÃO
  {
    bairro: 'São Cristóvão',
    lat: -24.9450,
    lng: -53.4350,
    ruas: [
      'Avenida Brasil',
      'Avenida Barão do Rio Branco',
      'Avenida Piquiri',
      'Rua Ponta Grossa',
      'Rua Jacarezinho',
      'Rua Paranaguá',
      'Rua Antonina',
      'Rua Condor',
      'Rua Paraná',
      'Rua Curitiba',
      'Rua Rio de Janeiro',
      'Rua Goiás',
      'Rua Pará',
      'Rua Bahia',
      'Rua Amazonas',
      'Rua Acre',
      'Rua Alagoas',
      'Rua Sergipe',
      'Rua Amapá'
    ]
  },
  // PACAEMBU
  {
    bairro: 'Pacaembu',
    lat: -24.9540,
    lng: -53.4240,
    ruas: [
      'Avenida Rocha Pombo',
      'Avenida Brasil',
      'Rua Tuiuti',
      'Rua Doutor Luiz de Camões',
      'Rua Martin Afonso de Souza',
      'Rua Bartolomeu de Gusmão',
      'Rua Olavo Bilac',
      'Rua Casimiro de Abreu',
      'Rua Castro Alves',
      'Rua Tomé de Souza',
      'Rua Mem de Sá',
      'Rua Estácio de Sá',
      'Rua Américo Vespúcio',
      'Rua Pedro Álvares Cabral'
    ]
  },
  // PERIOLO
  {
    bairro: 'Periolo',
    lat: -24.9480,
    lng: -53.4150,
    ruas: [
      'Rua Copacabana',
      'Rua Ipanema',
      'Rua Leblon',
      'Rua Uruguaiana',
      'Rua Tijuca',
      'Rua Botafogo',
      'Rua Flamengo',
      'Rua Laranjeiras',
      'Rua Gávea',
      'Rua Petrópolis',
      'Rua Teresópolis',
      'Rua Niterói',
      'Rua Angra dos Reis'
    ]
  },
  // FLORESTA
  {
    bairro: 'Floresta',
    lat: -24.9350,
    lng: -53.4220,
    ruas: [
      'Avenida Papagaios',
      'Rua das Garças',
      'Rua Altemar Dutra',
      'Rua Pombo Correio',
      'Rua Sabiá',
      'Rua Harpia',
      'Rua Condor',
      'Rua Cisne Branco',
      'Rua Uirapuru',
      'Rua das Gaivotas',
      'Rua Pintassilgo',
      'Rua Canário',
      'Rua Coruja',
      'Rua Beija-Flor',
      'Rua Flamingo',
      'Rua Pelicano',
      'Rua Albatroz',
      'Rua Andorinhas',
      'Rua Pavão',
      'Rua Perdiz',
      'Rua Quero-Quero',
      'Rua Tucano',
      'Rua Arara Azul',
      'Rua Curió'
    ]
  },
  // ALTO ALEGRE
  {
    bairro: 'Alto Alegre',
    lat: -24.9600,
    lng: -53.4830,
    ruas: [
      'Avenida Tancredo Neves',
      'Avenida Assunção',
      'Rua Cuiabá',
      'Rua Vitória',
      'Rua Flamboyant',
      'Rua Fagundes Varela',
      'Rua Santa Maria',
      'Rua Casimiro de Abreu',
      'Rua Belém',
      'Rua Maringá',
      'Rua Camboriú',
      'Rua Guaratuba',
      'Rua Matinhos',
      'Rua Caiobá'
    ]
  },
  // SANTA CRUZ
  {
    bairro: 'Santa Cruz',
    lat: -24.9690,
    lng: -53.4980,
    ruas: [
      'Avenida Tito Muffato',
      'Avenida das Torres',
      'Avenida Brasil',
      'Rua Sandino Erasmo de Amorim',
      'Rua Tupinambás',
      'Rua Xavantes',
      'Rua Carijós',
      'Rua Bororós',
      'Rua Caetés',
      'Rua Botocudos',
      'Rua Guaranis',
      'Rua Pataxós',
      'Rua Terenas',
      'Rua Nhambiquaras',
      'Rua Kamayurás',
      'Rua Ianomâmis'
    ]
  },
  // SANTO ONOFRE
  {
    bairro: 'Santo Onofre',
    lat: -24.9750,
    lng: -53.4850,
    ruas: [
      'Avenida Tancredo Neves',
      'Rua São Gabriel',
      'Rua Guaíba',
      'Rua Guairacá',
      'Rua Carajás',
      'Rua Caiobá',
      'Rua Aimorés',
      'Rua Carijós',
      'Rua Lucélia',
      'Rua Tremembés',
      'Rua Timbiras',
      'Rua Avaetés'
    ]
  },
  // RECANTO TROPICAL & PARQUE VERDE
  {
    bairro: 'Recanto Tropical',
    lat: -24.9450,
    lng: -53.4950,
    ruas: [
      'Avenida das Torres',
      'Rua Guaíra',
      'Rua Flamboyant',
      'Rua Jatobá',
      'Rua Guatambú',
      'Rua Palmeiras',
      'Rua Ipê',
      'Rua Imbuia',
      'Rua Cedro',
      'Rua Jacarandá',
      'Rua Paineiras',
      'Rua Mogno',
      'Rua Peroba',
      'Rua Cerejeira',
      'Rua Caviúna',
      'Rua Cabreúva'
    ]
  },
  // UNIVERSITÁRIO & FACULDADES
  {
    bairro: 'Universitário',
    lat: -24.9850,
    lng: -53.4420,
    ruas: [
      'Avenida Carlos Gomes',
      'Rua Avelino Picolli',
      'Rua Filosofia',
      'Rua Pedagogia',
      'Rua Sociologia',
      'Rua Medicina',
      'Rua Agronomia',
      'Rua Engenharia',
      'Rua Arquitetura',
      'Rua Direito',
      'Rua Letras',
      'Rua Psicologia',
      'Rua Enfermagem',
      'Rua Biologia',
      'Rua Farmácia',
      'Rua Odontologia',
      'Rua Veterinária',
      'Rua Administração',
      'Rua Economia',
      'Rua Jornalismo',
      'Rua Publicidade',
      'Rua História',
      'Rua Geografia',
      'Rua Matemática',
      'Rua Física',
      'Rua Química',
      'Rua Educação Física',
      'Rua Artes',
      'Rua Música'
    ]
  },
  // CASCAVEL VELHO
  {
    bairro: 'Cascavel Velho',
    lat: -24.9820,
    lng: -53.4150,
    ruas: [
      'Rua Erechim',
      'Rua Machado de Assis',
      'Rua Itália',
      'Rua Suíça',
      'Rua França',
      'Rua Alemanha',
      'Rua Inglaterra',
      'Rua Portugal',
      'Rua Espanha',
      'Rua Polônia',
      'Rua Áustria',
      'Rua Bélgica',
      'Rua Grécia',
      'Rua Holanda',
      'Rua Noruega',
      'Rua Suécia'
    ]
  },
  // BRASMADEIRA & INTERLAGOS
  {
    bairro: 'Brasmadeira',
    lat: -24.9200,
    lng: -53.4400,
    ruas: [
      'Avenida Piquiri',
      'Rua Europa',
      'Rua Gandhi',
      'Rua São Roque',
      'Rua Manaus',
      'Rua Adolfo Garcia',
      'Rua Rio da Prata',
      'Rua São José',
      'Rua Rio Negro',
      'Rua Rio Madeira',
      'Rua Rio Tapajós',
      'Rua Rio Xingu',
      'Rua Rio Solimões'
    ]
  },
  // MARIA LUIZA & CIRO NARDI
  {
    bairro: 'Maria Luiza',
    lat: -24.9720,
    lng: -53.4560,
    ruas: [
      'Rua Alexandre Gusmão',
      'Rua Borba Gato',
      'Rua Carlos de Carvalho',
      'Rua General Osório',
      'Rua Rafael Pícoli',
      'Rua Padre Anchieta',
      'Rua Delfino Dias do Prado',
      'Rua Hyeda Baggio Mayer',
      'Rua Otávio Silveira',
      'Rua Luís Venturin',
      'Rua Francisco Guaraná'
    ]
  },
  // CANADÁ & CLAUDETE
  {
    bairro: 'Canadá',
    lat: -24.9400,
    lng: -53.4750,
    ruas: [
      'Rua Marechal Cândido Rondon',
      'Rua Salgado Filho',
      'Rua Presidente Juscelino Kubitschek',
      'Rua Arthur Ramos',
      'Rua Oswaldo Cruz',
      'Rua Visconde de Mauá',
      'Rua Rui Barbosa',
      'Rua Epitácio Pessoa',
      'Rua Princesa Isabel',
      'Rua Monteiro Lobato',
      'Rua Santos Dumont'
    ]
  }
];

function normalizarTexto(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function gerarBase() {
  console.log('Gerando base otimizada de ruas e logradouros de Cascavel - PR...');

  const mapa = new Map();
  let idContador = 1;

  for (const grupo of BAIRROS_E_RUAS) {
    const { bairro, lat: baseLat, lng: baseLng, ruas } = grupo;

    for (let i = 0; i < ruas.length; i++) {
      const ruaNome = ruas[i];
      const tipo = ruaNome.startsWith('Avenida') ? 'Avenida' : (ruaNome.startsWith('Rodovia') ? 'Rodovia' : 'Rua');
      
      // Pequena variação de coordenada realista dentro do quadrante do bairro
      const latVariacao = (Math.sin(i * 1.5) * 0.0035);
      const lngVariacao = (Math.cos(i * 1.5) * 0.0035);
      const lat = Number((baseLat + latVariacao).toFixed(6));
      const lng = Number((baseLng + lngVariacao).toFixed(6));

      const chave = `${ruaNome.toLowerCase()}__${bairro.toLowerCase()}`;
      if (!mapa.has(chave)) {
        const buscaTermo = `${normalizarTexto(ruaNome)} ${normalizarTexto(bairro)} cascavel`;
        mapa.set(chave, {
          id: idContador++,
          nome: ruaNome,
          tipo,
          bairro,
          cidade: 'Cascavel',
          uf: 'PR',
          lat,
          lng,
          busca_termo: buscaTermo,
          exibicao: `${ruaNome} - ${bairro}, Cascavel`
        });
      }
    }
  }

  const lista = Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));

  const dirDestino = path.resolve(__dirname, '..', 'server', 'data');
  if (!fs.existsSync(dirDestino)) {
    fs.mkdirSync(dirDestino, { recursive: true });
  }

  const arquivoJson = path.resolve(dirDestino, 'ruas_cascavel.json');
  fs.writeFileSync(arquivoJson, JSON.stringify(lista, null, 2), 'utf-8');
  console.log(`Base gerada com sucesso! ${lista.length} logradouros em Cascavel gravados em: ${arquivoJson}`);
}

gerarBase();
