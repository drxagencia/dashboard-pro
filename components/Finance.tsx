import React, { useEffect, useState, useMemo } from 'react';
import * as database from 'firebase/database';
import { db } from '../services/firebase';
import { Order } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, DollarSign, Calendar } from 'lucide-react';

interface FinanceProps {
  companyId: string;
}

export const Finance: React.FC<FinanceProps> = ({ companyId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    const ordersRef = database.ref(db, `empresas/${companyId}/pedidos`);
    const unsubscribe = database.onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      const loaded: Order[] = [];
      if (data) Object.values(data).forEach((o: any) => loaded.push(o));
      setOrders(loaded);
    });
    return () => unsubscribe();
  }, [companyId]);

  const stats = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    
    // Filter orders for selected month and only 'finalizado'
    const monthOrders = orders.filter(o => {
        if (o.status !== 'finalizado' && o.status !== 'entregue') return false;
        if (!o.data_hora) return false;
        const [d, m, y] = o.data_hora.split(' ')[0].split('/');
        return y === year && m === month;
    });

    const totalRevenue = monthOrders.reduce((acc, curr) => acc + Number(curr.total_pedido || 0), 0);
    const estimatedProfit = totalRevenue * 0.40; // 40% margin based on original code

    // Group by Day for Chart
    const dailyData: Record<number, number> = {};
    monthOrders.forEach(o => {
        const day = parseInt(o.data_hora.split(' ')[0].split('/')[0], 10);
        dailyData[day] = (dailyData[day] || 0) + Number(o.total_pedido || 0);
    });

    const chartData = Object.keys(dailyData).map(d => ({
        day: `Dia ${d}`,
        amount: dailyData[Number(d)]
    })).sort((a, b) => {
        const dayA = parseInt(a.day.replace('Dia ', ''));
        const dayB = parseInt(b.day.replace('Dia ', ''));
        return dayA - dayB;
    });

    return { totalRevenue, estimatedProfit, count: monthOrders.length, chartData };
  }, [orders, selectedMonth]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-surface p-4 rounded-lg border border-slate-700">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="text-neonGreen" /> Dashboard Financeiro
        </h2>
        <input 
          type="month" 
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-neonGreen"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface border border-slate-700 p-6 rounded-xl shadow-lg">
          <div className="text-slate-400 mb-1 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Faturamento Mensal
          </div>
          <div className="text-3xl font-bold text-white">
            R$ {stats.totalRevenue.toFixed(2)}
          </div>
        </div>
        <div className="bg-surface border border-slate-700 p-6 rounded-xl shadow-lg">
          <div className="text-slate-400 mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Lucro Estimado (40%)
          </div>
          <div className="text-3xl font-bold text-neonGreen">
            R$ {stats.estimatedProfit.toFixed(2)}
          </div>
        </div>
        <div className="bg-surface border border-slate-700 p-6 rounded-xl shadow-lg">
          <div className="text-slate-400 mb-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Pedidos Concluídos
          </div>
          <div className="text-3xl font-bold text-neonBlue">
            {stats.count}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-slate-700 p-6 rounded-xl shadow-lg h-[400px]">
        <h3 className="text-lg font-bold text-white mb-4">Performance Diária</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stats.chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="day" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" tickFormatter={(val) => `R$${val}`} />
            <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
                itemStyle={{ color: '#10b981' }}
            />
            <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]}>
              {stats.chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#3b82f6' : '#2563eb'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};