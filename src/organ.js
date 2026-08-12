export class Organ {

    constructor() {

        this.audioContext =
            new (window.AudioContext || window.webkitAudioContext)();


        // =====================================================
        // MASTER
        // =====================================================

        this.master =
            this.audioContext.createGain();

        this.master.gain.value = 0.14;


        // =====================================================
        // DELIKATNY MASTER COMPRESSOR
        // =====================================================

        this.compressor =
            this.audioContext.createDynamicsCompressor();

        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 2;
        this.compressor.attack.value = 0.008;
        this.compressor.release.value = 0.18;


        // =====================================================
        // DIRECT
        // =====================================================

        this.directGain =
            this.audioContext.createGain();

        this.directGain.gain.value = 0.965;


        // =====================================================
        // REVERB
        // =====================================================

        this.reverbGain =
            this.audioContext.createGain();

        this.reverbGain.gain.value = 0.035;


        this.reverb =
            this.audioContext.createConvolver();


        // =====================================================
        // ROUTING
        // =====================================================

        this.master.connect(
            this.compressor
        );

        this.compressor.connect(
            this.directGain
        );

        this.compressor.connect(
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


        this.reverb.buffer =
            this.createReverb();


        // =====================================================
        // REJESTRY
        // =====================================================

        this.samples = {

            geingenprincipal: {

                name: "Geigenprincipal 8′",

                file:
                    "./samples/geingenprincipal1.mp3",

                enabled: true,

                // C2
                baseFrequency: 65.4064,

                octave: 0,

                volume: 0.48,

                attack: 0.010,

                release: 0.22,

                loopStart: 0.25,

                loopEnd: 0.95
            },


            sacional: {

                name: "Salicional 8′",

                file:
                    "./samples/sacional1.mp3",

                enabled: false,

                baseFrequency: 65.4064,

                octave: 0,

                volume: 0.33,

                attack: 0.012,

                release: 0.23,

                loopStart: 0.25,

                loopEnd: 0.95
            },


            gedact: {

                name: "Gedeckt 8′",

                file:
                    "./samples/gedact1.mp3",

                enabled: false,

                baseFrequency: 65.4064,

                octave: 0,

                volume: 0.33,

                attack: 0.014,

                release: 0.24,

                loopStart: 0.25,

                loopEnd: 0.95
            },


            flute: {

                name: "Flaut Traverso 4′",

                file:
                    "./samples/flute1.mp3",

                enabled: false,

                baseFrequency: 65.4064,

                octave: 1,

                volume: 0.26,

                attack: 0.010,

                release: 0.20,

                loopStart: 0.25,

                loopEnd: 0.95
            }
        };


        // =====================================================
        // CACHE
        // =====================================================

        this.buffers = {};
        this.loading = {};


        // =====================================================
        // AKTYWNE NUTY
        // =====================================================

        this.activeNotes =
            new Map();


        this.started =
            false;
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


        await this.loadAllSamples();


        this.started =
            true;
    }


    // =========================================================
    // LOAD ALL
    // =========================================================

    async loadAllSamples() {

        const names =
            Object.keys(
                this.samples
            );


        await Promise.all(
            names.map(
                name =>
                    this.loadSample(name)
            )
        );
    }


    // =========================================================
    // LOAD SAMPLE
    // =========================================================

    async loadSample(name) {

        if (
            this.buffers[name]
        ) {

            return this.buffers[name];
        }


        if (
            this.loading[name]
        ) {

            return this.loading[name];
        }


        const sample =
            this.samples[name];


        this.loading[name] =
            fetch(sample.file)

                .then(response => {

                    if (
                        !response.ok
                    ) {

                        throw new Error(
                            `${sample.file}: HTTP ${response.status}`
                        );
                    }


                    return response.arrayBuffer();
                })

                .then(data => {

                    return this.audioContext
                        .decodeAudioData(data);
                })

                .then(buffer => {

                    this.buffers[name] =
                        buffer;


                    console.log(
                        `Załadowano ${sample.name}:`,
                        buffer.duration.toFixed(2),
                        "s"
                    );


                    return buffer;
                });


        return this.loading[name];
    }


    // =========================================================
    // REJESTRY
    // =========================================================

    toggleRegister(name) {

        if (
            !this.samples[name]
        ) {

            console.error(
                "Brak rejestru:",
                name
            );

            return false;
        }


        this.samples[name].enabled =
            !this.samples[name].enabled;


        return this.samples[name].enabled;
    }


    // =========================================================
    // NOTE ON
    // =========================================================

    async noteOn(
        midiNote,
        velocity = 127
    ) {

        midiNote =
            Math.round(
                Number(midiNote)
            );


        if (
            !Number.isFinite(midiNote) ||
            midiNote < 0 ||
            midiNote > 127
        ) {

            return;
        }


        if (
            this.activeNotes.has(midiNote)
        ) {

            return;
        }


        if (
            this.audioContext.state !== "running"
        ) {

            await this.audioContext.resume();
        }


        // =====================================================
        // VELOCITY
        // =====================================================

        const velocityNormalized =
            Math.max(
                0,
                Math.min(
                    1,
                    Number(velocity) / 127
                )
            );


        /*
         * Organy nie powinny reagować jak fortepian.
         */

        const velocityFactor =
            0.92 +
            velocityNormalized * 0.08;


        const voices = [];


        // =====================================================
        // AKTYWNE REJESTRY
        // =====================================================

        for (
            const [
                name,
                sample
            ]
            of Object.entries(
                this.samples
            )
        ) {

            if (
                !sample.enabled
            ) {

                continue;
            }


            try {

                const buffer =
                    await this.loadSample(
                        name
                    );


                const voice =
                    this.createVoice(
                        name,
                        buffer,
                        midiNote,
                        velocityFactor
                    );


                if (
                    voice
                ) {

                    voices.push(
                        voice
                    );
                }

            } catch (error) {

                console.error(
                    `Błąd ${sample.name}:`,
                    error
                );
            }
        }


        if (
            voices.length
        ) {

            this.activeNotes.set(
                midiNote,
                voices
            );
        }
    }


    // =========================================================
    // TWORZENIE GŁOSU
    // =========================================================

    createVoice(
        name,
        buffer,
        midiNote,
        velocityFactor
    ) {

        const sample =
            this.samples[name];


        if (
            !sample ||
            !buffer
        ) {

            return null;
        }


        // =====================================================
        // CZĘSTOTLIWOŚĆ MIDI
        // =====================================================

        const midiFrequency =
            440 *
            Math.pow(
                2,
                (midiNote - 69) / 12
            );


        // =====================================================
        // REJESTR
        // =====================================================

        const targetFrequency =
            midiFrequency *
            Math.pow(
                2,
                sample.octave
            );


        // =====================================================
        // PLAYBACK RATE
        // =====================================================

        let playbackRate =
            targetFrequency /
            sample.baseFrequency;


        if (
            !Number.isFinite(
                playbackRate
            )
        ) {

            return null;
        }


        // =====================================================
        // WAŻNE DLA BASU
        // =====================================================

        /*
         * Przy bardzo niskich nutach jedna próbka C2
         * jest rozciągana bardzo mocno.
         *
         * Nie zmieniamy jednak wysokości MIDI.
         *
         * Robimy tylko łagodniejsze zachowanie dynamiki
         * oraz filtrację.
         */

        const isVeryLow =
            midiNote <= 35;


        const isLow =
            midiNote <= 47;


        const isHigh =
            midiNote >= 84;


        // =====================================================
        // SOURCE
        // =====================================================

        const source =
            this.audioContext
                .createBufferSource();


        source.buffer =
            buffer;


        source.playbackRate.value =
            playbackRate;


        // =====================================================
        // FILTR
        // =====================================================

        const filter =
            this.audioContext
                .createBiquadFilter();


        filter.type =
            "lowpass";


        if (isVeryLow) {

            filter.frequency.value =
                1700;

            filter.Q.value =
                0.45;

        } else if (isLow) {

            filter.frequency.value =
                3200;

            filter.Q.value =
                0.35;

        } else if (isHigh) {

            filter.frequency.value =
                12000;

            filter.Q.value =
                0.20;

        } else {

            filter.frequency.value =
                9000;

            filter.Q.value =
                0.25;
        }


        // =====================================================
        // GAIN
        // =====================================================

        const gain =
            this.audioContext
                .createGain();


        gain.gain.value =
            0;


        // =====================================================
        // POŁĄCZENIE
        // =====================================================

        source.connect(
            filter
        );


        filter.connect(
            gain
        );


        gain.connect(
            this.master
        );


        // =====================================================
        // LOOP
        // =====================================================

        this.setupLoop(
            source,
            buffer,
            sample
        );


        // =====================================================
        // DYNAMIKA BASU
        // =====================================================

        let level =
            sample.volume;


        if (isVeryLow) {

            level *= 0.78;

        } else if (isLow) {

            level *= 0.88;
        }


        level *=
            velocityFactor;


        // =====================================================
        // ATTACK
        // =====================================================

        let attack =
            sample.attack;


        /*
         * Dół dostaje trochę spokojniejszy
         * początek, żeby nie robił "buch".
         */

        if (isVeryLow) {

            attack =
                0.026;

        } else if (isLow) {

            attack =
                0.018;
        }


        // =====================================================
        // START
        // =====================================================

        const now =
            this.audioContext.currentTime;


        gain.gain.cancelScheduledValues(
            now
        );


        gain.gain.setValueAtTime(
            0,
            now
        );


        gain.gain.linearRampToValueAtTime(
            level,
            now + attack
        );


        source.start(
            now,
            0
        );


        return {

            source,

            gain,

            release:
                isVeryLow
                    ? 0.30
                    : isLow
                        ? 0.26
                        : sample.release,

            stopped:
                false
        };
    }


    // =========================================================
    // LOOP
    // =========================================================

    setupLoop(
        source,
        buffer,
        sample
    ) {

        const duration =
            buffer.duration;


        if (
            duration < 0.5
        ) {

            source.loop =
                false;

            return;
        }


        let start =
            Number(
                sample.loopStart
            );


        let end =
            Number(
                sample.loopEnd
            );


        /*
         * Nigdy nie pozwalamy loopowi dojść
         * dokładnie do końca pliku.
         */

        start =
            Math.max(
                0.05,
                Math.min(
                    start,
                    duration - 0.20
                )
            );


        end =
            Math.max(
                start + 0.15,
                Math.min(
                    end,
                    duration - 0.05
                )
            );


        if (
            end <= start
        ) {

            source.loop =
                false;

            return;
        }


        source.loop =
            true;


        source.loopStart =
            start;


        source.loopEnd =
            end;
    }


    // =========================================================
    // NOTE OFF
    // =========================================================

    noteOff(midiNote) {

        midiNote =
            Math.round(
                Number(midiNote)
            );


        const voices =
            this.activeNotes.get(
                midiNote
            );


        if (
            !voices
        ) {

            return;
        }


        const now =
            this.audioContext.currentTime;


        for (
            const voice
            of voices
        ) {

            if (
                voice.stopped
            ) {

                continue;
            }


            voice.stopped =
                true;


            const current =
                Math.max(
                    0,
                    Number(
                        voice.gain.gain.value
                    ) || 0
                );


            voice.gain.gain.cancelScheduledValues(
                now
            );


            voice.gain.gain.setValueAtTime(
                current,
                now
            );


            voice.gain.gain.linearRampToValueAtTime(
                0,
                now + voice.release
            );


            try {

                voice.source.stop(
                    now +
                    voice.release +
                    0.06
                );

            } catch (_) {}
        }


        this.activeNotes.delete(
            midiNote
        );
    }


    // =========================================================
    // REVERB
    // =========================================================

    createReverb() {

        const seconds =
            1.7;


        const length =
            Math.floor(
                this.audioContext.sampleRate *
                seconds
            );


        const buffer =
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
                buffer.getChannelData(
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
                        4.2
                    );


                data[i] =
                    (
                        Math.random() * 2 - 1
                    ) *
                    envelope *
                    0.040;
            }
        }


        return buffer;
    }
}
