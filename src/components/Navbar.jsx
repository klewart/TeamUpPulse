import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">TeamUpPulse</span>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {currentUser ? (
              <>
                <Link to="/profile" className="text-sm font-medium text-slate-700 hidden sm:block hover:text-blue-600 transition-colors">
                  {currentUser.displayName || currentUser.email}
                </Link>
                <Link to="/teams" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                  Discover Teams
                </Link>
                <Link to="/recommendations" className="text-slate-600 hover:text-slate-900 font-medium transition-colors flex items-center gap-1">
                  Smart Matches
                  <span className="flex h-2 w-2 relative -top-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                </Link>
                <Link to="/dashboard" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                  Dashboard
                </Link>
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                  Log in
                </Link>
                <Link to="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
