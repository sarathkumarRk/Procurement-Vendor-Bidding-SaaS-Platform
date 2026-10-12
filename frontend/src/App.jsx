import { useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import AppRoutes from "./routes/AppRoutes";

function App() {
  const location = useLocation();

  const hideNavbar =
    location.pathname === "/login" ||
    location.pathname === "/register";

  return (
    <div className="min-h-screen bg-[#f5eee7]">
      {!hideNavbar && <Navbar />}
      <main>
        <AppRoutes />
      </main>
    </div>
  );
}

export default App;

