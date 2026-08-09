import { Organ } from "./organ.js";
import { connectMIDI } from "./midi.js";

const organ = new Organ();

const startButton = document.getElementById("start-audio");
const status = document.getElementById("status");

startButton.addEventListener("click", async () => {

    await organ.start();

    status.textContent =
        "DŹWIĘK URUCHOMIONY — podłącz MIDI i graj.";

    startButton.disabled = true;

    await connectMIDI(organ);
});

const registerButtons =
    document.querySelectorAll(
        "[data-register]"
    );


registerButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            const register =
                button.dataset.register;

            organ.toggleRegister(
                register
            );


            button.classList.toggle(
                "active",
                organ.registers[register].enabled
            );

        }
    );

});