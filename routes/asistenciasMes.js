// routes/asistencias.js
const express = require('express');
const router = express.Router();
const db = require('../database');
const requireAuth = require('../middlewares/auth');

// GET /asistencias-mes?mes=9&anio=2025
router.get('/asistencias-mes', requireAuth, (req, res) => {
    const { mes, anio } = req.query;

    // Validaciones rápidas
    const m = parseInt(mes, 10);
    const y = parseInt(anio, 10);
    if (!m || !y || m < 1 || m > 12) {
        return res.status(400).json({ error: 'Parámetros mes/anio inválidos' });
    }

    // 1) Resolver ID_ROL del usuario
    const tokenIdRol = Number.isInteger(req.user?.id_rol)
        ? req.user.id_rol
        : (Number.isInteger(req.user?.rol) ? req.user.rol : null);

    const userId = req.user?.id_usuario_admin || req.user?.id_usuario;

    const getUserRoleId = (cb) => {
        if (tokenIdRol) return cb(null, tokenIdRol);
        if (!userId) return cb(new Error('No se pudo determinar el usuario del token'));
        db.query(
            'SELECT ID_ROL FROM usuario_administrativo WHERE ID_USUARIO_ADMIN = ? LIMIT 1',
            [userId],
            (err, rows) => {
                if (err) return cb(err);
                if (!rows.length) return cb(new Error('Usuario sin rol'));
                cb(null, rows[0].ID_ROL);
            }
        );
    };

    getUserRoleId((errRole, idRol) => {
        if (errRole) {
            console.error('Error resolviendo ID_ROL:', errRole);
            return res.status(500).json({ error: 'Error resolviendo rol del usuario' });
        }

        // 2) Roles “libres”: 1=Administrador, 2=Direccion, 3=Subdireccion (según tu tabla)
        const libre = [1, 2, 3].includes(Number(idRol));

        const fetchAllowedGrades = (cb) => {
            if (libre) return cb(null, null); // sin restricción
            db.query(
                'SELECT GRADO FROM rol_grado WHERE ID_ROL = ?',
                [idRol],
                (err, rows) => {
                    if (err) return cb(err);
                    const grados = rows.map(r => r.GRADO); // p.ej. [4,5] o [1,2,3]
                    cb(null, grados);
                }
            );
        };

        fetchAllowedGrades((errGrades, allowedGrades) => {
            if (errGrades) {
                console.error('Error consultando rol_grado:', errGrades);
                return res.status(500).json({ error: 'Error consultando permisos de grados' });
            }

            // 3) Tu consulta (NO SE TOCA)
            const query = `
        SELECT 
        e.id_estudiante, 
        p.apellido_paterno, 
        p.apellido_materno, 
        p.nombres, 
        ge.nro_grado, 
        s.seccion,
        a.fecha, 
        a.estado_asistencia
        FROM estudiante e
        INNER JOIN persona p ON e.id_persona = p.id_persona
        INNER JOIN grado_estudiante ge ON ge.id_estudiante = e.id_estudiante
        INNERINNER JOIN seccion s ON s.id_seccion = ge.id_seccion
        LEFT JOIN asistencia a 
        ON a.id_estudiante = e.id_estudiante
        AND MONTH(a.fecha) = ? AND YEAR(a.fecha) = ?
        ORDER BY ge.nro_grado, s.seccion, p.apellido_paterno, p.apellido_materno;
      `;

            db.query(query, [m, y], (err, results) => {
                if (err) {
                    console.error('Error consultando asistencias:', err);
                    return res.status(500).json({ error: 'Error en servidor' });
                }

                // 4) Si el rol tiene restricción, filtramos en memoria por grado permitido
                const data = (!allowedGrades || allowedGrades.length === 0)
                    ? results
                    : results.filter(r => allowedGrades.includes(r.nro_grado));

                return res.json(data);
            });
        });
    });
});

module.exports = router;
