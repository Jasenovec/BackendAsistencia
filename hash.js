const bcrypt = require("bcryptjs");

async function generarHash() {
  const password = "auxtarde456"; // aquí pones la contraseña que quieres
  const hash = await bcrypt.hash(password, 10);
  console.log("Hash generado:", hash);
}

generarHash();

//

//