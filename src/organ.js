export class Organ {

    constructor() {

        this.audioContext =
            new (window.AudioContext ||
                 window.webkitAudioContext)();


        // =====================================================
        // MASTER
        // =====================================================

        this.master =
            this.audioContext.createGain();

        this.master.gain.value = 0.20;


        // =====================================================
        // DIRECT
        // =====================================================

        this.directGain =
            this.audioContext.createGain();

        this.directGain.gain.value = 0.91;


        // =====================================================
        // REVERB
        // =====================================================

        this.reverb =
            this.audioContext.createConvolver();

        this.reverb.buffer =
            this.createSmallChurchReverb();


        this.reverbGain =
            this.audioContext.createGain();

        this.reverbGain.gain.value = 0.09;


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


        // =====================================================
        // PRÓBKI
        // =====================================================

        this.samples = {

            geingenprincipal: {

                name: "Geigenprincipal 8′",

                file:
                    "./samples/geingenprincipal1.mp3",

                enabled: true,

                volume: 0.82,

                baseNote: 60,

                loopStart: 0.30,

                loopEnd: 1.10,

                attack: 0.008,

                release: 0.10
            },


            sacional: {

                name: "Salicional 8′",

                file:
                    "./samples/sacional1.mp3",

                enabled: false,

                volume: 0.70,

                baseNote: 60,

                loopStart: 0.30,

                loopEnd: 1.10,

                attack: 0.008,

                release: 0.11
            },


            gedact: {

                name: "Gedackt 8′",

                file:
                    "./samples/gedact1.mp3",

                enabled: false,

                volume: 0.68,

                baseNote: 60,

                loopStart: 0.30,

                loopEnd: 1.10,

                attack: 0.008,

                release: 0.11
            },


            flute: {

                name: "Flaut Traverso 4′",

                file:
                    "./samples/flute1.mp3",

                enabled: false,

                volume: 0.62,

                baseNote: 60,

                loopStart: 0.30,

                loopEnd: 1.10,

                attack: 0.008,

                release: 0.11
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


        this.started = false;
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


        this.started = true;


        console.log(
            "Kamionki Virtual Organ: READY"
        );
    }


    // =========================================================
    // ŁADOWANIE WSZYSTKICH PRÓBEK
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
    // ŁADOWANIE PRÓBKI
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


        if (!sample) {

            throw new Error(
                `Nieznany rejestr: ${name}`
            );
        }


        this.loading[name] =
            fetch(sample.file)

                .then(response => {

                    if (
                        !response.ok
                    ) {

                        throw new Error(
                            `HTTP ${response.status}`
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

    enableRegister(name) {

        if (
            !this.samples[name]
        ) {

            return;
        }


        this.samples[name].enabled =
            true;
    }


    disableRegister(name) {

        if (
            !this.samples[name]
        ) {

            return;
        }


        this.samples[name].enabled =
            false;
    }


    toggleRegister(name) {

        if (
            !this.samples[name]
        ) {

            console.error(
                "Nie znaleziono rejestru:",
                name
            );

            return false;
        }


        this.samples[name].enabled =
            !this.samples[name].enabled;


        console.log(
            this.samples[name].name,
            this.samples[name].enabled
                ? "ON"
                : "OFF"
        );


        return this.samples[name].enabled;
    }


    // =========================================================
    // NOTE ON
    // =========================================================

    async noteOn(
        note,
        velocity = 127
    ) {

        note =
            Math.round(
                Number(note)
            );


        if (
            !Number.isFinite(note)
        ) {

            return;
        }


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


        if (
            this.audioContext.state !== "running"
        ) {

            await this.audioContext.resume();
        }


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


            const buffer =
                await this.loadSample(
                    name
                );


            const voice =
                this.createVoice(
                    name,
                    buffer,
                    note,
                    velocity
                );


            if (voice) {

                voices.push(
                    voice
                );
            }
        }


        if (
            voices.length
        ) {

            this.activeNotes.set(
                note,
                voices
            );
        }
    }


    // =========================================================
    // CREATE VOICE
    // =========================================================

    createVoice(
        name,
        buffer,
        midiNote,
        velocity
    ) {

        const sample =
            this.samples[name];


        if (!sample || !buffer) {

            return null;
        }


        // =====================================================
        // PITCH
        // =====================================================

        const semitones =
            midiNote -
            sample.baseNote;


        const playbackRate =
            Math.pow(
                2,
                semitones / 12
            );


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


        // Minimalny drift,
        // żeby kilka rejestrów nie było identycznie
        // zsynchronizowanych fazowo.
        source.detune.value =
            (
                Math.random() - 0.5
            ) * 0.35;


        // =====================================================
        // GAIN
        // =====================================================

        const gain =
            this.audioContext
                .createGain();


        gain.gain.value = 0;


        source.connect(
            gain
        );

        gain.connect(
            this.master
        );


        // =====================================================
        // LOOP
        // =====================================================

        let loopStart =
            Number(
                sample.loopStart
            );


        let loopEnd =
            Number(
                sample.loopEnd
            );


        const duration =
            buffer.duration;


        // Nie pozwalamy wyjść poza próbkę.

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
                loopStart + 0.10,
                Math.min(
                    loopEnd,
                    duration - 0.02
                )
            );


        source.loop = true;

        source.loopStart =
            loopStart;

        source.loopEnd =
            loopEnd;


        // =====================================================
        // ATTACK
        // =====================================================

        const now =
            this.audioContext.currentTime;


        const target =
            sample.volume;


        gain.gain.cancelScheduledValues(
            now
        );


        gain.gain.setValueAtTime(
            0,
            now
        );


        gain.gain.linearRampToValueAtTime(
            target,
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

            name,

            release:
                sample.release,

            stopped: false
        };
    }


    // =========================================================
    // NOTE OFF
    // =========================================================

    noteOff(note) {

        note =
            Math.round(
                Number(note)
            );


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
                voice.stopped
            ) {

                continue;
            }


            voice.stopped = true;


            const release =
                voice.release;


            const current =
                Math.max(
                    0,
                    Number(
                        voice.gain.gain.value
                    ) || 0
                );


            voice.gain.gain
                .cancelScheduledValues(
                    now
                );


            voice.gain.gain
                .setValueAtTime(
                    current,
                    now
                );


            voice.gain.gain
                .linearRampToValueAtTime(
                    0,
                    now + release
                );


            try {

                voice.source.stop(
                    now +
                    release +
                    0.02
                );

            } catch (_) {}

        }


        this.activeNotes.delete(
            note
        );
    }


    // =========================================================
    // REVERB
    // =========================================================

    createSmallChurchReverb() {

        const seconds = 1.8;

        const decay = 4.8;


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


                data[i] =
                    (
                        Math.random() * 2 - 1
                    ) *
                    envelope *
                    0.20;
            }
        }


        return impulse;
    }
}
