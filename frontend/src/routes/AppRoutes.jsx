import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";

// Auth
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

// Admin
import AdminDashboard from "../pages/admin/Dashboard";
import Departments from "../pages/admin/Departments";
import Users from "../pages/admin/Users";
import Vendors from "../pages/admin/Vendors";
import AuditLogs from "../pages/admin/AuditLogs";

// Procurement Manager
import RFQs from "../pages/procurement/RFQs";
import Quotations from "../pages/procurement/Quotations";
import BidComparison from "../pages/procurement/BidComparison";
import PurchaseOrders from "../pages/procurement/PurchaseOrders";

// Vendor
import VendorRFQs from "../pages/vendor/RFQs";

// Approver
import Approvals from "../pages/approver/Approvals";

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/departments"
          element={<Departments />}
        />

        <Route
          path="/admin/users"
          element={<Users />}
        />

        <Route
          path="/admin/vendors"
          element={<Vendors />}
        />

        <Route
          path="/admin/audit-logs"
          element={<AuditLogs />}
        />
      </Route>

      {/* Procurement Manager Routes */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["PROCUREMENT_MANAGER"]} />
        }
      >
        <Route
          path="/procurement/rfqs"
          element={<RFQs />}
        />

        <Route
          path="/procurement/quotations"
          element={<Quotations />}
        />

        <Route
          path="/procurement/bid-comparison"
          element={<BidComparison />}
        />

        <Route
          path="/procurement/purchase-orders"
          element={<PurchaseOrders />}
        />
      </Route>

      {/* Vendor Routes */}
      <Route element={<ProtectedRoute allowedRoles={["VENDOR"]} />}>
        <Route
          path="/vendor/rfqs"
          element={<VendorRFQs />}
        />

        <Route
          path="/vendor/quotations"
          element={<Quotations />}
        />

        <Route
          path="/vendor/purchase-orders"
          element={<PurchaseOrders />}
        />
      </Route>

      {/* Approver Routes */}
      <Route element={<ProtectedRoute allowedRoles={["APPROVER"]} />}>
        <Route
          path="/approver/approvals"
          element={<Approvals />}
        />
      </Route>

      {/* Default Routes */}
      <Route
        path="/"
        element={<Navigate to="/login" replace />}
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}

export default AppRoutes;