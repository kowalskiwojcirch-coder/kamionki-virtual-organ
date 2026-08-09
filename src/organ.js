export class Organ {

    constructor() {

        this.audioContext = new AudioContext();

        this.master = this.audioContext.createGain();

        this.master.gain.value = 0.8;

        this.master.connect(
            this.audioContext.destination
        );

        this.voices = new Map();

        console.log("Organ engine gotowy");
    }

    async start() {

        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }

    }

    noteOn(note, velocity = 127) {

        console.log(
            "NOTE ON:",
            note,
            "velocity:",
            velocity
        );

    }

    noteOff(note) {

        console.log(
            "NOTE OFF:",
            note
        );

    }

}