import React, { createContext, useContext, useState, useEffect } from 'react';

const CarrinhoContext = createContext();

export function CarrinhoProvider({ children }) {
  const [itens, setItens] = useState(() => {
    try {
      const salvo = localStorage.getItem('bulls_carrinho');
      return salvo ? JSON.parse(salvo) : [];
    } catch {
      return [];
    }
  });

  const [carrinhoAberto, setCarrinhoAberto] = useState(false);
  const [animandoSacola, setAnimandoSacola] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('bulls_carrinho', JSON.stringify(itens));
    } catch (err) {
      console.error('Falha ao salvar carrinho no storage:', err);
    }
  }, [itens]);

  function dispararAnimacao() {
    setAnimandoSacola(true);
    setTimeout(() => setAnimandoSacola(false), 500);
  }

  function adicionarItem(produto, opcionais = [], observacoes = '', quantidade = 1) {
    const precoUnitario = (produto.preco_promocional ?? produto.preco_base) +
      opcionais.reduce((total, opc) => total + (opc.preco_adicional || 0), 0);

    const novoItem = {
      produtoId: produto.id,
      nome: produto.nome,
      imagem: produto.imagens?.[0] || '/imagens/origem/instagram/baixada-1.jpg',
      precoUnitario,
      quantidade,
      opcionais,
      observacoes
    };

    setItens(atuais => [...atuais, novoItem]);
    dispararAnimacao();
  }

  function removerItem(indice) {
    setItens(atuais => atuais.filter((_, i) => i !== indice));
  }

  function atualizarQuantidade(indice, delta) {
    setItens(atuais => {
      const clone = [...atuais];
      const novaQtd = clone[indice].quantidade + delta;
      if (novaQtd <= 0) {
        return clone.filter((_, i) => i !== indice);
      }
      clone[indice] = { ...clone[indice], quantidade: novaQtd };
      return clone;
    });
  }

  function limparCarrinho() {
    setItens([]);
    localStorage.removeItem('bulls_carrinho');
  }

  const subtotal = itens.reduce((acc, item) => acc + (item.precoUnitario * item.quantidade), 0);
  const totalItens = itens.reduce((acc, item) => acc + item.quantidade, 0);

  return (
    <CarrinhoContext.Provider value={{
      itens,
      subtotal,
      totalItens,
      carrinhoAberto,
      setCarrinhoAberto,
      animandoSacola,
      adicionarItem,
      removerItem,
      atualizarQuantidade,
      limparCarrinho
    }}>
      {children}
    </CarrinhoContext.Provider>
  );
}

export function useCarrinho() {
  const context = useContext(CarrinhoContext);
  if (!context) {
    throw new Error('useCarrinho deve ser utilizado dentro de um CarrinhoProvider');
  }
  return context;
}
