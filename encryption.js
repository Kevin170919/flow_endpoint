
const crypto = require("crypto");

function getPrivateKey() {
  const encoded = process.env.PRIVATE_KEY_BASE64;

  if (!encoded) {
    throw new Error("Falta configurar PRIVATE_KEY_BASE64");
  }

  return Buffer.from(encoded, "base64").toString("utf8");
}

function decryptRequest(body) {
  const privateKey = getPrivateKey();

  const aesKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256"
    },
    Buffer.from(body.encrypted_aes_key, "base64")
  );

  const iv = Buffer.from(body.initial_vector, "base64");
  const encrypted = Buffer.from(body.encrypted_flow_data, "base64");

  const authTag = encrypted.subarray(encrypted.length - 16);
  const ciphertext = encrypted.subarray(0, encrypted.length - 16);

  const decipher = crypto.createDecipheriv("aes-128-gcm", aesKey, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return {
    data: JSON.parse(decrypted.toString("utf8")),
    aesKey,
    iv
  };
}

function encryptResponse(response, aesKey, originalIv) {
  const responseIv = Buffer.from(originalIv);
  for (let i = 0; i < responseIv.length; i++) {
    responseIv[i] = responseIv[i] ^ 0xff;
  }

  const cipher = crypto.createCipheriv(
    "aes-128-gcm",
    aesKey,
    responseIv
  );

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(response), "utf8"),
    cipher.final(),
    cipher.getAuthTag()
  ]);

  return encrypted.toString("base64");
}

module.exports = {
  decryptRequest,
  encryptResponse
};
