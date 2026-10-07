export function formatarPreco(centavos) {
  if (centavos === null || centavos === undefined) return 'R$ 0,00';
  const reais = (Number(centavos) / 100).toFixed(2);
  return `R$ ${reais.replace('.', ',')}`;
}

export function formatarTelefone(telefone) {
  if (!telefone) return '';
  const limpo = telefone.replace(/\D/g, '');
  if (limpo.length === 11) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
  }
  if (limpo.length === 10) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
  }
  return telefone;
}
