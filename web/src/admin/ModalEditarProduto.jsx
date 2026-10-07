import React, { useState } from 'react';
import { X, Plus, Trash2, Loader2, Save } from 'lucide-react';

const CAMPOS_VAZIOS = {
  categoria_id: '',
  nome: '',
  descricao: '',
  ingredientes: '',
  preco_base: '',
  preco_promocional: '',
  destaque: false
};

// Modal de criar/editar lanche: dados básicos do produto + grupos de
// adicionais (opcionais) com seus itens. Cada ação em grupo/item já salva na
// hora (POST/PUT/DELETE imediato), só os campos básicos do produto esperam o
// botão "Salvar" — assim dá pra criar o lanche primeiro e already ver o bloco
// de adicionais liberado com o id novo, sem fechar o modal.
export function ModalEditarProduto({ produto, categorias, onFechar, onSalvo }) {
  const [id, setId] = useState(produto?.id || null);
  const [campos, setCampos] = useState(
    produto
      ? {
          categoria_id: produto.categoria_id,
          nome: produto.nome,
          descricao: produto.descricao || '',
          ingredientes: produto.ingredientes || '',
          preco_base: (produto.preco_base / 100).toFixed(2),
          preco_promocional: produto.preco_promocional ? (produto.preco_promocional / 100).toFixed(2) : '',
          destaque: produto.destaque === 1
        }
      : { ...CAMPOS_VAZIOS, categoria_id: categorias[0]?.id || '' }
  );
  const [grupos, setGrupos] = useState(produto?.gruposOpcionais || []);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  function mudar(campo, valor) {
    setCampos((c) => ({ ...c, [campo]: valor }));
  }

  async function salvarProduto() {
    if (!campos.nome.trim() || !campos.categoria_id || !campos.preco_base) {
      setErro('Preencha categoria, nome e preço.');
      return;
    }
    setSalvando(true);
    setErro('');
    const payload = {
      categoria_id: Number(campos.categoria_id),
      nome: campos.nome.trim(),
      descricao: campos.descricao.trim() || null,
      ingredientes: campos.ingredientes.trim() || null,
      preco_base: Math.round(Number(campos.preco_base) * 100),
      preco_promocional: campos.preco_promocional ? Math.round(Number(campos.preco_promocional) * 100) : null,
      destaque: campos.destaque
    };

    try {
      if (id) {
        await fetch(`/api/admin/produtos/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        const res = await fetch('/api/admin/produtos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error('Falha ao criar o lanche.');
        setId(data.id);
      }
      onSalvo();
    } catch (err) {
      setErro(err.message || 'Falha ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function criarGrupo() {
    const res = await fetch(`/api/admin/produtos/${id}/grupos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: 'Novo grupo', obrigatorio: false, min_escolhas: 0, max_escolhas: 1 })
    });
    const data = await res.json();
    setGrupos((gs) => [...gs, { id: data.id, titulo: 'Novo grupo', obrigatorio: 0, min_escolhas: 0, max_escolhas: 1, itens: [] }]);
  }

  function mudarGrupoLocal(grupoId, campo, valor) {
    setGrupos((gs) => gs.map((g) => (g.id === grupoId ? { ...g, [campo]: valor } : g)));
  }

  async function salvarGrupo(grupo) {
    await fetch(`/api/admin/grupos/${grupo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titulo: grupo.titulo,
        obrigatorio: !!grupo.obrigatorio,
        min_escolhas: Number(grupo.min_escolhas),
        max_escolhas: Number(grupo.max_escolhas)
      })
    });
  }

  function alternarObrigatorio(grupo, marcado) {
    const minNovo = marcado && Number(grupo.min_escolhas) === 0 ? 1 : Number(grupo.min_escolhas);
    const grupoAtualizado = { ...grupo, obrigatorio: marcado, min_escolhas: minNovo };
    setGrupos((gs) => gs.map((g) => (g.id === grupo.id ? grupoAtualizado : g)));
    salvarGrupo(grupoAtualizado);
  }

  async function apagarGrupo(grupoId) {
    await fetch(`/api/admin/grupos/${grupoId}`, { method: 'DELETE' });
    setGrupos((gs) => gs.filter((g) => g.id !== grupoId));
  }

  async function criarItem(grupoId) {
    const res = await fetch(`/api/admin/grupos/${grupoId}/itens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Novo item', preco_adicional: 0 })
    });
    const data = await res.json();
    setGrupos((gs) =>
      gs.map((g) => (g.id === grupoId ? { ...g, itens: [...g.itens, { id: data.id, nome: 'Novo item', preco_adicional: 0 }] } : g))
    );
  }

  function mudarItemNome(grupoId, itemId, valor) {
    setGrupos((gs) =>
      gs.map((g) => (g.id !== grupoId ? g : { ...g, itens: g.itens.map((it) => (it.id === itemId ? { ...it, nome: valor } : it)) }))
    );
  }

  async function salvarItem(item) {
    await fetch(`/api/admin/itens/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: item.nome, preco_adicional: item.preco_adicional })
    });
  }

  async function apagarItem(grupoId, itemId) {
    await fetch(`/api/admin/itens/${itemId}`, { method: 'DELETE' });
    setGrupos((gs) => gs.map((g) => (g.id !== grupoId ? g : { ...g, itens: g.itens.filter((it) => it.id !== itemId) })));
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={onFechar}>
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">{id ? 'Editar lanche' : 'Novo lanche'}</h3>
          <button onClick={onFechar} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {erro && <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg p-2">{erro}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nome</label>
              <input
                value={campos.nome}
                onChange={(e) => mudar('nome', e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                placeholder="Ex: Burguer Bacon"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Categoria</label>
              <select
                value={campos.categoria_id}
                onChange={(e) => mudar('categoria_id', e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <input
                type="checkbox"
                checked={campos.destaque}
                onChange={(e) => mudar('destaque', e.target.checked)}
                id="destaque"
                className="w-4 h-4"
              />
              <label htmlFor="destaque" className="text-xs text-slate-300">Destacar na home</label>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Preço (R$)</label>
              <input
                type="number"
                step="0.10"
                value={campos.preco_base}
                onChange={(e) => mudar('preco_base', e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Preço promocional (R$)</label>
              <input
                type="number"
                step="0.10"
                value={campos.preco_promocional}
                onChange={(e) => mudar('preco_promocional', e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                placeholder="Opcional"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ingredientes</label>
              <input
                value={campos.ingredientes}
                onChange={(e) => mudar('ingredientes', e.target.value)}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                placeholder="Pão, blend 180g, cheddar, bacon..."
              />
            </div>

            <div className="col-span-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Descrição</label>
              <textarea
                value={campos.descricao}
                onChange={(e) => mudar('descricao', e.target.value)}
                rows={2}
                className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <button
            onClick={salvarProduto}
            disabled={salvando}
            className="w-full flex items-center justify-center gap-2 bg-amber-400 text-slate-950 font-bold text-sm py-2.5 rounded-lg hover:bg-amber-300 disabled:opacity-60"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {id ? 'Salvar alterações' : 'Criar lanche'}
          </button>

          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Adicionais e opcionais</h4>
              {id && (
                <button onClick={criarGrupo} className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300">
                  <Plus className="w-3.5 h-3.5" /> Novo grupo
                </button>
              )}
            </div>

            {!id && <p className="text-xs text-slate-500">Salve o lanche primeiro para adicionar adicionais.</p>}

            <div className="space-y-3">
              {grupos.map((grupo) => (
                <div key={grupo.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      value={grupo.titulo}
                      onChange={(e) => mudarGrupoLocal(grupo.id, 'titulo', e.target.value)}
                      onBlur={() => salvarGrupo(grupo)}
                      className="flex-1 min-w-[120px] bg-transparent text-sm font-bold text-white focus:outline-none border-b border-transparent focus:border-amber-400"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-slate-400">
                      <input
                        type="checkbox"
                        checked={!!grupo.obrigatorio}
                        onChange={(e) => alternarObrigatorio(grupo, e.target.checked)}
                      />
                      Obrigatório
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-slate-400">
                      Mín.
                      <input
                        type="number"
                        min="0"
                        defaultValue={grupo.min_escolhas}
                        onBlur={(e) => {
                          const valor = Number(e.target.value) || 0;
                          mudarGrupoLocal(grupo.id, 'min_escolhas', valor);
                          salvarGrupo({ ...grupo, min_escolhas: valor });
                        }}
                        className="w-12 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-xs text-center text-white"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-slate-400">
                      Máx.
                      <input
                        type="number"
                        min="1"
                        defaultValue={grupo.max_escolhas}
                        onBlur={(e) => {
                          const valor = Number(e.target.value) || 1;
                          mudarGrupoLocal(grupo.id, 'max_escolhas', valor);
                          salvarGrupo({ ...grupo, max_escolhas: valor });
                        }}
                        className="w-12 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-xs text-center text-white"
                      />
                    </label>
                    <button onClick={() => apagarGrupo(grupo.id)} className="text-slate-500 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5 pl-2">
                    {grupo.itens.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <input
                          value={item.nome}
                          onChange={(e) => mudarItemNome(grupo.id, item.id, e.target.value)}
                          onBlur={() => salvarItem(item)}
                          className="flex-1 bg-transparent text-xs text-slate-200 focus:outline-none border-b border-transparent focus:border-amber-400"
                        />
                        <span className="text-[10px] text-slate-500">R$</span>
                        <input
                          type="number"
                          step="0.10"
                          defaultValue={(item.preco_adicional / 100).toFixed(2)}
                          onBlur={(e) => {
                            const centavos = Math.round(Number(e.target.value) * 100) || 0;
                            salvarItem({ ...item, preco_adicional: centavos });
                          }}
                          className="w-16 bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-xs text-right text-amber-300"
                        />
                        <button onClick={() => apagarItem(grupo.id, item.id)} className="text-slate-500 hover:text-red-400">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => criarItem(grupo.id)} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-amber-400">
                      <Plus className="w-3 h-3" /> Adicionar item
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
