import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute({ allowedRoles }) {
  const token = localStorage.getItem("access_token");

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    localStorage.removeItem("user");
  }

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  const role = String(user.role || "").trim().toUpperCase();

  const roleRoutes = {
    ADMIN: "/admin/dashboard",
    PROCUREMENT_MANAGER: "/procurement/rfqs",
    VENDOR: "/vendor/rfqs",
    APPROVER: "/approver/approvals",
  };

  if (!role || !roleRoutes[role]) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={roleRoutes[role]} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;