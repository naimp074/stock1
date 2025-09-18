import React from "react";
import { Button } from "react-bootstrap";
import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import {
  crearCuenta,
  registrarMovimiento,
  listarCuentas,
} from "../services/cuentasService";

const Importador = ({ onImportado }) => {
  async function onImportar(e) {
    try {
      const [file] = e.target.files;
      if (!file) return;

      // Leer archivo Excel/CSV
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const hoja = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(hoja);

      // Cuentas existentes
      const existentes = await listarCuentas();

      for (let row of rows) {
        const cliente = row.Cliente?.trim();
        if (!cliente || !row.Importe) continue;

        // Verifico si existe la cuenta, sino la creo
        let cuenta = existentes.find(c => c.cliente === cliente);
        if (!cuenta) {
          cuenta = await crearCuenta({ cliente });
          existentes.push(cuenta);
        }

        // Transformar importe a número
        const monto = parseFloat(
          String(row.Importe).replace(/\./g, "").replace(",", ".")
        );

        // Registrar movimiento (cargo por factura)
        await registrarMovimiento({
          cuenta_id: cuenta.id,
          tipo: "cargo",
          monto,
          concepto: `Factura ${row.ComprobanteNo || ""} - ${row.Fecha || ""}`,
        });
      }

      Swal.fire("✅ Listo", "Facturas importadas a cuentas corrientes", "success");

      if (onImportado) onImportado();
    } catch (err) {
      console.error(err);
      Swal.fire("❌ Error", err.message || "No se pudo importar", "error");
    }
  }

  return null;
};

export default Importador;