import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./features/auth/Login";
import StockPage from "./features/stock/StockPage";
import VentasPage from "./features/ventas/VentasPage";
import ReportesPage from "./features/reportes/ReportesPage";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Container from "react-bootstrap/Container";
import CuentaCorriente from "./cuenta-corriente/Cuenta-corriente";

function App() {
  const { usuario } = useAuth();

  if (!usuario) {
    return <Login />;
  }

  return (
    <>
      <Navbar />
      <Container className="mt-5">
        <Routes>
          <Route path="/" element={<Navigate to="/stock" />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/ventas" element={<VentasPage />} />
          <Route path="/cuentacorriente" element={<CuentaCorriente />} />
          <Route path="/reportes" element={<ReportesPage />} />
        </Routes>
      </Container>
    </>
  );
}

export default App;
