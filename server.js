
require("dotenv").config();

const express = require("express");
const axios = require("axios");
const {
  decryptRequest,
  encryptResponse
} = require("./encryption");

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 3000;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

app.get("/health", (req, res) => {
  res.status(200).json({ status: "active" });
});

app.post("/flow", async (req, res) => {
  let aesKey;
  let iv;

  try {
    const decrypted = decryptRequest(req.body);
    const payload = decrypted.data;

    aesKey = decrypted.aesKey;
    iv = decrypted.iv;

    console.log("Acción recibida:", payload.action);
    console.log("Pantalla recibida:", payload.screen);

    let response;

    // Verificación de conexión solicitada por WhatsApp
    if (payload.action === "ping") {
      response = {
        data: {
          status: "active"
        }
      };
    } else if (payload.action === "data_exchange") {
      const cedula = String(payload.data?.cedula || "").trim();

      if (!cedula) {
        response = {
          screen: "VALIDAR_CLIENTE",
          data: {
            error_message: "Ingrese un número de cédula válido."
          }
        };
      } else {
        const apiResponse = await axios.post(
          APPS_SCRIPT_URL,
          {
            accion: "consultar",
            cedula
          },
          {
            timeout: 15000,
            headers: {
              "Content-Type": "application/json"
            }
          }
        );

        const resultado = apiResponse.data;

        if (resultado.success === true) {
          response = {
            screen: "CLIENTE_VALIDADO",
            data: {
              mensaje: resultado.mensaje || "Cliente validado correctamente."
            }
          };
        } else {
          response = {
            screen: "CLIENTE_NO_VALIDADO",
            data: {
              mensaje: resultado.mensaje || "No fue posible validar al cliente."
            }
          };
        }
      }
    } else {
      response = {
        screen: "ERROR_SERVICIO",
        data: {
          mensaje: "No se reconoce la operación solicitada."
        }
      };
    }

    const encryptedResponse = encryptResponse(response, aesKey, iv);

    res
      .status(200)
      .type("text/plain")
      .send(encryptedResponse);

  } catch (error) {
    console.error("Error procesando Flow:", error.message);

    // Si el descifrado falla, Meta debe recibir HTTP 421.
    if (!aesKey || !iv) {
      return res.status(421).send();
    }

    try {
      const encryptedError = encryptResponse(
        {
          screen: "ERROR_SERVICIO",
          data: {
            mensaje: "Ocurrió un error al consultar el servicio. Intente nuevamente."
          }
        },
        aesKey,
        iv
      );

      return res.status(200).type("text/plain").send(encryptedError);
    } catch (encryptionError) {
      console.error("Error cifrando respuesta:", encryptionError.message);
      return res.status(500).send();
    }
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});
