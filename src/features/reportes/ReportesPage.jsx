// Reportes con gráficos (usar la ruta de imports que corresponda en tu proyecto)
import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, Table } from 'react-bootstrap';
// Ajustá estas rutas según dónde esté tu archivo:
import { listarVentas } from '../../services/ventasService';
import { listarProductos } from '../../services/productosService';

// Charts
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
} from 'recharts';

export default function ReportesPage() {
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setCargando(true);
        const [vts, prods] = await Promise.all([listarVentas(500), listarProductos()]);
        setVentas(vts || []);
        setProductos(prods || []);
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const hace7 = new Date(hoy); hace7.setDate(hace7.getDate() - 6);

  const {
    totalHoy, totalSemana, totalMes,
    topProductos, lowStock, serie7d
  } = useMemo(() => {
    let th = 0, ts = 0, tm = 0;
    const contador = new Map(); // id -> {nombre, cantidad}

    // base de 7 días
    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      dias.push({ key: d.toISOString().slice(0,10), label: d.toLocaleDateString('es-AR'), total: 0 });
    }

    for (const v of ventas) {
      const f = new Date(v.fecha);
      const t = Number(v.total || 0);

      if (f >= inicioDia) th += t;
      if (f >= hace7) ts += t;
      if (f >= inicioMes) tm += t;

      // línea 7 días
      const k = f.toISOString().slice(0,10);
      const bucket = dias.find(x => x.key === k);
      if (bucket) bucket.total += t;

      for (const it of v.items || []) {
        const prev = contador.get(it.id) || { nombre: it.nombre, cantidad: 0 };
        prev.cantidad += Number(it.cantidad || 0);
        contador.set(it.id, prev);
      }
    }

    const top = [...contador.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 7); // top 7 para el gráfico

    const low = (productos || [])
      .filter(p => Number(p.cantidad || 0) <= 5)
      .sort((a, b) => Number(a.cantidad || 0) - Number(b.cantidad || 0));

    const serie7d = dias.map(d => ({ fecha: d.label, total: d.total }));

    return { totalHoy: th, totalSemana: ts, totalMes: tm, topProductos: top, lowStock: low, serie7d };
  }, [ventas, productos]);

  return (
    <Container fluid>
      <Card className="p-3 shadow">
        <h1>Reportes</h1>

        {cargando ? <p>Cargando…</p> : (
          <>
            {/* KPI cards */}
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <Card className="p-3">
                  <div className="text-muted">Ventas Hoy</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>
                    ${totalHoy.toFixed(2)}
                  </div>
                </Card>
              </div>
              <div className="col-md-4">
                <Card className="p-3">
                  <div className="text-muted">Últimos 7 días</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>
                    ${totalSemana.toFixed(2)}
                  </div>
                </Card>
              </div>
              <div className="col-md-4">
                <Card className="p-3">
                  <div className="text-muted">Mes en curso</div>
                  <div style={{ fontSize: 28, fontWeight: 700 }}>
                    ${totalMes.toFixed(2)}
                  </div>
                </Card>
              </div>
            </div>

            {/* Gráficos */}
            <div className="row g-3 mb-3">
              <div className="col-lg-6">
                <Card className="p-3">
                  <h5 className="mb-3">Top productos (unidades)</h5>
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <BarChart data={topProductos.map(p => ({ nombre: p.nombre, cantidad: p.cantidad }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="nombre" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="cantidad" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              <div className="col-lg-6">
                <Card className="p-3">
                  <h5 className="mb-3">Ventas últimos 7 días</h5>
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer>
                      <LineChart data={serie7d}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="fecha" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="total" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </div>

            {/* Tablas de apoyo */}
            <div className="row g-3">
              <div className="col-lg-7">
                <Card className="p-3">
                  <h5>Top productos (detalle)</h5>
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th className="text-end">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProductos.length ? topProductos.map(p => (
                          <tr key={p.id}>
                            <td>{p.nombre}</td>
                            <td className="text-end">{p.cantidad}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="2" className="text-center">Sin datos</td></tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              </div>
              <div className="col-lg-5">
                <Card className="p-3">
                  <h5>Stock bajo (≤ 5)</h5>
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th className="text-end">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStock.length ? lowStock.map(p => (
                          <tr key={p.id}>
                            <td>{p.nombre}</td>
                            <td className="text-end">{Number(p.cantidad || 0)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="2" className="text-center">Sin alertas</td></tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </Card>
    </Container>
  );
}
