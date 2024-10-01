const { describe, it } = require("node:test");
const assert = require("assert"); // Asegúrate de requerir assert para las validaciones
const axios = require("./axios");

describe("Test Giveaway", () => {
    let id;
    it("Create a giveaway", async () => {
        try{
            const response = await axios.post("/giveaway/", {
                
            });
            if(response.status === 200) {
                id = response.data.id; // Almacenamos el ID del giveaway creado para usarlo en las pruebas siguientes
            };
        
            assert.strictEqual(response.status, 200); // Usamos assert.strictEqual para comparar valores
        }catch (error) {
            assert.ifError(error); // Usamos assert.ifError para verificar si hay un error en la respuesta
        }

    });

    it("Get a giveaway", async () =>{
        const response = await axios.get(`/giveaway/${id}`);
        assert.strictEqual(response.status, 200);
    })

    it("End a giveaway", async () => {
        const response = await axios.post(`/giveaway/${id}/end`)
        assert.strictEqual(response.status, 200)
    })
});
