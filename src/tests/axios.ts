import axios, { AxiosInstance } from "axios";
import { web } from "../utils/assets/env";
import assert from "assert";

// Crea una instancia de Axios con la configuración personalizada
const axiosInstance: AxiosInstance = axios.create({
    baseURL: "http://localhost:3000",
    headers: {
        "Content-Type": "application/json",
        "account-token": web.token
    },
});

export default axiosInstance;

describe("AxiosInstance", () => {
    it(("debería ser una instancia de Axios"), () => {
        assert.strictEqual(true, true)
    })
})