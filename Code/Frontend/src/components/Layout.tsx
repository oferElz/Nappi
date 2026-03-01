import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLayoutContext } from './LayoutContext';
import ChatFloatingButton from './ChatFloatingButton';
import { removeSession } from '../utils/session';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { menuOpen, setMenuOpen } = useLayoutContext();

  const handleLogout = () => {
    removeSession();
    setMenuOpen(false);
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-b from-[#fee2d6] via-[#FAFBFC] to-[#e2f9fb] p-0 md:p-8 overflow-x-hidden relative">
      
      {/* Decorative background clouds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img src="/Vector1.svg" alt="" className="absolute top-[10%] left-[20%] w-[200px] h-[100px] opacity-60" />
        <img src="/Vector.svg" alt="" className="absolute top-[5%] right-[5%] w-[120px] h-[60px] opacity-40" />
        <img src="/Vector1.svg" alt="" className="absolute top-[60%] left-[25%] w-[250px] h-[150px]" />
        <img src="/Vector.svg" alt="" className="absolute top-[50%] right-[15%] w-[150px] h-[70px] opacity-50" />
      </div>

      {/* Burger Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
      )}

      {/* Burger Menu Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-60 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-semibold font-[Kodchasan]">Menu</h3>
            <button onClick={() => setMenuOpen(false)} className="text-2xl text-gray-600 hover:text-gray-800">✕</button>
          </div>

          <nav className="flex flex-col gap-4">
            <button onClick={() => { navigate('/'); setMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive('/') ? 'bg-[#4ECDC4]/10 text-[#4ECDC4]' : 'hover:bg-gray-100 text-gray-700'}`}>
              <img src="/Home.svg" alt="" className="w-7 h-7" />
              Home
            </button>
            <button onClick={() => { navigate('/statistics'); setMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive('/statistics') ? 'bg-[#4ECDC4]/10 text-[#4ECDC4]' : 'hover:bg-gray-100 text-gray-700'}`}>
              <img src="/Statistics.svg" alt="" className="w-7 h-7" />
              Statistics
            </button>
            <button onClick={() => { navigate('/notifications'); setMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive('/notifications') ? 'bg-[#4ECDC4]/10 text-[#4ECDC4]' : 'hover:bg-gray-100 text-gray-700'}`}>
              <img src="/Notification.svg" alt="" className="w-7 h-7" />
              Notification
            </button>
            <button onClick={() => { navigate('/user'); setMenuOpen(false); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive('/user') ? 'bg-[#4ECDC4]/10 text-[#4ECDC4]' : 'hover:bg-gray-100 text-gray-700'}`}>
              <img src="/Profile.svg" alt="" className="w-7 h-7" />
              Profile
            </button>
          </nav>
        </div>

        <div className="p-6 border-t border-gray-200">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-gray-700 font-medium hover:bg-red-50 transition-all">
            Log Out
          </button>
        </div>
      </div>

      <div className="w-full h-full md:h-auto md:max-w-2xl lg:max-w-3xl relative flex flex-col min-h-screen md:min-h-[600px] isolate">
        {children}
      </div>
      
      {/* Floating Chat Button */}
      <ChatFloatingButton />
    </div>
  );
};

export default Layout;