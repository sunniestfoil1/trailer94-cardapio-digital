import db from '../db/db.js';

async function limparMocks() {
  console.log('🧹 [LIMPEZA] Removendo produtos mockados e de teste do banco de dados...');
  const res = await db.prepare(`
    DELETE FROM produtos 
    WHERE nome LIKE '%Teste%' 
       OR nome LIKE '%Test%' 
       OR nome IN ('Smash Bacon Supreme', 'Classic Cheese Smash', 'Monster Cheddar Duplo', 'Batata Rústica Especial')
  `).run();

  console.log(`✅ ${res.changes || 0} produtos mockados removidos com sucesso!`);
  
  const prodsRestantes = await db.prepare('SELECT id, nome, preco_base FROM produtos').all();
  console.log('📋 Produtos Reais Mantidos no Cardápio:');
  console.table(prodsRestantes);
}

limparMocks().catch(console.error);
