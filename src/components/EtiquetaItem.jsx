export default function EtiquetaItem({ item, categoriaNome, tipoNome, funcaoNome, acoes }) {
  const abaixoMinimo = Number(item.quantidade) <= Number(item.quantidade_minima)
  const emprestado = Number(item.quantidade_emprestada || 0)

  return (
    <div className={`etiqueta ${abaixoMinimo ? 'abaixo-minimo' : ''}`}>
      <div className="etiqueta-corpo">
        <div className="etiqueta-topo">
          <div className="etiqueta-nome">{item.nome}</div>
          {item.codigo && <div className="etiqueta-codigo">{item.codigo}</div>}
        </div>

        <div className="etiqueta-tags">
          <span>{categoriaNome}</span>
          <span>{tipoNome}</span>
          {funcaoNome && <span>{funcaoNome}</span>}
        </div>

        <div className="etiqueta-qtd">
          <span className="num">{item.quantidade}</span>
          <span className="unidade">{item.unidade} disponível</span>
          {emprestado > 0 && <span className="emprestado">{emprestado} emprestado</span>}
          {abaixoMinimo && <span className="aviso">Estoque baixo</span>}
        </div>

        {acoes}
      </div>
    </div>
  )
}
