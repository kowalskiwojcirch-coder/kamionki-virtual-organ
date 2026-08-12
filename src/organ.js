export class Organ {

    constructor() {

        this.audioContext =
            new (window.AudioContext || window.webkitAudioContext)();


        // =====================================================
        // MASTER
        // =====================================================

        this.master =
            this.audioContext.createGain();

        // Zostawiamy zapas na akordy i kilka rejestrów.
        this.master.gain.value = 0.18;


        // =====================================================
        // DELIKATNY REVERB
        // =====================================================

        this.directGain =
            this.audioContext.createGain();

        this.reverbGain =
            this.audioContext.createGain();

        this.reverb =
            this.audioContext.createConvolver();


        this.directGain.gain.value = 0.96;
        this.reverbGain.gain.value = 0.04;


        this.master.connect(
            this.directGain
        );

        this.master.connect(
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
        // PRÓBKI
        // =====================================================
        //
        // Wszystkie przesłane przez Ciebie próbki są bazowane
        // około C2 = 65.41 Hz.
        //
        // Dlatego NIE używamy już baseNote: 60.
        //

        this.samples = {

            geingenprincipal: {

                name: "Geigenprincipal 8′",

                file:
                    "./samples/geingenprincipal1.mp3",

                enabled: true,

                baseFrequency: 65.3566,

                volume: 0.52,

                attack: 0.015,

                release: 0.18,

                loopStart: 0.25,

                loopEnd: 0.95
            },


            sacional: {

                name: "Salicional 8′",

                file:
                    "./samples/sacional1.mp3",

                enabled: false,

                baseFrequency: 65.3566,

                volume: 0.40,

                attack: 0.015,

                release: 0.18,

                loopStart: 0.25,

                loopEnd: 0.95
            },


            gedact: {

                name: "Gedeckt 8′",

                file:
                    "./samples/gedact1.mp3",

                enabled: false,

                baseFrequency: 65.3566,

                volume: 0.40,

                attack: 0.015,

                release: 0.18,

                loopStart: 0.25,

                loopEnd: 0.95
            },


            flute: {

                name: "Flaut Traverso 4′",

                file:
                    "./samples/flute1.mp3",

                enabled: false,

                baseFrequency: 65.3566,

                volume: 0.34,

                attack: 0.015,

                release: 0.18,

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
    // ŁADOWANIE
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


        // Organy nie reagują tak mocno na velocity
        // jak fortepian.

        const velocityFactor =
            Math.max(
                0.82,
                Math.min(
                    1,
                    Number(velocity) / 127
                )
            );


        const voices = [];


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
                    `Błąd głosu ${name}:`,
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
    // VOICE
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
        // PRAWDZIWE STROJENIE W Hz
        // =====================================================
        //
        // MIDI 69 = A4 = 440 Hz
        //

        const targetFrequency =
            440 *
            Math.pow(
                2,
                (midiNote - 69) / 12
            );


        const playbackRate =
            targetFrequency /
            sample.baseFrequency;


        if (
            !Number.isFinite(
                playbackRate
            ) ||
            playbackRate <= 0
        ) {

            return null;
        }


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


        // UWAGA:
        // Żadnego losowego detune.
        // Instrument ma być najpierw czysto dostrojony.


        // =====================================================
        // GAIN
        // =====================================================

        const gain =
            this.audioContext
                .createGain();


        gain.gain.value =
            0;


        source.connect(
            gain
        );


        gain.connect(
            this.master
        );


        // =====================================================
        // LOOP
        // =====================================================

        const duration =
            buffer.duration;


        let loopStart =
            Number(
                sample.loopStart
            );


        let loopEnd =
            Number(
                sample.loopEnd
            );


        loopStart =
            Math.max(
                0.02,
                Math.min(
                    loopStart,
                    duration - 0.10
                )
            );


        loopEnd =
            Math.max(
                loopStart + 0.05,
                Math.min(
                    loopEnd,
                    duration - 0.02
                )
            );


        source.loop =
            true;


        source.loopStart =
            loopStart;


        source.loopEnd =
            loopEnd;


        // =====================================================
        // ATAK
        // =====================================================

        const now =
            this.audioContext.currentTime;


        const targetGain =
            sample.volume *
            velocityFactor;


        gain.gain.cancelScheduledValues(
            now
        );


        gain.gain.setValueAtTime(
            0,
            now
        );


        gain.gain.linearRampToValueAtTime(
            targetGain,
            now + sample.attack
        );


        // =====================================================
        // START
        // =====================================================

        source.start(
            now,
            0
        );


        return {

            source,

            gain,

            release:
                sample.release,

            stopped:
                false
        };
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
                    0.05
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
            1.6;


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
                        4
                    );


                data[i] =
                    (
                        Math.random() * 2 - 1
                    ) *
                    envelope *
                    0.07;
            }
        }


        return buffer;
    }
}
