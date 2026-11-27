
const crypto = require("crypto");
const fs = require("fs");

const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem"
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem"
  }
});

fs.writeFileSync("public_key.pem", publicKey);
fs.writeFileSync("private_key.pem", privateKey);

const privateKeyBase64 = Buffer
  .from(privateKey, "utf8")
  .toString("base64");

console.log("Claves generadas correctamente.");
console.log("\nCLAVE PÚBLICA (para Meta):\n");
console.log(publicKey);
console.log("\nPRIVATE_KEY_BASE64 (para Render):\n");
console.log(privateKeyBase64);
