import { NavLink } from 'react-router-dom';
import { ShoppingBag, Package, Bike, Receipt, BarChart3, Folder, CreditCard, Menu, Settings as SettingsIcon } from 'lucide-react';

const navItems = [
    { to: '/', icon: ShoppingBag, label: 'Orders' },
    { to: '/categories', icon: Folder, label: 'Categories' },
    { to: '/items', icon: Package, label: 'Items' },
    { to: '/payment-methods', icon: CreditCard, label: 'Payment Methods' },
    { to: '/riders', icon: Bike, label: 'Riders' },
    { to: '/expenses', icon: Receipt, label: 'Expenses' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/settings', icon: SettingsIcon, label: 'Settings' },
];

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

const Sidebar = ({ collapsed, onToggle }: SidebarProps) => {
    return (
        <aside className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-100 flex flex-col shadow-sm z-40 transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}>
            {/* Logo */}
            <div className={`p-6 border-b border-gray-100 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
                {!collapsed && <h1 className="text-xl font-bold text-orange-500">🍔 Mr B</h1>}
                <button
                    onClick={onToggle}
                    className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                    {collapsed ? (
                        <Menu size={20} />
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {navItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? 'bg-orange-50 text-orange-600 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            } ${collapsed ? 'justify-center' : ''}`
                        }
                        title={collapsed ? item.label : ''}
                    >
                        <item.icon size={20} />
                        {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            {!collapsed && (
                <div className="p-4 border-t border-gray-100 text-center text-xs text-gray-400">
                    v1.1.4 — Auto-Update Test ✅
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
