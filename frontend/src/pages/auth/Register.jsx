import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import API from "../../api/axios";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
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

    if (!form.name.trim() || !form.email.trim() || !form.password) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (form.password.length < 3) {
      toast.error("Password must contain at least 3 characters.");
      return;
    }

    try {
      setLoading(true);

      await API.post("/auth/register", {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: "ADMIN",
        department_id: null,
      });

      toast.success("Admin registered successfully!");
      navigate("/login");
    } catch (error) {
      const detail = error.response?.data?.detail;

      if (Array.isArray(detail)) {
        detail.forEach((item) => {
          toast.error(`${item.loc?.join(" → ")}: ${item.msg}`);
        });
      } else {
        toast.error(
          typeof detail === "string"
            ? detail
            : "Registration failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5eee7] px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-[#d6c0ad] bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#6f452c]">
            Create Account
          </h1>

          <p className="mt-2 text-sm text-[#8b6a52]">
            Register your administrator account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold text-[#6f452c]"
            >
              Full Name
            </label>

            <input
              id="name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter your full name"
              autoComplete="name"
              maxLength={100}
              required
              className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 text-[#54331f] outline-none transition focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
            />
          </div>

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
              className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 text-[#54331f] outline-none transition focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
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
              placeholder="Minimum 3 characters"
              autoComplete="new-password"
              minLength={3}
              required
              className="w-full rounded-lg border border-[#d6c0ad] px-4 py-3 text-[#54331f] outline-none transition focus:border-[#6f452c] focus:ring-2 focus:ring-[#d6c0ad]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#6f452c] px-4 py-3 font-semibold text-white transition hover:bg-[#54331f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#8b6a52]">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-[#6f452c] underline hover:text-[#54331f]"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;