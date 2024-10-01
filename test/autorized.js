const { describe, it } = require("node:test");
const assert = require("assert"); // Asegúrate de requerir assert para las validaciones
const axios = require("./axios");

describe("Test Autorized", () => {
    it("should return 200", async () => {
        const response = await axios.get("/");
        assert.strictEqual(response.status, 200); // Usamos assert.strictEqual para comparar valores
    });
});
