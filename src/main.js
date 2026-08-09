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