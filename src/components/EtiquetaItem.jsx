import { useState } from 'react'

export default function EtiquetaItem({ item, categoriaNome, tipoNome, funcaoNome, podeVerOculto, acoes }) {
  const [mostrarOculto, setMostrarOculto] = useState(false)
  const abaixoMinimo = Number(item.quantidade) <= Number(item.quantidade_minima)

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
          <span className="unidade">{item.unidade}</span>
          {abaixoMinimo && <span className="aviso">Estoque baixo</span>}
        </div>

        {podeVerOculto && (item.nota_fiscal || item.data_compra || item.loja) && (
          <div className="etiqueta-oculta">
            {mostrarOculto ? (
              <>
                {item.nota_fiscal && <div>Nota fiscal: {item.nota_fiscal}</div>}
                {item.data_compra && <div>Comprado em: {item.data_compra}</div>}
                {item.loja && <div>Loja/fornecedor: {item.loja}</div>}
              </>
            ) : (
              <button onClick={() => setMostrarOculto(true)}>Ver dados de compra</button>
            )}
          </div>
        )}

        {acoes}
      </div>
    </div>
  )
}
