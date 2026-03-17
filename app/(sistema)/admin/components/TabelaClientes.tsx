'use client';

// AQUI ADICIONAMOS A CIDADE NO TIPO DO CLIENTE
type Cliente = { 
  id: string; 
  nome: string; 
  cpfCnpj: string | null; 
  email: string | null; 
  whatsapp: string | null; 
  status: string; 
  cidade: string | null; // <-- ADICIONADO
  conexoes: any[]; 
};

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
          <th>CIDADE</th>
          <th>CONTATO</th>
          <th>CPF/CNPJ</th>
          <th>AÇÕES</th>
        </tr>
      </thead>
      <tbody>
        {clientes.map(cli => (
          <tr key={cli.id}>
            <td><strong>{cli.nome}</strong></td>
            {/* EXIBINDO A CIDADE NA TABELA */}
            <td><span style={{fontSize:'12px', color:'#7f8c8d'}}>{cli.cidade || 'Não informada'}</span></td>
            <td>{cli.whatsapp || '---'}</td>
            <td>{cli.cpfCnpj || '---'}</td>
            <td>
              <button onClick={() => onEdit(cli)} style={{marginRight:'10px', background:'none', border:'none', cursor:'pointer'}}>✏️</button>
              <button onClick={() => onDelete(cli.id)} style={{background:'none', border:'none', cursor:'pointer'}}>🗑️</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}