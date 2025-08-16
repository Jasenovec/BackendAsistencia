module.exports = (req, res, next) => {
  const { rol } = req.user;

  const permisos = {
    administrador: [], // sin restricción
    auxiliar_mañana: [4, 5],
    auxiliar_tarde: [1, 2, 3]
  };

  if (rol === 'administrador') {
    return next();
  }

  const gradoParam = parseInt(req.params.grado);
  if (!permisos[rol] || !permisos[rol].includes(gradoParam)) {
    return res.status(403).json({ message: 'No tienes permiso para acceder a este grado' });
  }

  next();
};
