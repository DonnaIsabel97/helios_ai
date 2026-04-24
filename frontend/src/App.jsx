import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import SideMenu from "./components/SideMenu.jsx";
import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import ContactUs from "./pages/ContactUs.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Finguard from "./pages/Finguard.jsx";
import Finsage from "./pages/Finsage.jsx";
import Cases from "./pages/Cases.jsx";
import Reports from "./pages/Reports.jsx";
import Account from "./pages/Account.jsx";
import Settings from "./pages/Settings.jsx";

function ProtectedLayout() {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return (
    <SideMenu>
      <Outlet />
    </SideMenu>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact-us" element={<ContactUs />} />

        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/finguard" element={<Finguard />} />
          <Route path="/finsage" element={<Finsage />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/account" element={<Account />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}