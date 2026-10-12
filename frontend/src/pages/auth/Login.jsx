
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../api/axios";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.email.trim() || !form.password) {
      toast.error("Please enter email and password.");
      return;
    }

    try {
      setLoading(true);

      // Step 1: Login
      const response = await API.post("/auth/login", {
        email: form.email.trim(),
        password: form.password,
      });

      const token = response.data?.access_token;

      if (!token) {
        toast.error("Access token not received from server.");
        return;
      }

      // Step 2: Save token
      localStorage.setItem("access_token", token);

      // Step 3: Get logged-in user details
      const userResponse = await API.get("/auth/me");
      const user = userResponse.data;

      if (!user || !user.role) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        toast.error("User details or role not received from server.");
        return;
      }

      // Step 4: Normalize role
      const role = String(user.role).trim().toUpperCase();

      // Step 5: Define role-based routes
      const roleRoutes = {
        ADMIN: "/admin/dashboard",
        PROCUREMENT_MANAGER: "/procurement/rfqs",
        VENDOR: "/vendor/rfqs",
        APPROVER: "/approver/approvals",
      };

      const destination = roleRoutes[role];

      if (!destination) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        toast.error(`Unsupported user role: ${user.role}`);
        return;
      }

      // Step 6: Save user details
      const loggedInUser = {
        ...user,
        role,
      };

      localStorage.setItem("user", JSON.stringify(loggedInUser));

      // Step 7: Navigate to the correct page
      toast.success("Login successful!");
      navigate(destination, { replace: true });
    } catch (error) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");

      const message = error.response?.data?.detail;

      toast.error(
        typeof message === "string"
          ? message
          : "Login failed. Please check your email and password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5eee7] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-[#d6c0ad] bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#6f452c]">
            Welcome Back
          </h1>

          <p className="mt-2 text-sm text-[#8b6a52]">
            Login to your Procurement Platform
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-[#6f452c]"
            >
              Email Address
            </label>

            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              required
              disabled={loading}
              className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 text-[#54331f] outline-none transition focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad] disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-[#6f452c]"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              disabled={loading}
              className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 text-[#54331f] outline-none transition focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad] disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#6f452c] px-4 py-3 font-semibold text-white transition hover:bg-[#54331f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#8b6a52]">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-[#6f452c] underline hover:text-[#54331f]"
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;

