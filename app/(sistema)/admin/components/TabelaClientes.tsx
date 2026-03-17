'use client';

type Conexao = { id: string; contratoMhnet: string | null; endereco: string; bairro: string | null; pppoe: string | null; senhaPpoe: string | null; };
type Cliente = { id: string; nome: string; cpfCnpj: string | null; email: string | null; whatsapp: string | null; status: string; conexoes: Conexao[]; };

interface Props {
  clientes: Cliente[];
  onEdit: (cli: Cliente) => void;
  onDelete: (id: string) => void;
}

export function TabelaClientes({ clientes, onEdit, onDelete }: Props) {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>NOME</th>
          <th>CONTATO</th>
          <th>INSTALAÇÕES</th>
          <th>AÇÕES</th>
        </tr>
      </thead>
      <tbody>
        {clientes.map(cli => (
          <tr key={cli.id}>
            <td><strong>{cli.nome}</strong></td>
            <td>{cli.whatsapp || '---'}</td>
            <td><span style={{ background: '#eef2f5', padding: '3px 8px', borderRadius: '10px', fontSize: '11px' }}>{cli.conexoes.length} local(is)</span></td>
            <td>
              <button onClick={() => onEdit(cli)} style={{ marginRight: '15px', cursor: 'pointer', background: 'none', border: 'none' }}>✏️</button>
              <button onClick={() => onDelete(cli.id)} style={{ cursor: 'pointer', background: 'none', border: 'none' }}>🗑️</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}