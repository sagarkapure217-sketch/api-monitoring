import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { logout } = useAuth();

  return (
    <nav className="bg-white border-b border-[#e2e8f0] shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="text-lg font-bold text-[#0f172a] tracking-tight">
          API Monitor
        </div>
        <button
          onClick={logout}
          className="btn-secondary px-3 py-1.5 text-xs font-semibold"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
