import assert from "assert";
import axios from "./axios";


describe("Test Giveaway", () => {
    let id: string | undefined;

    it("Create a giveaway", async () => {
        try {
            const response = await axios.post("/giveaway", {
               guild: "739306480586588241",
               channel: "921170433800294460",
               prize: "rol dos",
               winnersCount: 1,
               delay: 60*1,
               users: ["403695999941345280", "725470592303890543", "518251720128856084"],
               lang: "en_US",
               active: true
            });

            // Verifica si la respuesta es correcta y tiene el ID del giveaway
            assert.strictEqual(response.status, 200);
            assert.ok(response.data?.giveaway?.id, "El ID del giveaway no está presente en la respuesta.");
            
            id = response.data.giveaway.id; // Almacena el ID para usarlo en las siguientes pruebas
        } catch (error: any) {
            const data = error.response?.data;
            if(Array.isArray(data)){
                assert.ifError(`${error.message} datails:\n${error.response.data.join("\n")}`); // Verifica si hay un error en la solicitud
            }
            else if(typeof data === "object"){
                assert.ifError(`${error.message} datails:\n${JSON.stringify(data)}`); // Verifica si hay un error en la solicitud
            }
            else{
                assert.ifError(error); // Captura cualquier otro error en la solicitud
            }
        }
    });

    if(!id) return;

    it("Get a giveaway", async () => {
        if (!id) {
            assert.fail("El ID del giveaway no se estableció correctamente.");
        }

        try {
            const response = await axios.get(`/giveaway/${id}`);
            assert.strictEqual(response.status, 200);
        } catch (error: any) {
            assert.ifError(error); // Captura cualquier error en la solicitud
        }
    });

    it("End a giveaway", async () => {
        if (!id) {
            assert.fail("El ID del giveaway no se estableció correctamente.");
        }

        try {
            const response = await axios.post(`/giveaway/${id}/end`);
            assert.strictEqual(response.status, 200);
        } catch (error: any) {
            assert.ifError(error); // Captura cualquier error en la solicitud
        }
    });
});
