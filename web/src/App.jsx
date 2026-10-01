import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './lib/state.jsx';
import { RouteProgress, ToastProvider, Page } from './components/ui.jsx';
import Landing from './pages/Landing.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import Login from './pages/admin/Login.jsx';
import Dashboard from './pages/admin/Dashboard.jsx';
import Certificates from './pages/admin/Certificates.jsx';
import Generate from './pages/admin/Generate.jsx';
import Settings from './pages/admin/Settings.jsx';

function NotFound() {
  return (
    <Page title="Not found">
      <div className="notfound">
        <p className="mono">404</p>
        <h1>That page doesn’t exist.</h1>
        <a className="btn" href="/">Back to the home page</a>
      </div>
    </Page>
  );
}

function RequireAuth({ children }) {
  const { ready, authed, error } = useApp();
  const loc = useLocation();
  if (error) return <div className="boot">Could not reach the server. {error}</div>;
  if (!ready) return <div className="boot"><span className="skel" style={{ width: 160, height: 12 }} /></div>;
  if (!authed) return <Navigate to="/admin/login" state={{ from: loc.pathname }} replace />;
  return children;
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <RouteProgress />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<RequireAuth><AdminLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="certificates" element={<Certificates />} />
            <Route path="generate" element={<Generate />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ToastProvider>
    </AppProvider>
  );
}
