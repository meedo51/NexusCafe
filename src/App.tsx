/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './store';
import POSLayout from './components/POSLayout';
import AppLayout from './components/AppLayout';
import EmployeesView from './features/employees/components/EmployeesView/EmployeesView';
import AuditLogViewer from './features/employees/components/AuditLog/AuditLogViewer';
import AuthProvider from './components/AuthProvider';

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <div className="min-h-screen bg-[var(--color-base)] text-white font-sans selection:bg-[var(--color-accent)] selection:text-[var(--color-base)]">
            <Routes>
              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/pos" replace />} />
                <Route path="pos" element={<POSLayout />} />
                <Route path="employees/*" element={<EmployeesView />} />
                <Route path="audit/*" element={<AuditLogViewer />} />
                <Route path="*" element={<div className="p-8 text-center w-full">Module not found</div>} />
              </Route>
            </Routes>
          </div>
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  );
}
