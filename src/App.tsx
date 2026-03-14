import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import LicenseScreen from './components/LicenseScreen';
import Sidebar from './components/Sidebar';
import Orders from './pages/Orders';
import Categories from './pages/Categories';
import Items from './pages/Items';
import PaymentMethods from './pages/PaymentMethods';
import Riders from './pages/Riders';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import OtherSales from './pages/OtherSales';
import UpdateNotification from './components/UpdateNotification';

function App() {
  const [licenseValid, setLicenseValid] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    checkLicense();
  }, []);

  const checkLicense = async () => {
    if (window.api) {
      try {
        const result = await window.api.checkLicense();
        if (result.success) {
          setLicenseValid(result.valid);
        } else {
          setLicenseValid(false);
        }
      } catch (error) {
        console.error('Error checking license:', error);
        setLicenseValid(false);
      } finally {
        setChecking(false);
      }
    } else {
      setLicenseValid(false);
      setChecking(false);
    }
  };

  // Show loading state while checking license
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking license...</p>
        </div>
      </div>
    );
  }

  // Show license screen if license is not valid
  if (!licenseValid) {
    return (
      <ToastProvider>
        <LicenseScreen />
      </ToastProvider>
    );
  }

  // Show main app if license is valid
  return (
    <ToastProvider>
      <HashRouter>
        <div className="flex min-h-screen bg-gray-50 font-sans">
          <Sidebar
            collapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
          <main className={`flex-1 min-w-0 transition-all duration-300 ${!isSidebarCollapsed ? 'ml-64' : 'ml-20'}`}>
            <Routes>
              <Route path="/" element={<Orders />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/items" element={<Items />} />
              <Route path="/payment-methods" element={<PaymentMethods />} />
              <Route path="/riders" element={<Riders />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/other-sales" element={<OtherSales />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<div className="p-8">Page Not Found</div>} />
            </Routes>
          </main>
        </div>
      </HashRouter>
      <UpdateNotification />
    </ToastProvider>
  );
}

export default App;

