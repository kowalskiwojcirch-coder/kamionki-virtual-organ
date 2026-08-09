import { Organ } from "./organ.js";
import { connectMIDI } from "./midi.js";

const organ = new Organ();

window.organ = organ;

connectMIDI(organ);