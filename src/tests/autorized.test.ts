import assert from "assert";
import axios from "./axios"; // Asegúrate de que "./axios" está bien configurado

describe("Test Authorized", () => {
    it("should return 200", async () => {
        try {
            const response = await axios.get("/");
            assert.strictEqual(response.status, 200); // Compara si el status es 200
        } catch (error: any) {
            assert.fail(`Request failed with error: ${error.message}`);
        }
    });
});
