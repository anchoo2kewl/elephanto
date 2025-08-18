import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { VelvetHourLogo } from './VelvetHourLogo';
import { LogOut, Settings, Shield, User, Menu, X } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-purple-800 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        {children}
      </div>
    );
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: User },
    { path: '/settings', label: 'My Profile', icon: Settings },
    ...(user.role === 'admin' ? [{ path: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black dark:from-black dark:via-gray-900 dark:to-black overflow-x-hidden">
      {/* Header */}
      <header className="p-1 sm:p-4">
        <div className="max-w-6xl mx-auto">
          <GlassCard className="p-2 sm:p-4">
            {/* Mobile Layout */}
            <div className="block sm:block md:hidden lg:hidden xl:hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <VelvetHourLogo size="small" />
                  <h1 className="text-base font-bold text-yellow-600 dark:text-yellow-400">
                    Velvet Hour
                  </h1>
                </div>
                
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200"
                >
                  {isMobileMenuOpen ? (
                    <X className="h-5 w-5 text-gray-900 dark:text-white" />
                  ) : (
                    <Menu className="h-5 w-5 text-gray-900 dark:text-white" />
                  )}
                </button>
              </div>
              
              {/* Mobile Menu Dropdown */}
              {isMobileMenuOpen && (
                <div className="mt-3 pt-3 border-t border-white/20">
                  <nav className="space-y-2">
                    {navItems.map(({ path, label, icon: Icon }) => (
                      <Link
                        key={path}
                        to={path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                          location.pathname === path
                            ? 'bg-blue-600/20 text-blue-800 dark:text-blue-200'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </Link>
                    ))}
                  </nav>
                  
                  <div className="mt-3 pt-3 border-t border-white/20 space-y-2">
                    <div className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Welcome, {user.name?.split(' ')[0] || user.email.split('@')[0]}
                      </span>
                      <ThemeToggle />
                    </div>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-500/30 transition-all duration-200"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Layout */}
            <div className="hidden md:flex lg:flex xl:flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <VelvetHourLogo size="medium" />
                <h1 className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  Velvet Hour
                </h1>
                <nav className="flex space-x-6">
                  {navItems.map(({ path, label, icon: Icon }) => (
                    <Link
                      key={path}
                      to={path}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                        location.pathname === path
                          ? 'bg-blue-600/20 text-blue-800 dark:text-blue-200'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="text-gray-700 dark:text-gray-300 text-sm mr-2">
                  Welcome, {user.name || user.email}
                </div>
                <ThemeToggle />
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-500/30 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-1 sm:p-4 overflow-x-hidden">
        <div className="max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};
