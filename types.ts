export interface StockItem {
  id: string;
  nome: string;
  disponivel: boolean;
  preco?: number;
}

export interface OrderItem {
  produto: string;
  sabores?: string[];
  recheios?: string[];
  adicionais?: { nome: string; valor?: number }[];
  quantidade: number;
}

export interface Order {
  id: string;
  display_id?: string;
  status: 'pendente' | 'preparo' | 'entrega' | 'finalizado' | 'cancelado' | 'em_transporte' | 'entregue';
  data_hora: string;
  total_pedido: string | number;
  cliente: {
    nome: string;
    whatsapp: string;
  };
  endereco: string | {
    rua?: string;
    bairro?: string;
    ref?: string;
    numero?: string;
  };
  pagamento: {
    metodo: string;
    troco?: string;
  };
  itens: OrderItem[];
}

export interface CompanyData {
  config: {
    email_dono: string;
    nome_fantasia?: string;
  };
  pedidos?: Record<string, Order>;
  cardapio?: {
    sabores?: Record<string, StockItem> | StockItem[];
    recheios?: Record<string, StockItem> | StockItem[];
    adicionais?: Record<string, StockItem> | StockItem[];
  };
}