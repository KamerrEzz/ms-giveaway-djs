const { Axios } = require("axios");

module.exports = new Axios({
    baseURL: "http://localhost:3000",
    headers: {
        "Content-Type": "application/json",
        "account-user": "nombre_usuario_autorizado",
        "account-password": "contraseña_autorizada",
    }
})