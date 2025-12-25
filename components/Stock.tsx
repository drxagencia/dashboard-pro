import React, { useEffect, useState } from 'react';
import * as database from 'firebase/database';
import { db, toggleStockItem } from '../services/firebase';
import { StockItem } from '../types';
import { Layers, ListPlus, Pizza } from 'lucide-react';

interface StockProps {
  companyId: string;
}

const ToggleGroup = ({ title, icon: Icon, path }: { title: string, icon: any, path: string }) => {
  const [items, setItems] = useState<StockItem[]>([]);

  useEffect(() => {
    const itemRef = database.ref(db, path);
    const unsubscribe = database.onValue(itemRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Handle both array and object structures from Firebase
        const list = Array.isArray(data) 
          ? data.map((item, idx) => ({ ...item, id: idx.toString() }))
          : Object.keys(data).map(key => ({ ...data[key], id: key }));
        setItems(list);
      } else {
        setItems([]);
      }
    });
    return () => unsubscribe();
  }, [path]);

  const handleToggle = (item: StockItem) => {
    // Determine the key/index. If using array in DB, ID is index.
    const newStatus = item.disponivel === false ? true : false;
    toggleStockItem(`${path}/${item.id}`, newStatus);
  };

  return (
    <div className="bg-surface border border-slate-700 rounded-xl p-5 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Icon className="text-neonBlue" /> {title}
      </h3>
      <div className="space-y-3">
        {items.map((item) => {
          const isAvailable = item.disponivel !== false; // Default to true if undefined
          return (
            <div 
              key={item.id} 
              className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                isAvailable ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-900 border-slate-800 opacity-60'
              }`}
            >
              <span className={`font-medium ${isAvailable ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                {item.nome}
              </span>
              <button
                onClick={() => handleToggle(item)}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out ${
                  isAvailable ? 'bg-neonGreen' : 'bg-slate-600'
                }`}
              >
                <div 
                  className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                    isAvailable ? 'translate-x-6' : 'translate-x-0'
                  }`} 
                />
              </button>
            </div>
          )
        })}
        {items.length === 0 && <p className="text-slate-500 text-sm italic">Nenhum item cadastrado.</p>}
      </div>
    </div>
  );
};

export const Stock: React.FC<StockProps> = ({ companyId }) => {
  const basePath = `empresas/${companyId}/cardapio`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <ToggleGroup 
        title="Sabores" 
        icon={Pizza} 
        path={`${basePath}/sabores`} 
      />
      <ToggleGroup 
        title="Recheios" 
        icon={Layers} 
        path={`${basePath}/recheios`} 
      />
      <ToggleGroup 
        title="Adicionais" 
        icon={ListPlus} 
        path={`${basePath}/adicionais`} 
      />
    </div>
  );
};