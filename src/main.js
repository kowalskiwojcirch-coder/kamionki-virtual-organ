import { Organ } from "./organ.js";
import { connectMIDI } from "./midi.js";

const organ = new Organ();

connectMIDI(organ);

document.getElementById("status").textContent =
    "GOTOWE — silnik organów uruchomiony";