import React from 'react';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import { CarrinhoProvider } from './compartilhado/CarrinhoContext';
import { LojaPage } from './loja/LojaPage';
import { EntregadorPage } from './entregador/EntregadorPage';
import { AdminPage } from './admin/AdminPage';
import { CozinhaPage } from './cozinha/CozinhaPage';

function AcompanhamentoWrapper() {
  const { id } = useParams();
  return <LojaPage initialPedidoId={id} />;
}

export function App() {
  return (
    <CarrinhoProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LojaPage />} />
          <Route path="/pedido/:id" element={<AcompanhamentoWrapper />} />
          <Route path="/entregador" element={<EntregadorPage />} />
          <Route path="/cozinha" element={<CozinhaPage />} />
          <Route path="/kds" element={<CozinhaPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </CarrinhoProvider>
  );
}

export default App;
