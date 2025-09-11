import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Navbar as BsNavbar, Nav, Container, Button, Badge } from "react-bootstrap";

const Navbar = () => {
  const { usuario, logout } = useAuth();

  return (
    <BsNavbar bg="dark" variant="dark" expand="md" fixed="top" className="shadow">
      <Container fluid>
        {/* Logo */}
        <BsNavbar.Brand as={Link} to="/" className="fw-bold text-info text-truncate">
          📦 Mi POS
        </BsNavbar.Brand>

        {/* Botón hamburguesa */}
        <BsNavbar.Toggle aria-controls="navbarResponsive" />

        <BsNavbar.Collapse id="navbarResponsive">
          {/* Navegación */}
          <Nav className="me-auto text-center">
            <Nav.Link as={Link} to="/stock" className="nav-link-custom">
              Stock
            </Nav.Link>
            <Nav.Link as={Link} to="/ventas" className="nav-link-custom">
              Ventas
            </Nav.Link>
            <Nav.Link as={Link} to="/reportes" className="nav-link-custom">
              Reportes
            </Nav.Link>
            <Nav.Link as={Link} to="/cuentacorriente" className="nav-link-custom">
              Cuenta Corriente
            </Nav.Link>
          </Nav>

          {/* Usuario y logout */}
          <div className="d-flex flex-column flex-md-row align-items-center gap-2 mt-3 mt-md-0">
            {usuario && (
              <Badge bg="secondary" pill className="px-2 py-2 text-truncate">
                👤 {usuario.nombre}
              </Badge>
            )}
            <Button
              variant="outline-danger"
              size="sm"
              className="w-100 w-md-auto"
              onClick={logout}
            >
              Salir
            </Button>
          </div>
        </BsNavbar.Collapse>
      </Container>

      {/* Estilos extras */}
      <style>{`
        .nav-link-custom {
          position: relative;
          transition: color 0.2s ease-in-out;
        }
        .nav-link-custom:hover {
          color: #0dcaf0 !important;
        }
        .nav-link-custom::after {
          content: '';
          position: absolute;
          width: 0;
          height: 2px;
          display: block;
          margin-top: 5px;
          left: 0;
          background: #0dcaf0;
          transition: width 0.3s;
        }
        .nav-link-custom:hover::after {
          width: 100%;
        }
      `}</style>
    </BsNavbar>
  );
};

export default Navbar;
