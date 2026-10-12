// Data de hoje no formato AAAA-MM-DD (fuso local)
export function hojeISO() {
  return new Date().toLocaleDateString('en-CA')
}

// Quantos dias faltam até a data (negativo = já passou)
export function diasAte(iso) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  const alvo = new Date(a, m - 1, d)
  const h = new Date()
  const hoje = new Date(h.getFullYear(), h.getMonth(), h.getDate())
  return Math.round((alvo - hoje) / 86400000)
}

// AAAA-MM-DD -> DD/MM/AAAA
export function formatarData(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}
