export class Organ {

    constructor() {

        this.audioContext =
            new AudioContext({
                latencyHint: "interactive"
            });


        // =====================================================
        // MASTER
        // =====================================================

        this.master =
            this.audioContext.createGain();

        this.master.gain.value = 0.82;


        // =====================================================
        // DELIKATNA KOMPRESJA
        // =====================================================

        this.compressor =
            this.audioContext
                .createDynamicsCompressor();

        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 2.2;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.16;


        // =====================================================
        // REVERB
        // =====================================================

        this.reverb =
            this.audioContext.createConvolver();

        this.reverb.buffer =
            this.createSmallChurchReverb();


        this.directGain =
            this.audioContext.createGain();

        this.reverbGain =
            this.audioContext.createGain();


        this.directGain.gain.value = 0.965;
        this.reverbGain.gain.value = 0.035;


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


        // =====================================================
        // GŁOSY
        //
        // TYLKO GEIGENPRINCIPAL STARTUJE WŁĄCZONY
        // =====================================================

        this.samples = {


            geingenprincipal: {

                name: "Geigenprincipal 8'",

                file:
                    "./samples/geingenprincipal1.mp3",

                enabled: true,

                volume: 0.60,

                baseNote: 60,

                // Stabilniejszy fragment Twojej próbki.
                loopStart: 1.55,
                loopEnd: 2.18,

                attack: 0.012,
                release: 0.22
            },


            sacional: {

                name: "Salicional 8'",

                file:
                    "./samples/sacional1.mp3",

                enabled: false,

                volume: 0.43,

                baseNote: 60,

                loopStart: 0.90,
                loopEnd: 1.50,

                attack: 0.014,
                release: 0.24
            },


            gedact: {

                name: "Gedackt 8'",

                file:
                    "./samples/gedact1.mp3",

                enabled: false,

                volume: 0.46,

                baseNote: 60,

                loopStart: 0.95,
                loopEnd: 1.55,

                attack: 0.014,
                release: 0.24
            },


            flute: {

                name: "Flaut Traverso 4'",

                file:
                    "./samples/flute1.mp3",

                enabled: false,

                volume: 0.38,

                baseNote: 60,

                loopStart: 1.02,
                loopEnd: 1.62,

                attack: 0.012,
                release: 0.22
            }
        };


        // =====================================================
        // CACHE PRÓBEK
        // =====================================================

        this.buffers = {};
        this.loading = {};


        // =====================================================
        // AKTYWNE NUTY
        // =====================================================

        this.activeNotes =
            new Map();


        // NUTY NACIŚNIĘTE PODCZAS ŁADOWANIA
        this.pendingNotes =
            new Set();


        this.ready = false;


        this.globalVolume = 0.82;

        this.attack = 0.012;

        this.release = 0.22;
    }


    // =========================================================
    // START
    // =========================================================

    async start() {

        await this.audioContext.resume();


        const names =
            Object.keys(
                this.samples
            );


        // Wszystkie próbki ładowane od razu.
        await Promise.all(
            names.map(
                name =>
                    this.loadSample(name)
            )
        );


        this.ready = true;


        // Jeżeli ktoś nacisnął MIDI podczas ładowania,
        // uruchamiamy nutę natychmiast.

        for (
            const note
            of this.pendingNotes
        ) {

            this.noteOn(note);
        }


        this.pendingNotes.clear();
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


        this.loading[name] =
            fetch(sample.file)

                .then(response => {

                    if (!response.ok) {

                        throw new Error(
                            `HTTP ${response.status}: ${sample.file}`
                        );
                    }


                    return response.arrayBuffer();
                })


                .then(data =>
                    this.audioContext
                        .decodeAudioData(data)
                )


                .then(buffer => {

                    this.buffers[name] =
                        buffer;


                    console.log(
                        "Załadowano:",
                        sample.name,
                        buffer.duration.toFixed(2),
                        "s"
                    );


                    return buffer;
                });


        return this.loading[name];
    }


    // =========================================================
    // GŁOŚNOŚĆ
    // =========================================================

    setMasterVolume(value) {

        this.globalVolume =
            Number(value);


        const now =
            this.audioContext.currentTime;


        this.master.gain.setTargetAtTime(
            this.globalVolume,
            now,
            0.015
        );
    }


    setAttack(value) {

        this.attack =
            Number(value);
    }


    setRelease(value) {

        this.release =
            Number(value);
    }


    // =========================================================
    // REJESTR ON
    // =========================================================

    enableRegister(name) {

        const sample =
            this.samples[name];


        if (!sample) {
            return;
        }


        sample.enabled =
            true;


        // Jeżeli aktualnie trzymamy nuty,
        // natychmiast dołączamy nowy głos.

        for (
            const [
                note,
                voices
            ]
            of this.activeNotes
        ) {

            const alreadyPlaying =
                voices.some(
                    voice =>
                        voice.name === name &&
                        !voice.stopped
                );


            if (
                !alreadyPlaying &&
                this.buffers[name]
            ) {

                const voice =
                    this.createVoice(
                        name,
                        this.buffers[name],
                        note
                    );


                if (voice) {
                    voices.push(voice);
                }
            }
        }
    }


    // =========================================================
    // REJESTR OFF
    // =========================================================

    disableRegister(name) {

        const sample =
            this.samples[name];


        if (!sample) {
            return;
        }


        sample.enabled =
            false;


        const now =
            this.audioContext.currentTime;


        for (
            const voices
            of this.activeNotes.values()
        ) {

            for (
                const voice
                of voices
            ) {

                if (
                    voice.name === name &&
                    !voice.stopped
                ) {

                    this.fadeOutVoice(
                        voice,
                        now
                    );
                }
            }
        }
    }


    // =========================================================
    // TOGGLE
    // =========================================================

    toggleRegister(name) {

        if (!this.samples[name]) {
            return false;
        }


        const enabledCount =
            Object.values(
                this.samples
            )
            .filter(
                sample =>
                    sample.enabled
            )
            .length;


        // Nie pozwalamy wyłączyć ostatniego głosu.

        if (
            this.samples[name].enabled &&
            enabledCount === 1
        ) {

            return true;
        }


        if (
            this.samples[name].enabled
        ) {

            this.disableRegister(name);

        } else {

            this.enableRegister(name);
        }


        return this.samples[name].enabled;
    }


    // =========================================================
    // NOTE ON
    // =========================================================

    noteOn(
        note,
        velocity = 1
    ) {

        note =
            Math.round(
                Number(note)
            );


        if (
            !Number.isFinite(note) ||
            note < 0 ||
            note > 127
        ) {

            return;
        }


        // Jeżeli jeszcze się ładuje,
        // zapamiętaj naciśniętą nutę.

        if (!this.ready) {

            this.pendingNotes.add(
                note
            );

            return;
        }


        if (
            this.activeNotes.has(note)
        ) {

            return;
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
                this.buffers[name];


            if (!buffer) {
                continue;
            }


            const voice =
                this.createVoice(
                    name,
                    buffer,
                    note,
                    velocity
                );


            if (voice) {
                voices.push(voice);
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
    // TWORZENIE GŁOSU
    // =========================================================

    createVoice(
        name,
        buffer,
        midiNote,
        velocity = 1
    ) {

        const sample =
            this.samples[name];


        const now =
            this.audioContext.currentTime;


        // =====================================================
        // TRANSPONOWANIE
        // =====================================================

        const ratio =
            Math.pow(
                2,
                (
                    midiNote -
                    sample.baseNote
                ) / 12
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
            ratio;


        // =====================================================
        // GAIN
        // =====================================================

        const gain =
            this.audioContext
                .createGain();


        gain.connect(
            this.master
        );


        source.connect(
            gain
        );


        // =====================================================
        // POZIOM GŁOSU
        // =====================================================

        const velocityGain =
            Math.max(
                0.25,
                Math.min(
                    1,
                    velocity
                )
            );


        const level =
            sample.volume *
            this.globalVolume *
            velocityGain;


        // =====================================================
        // ATAK
        // =====================================================

        gain.gain.setValueAtTime(
            0.0001,
            now
        );


        gain.gain.exponentialRampToValueAtTime(
            Math.max(
                0.0002,
                level
            ),
            now + this.attack
        );


        // =====================================================
        // LOOP
        // =====================================================

        let loopStart =
            Math.max(
                0.05,
                Math.min(
                    sample.loopStart,
                    buffer.duration - 0.15
                )
            );


        let loopEnd =
            Math.max(
                loopStart + 0.15,
                Math.min(
                    sample.loopEnd,
                    buffer.duration - 0.02
                )
            );


        source.loop = true;


        source.loopStart =
            loopStart;


        source.loopEnd =
            loopEnd;


        // Start natychmiast.
        source.start(now);


        return {

            name,

            source,

            gain,

            stopped: false,

            release:
                sample.release
        };
    }


    // =========================================================
    // FADE OUT
    // =========================================================

    fadeOutVoice(
        voice,
        now =
            this.audioContext.currentTime
    ) {

        if (
            !voice ||
            voice.stopped
        ) {

            return;
        }


        voice.stopped =
            true;


        const release =
            Math.max(
                0.04,
                this.release
            );


        const current =
            Math.max(
                0.0001,
                voice.gain.gain.value
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
            .exponentialRampToValueAtTime(
                0.0001,
                now + release
            );


        try {

            voice.source.stop(
                now +
                release +
                0.03
            );

        } catch (_) {}


        setTimeout(() => {

            try {
                voice.source.disconnect();
                voice.gain.disconnect();
            } catch (_) {}

        }, (release + 0.1) * 1000);
    }


    // =========================================================
    // NOTE OFF
    // =========================================================

    noteOff(note) {

        note =
            Math.round(
                Number(note)
            );


        this.pendingNotes.delete(
            note
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

            this.fadeOutVoice(
                voice,
                now
            );
        }


        this.activeNotes.delete(
            note
        );
    }


    // =========================================================
    // STOP ALL
    // =========================================================

    stopAll() {

        for (
            const note
            of [
                ...this.activeNotes.keys()
            ]
        ) {

            this.noteOff(note);
        }
    }


    // =========================================================
    // REVERB
    // =========================================================

    createSmallChurchReverb() {

        const seconds = 2.0;

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


                data[i] =
                    (
                        Math.random() * 2 - 1
                    ) *
                    Math.pow(
                        1 - position,
                        4.5
                    ) *
                    0.22;
            }
        }


        return impulse;
    }
}
