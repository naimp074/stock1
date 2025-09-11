// src/features/stock/StockPage.jsx
import React, { useEffect, useState } from 'react';
import { Container, Card, Form, Button, Table, Image } from 'react-bootstrap';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

import {
  listarProductos,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  guardarProductosMasivo,
} from '../../services/productosService';

const StockPage = () => {
  const [productos, setProductos] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: '',
    costo: '',
    venta: '',
    cantidad: '',
    proveedor: '',
    telefono: '',
    imagen: '',
  });
  const [cargando, setCargando] = useState(true);

  // Cargar desde Supabase al montar
  useEffect(() => {
    (async () => {
      try {
        setCargando(true);
        const data = await listarProductos();
        setProductos(data);
      } catch (e) {
        console.error('Error cargando productos:', e.message || e);
        Swal.fire('❌ Error', e.message || 'No se pudieron cargar los productos', 'error');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const handleChange = (e) => {
    setNuevoProducto({
      ...nuevoProducto,
      [e.target.name]: e.target.value,
    });
  };

  const handleGuardarProducto = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: (nuevoProducto.nombre || '').trim(),
        precio_costo: Number(nuevoProducto.costo || 0),
        precio_venta: Number(nuevoProducto.venta || 0),
        cantidad: Number(nuevoProducto.cantidad || 0),
        proveedor: nuevoProducto.proveedor || null,
        telefono: nuevoProducto.telefono || null,
        imagen: nuevoProducto.imagen || null,
      };

      let guardado;

      if (editIndex !== null) {
        const id = productos[editIndex]?.id;
        if (!id) throw new Error('No se encontró el ID del producto a editar');
        guardado = await actualizarProducto(id, payload);
        const productosActualizados = [...productos];
        productosActualizados[editIndex] = guardado;
        setProductos(
          productosActualizados.sort((a, b) =>
            (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
          )
        );
        Swal.fire('✅ Actualizado', 'El producto fue editado con éxito', 'success');
      } else {
        guardado = await crearProducto(payload); // no manda id → Postgres genera
        setProductos(
          [guardado, ...productos].sort((a, b) =>
            (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
          )
        );
        Swal.fire('✅ Guardado', 'El producto fue agregado con éxito', 'success');
      }

      setEditIndex(null);
      setNuevoProducto({
        nombre: '',
        costo: '',
        venta: '',
        cantidad: '',
        proveedor: '',
        telefono: '',
        imagen: '',
      });
      setMostrarFormulario(false);
    } catch (error) {
      console.error(error);
      Swal.fire('❌ Error', error.message || 'No se pudo guardar', 'error');
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      const productosExcel = sheet.map((row) => ({
        nombre: row.Nombre || row.Producto || row.nombre || '',
        precio_costo: Number(row.Costo ?? row.costo ?? 0),
        precio_venta: Number(row.Venta ?? row.venta ?? 0),
        cantidad: Number(row.Cantidad ?? row.cantidad ?? 0),
        proveedor: row.Proveedor ?? row.proveedor ?? null,
        telefono: row.Telefono ?? row.telefono ?? null,
        imagen: row.Imagen ?? row.imagen ?? null,
      }));

      const guardados = await guardarProductosMasivo(productosExcel);

      const merged = [...guardados, ...productos].sort((a, b) =>
        (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' })
      );
      setProductos(merged);

      Swal.fire('📂 Importado', 'Productos cargados desde Excel', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('❌ Error', error.message || 'No se pudo importar el Excel', 'error');
    } finally {
      e.target.value = '';
    }
  };

  const handleEliminar = (index) => {
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'No podrás revertir esta acción',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const id = productos[index]?.id;
          if (!id) throw new Error('No se encontró el ID del producto');
          await eliminarProducto(id);

          const productosActualizados = productos.filter((_, i) => i !== index);
          setProductos(productosActualizados);
          Swal.fire('🗑️ Eliminado', 'El producto fue eliminado', 'success');
        } catch (error) {
          console.error(error);
          Swal.fire('❌ Error', error.message || 'No se pudo eliminar', 'error');
        }
      }
    });
  };

  const handleEditar = (index) => {
    const p = productos[index];
    setNuevoProducto({
      nombre: p?.nombre || '',
      costo: p?.precio_costo ?? '',
      venta: p?.precio_venta ?? '',
      cantidad: p?.cantidad ?? '',
      proveedor: p?.proveedor ?? '',
      telefono: p?.telefono ?? '',
      imagen: p?.imagen ?? '',
    });
    setEditIndex(index);
    setMostrarFormulario(true);
  };

  return (
    <Container fluid>
      <Card className="p-3 shadow">
        <h1>Gestión de Stock</h1>

        {!mostrarFormulario && (
          <Button
            variant="success"
            className="mb-3"
            onClick={() => setMostrarFormulario(true)}
          >
            Cargar Producto
          </Button>
        )}

        {mostrarFormulario && (
          <Form onSubmit={handleGuardarProducto} className="mb-3">
            <Form.Group className="mb-2">
              <Form.Label>Nombre del Producto</Form.Label>
              <Form.Control
                type="text"
                name="nombre"
                value={nuevoProducto.nombre}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Precio Costo</Form.Label>
              <Form.Control
                type="number"
                name="costo"
                value={nuevoProducto.costo}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Precio Venta</Form.Label>
              <Form.Control
                type="number"
                name="venta"
                value={nuevoProducto.venta}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Cantidad</Form.Label>
              <Form.Control
                type="number"
                name="cantidad"
                value={nuevoProducto.cantidad}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Proveedor</Form.Label>
              <Form.Control
                type="text"
                name="proveedor"
                value={nuevoProducto.proveedor}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Teléfono</Form.Label>
              <Form.Control
                type="text"
                name="telefono"
                value={nuevoProducto.telefono}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>URL de la Imagen</Form.Label>
              <Form.Control
                type="text"
                name="imagen"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={nuevoProducto.imagen || ''}
                onChange={handleChange}
              />
            </Form.Group>
            {nuevoProducto.imagen && (
              <div className="mb-2">
                <Image src={nuevoProducto.imagen} thumbnail width={100} />
              </div>
            )}
            <Button type="submit" variant="primary">
              {editIndex !== null ? 'Actualizar Producto' : 'Guardar Producto'}
            </Button>{' '}
            <Button
              variant="secondary"
              onClick={() => {
                setMostrarFormulario(false);
                setEditIndex(null);
                setNuevoProducto({
                  nombre: '',
                  costo: '',
                  venta: '',
                  cantidad: '',
                  proveedor: '',
                  telefono: '',
                  imagen: '',
                });
              }}
            >
              Cancelar
            </Button>
          </Form>
        )}

        <Form.Group controlId="formFile" className="mb-3">
          <Form.Label>Cargar Excel</Form.Label>
          <Form.Control
            type="file"
            accept=".xlsx, .xls"
            onChange={handleExcelUpload}
          />
        </Form.Group>

        <div className="table-responsive">
          {cargando ? (
            <p>Cargando…</p>
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Nombre</th>
                  <th>Precio Costo</th>
                  <th>Precio Venta</th>
                  <th>Cantidad</th>
                  <th>Proveedor</th>
                  <th>Teléfono</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((prod, index) => (
                  <tr key={prod.id || index}>
                    <td>
                      {prod.imagen ? (
                        <Image src={prod.imagen} thumbnail width={80} />
                      ) : (
                        'Sin imagen'
                      )}
                    </td>
                    <td>{prod.nombre}</td>
                    <td>{Number(prod.precio_costo || 0)}</td>
                    <td>{Number(prod.precio_venta || 0)}</td>
                    <td>{Number(prod.cantidad || 0)}</td>
                    <td>{prod.proveedor || ''}</td>
                    <td>{prod.telefono || ''}</td>
                    <td>
                      <Button
                        variant="warning"
                        size="sm"
                        className="me-2"
                        onClick={() => handleEditar(index)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleEliminar(index)}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                ))}
                {!productos.length && (
                  <tr>
                    <td colSpan="8" className="text-center">
                      Sin productos aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </div>
      </Card>
    </Container>
  );
};

export default StockPage;
