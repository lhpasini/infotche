export type OrcamentoItemInput = {
  id?: string;
  ordem: number;
  quantidade: number;
  descricao: string;
  descricaoDetalhada?: string;
  valorUnitario: number;
};

export type OrcamentoEditorData = {
  id?: string;
  numero?: number;
  titulo: string;
  clienteNome: string;
  clienteDocumento: string;
  clienteContato: string;
  clienteEmail: string;
  clienteEndereco: string;
  clienteCidade: string;
  status: string;
  fonteTitulo: string;
  fonteCorpo: string;
  corDestaque: string;
  validadeDias: number;
  descontoVistaPercentual: number;
  descontoVistaObservacao: string;
  parcelamentoObservacao: string;
  parcelaMinima: number;
  maxParcelas: number;
  observacoes: string;
  notaInterna: string;
  itens: OrcamentoItemInput[];
  criadoEm?: string;
  atualizadoEm?: string;
};

export type OrcamentoResumo = {
  subtotal: number;
  descontoVistaValor: number;
  totalFinal: number;
  parcelasSemJuros: Array<{
    quantidade: number;
    valorParcela: number;
    totalParcelado: number;
  }>;
  parcelasComJuros: Array<{
    quantidade: number;
    valorParcela: number;
    totalParcelado: number;
    taxaMensal: number;
  }>;
};

export type ProdutoCatalogoInput = {
  id?: string;
  categoria: string;
  nome: string;
  descricaoCurta: string;
  descricaoDetalhada: string;
  precoBase: number;
  ativo: boolean;
  recorrente: boolean;
  ordem: number;
};

export const FONTES_DISPONIVEIS = [
  "Georgia",
  "Arial",
  "Trebuchet MS",
  "Verdana",
  "Times New Roman",
  "Garamond",
] as const;

export function criarOrcamentoVazio(): OrcamentoEditorData {
  return {
    titulo: "Proposta Comercial",
    clienteNome: "",
    clienteDocumento: "",
    clienteContato: "",
    clienteEmail: "",
    clienteEndereco: "",
    clienteCidade: "Santa Barbara do Sul - RS",
    status: "RASCUNHO",
    fonteTitulo: "Georgia",
    fonteCorpo: "Arial",
    corDestaque: "#1d4ed8",
    validadeDias: 15,
    descontoVistaPercentual: 7,
    descontoVistaObservacao: "Desconto a vista valido para PIX ou dinheiro.",
    parcelamentoObservacao: "Parcelamento em ate 6x sem juros ou ate 12x com juros de 3,99% ao mes.",
    parcelaMinima: 150,
    maxParcelas: 12,
    observacoes: "",
    notaInterna: "",
    itens: [
      {
        ordem: 0,
        quantidade: 1,
        descricao: "",
        descricaoDetalhada: "",
        valorUnitario: 0,
      },
    ],
  };
}

export function arredondarMoeda(valor: number) {
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}

export function normalizarQuantidade(quantidade: number) {
  return quantidade > 0 ? quantidade : 1;
}

export function calcularItemTotal(item: OrcamentoItemInput) {
  return arredondarMoeda(normalizarQuantidade(item.quantidade) * item.valorUnitario);
}

function calcularParcelaComJuros(total: number, taxaMensal: number, parcelas: number) {
  const taxa = taxaMensal / 100;
  if (parcelas <= 0) return 0;
  if (taxa <= 0) return total / parcelas;
  const fator = Math.pow(1 + taxa, parcelas);
  return (total * taxa * fator) / (fator - 1);
}

export function gerarParcelasSemJuros(totalFinal: number, parcelaMinima: number) {
  const parcelas: OrcamentoResumo["parcelasSemJuros"] = [];

  for (let quantidade = 1; quantidade <= 6; quantidade += 1) {
    const valorParcela = arredondarMoeda(totalFinal / quantidade);

    if (quantidade === 1 || valorParcela >= parcelaMinima) {
      parcelas.push({
        quantidade,
        valorParcela,
        totalParcelado: arredondarMoeda(valorParcela * quantidade),
      });
    }
  }

  return parcelas;
}

export function gerarParcelasComJuros(totalFinal: number, parcelaMinima: number, taxaMensal: number) {
  const parcelas: OrcamentoResumo["parcelasComJuros"] = [];

  for (let quantidade = 7; quantidade <= 12; quantidade += 1) {
    const valorParcela = arredondarMoeda(
      calcularParcelaComJuros(totalFinal, taxaMensal, quantidade),
    );

    if (valorParcela >= parcelaMinima) {
      parcelas.push({
        quantidade,
        valorParcela,
        totalParcelado: arredondarMoeda(valorParcela * quantidade),
        taxaMensal,
      });
    }
  }

  return parcelas;
}

export function calcularResumo(orcamento: OrcamentoEditorData): OrcamentoResumo {
  const subtotal = arredondarMoeda(
    orcamento.itens.reduce((acc, item) => {
      if (!item.descricao.trim() && !item.valorUnitario && !item.quantidade) {
        return acc;
      }

      return acc + calcularItemTotal(item);
    }, 0),
  );

  const descontoVistaValor = arredondarMoeda(
    subtotal * ((orcamento.descontoVistaPercentual || 0) / 100),
  );
  const totalFinal = arredondarMoeda(subtotal - descontoVistaValor);

  return {
    subtotal,
    descontoVistaValor,
    totalFinal,
    parcelasSemJuros: gerarParcelasSemJuros(
      totalFinal,
      orcamento.parcelaMinima || 150,
    ),
    parcelasComJuros: gerarParcelasComJuros(
      totalFinal,
      orcamento.parcelaMinima || 150,
      3.99,
    ),
  };
}

export function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor || 0);
}

export function formatarData(valor?: string) {
  if (!valor) return "";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(valor));
}
