import bcrypt from 'bcryptjs';

export async function hashSenha(senha) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(senha, salt);
}

export async function compararSenha(senha, hash) {
  return bcrypt.compare(senha, hash);
}
