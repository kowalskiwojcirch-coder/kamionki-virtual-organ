export class Organ {

    constructor() {

        this.audioContext = new AudioContext();

        this.master =
            this.audioContext.createGain();

        this.master.gain.value = 0.2;

        this.master.connect(
            this.audioContext.destination
        );

        this.activeNotes = new Map();
    }


    async start() {

        if (
            this.audioContext.state !== "running"
        ) {

            await this.audioContext.resume();
        }

        console.log(
            "Audio:",
            this.audioContext.state
        );
    }


    noteOn(note, velocity = 127) {

        if (this.activeNotes.has(note)) {
            return;
        }

        const frequency =
            440 *
            Math.pow(
                2,
                (note - 69) / 12
            );


        const oscillator =
            this.audioContext.createOscillator();

        const gain =
            this.audioContext.createGain();


        oscillator.type = "sine";

        oscillator.frequency.value =
            frequency;


        const now =
            this.audioContext.currentTime;


        gain.gain.setValueAtTime(
            0,
            now
        );


        gain.gain.linearRampToValueAtTime(
            0.2,
            now + 0.05
        );


        oscillator.connect(gain);

        gain.connect(this.master);

        oscillator.start(now);


        this.activeNotes.set(
            note,
            {
                oscillator,
                gain
            }
        );


        console.log(
            "NOTE ON:",
            note,
            "Hz:",
            frequency
        );
    }


    noteOff(note) {

        const voice =
            this.activeNotes.get(note);

        if (!voice) {
            return;
        }


        const now =
            this.audioContext.currentTime;


        voice.gain.gain.cancelScheduledValues(
            now
        );


        voice.gain.gain.setValueAtTime(
            voice.gain.gain.value,
            now
        );


        voice.gain.gain.linearRampToValueAtTime(
            0,
            now + 0.1
        );


        voice.oscillator.stop(
            now + 0.15
        );


        this.activeNotes.delete(note);


        console.log(
            "NOTE OFF:",
            note
        );
    }
}