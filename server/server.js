import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import cardapioRoutes from './routes/cardapio.js';
import pedidosRoutes from './routes/pedidos.js';
import authDonoRoutes from './routes/auth-dono.js';
import authMotoboyRoutes from './routes/auth-motoboy.js';
import adminRoutes from './routes/admin/index.js';
import motoboyRoutes from './routes/motoboy/index.js';
import enderecosRoutes from './routes/enderecos.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// process.env.VERCEL === '1' dentro de uma função serverless da Vercel.
// Nesse ambiente o app não escuta porta nenhuma (a própria Vercel invoca o
// handler) e os arquivos estáticos já saem do build do Vite (web/dist),
// então as rotas de arquivo estático abaixo só fazem sentido rodando local.
const rodandoNaVercel = process.env.VERCEL === '1';

const app = express();

// A Vercel roda atrás do próprio proxy dela e manda X-Forwarded-For de
// verdade; sem isso o express-rate-limit recusa confiar no IP do cliente
// e derruba a requisição. "1" = confia só no primeiro hop (o proxy da Vercel).
if (rodandoNaVercel) {
  app.set('trust proxy', 1);
}

// 1. Middlewares de Segurança
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false
}));

const origensPermitidas = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3005',
  'http://127.0.0.1:3005',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || origensPermitidas.includes(origin)) {
      return callback(null, true);
    }
    callback(null, true);
  },
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiters defensivos
const apiGeralLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: { erro: 'limite_excedido', mensagem: 'Muitas requisições. Aguarde um instante.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { erro: 'limite_excedido', mensagem: 'Muitas tentativas. Tente novamente mais tarde.' }
});

const pedidosLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: { erro: 'limite_pedidos', mensagem: 'Aguarde um instante antes de enviar outro pedido.' }
});

app.use('/api/', apiGeralLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/pedidos', pedidosLimiter);

// 2. Arquivos estáticos só fazem sentido rodando local (node server.js direto);
// na Vercel isso já vem do build do Vite em web/dist.
if (!rodandoNaVercel) {
  app.use('/imagens', express.static(path.resolve(rootDir, 'imagens')));
  app.use('/images', express.static(path.resolve(rootDir, 'images')));
  app.use('/apresentacao', express.static(path.resolve(rootDir, 'apresentacao')));
  app.use('/pagamentos', express.static(path.resolve(rootDir, 'imagens', 'pagamentos')));
}

// 3. Rotas da API
app.use('/api/cardapio', cardapioRoutes);
app.use('/api/loja', cardapioRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/auth/dono', authDonoRoutes);
app.use('/api/auth/motoboy', authMotoboyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/motoboy', motoboyRoutes);
app.use('/api/enderecos', enderecosRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', servico: 'Bulls Burger API', versao: '2.0.0-supabase', time: new Date().toISOString() });
});

// Servir o frontend compilado só no modo local (node server.js servindo tudo junto)
if (!rodandoNaVercel) {
  const webDistPath = path.resolve(rootDir, 'web', 'dist');
  if (fs.existsSync(webDistPath)) {
    app.use(express.static(webDistPath));
    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/assets') ||
        req.path.startsWith('/imagens') ||
        req.path.startsWith('/images') ||
        req.path.startsWith('/pagamentos') ||
        req.path.includes('.')
      ) {
        return next();
      }
      res.sendFile(path.resolve(webDistPath, 'index.html'));
    });
  }
}

process.on('uncaughtException', (err) => {
  console.error('⚠️ [CRITICAL] uncaughtException capturada no servidor:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('⚠️ [CRITICAL] unhandledRejection capturada:', reason);
});

app.use((err, req, res, next) => {
  console.error('Erro na requisição:', err);
  res.status(500).json({ erro: 'erro_interno', mensagem: 'Ocorreu um erro no processamento do servidor.' });
});

if (!rodandoNaVercel) {
  const PORT = Number(process.env.PORT) || 3005;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🍔 Bulls Burger Server rodando na porta ${PORT}`);
    console.log(`📡 API Local: http://localhost:${PORT}/api`);
  });
}

export default app;
export { app };
