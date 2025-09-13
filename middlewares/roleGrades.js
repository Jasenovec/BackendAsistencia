// middlewares/roleGrades.js
const pool = require('../database');

module.exports = async (req, res, next) => {
  try {
    const { codigo_rol, nivel_rol } = req.user || {};

    if (!codigo_rol && !nivel_rol) {
      return res.status(401).json({ message: 'Token sin información de rol' });
    }

    // Admin por código o por nivel=1
    const isAdmin = codigo_rol === 'administrador' || Number(nivel_rol) === 1;
    if (isAdmin) {
      req.user.isAdmin = true;
      req.user.allowedGrades = null;
      req.user.allowedSections = null;
      return next();
    }

    // 1) ID_ROL a partir del CODIGO_ROL
    const [rolRows] = await pool.query(
      'SELECT ID_ROL FROM rol WHERE CODIGO_ROL = ? LIMIT 1',
      [codigo_rol]
    );
    if (!rolRows.length) {
      return res.status(403).json({ message: 'Rol no reconocido' });
    }
    const idRol = rolRows[0].ID_ROL;

    // 2) Grados permitidos desde rol_grado (COL CORRECTA: NRO_GRADO)
    const [gradoRows] = await pool.query(
      'SELECT NRO_GRADO FROM rol_grado WHERE ID_ROL = ? ORDER BY NRO_GRADO',
      [idRol]
    );
    const allowedGrades = gradoRows.map(r => Number(r.NRO_GRADO)).filter(n => !Number.isNaN(n));

    if (!allowedGrades.length) {
      req.user.allowedGrades = [];
      req.user.allowedSections = [];
      return res.status(403).json({ message: 'No tienes grados asignados' });
    }

    // 3) Secciones permitidas para esos grados (nivel secundaria=3, año lectivo configurable)
    const NIVEL_CODIGO = process.env.NIVEL_CODIGO || 'secundaria';
    const ANIO_LECTIVO = Number(process.env.ANIO_LECTIVO) || 2025;

    const placeholders = allowedGrades.map(() => '?').join(',');
    const params = [...allowedGrades, NIVEL_CODIGO, ANIO_LECTIVO];

    const [secRows] = await pool.query(
      `
      SELECT DISTINCT g.ID_SECCION
      FROM grado_estudiante g
      JOIN nivel n        ON n.ID_NIVEL = g.ID_NIVEL
      JOIN anio_lectivo a ON a.ID_ANIO_LECTIVO = g.ID_ANIO_LECTIVO
      WHERE g.NRO_GRADO IN (${placeholders})
        AND n.CODIGO_NIVEL = ?
        AND a.NRO_ANIO = ?
      `,
      params
    );
    const allowedSections = secRows.map(r => Number(r.ID_SECCION)).filter(n => !Number.isNaN(n));

    // Colgar permisos en req.user
    req.user.isAdmin = false;
    req.user.allowedGrades = allowedGrades;
    req.user.allowedSections = allowedSections;

    // Validación rápida si la ruta trae :grado / :seccion
    const gradoParam = req.params?.grado ? Number(req.params.grado) : null;
    if (gradoParam !== null && !allowedGrades.includes(gradoParam)) {
      return res.status(403).json({ message: 'No tienes permiso para este grado' });
    }

    const seccionParam = req.params?.seccion ? Number(req.params.seccion) : null;
    if (seccionParam !== null && allowedSections.length && !allowedSections.includes(seccionParam)) {
      return res.status(403).json({ message: 'No tienes permiso para esta sección' });
    }

    return next();
  } catch (error) {
    console.error('Error en roleGrades:', error);
    return res.status(500).json({ message: 'Error verificando permisos' });
  }
};
