/**
 * ========================================================
 * 🍔 CONFIGURAÇÃO CENTRAL DA EMPRESA (WHITE-LABEL)
 * ========================================================
 * Para personalizar este delivery para um novo cliente em minutos:
 * A IA ou desenvolvedor só precisa alterar os campos abaixo!
 */

export const EMPRESA_CONFIG = {
  // Dados Principais
  nome: 'Trailer 94',
  slug: 'trailer94',
  slogan: 'Hamburgueria Artesanal & Lanches de Foz do Iguaçu',
  subtitulo: 'Pão tostado, carnes suculentas e receitas exclusivas que você já ama!',
  
  // Identidade Visual
  logoUrl: '/logo.jpg',
  bannerUrl: '/banner.avif',

  // Localização & Contato
  cidade: 'Foz do Iguaçu',
  estado: 'PR',
  enderecoCompleto: 'Foz do Iguaçu - PR',
  telefone: '(45) 99999-9494',
  whatsapp: '45999999494',
  instagram: '@trailer94foz',
  
  // Operação & Delivery
  horarioFuncionamento: 'Terça a Domingo das 18h às 23h30',
  tempoEstimadoEntrega: '30 a 45 min',
  taxaEntregaCentavos: 700, // R$ 7,00
  freteGratisApartirDeCentavos: 9000, // R$ 90,00 (0 para desativar)
  
  // Cores & Identidade Visual (Design Tokens)
  corPrimaria: '#FFCC00', // Yellow Primary
  corSecundaria: '#E6B800', // Primary Hover
  corFundo: '#F8F9FA', // Neutral Canvas BG
  
  // Credenciais Padrão Auto-Geradas
  admin: {
    nome: 'Gerente Trailer 94',
    email: 'admin@trailer94.com.br',
    senhaPadrao: 'trailer942026'
  },
  motoboy: {
    nome: 'Carlos Entregador',
    usuario: 'carlos@trailer94.com.br',
    senhaPadrao: 'motoboy2026',
    pinPadrao: '4321'
  },

  // Avaliação no Google
  googlePlaceId: 'ChIJm-6LuVab9pQR3l2lMq9sgek',
  googleReviewUrl: 'https://search.google.com/local/writereview?placeid=ChIJm-6LuVab9pQR3l2lMq9sgek'
};

/**
 * Função utilitária para gerar e-mails e senhas amigáveis com base no nome da empresa
 * Exemplo: gerarCredenciaisEmpresa("Texas Smash Burger") -> admin@texassmash.com.br
 */
export function gerarCredenciaisEmpresa(nomeEmpresa = 'Burguer Delivery') {
  const slug = nomeEmpresa
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  const primeiroNome = slug.slice(0, 12);

  return {
    adminEmail: `admin@${primeiroNome}.com.br`,
    adminSenha: `${primeiroNome}2026`,
    motoboyUsuario: `carlos@${primeiroNome}.com.br`,
    motoboySenha: `motoboy2026`,
    motoboyPin: '4321'
  };
}
