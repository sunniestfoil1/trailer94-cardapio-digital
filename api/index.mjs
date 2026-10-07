// Ponto de entrada serverless da Vercel: reaproveita o mesmo app Express do
// servidor local (server/server.js), só que aqui ninguém chama app.listen()
// — a própria Vercel invoca esse handler a cada requisição.
import app from '../server/server.js';

export default app;
