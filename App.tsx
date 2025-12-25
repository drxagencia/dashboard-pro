import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, findCompanyIdByEmail } from './services/firebase';
import { Login } from './components/Login';
import { Orders } from './components/Orders';
import { Finance } from './components/Finance';
import { Stock } from './components/Stock';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  DollarSign, 
  Package, 
  LogOut, 
  Terminal,
  AlertTriangle
} from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [view, setView] = useState<'pedidos' | 'financeiro' | 'estoque'>('pedidos');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setAuthError(null);
      if (currentUser && currentUser.email) {
        try {
          // This matches the original logic of finding the company by owner email.
          // IMPORTANT: This may fail if Database Rules prevent reading root "empresas".
          const id = await findCompanyIdByEmail(currentUser.email);
          if (id) {
            setCompanyId(id);
            setUser(currentUser);
          } else {
            setAuthError("Usuário sem empresa vinculada ou erro de permissão no banco.");
            await signOut(auth);
          }
        } catch (err) {
            console.error(err);
            setAuthError("Erro de Conexão: Verifique as Regras do Firebase Database.");
            await signOut(auth);
        }
      } else {
        setUser(null);
        setCompanyId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-neonBlue border-t-transparent rounded-full animate-spin mb-4"></div>
        <p>Carregando sistema...</p>
      </div>
    );
  }

  if (!user || !companyId) {
    return (
      <>
        {authError && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-900 text-white px-6 py-3 rounded-lg shadow-xl border border-red-500 z-50 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5"/> {authError}
            </div>
        )}
        <Login />
      </>
    );
  }

  const companyNameFormatted = companyId.replace(/_/g, ' ').toUpperCase();

  return (
    <div className="min-h-screen bg-background text-slate-200 font-sans">
      {/* Sidebar / Navigation (Mobile Top, Desktop Left) */}
      <nav className="fixed md:left-0 md:top-0 md:h-full md:w-64 w-full h-auto bg-surface border-b md:border-b-0 md:border-r border-slate-700 z-40 flex md:flex-col justify-between p-4">
        
        {/* Brand */}
        <div className="mb-0 md:mb-8 flex items-center gap-2 md:block">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <Terminal className="text-neonBlue" />
            <span className="truncate max-w-[150px]">{companyNameFormatted}</span>
          </div>
          <span className="hidden md:block text-xs text-neonBlue mt-1 font-mono tracking-widest">ADMIN PANEL</span>
        </div>

        {/* Links */}
        <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          <button 
            onClick={() => setView('pedidos')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${view === 'pedidos' ? 'bg-neonBlue text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <ShoppingBag className="w-5 h-5" /> <span className="hidden md:inline">Pedidos</span>
          </button>
          
          <button 
            onClick={() => setView('financeiro')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${view === 'financeiro' ? 'bg-neonBlue text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <DollarSign className="w-5 h-5" /> <span className="hidden md:inline">Financeiro</span>
          </button>
          
          <button 
            onClick={() => setView('estoque')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${view === 'estoque' ? 'bg-neonBlue text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Package className="w-5 h-5" /> <span className="hidden md:inline">Cardápio/Estoque</span>
          </button>
        </div>

        {/* Footer Actions */}
        <div className="hidden md:block mt-auto border-t border-slate-700 pt-4">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 w-full transition-all"
          >
            <LogOut className="w-5 h-5" /> Sair
          </button>
        </div>
      </nav>

      {/* Mobile Logout (Top Right) */}
      <button 
        onClick={handleLogout}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-slate-800 rounded-full text-slate-400 border border-slate-700"
      >
        <LogOut className="w-5 h-5" />
      </button>

      {/* Main Content */}
      <main className="md:ml-64 pt-24 md:pt-8 p-4 md:p-8 max-w-7xl mx-auto">
        {view === 'pedidos' && <Orders companyId={companyId} />}
        {view === 'financeiro' && <Finance companyId={companyId} />}
        {view === 'estoque' && <Stock companyId={companyId} />}
      </main>
    </div>
  );
};

export default App;