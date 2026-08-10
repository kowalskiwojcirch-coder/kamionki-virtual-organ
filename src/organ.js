export class Organ {

    constructor() {

        this.audioContext = new AudioContext();

        // =========================
        // MASTER
        // =========================

        this.master =
            this.audioContext.createGain();

        this.master.gain.setValueAtTime(
            0.25,
            this.audioContext.currentTime
        );

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
                octave: 1,
                detune: 0.08,

                harmonics: [
                    [1, 1.00],
                    [2, 0.18],
                    [3, 0.35],
                    [4, 0.08],
                    [5, 0.16],
                    [6, 0.05],
                    [7, 0.08],
                    [8, 0.03]
                ]
            },

            salicional8: {
                name: "Salicional 8'",
                enabled: false,
                octave: 1,
                detune: 0.22,

                harmonics: [
                    [1, 1.00],
                    [2, 0.10],
                    [3, 0.20],
                    [4, 0.05],
                    [5, 0.08],
                    [6, 0.03]
                ]
            },

            gedeckt8: {
                name: "Gedeckt 8'",
                enabled: false,
                octave: 1,
                detune: 0.04,

                harmonics: [
                    [1, 1.00],
                    [2, 0.30],
                    [3, 0.08],
                    [4, 0.04],
                    [5, 0.02]
                ]
            },

            flauttraverso4: {
                name: "Flaut traverso 4'",
                enabled: false,
                octave: 2,
                detune: 0.06,

                harmonics: [
                    [1, 1.00],
                    [2, 0.45],
                    [3, 0.10],
                    [4, 0.05],
                    [5, 0.02]
                ]
            },

            waldflote2: {
                name: "Waldflöte 2'",
                enabled: false,
                octave: 4,
                detune: 0.05,

                harmonics: [
                    [1, 1.00],
                    [2, 0.35],
                    [3, 0.25],
                    [4, 0.12],
                    [5, 0.05],
                    [6, 0.03]
                ]
            },

            subbass16: {
                name: "Subbass 16'",
                enabled: false,
                octave: 0.5,
                detune: 0.02,

                harmonics: [
                    [1, 1.00],
                    [2, 0.35],
                    [3, 0.08],
                    [4, 0.03]
                ]
            }
        };


        this.activeNotes = new Map();
    }


    // =========================
    // BEZPIECZNA LICZBA
    // =========================

    safeNumber(value, fallback) {

        const number = Number(value);

        if (Number.isFinite(number)) {
            return number;
        }

        return fallback;
    }


    // =========================
    // START
    // =========================

    async start() {

        if (
            this.audioContext.state !== "running"
        ) {
            await this.audioContext.resume();
        }

        console.log(
            "AUDIO:",
            this.audioContext.state
        );
    }


    // =========================
    // REJESTRY
    // =========================

    enableRegister(name) {

        if (!this.registers[name]) {
            return;
        }

        this.registers[name].enabled = true;
    }


    disableRegister(name) {

        if (!this.registers[name]) {
            return;
        }

        this.registers[name].enabled = false;
    }


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

    noteOn(note, velocity = 127) {

        // MIDI musi dać prawidłową liczbę

        note = this.safeNumber(note, -1);

        velocity = this.safeNumber(
            velocity,
            127
        );


        // Jeżeli MIDI wysłało coś złego,
        // ignorujemy wiadomość.

        if (
            !Number.isFinite(note) ||
            note < 0 ||
            note > 127
        ) {

            console.warn(
                "Nieprawidłowy numer MIDI:",
                note
            );

            return;
        }


        velocity =
            Math.max(
                0,
                Math.min(
                    127,
                    velocity
                )
            );


        note = Math.round(note);


        if (
            this.activeNotes.has(note)
        ) {
            return;
        }


        const voices = [];


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


            if (voice) {
                voices.push(voice);
            }
        }


        if (voices.length > 0) {

            this.activeNotes.set(
                note,
                voices
            );
        }
    }


    // =========================
    // TWORZENIE GŁOSU
    // =========================

    createRegisterVoice(
        note,
        velocity,
        register
    ) {

        // =========================
        // CZĘSTOTLIWOŚĆ MIDI
        // =========================

        const safeNote =
            this.safeNumber(
                note,
                60
            );


        const frequency =
            440 *
            Math.pow(
                2,
                (safeNote - 69) / 12
            );


        if (
            !Number.isFinite(frequency) ||
            frequency <= 0
        ) {

            console.error(
                "Błędna częstotliwość:",
                frequency,
                "MIDI:",
                safeNote
            );

            return null;
        }


        // =========================
        // OKTAWA
        // =========================

        const octave =
            this.safeNumber(
                register.octave,
                1
            );


        // =========================
        // DETUNE
        // =========================

        const detune =
            this.safeNumber(
                register.detune,
                0
            );


        // =========================
        // ENVELOPE
        // =========================

        const envelope =
            this.audioContext.createGain();


        const now =
            this.audioContext.currentTime;


        envelope.gain.setValueAtTime(
            0,
            now
        );


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

            let harmonic =
                this.safeNumber(
                    harmonicData[0],
                    1
                );


            let amplitude =
                this.safeNumber(
                    harmonicData[1],
                    0
                );


            // Dodatkowa ochrona

            if (
                harmonic <= 0
            ) {
                harmonic = 1;
            }


            if (
                amplitude < 0
            ) {
                amplitude = 0;
            }


            // =========================
            // CZĘSTOTLIWOŚĆ
            // =========================

            let oscillatorFrequency =
                frequency *
                harmonic *
                octave;


            // OSTATECZNE SPRAWDZENIE

            if (
                !Number.isFinite(
                    oscillatorFrequency
                ) ||
                oscillatorFrequency <= 0
            ) {

                console.warn(
                    "Pominięto błędną harmoniczną:",
                    oscillatorFrequency
                );

                continue;
            }


            // =========================
            // OSCYLATOR
            // =========================

            const oscillator =
                this.audioContext
                    .createOscillator();


            const harmonicGain =
                this.audioContext
                    .createGain();


            oscillator.type = "sine";


            oscillator.frequency.setValueAtTime(
                oscillatorFrequency,
                now
            );


            // Losowe minimalne rozstrojenie

            let randomDetune =
                (
                    Math.random() - 0.5
                ) * detune;


            if (
                !Number.isFinite(
                    randomDetune
                )
            ) {
                randomDetune = 0;
            }


            oscillator.detune.setValueAtTime(
                randomDetune,
                now
            );


            // =========================
            // GŁOŚNOŚĆ
            // =========================

            let gainValue =
                amplitude *
                (
                    velocity / 127
                );


            if (
                !Number.isFinite(
                    gainValue
                )
            ) {
                gainValue = 0;
            }


            harmonicGain.gain.setValueAtTime(
                gainValue,
                now
            );


            // =========================
            // POŁĄCZENIA
            // =========================

            oscillator.connect(
                harmonicGain
            );


            harmonicGain.connect(
                envelope
            );


            oscillator.start(now);


            oscillators.push({
                oscillator,
                gain: harmonicGain
            });
        }


        // =========================
        // JEŻELI NIE MA OSCYLATORÓW
        // =========================

        if (
            oscillators.length === 0
        ) {

            envelope.disconnect();

            return null;
        }


        // =========================
        // ATAK
        // =========================

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

        note =
            this.safeNumber(
                note,
                -1
            );


        if (
            !Number.isFinite(note)
        ) {
            return;
        }


        note = Math.round(note);


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

            if (!voice.envelope) {
                continue;
            }


            const currentGain =
                this.safeNumber(
                    voice.envelope.gain.value,
                    0
                );


            voice.envelope.gain.cancelScheduledValues(
                now
            );


            voice.envelope.gain.setValueAtTime(
                currentGain,
                now
            );


            voice.envelope.gain.linearRampToValueAtTime(
                0,
                now + 0.30
            );


            for (
                const oscillator
                of voice.oscillators
            ) {

                try {

                    oscillator.oscillator.stop(
                        now + 0.35
                    );

                } catch (error) {

                    // Oscylator już zatrzymany.
                }
            }
        }


        this.activeNotes.delete(note);
    }
}