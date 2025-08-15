
const mysql = require('mysql2');

// Configuración del pool de conexiones
const pool = mysql.createPool({
    host: '100.67.109.61',
    user: 'rodrigo',
    password: 'Rodri1234*',
    database: 'atus_re2',
    port: 3306,
});

// Probar una conexión inicial (opcional)
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ Error conectando al pool de base de datos:', err);
    } else {
        console.log('✅ Pool de conexiones a la base de datos MySQL operativo');
        connection.release();
    }
});

// Exportar el pool para usarlo en las rutas
module.exports = pool;
