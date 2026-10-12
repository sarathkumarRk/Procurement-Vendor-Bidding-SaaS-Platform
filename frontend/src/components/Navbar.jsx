import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  LogOut,
  ShoppingCart,
  LayoutDashboard,
  Users,
  Building2,
  Truck,
  FileText,
  ClipboardList,
  GitCompare,
  ShoppingBag,
  CheckCircle,
  History,
} from "lucide-react";
import { toast } from "react-toastify";

function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const token = localStorage.getItem("access_token");
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  if (!token || !user) {
    return null;
  }

  const role = user.role;

  const roleMenus = {
    ADMIN: [
      {
        label: "Dashboard",
        path: "/admin/dashboard",
        icon: LayoutDashboard,
      },
      { label: "Users", path: "/admin/users", icon: Users },
      {
        label: "Departments",
        path: "/admin/departments",
        icon: Building2,
      },
      { label: "Vendors", path: "/admin/vendors", icon: Truck },
      {
        label: "Audit Logs",
        path: "/admin/audit-logs",
        icon: History,
      },
    ],

    PROCUREMENT_MANAGER: [
      {
        label: "RFQs",
        path: "/procurement/rfqs",
        icon: FileText,
      },
      {
        label: "Quotations",
        path: "/procurement/quotations",
        icon: ClipboardList,
      },
      {
        label: "Bid Comparison",
        path: "/procurement/bid-comparison",
        icon: GitCompare,
      },
      {
        label: "Purchase Orders",
        path: "/procurement/purchase-orders",
        icon: ShoppingBag,
      },
    ],

    VENDOR: [
      {
        label: "Published RFQs",
        path: "/vendor/rfqs",
        icon: FileText,
      },
      {
        label: "My Quotations",
        path: "/vendor/quotations",
        icon: ClipboardList,
      },
      {
        label: "Purchase Orders",
        path: "/vendor/purchase-orders",
        icon: ShoppingBag,
      },
    ],

    APPROVER: [
      {
        label: "Approvals",
        path: "/approver/approvals",
        icon: CheckCircle,
      },
    ],
  };

  const menus = roleMenus[role] || [];

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    setMenuOpen(false);
    toast.success("Logged out successfully!");
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-[#6f452c] text-white"
        : "text-[#6f452c] hover:bg-[#eadbcf]"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-[#d6c0ad] bg-[#f5eee7]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <NavLink
          to={
            role === "ADMIN"
              ? "/admin/dashboard"
              : role === "PROCUREMENT_MANAGER"
              ? "/procurement/rfqs"
              : role === "VENDOR"
              ? "/vendor/rfqs"
              : "/approver/approvals"
          }
          className="flex shrink-0 items-center gap-2 text-lg font-bold text-[#6f452c]"
        >
          <ShoppingCart size={25} />
          <span>ProcureHub</span>
        </NavLink>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-1 xl:flex">
          {menus.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={linkClass}
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        {/* User and Logout */}
        <div className="hidden items-center gap-3 lg:flex">
          <div className="max-w-40 text-right">
            <p className="truncate text-sm font-semibold text-[#6f452c]">
              {user.name || user.email}
            </p>
            <p className="text-xs text-[#8b6a52]">
              {role?.replaceAll("_", " ")}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg bg-[#6f452c] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#54331f]"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setMenuOpen((previous) => !previous)}
          className="rounded-lg p-2 text-[#6f452c] hover:bg-[#eadbcf] xl:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {menuOpen && (
        <div className="border-t border-[#d6c0ad] bg-[#f5eee7] px-4 py-4 xl:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {menus.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={linkClass}
                >
                  <Icon size={17} />
                  {item.label}
                </NavLink>
              );
            })}

            <div className="mt-2 border-t border-[#d6c0ad] pt-4 lg:hidden">
              <p className="text-sm font-semibold text-[#6f452c]">
                {user.name || user.email}
              </p>
              <p className="mb-3 text-xs text-[#8b6a52]">
                {role?.replaceAll("_", " ")}
              </p>

              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#6f452c] px-4 py-2 text-sm font-medium text-white hover:bg-[#54331f]"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;