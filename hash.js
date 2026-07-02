const bcrypt = require("bcryptjs");

async function generarHash() {
  const password = "1234"; // aquí pones la contraseña que quieres
  const hash = await bcrypt.hash(password, 10);
  console.log("Hash generado:", hash);
}

generarHash();

//

//