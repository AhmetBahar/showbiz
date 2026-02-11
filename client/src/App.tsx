import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import MainLayout from './components/common/MainLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VenueListPage from './pages/VenueListPage';
import VenueWizardPage from './pages/VenueWizardPage';
import VenueDetailPage from './pages/VenueDetailPage';
import ShowListPage from './pages/ShowListPage';
import ShowCreatePage from './pages/ShowCreatePage';
import ShowDetailPage from './pages/ShowDetailPage';
import TicketSalesPage from './pages/TicketSalesPage';
import CheckinPage from './pages/CheckinPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <MainLayout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/venues" element={<VenueListPage />} />
                <Route path="/venues/new" element={<AdminRoute><VenueWizardPage /></AdminRoute>} />
                <Route path="/venues/:id" element={<VenueDetailPage />} />
                <Route path="/shows" element={<ShowListPage />} />
                <Route path="/shows/new" element={<AdminRoute><ShowCreatePage /></AdminRoute>} />
                <Route path="/shows/:id" element={<ShowDetailPage />} />
                <Route path="/shows/:id/tickets" element={<TicketSalesPage />} />
                <Route path="/shows/:id/checkin" element={<CheckinPage />} />
                <Route path="/shows/:id/reports" element={<ReportsPage />} />
                <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
              </Routes>
            </MainLayout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
