export class Organ {

    constructor() {

        this.audioContext = new AudioContext();

        this.master = this.audioContext.createGain();
        this.master.gain.value = 0.8;

        this.master.connect(
            this.audioContext.destination
        );
    }

    async start() {

        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }
    }

    noteOn(note, velocity) {

        console.log(
            "NOTE ON",
            note,
            velocity
        );
    }

    noteOff(note) {

        console.log(
            "NOTE OFF",
            note
        );
    }
}