export class Organ {

    constructor() {

        this.audioContext = new AudioContext();

        this.master = this.audioContext.createGain();
        this.master.gain.value = 0.25;

        this.master.connect(
            this.audioContext.destination
        );

        this.activeNotes = new Map();
    }

    async start() {

        if (this.audioContext.state === "suspended") {
            await this.audioContext.resume();
        }
    }

    noteOn(note, velocity = 127) {

        if (this.activeNotes.has(note)) {
            return;
        }

        const frequency =
            440 * Math.pow(2, (note - 69) / 12);

        const oscillator =
            this.audioContext.createOscillator();

        const gain =
            this.audioContext.createGain();

        oscillator.type = "sawtooth";
        oscillator.frequency.value = frequency;

        gain.gain.setValueAtTime(
            0,
            this.audioContext.currentTime
        );

        gain.gain.linearRampToValueAtTime(
            0.15,
            this.audioContext.currentTime + 0.05
        );

        oscillator.connect(gain);
        gain.connect(this.master);

        oscillator.start();

        this.activeNotes.set(note, {
            oscillator,
            gain
        });
    }

    noteOff(note) {

        const voice = this.activeNotes.get(note);

        if (!voice) {
            return;
        }

        const now =
            this.audioContext.currentTime;

        voice.gain.gain.cancelScheduledValues(now);

        voice.gain.gain.setValueAtTime(
            voice.gain.gain.value,
            now
        );

        voice.gain.gain.linearRampToValueAtTime(
            0,
            now + 0.15
        );

        voice.oscillator.stop(
            now + 0.2
        );

        this.activeNotes.delete(note);
    }
}