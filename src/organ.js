export class Organ {

    constructor() {

        this.audioContext = new AudioContext();

        // =========================
        // MASTER
        // =========================

        this.master = this.audioContext.createGain();
        this.master.gain.value = 0.35;

        this.master.connect(
            this.audioContext.destination
        );


        // =========================
        // REJESTRY
        // =========================

        this.registers = {

            geigenprincipal8: {
                name: "Geigenprincipal 8'",
                enabled: true,

                harmonics: [
                    [1, 1.00],
                    [2, 0.18],
                    [3, 0.35],
                    [4, 0.08],
                    [5, 0.16],
                    [6, 0.05],
                    [7, 0.08],
                    [8, 0.03]
                ],

                detune: 0.08
            },


            salicional8: {
                name: "Salicional 8'",
                enabled: false,

                harmonics: [
                    [1, 1.00],
                    [2, 0.10],
                    [3, 0.20],
                    [4, 0.05],
                    [5, 0.08],
                    [6, 0.03]
                ],

                detune: 0.22
            },


            gedeckt8: {
                name: "Gedeckt 8'",
                enabled: false,

                harmonics: [
                    [1, 1.00],
                    [2, 0.30],
                    [3, 0.08],
                    [4, 0.04],
                    [5, 0.02]
                ],

                detune: 0.04
            },


            flauttraverso4: {
                name: "Flaut traverso 4'",
                enabled: false,

                harmonics: [
                    [1, 1.00],
                    [2, 0.45],
                    [3, 0.10],
                    [4, 0.05],
                    [5, 0.02]
                ],

                detune: 0.06,

                octave: 2
            },


            waldflote2: {
                name: "Waldflöte 2'",
                enabled: false,

                harmonics: [
                    [1, 1.00],
                    [2, 0.35],
                    [3, 0.25],
                    [4, 0.12],
                    [5, 0.05],
                    [6, 0.03]
                ],

                detune: 0.05,

                octave: 4
            },


            subbass16: {
                name: "Subbass 16'",
                enabled: false,

                harmonics: [
                    [1, 1.00],
                    [2, 0.35],
                    [3, 0.08],
                    [4, 0.03]
                ],

                detune: 0.02,

                octave: 0.5
            }
        };


        // Aktywne klawisze

        this.activeNotes = new Map();
    }


    // =========================
    // START AUDIO
    // =========================

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


    // =========================
    // REJESTRY
    // =========================

    enableRegister(name) {

        if (!this.registers[name]) return;

        this.registers[name].enabled = true;
    }


    disableRegister(name) {

        if (!this.registers[name]) return;

        this.registers[name].enabled = false;
    }


    toggleRegister(name) {

        if (!this.registers[name]) return;

        this.registers[name].enabled =
            !this.registers[name].enabled;

        console.log(
            this.registers[name].name,
            this.registers[name].enabled
                ? "ON"
                : "OFF"
        );
    }


    // =========================
    // NOTE ON
    // =========================

    noteOn(note, velocity = 127) {

        if (
            this.activeNotes.has(note)
        ) {
            return;
        }


        const voices = [];


        for (
            const [name, register]
            of Object.entries(this.registers)
        ) {

            if (!register.enabled) {
                continue;
            }


            const voice =
                this.createRegisterVoice(
                    note,
                    velocity,
                    register
                );


            voices.push(voice);
        }


        this.activeNotes.set(
            note,
            voices
        );
    }


    // =========================
    // TWORZENIE GŁOSU
    // =========================

    createRegisterVoice(
        note,
        velocity,
        register
    ) {

        const frequency =
            440 *
            Math.pow(
                2,
                (note - 69) / 12
            );


        const gain =
            this.audioContext.createGain();


        gain.connect(
            this.master
        );


        const oscillators = [];


        // Każda harmoniczna
        // jest osobnym oscylatorem.

        for (
            const [
                harmonic,
                amplitude
            ]
            of register.harmonics
        ) {

            const oscillator =
                this.audioContext
                    .createOscillator();


            oscillator.type = "sine";


            const randomDetune =
                (
                    Math.random() - 0.5
                ) *
                register.detune;


            oscillator.frequency.value =
                frequency *
                harmonic *
                register.octave;


            oscillator.detune.value =
                randomDetune;


            const harmonicGain =
                this.audioContext
                    .createGain();


            harmonicGain.gain.value =
                amplitude *
                (velocity / 127);


            oscillator.connect(
                harmonicGain
            );


            harmonicGain.connect(
                gain
            );


            oscillator.start();


            oscillators.push({
                oscillator,
                harmonicGain
            });
        }


        // =========================
        // ATAK PISZCZAŁKI
        // =========================

        const now =
            this.audioContext.currentTime;


        gain.gain.setValueAtTime(
            0,
            now
        );


        gain.gain.linearRampToValueAtTime(
            0.18,
            now + 0.025
        );


        return {
            oscillators,
            gain
        };
    }


    // =========================
    // NOTE OFF
    // =========================

    noteOff(note) {

        const voices =
            this.activeNotes.get(note);


        if (!voices) {
            return;
        }


        const now =
            this.audioContext.currentTime;


        for (
            const voice
            of voices
        ) {

            voice.gain.gain.cancelScheduledValues(
                now
            );


            voice.gain.gain.setValueAtTime(
                voice.gain.gain.value,
                now
            );


            // Łagodne wygaszenie
            // zamiast brutalnego ucięcia.

            voice.gain.gain.linearRampToValueAtTime(
                0,
                now + 0.35
            );


            for (
                const oscillator
                of voice.oscillators
            ) {

                oscillator.oscillator.stop(
                    now + 0.4
                );
            }
        }


        this.activeNotes.delete(note);
    }
}