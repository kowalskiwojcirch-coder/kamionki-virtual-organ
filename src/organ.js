export class Organ {

    constructor() {

        this.audioContext = new AudioContext();

        // =====================================================
        // GŁOŚNOŚĆ GŁÓWNA
        // =====================================================

        this.master = this.audioContext.createGain();

        // Stała głośność - velocity MIDI NIE wpływa na głośność
        this.master.gain.value = 0.20;


        // =====================================================
        // DELIKATNA SATURACJA
        // =====================================================

        this.saturation = this.audioContext.createWaveShaper();

        this.saturation.curve =
            this.createSaturationCurve(180);

        this.saturation.oversample = "2x";


        // =====================================================
        // POGŁOS KOŚCIELNY
        // =====================================================

        this.reverb = this.audioContext.createConvolver();

        this.reverb.buffer =
            this.createChurchImpulse(
                4.8,
                2.8
            );


        this.directGain =
            this.audioContext.createGain();

        this.reverbGain =
            this.audioContext.createGain();


        this.directGain.gain.value = 0.76;

        this.reverbGain.gain.value = 0.24;


        this.master.connect(
            this.saturation
        );


        this.saturation.connect(
            this.directGain
        );

        this.saturation.connect(
            this.reverbGain
        );


        this.directGain.connect(
            this.audioContext.destination
        );

        this.reverbGain.connect(
            this.reverb
        );

        this.reverb.connect(
            this.audioContext.destination
        );


        // =====================================================
        // REJESTRY
        // =====================================================

        this.registers = {


            // -------------------------------------------------
            // GEIGENPRINCIPAL 8'
            // -------------------------------------------------

            geigenprincipal8: {

                name: "Geigenprincipal 8'",

                enabled: true,

                octave: 1,

                attack: 0.035,

                release: 0.38,

                air: 0.008,

                detune: 0.018,

                brightness: 1.0,

                harmonics: [

                    [1, 1.000],
                    [2, 0.280],
                    [3, 0.210],
                    [4, 0.115],
                    [5, 0.085],
                    [6, 0.060],
                    [7, 0.040],
                    [8, 0.027],
                    [9, 0.018],
                    [10, 0.012],
                    [11, 0.008],
                    [12, 0.005]

                ]
            },


            // -------------------------------------------------
            // SALICIONAL 8'
            // -------------------------------------------------

            salicional8: {

                name: "Salicional 8'",

                enabled: false,

                octave: 1,

                attack: 0.055,

                release: 0.48,

                air: 0.012,

                detune: 0.085,

                brightness: 0.70,

                harmonics: [

                    [1, 1.000],
                    [2, 0.190],
                    [3, 0.145],
                    [4, 0.075],
                    [5, 0.048],
                    [6, 0.030],
                    [7, 0.018],
                    [8, 0.010]

                ]
            },


            // -------------------------------------------------
            // GEDECKT 8'
            // -------------------------------------------------

            gedeckt8: {

                name: "Gedeckt 8'",

                enabled: false,

                octave: 1,

                attack: 0.045,

                release: 0.42,

                air: 0.006,

                detune: 0.012,

                brightness: 0.50,

                harmonics: [

                    [1, 1.000],
                    [2, 0.350],
                    [3, 0.115],
                    [4, 0.055],
                    [5, 0.022],
                    [6, 0.010]

                ]
            },


            // -------------------------------------------------
            // FLAUT TRAVERSO 4'
            // -------------------------------------------------

            flauttraverso4: {

                name: "Flaut traverso 4'",

                enabled: false,

                octave: 2,

                attack: 0.050,

                release: 0.40,

                air: 0.009,

                detune: 0.020,

                brightness: 0.62,

                harmonics: [

                    [1, 1.000],
                    [2, 0.400],
                    [3, 0.130],
                    [4, 0.052],
                    [5, 0.021],
                    [6, 0.010]

                ]
            },


            // -------------------------------------------------
            // WALDFLÖTE 2'
            // -------------------------------------------------

            waldflote2: {

                name: "Waldflöte 2'",

                enabled: false,

                octave: 4,

                attack: 0.028,

                release: 0.34,

                air: 0.007,

                detune: 0.018,

                brightness: 0.82,

                harmonics: [

                    [1, 1.000],
                    [2, 0.430],
                    [3, 0.240],
                    [4, 0.115],
                    [5, 0.060],
                    [6, 0.032],
                    [7, 0.017],
                    [8, 0.009]

                ]
            },


            // -------------------------------------------------
            // SUBBASS 16'
            // -------------------------------------------------

            subbass16: {

                name: "Subbass 16'",

                enabled: false,

                octave: 0.5,

                attack: 0.085,

                release: 0.60,

                air: 0.003,

                detune: 0.008,

                brightness: 0.22,

                harmonics: [

                    [1, 1.000],
                    [2, 0.300],
                    [3, 0.070],
                    [4, 0.025],
                    [5, 0.010]

                ]
            }

        };


        // =====================================================
        // AKTYWNE NUTY
        // =====================================================

        this.activeNotes = new Map();
    }


    // =========================================================
    // START
    // =========================================================

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


    // =========================================================
    // REJESTRY
    // =========================================================

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


    enableRegister(name) {

        if (this.registers[name]) {

            this.registers[name].enabled = true;
        }
    }


    disableRegister(name) {

        if (this.registers[name]) {

            this.registers[name].enabled = false;
        }
    }


    // =========================================================
    // NOTE ON
    // =========================================================

    noteOn(note, velocity = 127) {

        note = Number(note);

        if (!Number.isFinite(note)) {
            return;
        }

        note = Math.round(note);


        if (
            note < 0 ||
            note > 127
        ) {
            return;
        }


        if (
            this.activeNotes.has(note)
        ) {
            return;
        }


        // =====================================================
        // WAŻNE:
        // velocity jest całkowicie ignorowane.
        // Organ ma stałą głośność.
        // =====================================================


        const voices = [];


        for (
            const register
            of Object.values(this.registers)
        ) {

            if (!register.enabled) {
                continue;
            }


            const voice =
                this.createPipeVoice(
                    note,
                    register
                );


            if (voice) {

                voices.push(
                    voice
                );
            }
        }


        if (
            voices.length > 0
        ) {

            this.activeNotes.set(
                note,
                voices
            );
        }
    }


    // =========================================================
    // PISZCZAŁKA
    // =========================================================

    createPipeVoice(
        note,
        register
    ) {

        // -----------------------------------------------------
        // MIDI -> Hz
        // -----------------------------------------------------

        const midiFrequency =
            440 *
            Math.pow(
                2,
                (note - 69) / 12
            );


        const octave =
            Number.isFinite(
                register.octave
            )
                ? register.octave
                : 1;


        const frequency =
            midiFrequency *
            octave;


        if (
            !Number.isFinite(
                frequency
            ) ||
            frequency <= 0
        ) {

            return null;
        }


        // -----------------------------------------------------
        // GŁÓWNA OBWIEDNIA
        // -----------------------------------------------------

        const envelope =
            this.audioContext.createGain();


        envelope.gain.value = 0;


        envelope.connect(
            this.master
        );


        const oscillators = [];


        // -----------------------------------------------------
        // HARMONICZNE
        // -----------------------------------------------------

        for (
            const data
            of register.harmonics
        ) {

            const harmonic =
                Number(data[0]);

            const amplitude =
                Number(data[1]);


            if (
                !Number.isFinite(harmonic) ||
                !Number.isFinite(amplitude)
            ) {

                continue;
            }


            const oscillator =
                this.audioContext
                    .createOscillator();


            const harmonicGain =
                this.audioContext
                    .createGain();


            const actualFrequency =
                frequency *
                harmonic;


            if (
                !Number.isFinite(
                    actualFrequency
                ) ||
                actualFrequency <= 0
            ) {

                continue;
            }


            oscillator.type =
                "sine";


            oscillator.frequency.setValueAtTime(
                actualFrequency,
                this.audioContext.currentTime
            );


            // -------------------------------------------------
            // Minimalna niestabilność piszczałki
            // -------------------------------------------------

            const randomDetune =
                (
                    Math.random() - 0.5
                ) *
                register.detune;


            oscillator.detune.setValueAtTime(
                randomDetune,
                this.audioContext.currentTime
            );


            // -------------------------------------------------
            // GŁOŚNOŚĆ HARMONICZNEJ
            // -------------------------------------------------

            harmonicGain.gain.value =
                amplitude;


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


        // -----------------------------------------------------
        // SZUM POWIETRZA
        // -----------------------------------------------------

        const air =
            this.createAir(
                frequency,
                register.air,
                envelope
            );


        // -----------------------------------------------------
        // LEKKI TRANSIENT
        // -----------------------------------------------------

        const transient =
            this.createTransient(
                frequency,
                register,
                envelope
            );


        // -----------------------------------------------------
        // ATAK
        // -----------------------------------------------------

        const now =
            this.audioContext.currentTime;


        const attack =
            Number.isFinite(
                register.attack
            )
                ? register.attack
                : 0.04;


        envelope.gain.setValueAtTime(
            0,
            now
        );


        envelope.gain.linearRampToValueAtTime(
            0.72,
            now + attack
        );


        return {

            envelope,

            oscillators,

            air,

            transient,

            release:
                Number.isFinite(
                    register.release
                )
                    ? register.release
                    : 0.4
        };
    }


    // =========================================================
    // SZUM POWIETRZA
    // =========================================================

    createAir(
        frequency,
        amount,
        destination
    ) {

        if (
            amount <= 0
        ) {
            return null;
        }


        const duration =
            0.25;


        const length =
            Math.floor(
                this.audioContext.sampleRate *
                duration
            );


        const buffer =
            this.audioContext.createBuffer(
                1,
                length,
                this.audioContext.sampleRate
            );


        const data =
            buffer.getChannelData(0);


        for (
            let i = 0;
            i < length;
            i++
        ) {

            // Lekko miękki szum

            data[i] =
                (
                    Math.random() * 2 - 1
                ) *
                0.35;
        }


        const source =
            this.audioContext
                .createBufferSource();


        source.buffer =
            buffer;


        source.loop = true;


        const filter =
            this.audioContext
                .createBiquadFilter();


        filter.type =
            "bandpass";


        filter.frequency.value =
            Math.min(
                5000,
                Math.max(
                    250,
                    frequency * 1.8
                )
            );


        filter.Q.value =
            0.8;


        const gain =
            this.audioContext
                .createGain();


        gain.gain.value =
            amount;


        source.connect(
            filter
        );


        filter.connect(
            gain
        );


        gain.connect(
            destination
        );


        source.start();


        return {
            source,
            gain
        };
    }


    // =========================================================
    // TRANSIENT PISZCZAŁKI
    // =========================================================

    createTransient(
        frequency,
        register,
        destination
    ) {

        const oscillator =
            this.audioContext
                .createOscillator();


        const gain =
            this.audioContext
                .createGain();


        oscillator.type =
            "triangle";


        oscillator.frequency.value =
            frequency *
            1.003;


        gain.gain.value = 0;


        oscillator.connect(
            gain
        );


        gain.connect(
            destination
        );


        const now =
            this.audioContext.currentTime;


        gain.gain.setValueAtTime(
            0,
            now
        );


        gain.gain.linearRampToValueAtTime(
            0.025,
            now + 0.008
        );


        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            now + 0.10
        );


        oscillator.start(now);


        oscillator.stop(
            now + 0.12
        );


        return {
            oscillator,
            gain
        };
    }


    // =========================================================
    // NOTE OFF
    // =========================================================

    noteOff(note) {

        note = Number(note);


        if (
            !Number.isFinite(note)
        ) {
            return;
        }


        note = Math.round(note);


        const voices =
            this.activeNotes.get(
                note
            );


        if (!voices) {
            return;
        }


        const now =
            this.audioContext.currentTime;


        for (
            const voice
            of voices
        ) {

            if (
                !voice.envelope
            ) {
                continue;
            }


            const release =
                voice.release;


            const current =
                Math.max(
                    0,
                    Number(
                        voice.envelope
                            .gain
                            .value
                    ) || 0
                );


            voice.envelope.gain
                .cancelScheduledValues(
                    now
                );


            voice.envelope.gain
                .setValueAtTime(
                    current,
                    now
                );


            voice.envelope.gain
                .linearRampToValueAtTime(
                    0,
                    now + release
                );


            // -------------------------------------------------
            // Zatrzymanie harmonicznych
            // -------------------------------------------------

            for (
                const osc
                of voice.oscillators
            ) {

                try {

                    osc.oscillator.stop(
                        now +
                        release +
                        0.05
                    );

                } catch (error) {

                    // Już zatrzymany.
                }
            }


            // -------------------------------------------------
            // Zatrzymanie szumu
            // -------------------------------------------------

            if (
                voice.air &&
                voice.air.source
            ) {

                try {

                    voice.air.source.stop(
                        now +
                        release +
                        0.05
                    );

                } catch (error) {}
            }
        }


        this.activeNotes.delete(
            note
        );
    }


    // =========================================================
    // SATURACJA
    // =========================================================

    createSaturationCurve(amount) {

        const samples = 1024;

        const curve =
            new Float32Array(
                samples
            );


        const drive =
            amount / 100;


        for (
            let i = 0;
            i < samples;
            i++
        ) {

            const x =
                (i * 2 / samples) - 1;


            curve[i] =
                Math.tanh(
                    x * (1 + drive)
                );
        }


        return curve;
    }


    // =========================================================
    // IMPULS POGŁOSOWY
    // =========================================================

    createChurchImpulse(
        seconds,
        decay
    ) {

        const length =
            Math.floor(
                this.audioContext.sampleRate *
                seconds
            );


        const impulse =
            this.audioContext.createBuffer(
                2,
                length,
                this.audioContext.sampleRate
            );


        for (
            let channel = 0;
            channel < 2;
            channel++
        ) {

            const data =
                impulse.getChannelData(
                    channel
                );


            for (
                let i = 0;
                i < length;
                i++
            ) {

                const position =
                    i / length;


                const envelope =
                    Math.pow(
                        1 - position,
                        decay
                    );


                // Gęsty, nieregularny ogon

                data[i] =
                    (
                        Math.random() * 2 - 1
                    ) *
                    envelope *
                    0.75;
            }
        }


        return impulse;
    }
}