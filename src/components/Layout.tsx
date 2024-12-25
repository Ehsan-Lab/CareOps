import React from 'react';
import { Link, Outlet, useLocation, NavLink } from 'react-router-dom';
import { Heart, Users, Wallet, Utensils, Menu, CircleDollarSign, UserRound, CreditCard, FileText, LogOut, LayoutDashboard, DollarSign, Gift, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Layout: React.FC = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { signOut } = useAuth();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Donors', href: '/donors', icon: Users },
    { name: 'Donations', href: '/donations', icon: Gift },
    { name: 'Feeding Rounds', href: '/feeding-rounds', icon: Utensils },
    { name: 'Treasury', href: '/treasury', icon: Wallet },
    { name: 'Beneficiaries', href: '/beneficiaries', icon: UserCheck },
    { name: 'Payment Requests', href: '/payment-requests', icon: FileText },
    { name: 'Transactions', href: '/transactions', icon: DollarSign }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white shadow-sm p-4">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-gray-500 hover:text-gray-600"
          title="Toggle menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex h-16 items-center justify-center border-b border-gray-200">
          <h1 className="text-xl font-bold text-indigo-600">Care-Ops</h1>
        </div>

        <nav className="mt-5 space-y-1 px-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`group flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                  isActive(item.href)
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive(item.href)
                      ? 'text-indigo-600'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {item.name}
              </NavLink>
            );
          })}

          <button
            onClick={signOut}
            className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
            Sign Out
          </button>
        </nav>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="py-8 px-4 sm:px-6 lg:px-8">
          <div className="mt-8 lg:mt-0">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;