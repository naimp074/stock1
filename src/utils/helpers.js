export const generarId = () => {
  return crypto.randomUUID();
};

export const formatearFecha = (fecha) => {
  return new Date(fecha).toLocaleDateString("es-AR");
};
