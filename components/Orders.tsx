import React, { useEffect, useState } from 'react';
import * as database from 'firebase/database';
import { db, updateOrderStatus } from '../services/firebase';
import { Order } from '../types';
import { Clock, CheckCircle2, XCircle, Truck, ChefHat, MapPin, DollarSign, User } from 'lucide-react';

interface OrdersProps {
  companyId: string;
}

export const Orders: React.FC<OrdersProps> = ({ companyId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const ordersRef = database.ref(db, `empresas/${companyId}/pedidos`);
    const unsubscribe = database.onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      const loadedOrders: Order[] = [];
      if (data) {
        Object.keys(data).forEach((key) => {
          loadedOrders.push({ id: key, ...data[key] });
        });
      }
      // Sort by newest first
      loadedOrders.sort((a, b) => (a.id < b.id ? 1 : -1)); // Assuming Lexicographical ID or Timestamp based ID
      setOrders(loadedOrders);
    });

    return () => unsubscribe();
  }, [companyId]);

  const filteredOrders = orders.filter(order => {
    if (!order.data_hora) return false;
    // Handle "DD/MM/YYYY" format
    const [day, month, year] = order.data_hora.split(' ')[0].split('/');
    // Handle filterDate "YYYY-MM-DD"
    const [fYear, fMonth, fDay] = filterDate.split('-');
    return day === fDay && month === fMonth && year === fYear;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
      case 'preparo': return 'bg-orange-500/20 text-orange-500 border-orange-500/50';
      case 'entrega': return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
      case 'finalizado': return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 'cancelado': return 'bg-red-500/20 text-red-500 border-red-500/50';
      default: return 'bg-slate-500/20 text-slate-500 border-slate-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'preparo': return <ChefHat className="w-4 h-4" />;
      case 'entrega': return <Truck className="w-4 h-4" />;
      case 'finalizado': return <CheckCircle2 className="w-4 h-4" />;
      case 'cancelado': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatAddress = (addr: any) => {
    if (typeof addr === 'string') return addr;
    if (!addr) return 'Retirada';
    return `${addr.rua || ''}, ${addr.bairro || ''} ${addr.numero ? '- ' + addr.numero : ''}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-surface p-4 rounded-lg border border-slate-700">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Clock className="text-neonBlue" /> Pedidos do Dia
        </h2>
        <input 
          type="date" 
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-neonBlue"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full text-center py-20 text-slate-500">
            Nenhum pedido encontrado para esta data.
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className="bg-surface border border-slate-700 rounded-xl p-5 flex flex-col shadow-lg hover:border-slate-600 transition-colors">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <span className="text-lg font-mono font-bold text-white">
                  {order.display_id || `#${order.id.slice(-4)}`}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1 uppercase ${getStatusColor(order.status)}`}>
                  {getStatusIcon(order.status)}
                  {order.status}
                </span>
              </div>

              {/* Customer Info */}
              <div className="space-y-2 mb-4 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-neonBlue" />
                  <span className="font-semibold">{order.cliente?.nome || 'Cliente não identificado'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-neonBlue mt-0.5" />
                  <span className="text-xs text-slate-400">{formatAddress(order.endereco)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-neonGreen" />
                  <span className="text-neonGreen font-bold">R$ {order.total_pedido}</span>
                  <span className="text-xs text-slate-500">({order.pagamento?.metodo})</span>
                </div>
              </div>

              {/* Items */}
              <div className="bg-slate-900/50 p-3 rounded-lg mb-4 flex-1 overflow-y-auto max-h-40">
                {order.itens?.map((item, idx) => (
                  <div key={idx} className="mb-2 last:mb-0 border-b border-slate-800 last:border-0 pb-2 last:pb-0">
                    <div className="text-sm font-bold text-white">
                      {item.quantidade}x {item.produto}
                    </div>
                    <div className="text-xs text-slate-400 pl-4">
                      {item.sabores && item.sabores.length > 0 && <p>Sabores: {item.sabores.join(', ')}</p>}
                      {item.adicionais && item.adicionais.length > 0 && <p>Add: {item.adicionais.map(a => a.nome).join(', ')}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 mt-auto">
                {(!order.status || order.status === 'pendente') && (
                  <>
                    <button 
                      onClick={() => updateOrderStatus(companyId, order.id, 'cancelado')}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/50 py-2 rounded font-bold text-sm transition-colors"
                    >
                      Recusar
                    </button>
                    <button 
                      onClick={() => updateOrderStatus(companyId, order.id, 'preparo')}
                      className="bg-neonBlue hover:bg-blue-600 text-white py-2 rounded font-bold text-sm transition-colors"
                    >
                      Aceitar
                    </button>
                  </>
                )}
                {order.status === 'preparo' && (
                  <button 
                    onClick={() => updateOrderStatus(companyId, order.id, 'entrega')}
                    className="col-span-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Truck className="w-4 h-4" /> Saiu para Entrega
                  </button>
                )}
                {order.status === 'entrega' && (
                  <button 
                    onClick={() => updateOrderStatus(companyId, order.id, 'finalizado')}
                    className="col-span-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Concluir Pedido
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};