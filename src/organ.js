export class Organ {

    constructor() {

        this.audioContext = new AudioContext();

        // =========================
        // MASTER
        // =========================

        this.master =
            this.audioContext.createGain();

        this.master.gain.value = 0.25;

        this.master.connect(
            this.audioContext.destination
        );


        // =========================
        // REJESTRY ORGANOWE
        // =========================

        this.registers = {

            geigenprincipal8: {

                name: "Geigenprincipal 8'",

                enabled: true,

                // 8'
                octave: 1,

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

                octave: 1,

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

                octave: 1,

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

                // 4'
                octave: 2,

                harmonics: [
                    [1, 1.00],
                    [2, 0.45],
                    [3, 0.10],
                    [4, 0.05],
                    [5, 0.02]
                ],

                detune: 0.06
            },


            waldflote2: {

                name: "Waldflöte 2'",

                enabled: false,

                // 2'
                octave: 4,

                harmonics: [
                    [1, 1.00],
                    [2, 0.35],
                    [3, 0.25],
                    [4, 0.12],
                    [5, 0.05],
                    [6, 0.03]
                ],

                detune: 0.05
            },


            subbass16: {

                name: "Subbass 16'",

                enabled: false,

                // 16'
                octave: 0.5,

                harmonics: [
                    [1, 1.00],
                    [2, 0.35],
                    [3, 0.08],
                    [4, 0.03]
                ],

                detune: 0.02
            }

        };


        // =========================
        // AKTYWNE KLAWISZE
        // =========================

        this.activeNotes =
            new Map();
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
    // WŁĄCZ REJESTR
    // =========================

    enableRegister(name) {

        if (!this.registers[name]) {
            return;
        }

        this.registers[name].enabled = true;

        console.log(
            "ON:",
            this.registers[name].name
        );
    }


    // =========================
    // WYŁĄCZ REJESTR
    // =========================

    disableRegister(name) {

        if (!this.registers[name]) {
            return;
        }

        this.registers[name].enabled = false;

        console.log(
            "OFF:",
            this.registers[name].name
        );
    }


    // =========================
    // PRZEŁĄCZ REJESTR
    // =========================

    toggleRegister(name) {

        if (!this.registers[name]) {
            return;
        }

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

    noteOn(
        note,
        velocity = 127
    ) {

        if (
            this.activeNotes.has(note)
        ) {
            return;
        }


        const voices = [];


        // Sprawdzenie aktywnych głosów

        for (
            const register
            of Object.values(
                this.registers
            )
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

        // MIDI → częstotliwość

        const frequency =
            440 *
            Math.pow(
                2,
                (note - 69) / 12
            );


        // Bezpieczna wartość oktawy

        const octave =
            Number.isFinite(
                register.octave
            )
                ? register.octave
                : 1;


        // =========================
        // WSPÓLNA OBWIEDNIA
        // =========================

        const envelope =
            this.audioContext.createGain();


        envelope.gain.value = 0;


        envelope.connect(
            this.master
        );


        const oscillators = [];


        // =========================
        // HARMONICZNE
        // =========================

        for (
            const harmonicData
            of register.harmonics
        ) {

            const harmonic =
                harmonicData[0];

            const amplitude =
                harmonicData[1];


            // Bezpieczne wartości

            const safeHarmonic =
                Number.isFinite(harmonic)
                    ? harmonic
                    : 1;


            const safeAmplitude =
                Number.isFinite(amplitude)
                    ? amplitude
                    : 0;


            const oscillator =
                this.audioContext
                    .createOscillator();


            const harmonicGain =
                this.audioContext
                    .createGain();


            oscillator.type = "sine";


            // =========================
            // CZĘSTOTLIWOŚĆ
            // =========================

            const oscillatorFrequency =
                frequency *
                safeHarmonic *
                octave;


            oscillator.frequency.value =
                oscillatorFrequency;


            // Delikatne rozstrojenie

            const detuneAmount =
                Number.isFinite(
                    register.detune
                )
                    ? register.detune
                    : 0;


            oscillator.detune.value =
                (
                    Math.random() - 0.5
                ) *
                detuneAmount;


            // =========================
            // GŁOŚNOŚĆ HARMONICZNEJ
            // =========================

            harmonicGain.gain.value =
                safeAmplitude *
                (
                    velocity / 127
                );


            oscillator.connect(
                harmonicGain
            );


            harmonicGain.connect(
                envelope
            );


            oscillator.start();


            oscillators.push(
                {
                    oscillator,
                    gain: harmonicGain
                }
            );
        }


        // =========================
        // ATAK
        // =========================

        const now =
            this.audioContext.currentTime;


        envelope.gain.setValueAtTime(
            0,
            now
        );


        envelope.gain.linearRampToValueAtTime(
            0.7,
            now + 0.035
        );


        return {

            oscillators,

            envelope

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

            // Łagodne wygaszanie

            voice.envelope.gain.cancelScheduledValues(
                now
            );


            voice.envelope.gain.setValueAtTime(
                voice.envelope.gain.value,
                now
            );


            voice.envelope.gain.linearRampToValueAtTime(
                0,
                now + 0.30
            );


            // Zatrzymanie oscylatorów

            for (
                const oscillator
                of voice.oscillators
            ) {

                oscillator.oscillator.stop(
                    now + 0.35
                );
            }
        }


        this.activeNotes.delete(
            note
        );
    }

}