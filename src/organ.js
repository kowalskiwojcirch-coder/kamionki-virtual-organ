export class Organ {

    constructor() {

        this.audioContext =
            new (window.AudioContext || window.webkitAudioContext)();

        // =====================================================
        // MASTER
        // =====================================================

        this.master =
            this.audioContext.createGain();

        this.master.gain.value = 0.20;


        // =====================================================
        // DELIKATNY REVERB
        // =====================================================

        this.directGain =
            this.audioContext.createGain();

        this.reverbGain =
            this.audioContext.createGain();

        this.reverb =
            this.audioContext.createConvolver();

        this.directGain.gain.value = 0.94;
        this.reverbGain.gain.value = 0.06;

        this.master.connect(this.directGain);
        this.master.connect(this.reverbGain);

        this.directGain.connect(
            this.audioContext.destination
        );

        this.reverbGain.connect(this.reverb);

        this.reverb.connect(
            this.audioContext.destination
        );


        // =====================================================
        // REJESTRY
        // =====================================================

        this.samples = {

            geingenprincipal: {

                name: "Geigenprincipal 8′",

                file:
                    "./samples/geingenprincipal1.mp3",

                enabled: true,

                volume: 0.72,

                baseNote: 60,

                attack: 0.008,

                release: 0.11,

                loopStart: 0.25,

                loopEnd: 0.95
            },


            sacional: {

                name: "Salicional 8′",

                file:
                    "./samples/sacional1.mp3",

                enabled: false,

                volume: 0.55,

                baseNote: 60,

                attack: 0.008,

                release: 0.11,

                loopStart: 0.25,

                loopEnd: 0.95
            },


            gedact: {

                name: "Gedeckt 8′",

                file:
                    "./samples/gedact1.mp3",

                enabled: false,

                volume: 0.55,

                baseNote: 60,

                attack: 0.008,

                release: 0.11,

                loopStart: 0.25,

                loopEnd: 0.95
            },


            flute: {

                name: "Flaut Traverso 4′",

                file:
                    "./samples/flute1.mp3",

                enabled: false,

                volume: 0.48,

                baseNote: 60,

                attack: 0.008,

                release: 0.11,

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

        this.activeNotes = new Map();

        this.started = false;
    }


    // =========================================================
    // START
    // =========================================================

    async start() {

        if (this.audioContext.state !== "running") {
            await this.audioContext.resume();
        }

        await this.loadAllSamples();

        this.started = true;
    }


    // =========================================================
    // ŁADOWANIE
    // =========================================================

    async loadAllSamples() {

        const names =
            Object.keys(this.samples);

        await Promise.all(
            names.map(
                name => this.loadSample(name)
            )
        );
    }


    async loadSample(name) {

        if (this.buffers[name]) {
            return this.buffers[name];
        }

        if (this.loading[name]) {
            return this.loading[name];
        }

        const sample =
            this.samples[name];

        this.loading[name] =
            fetch(sample.file)
                .then(response => {

                    if (!response.ok) {
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
                        buffer.duration.toFixed(2) + " s"
                    );

                    return buffer;
                });

        return this.loading[name];
    }


    // =========================================================
    // REJESTRY
    // =========================================================

    toggleRegister(name) {

        if (!this.samples[name]) {
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

    async noteOn(note, velocity = 127) {

        note =
            Math.round(Number(note));

        if (
            !Number.isFinite(note) ||
            note < 0 ||
            note > 127
        ) {
            return;
        }

        if (this.activeNotes.has(note)) {
            return;
        }

        if (this.audioContext.state !== "running") {
            await this.audioContext.resume();
        }

        const voices = [];

        for (
            const [name, sample]
            of Object.entries(this.samples)
        ) {

            if (!sample.enabled) {
                continue;
            }

            try {

                const buffer =
                    await this.loadSample(name);

                const voice =
                    this.createVoice(
                        name,
                        buffer,
                        note
                    );

                if (voice) {
                    voices.push(voice);
                }

            } catch (error) {

                console.error(
                    `Nie można uruchomić ${name}:`,
                    error
                );
            }
        }

        if (voices.length > 0) {

            this.activeNotes.set(
                note,
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
        midiNote
    ) {

        const sample =
            this.samples[name];

        if (!sample || !buffer) {
            return null;
        }


        // =====================================================
        // TRANSPONOWANIE
        // C4 = 60
        // C#4 = 61 itd.
        // =====================================================

        const semitones =
            midiNote - sample.baseNote;

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


        // =====================================================
        // GAIN
        // =====================================================

        const gain =
            this.audioContext
                .createGain();

        gain.gain.value = 0;

        source.connect(gain);

        gain.connect(this.master);


        // =====================================================
        // LOOP
        // =====================================================

        const duration =
            buffer.duration;

        let start =
            Number(sample.loopStart);

        let end =
            Number(sample.loopEnd);

        start =
            Math.max(
                0.02,
                Math.min(
                    start,
                    duration - 0.1
                )
            );

        end =
            Math.max(
                start + 0.05,
                Math.min(
                    end,
                    duration - 0.02
                )
            );


        if (end > start) {

            source.loop = true;

            source.loopStart = start;
            source.loopEnd = end;

        } else {

            source.loop = false;
        }


        // =====================================================
        // ATAK
        // =====================================================

        const now =
            this.audioContext.currentTime;

        gain.gain.cancelScheduledValues(now);

        gain.gain.setValueAtTime(
            0,
            now
        );

        gain.gain.linearRampToValueAtTime(
            sample.volume,
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

            stopped: false
        };
    }


    // =========================================================
    // NOTE OFF
    // =========================================================

    noteOff(note) {

        note =
            Math.round(Number(note));

        const voices =
            this.activeNotes.get(note);

        if (!voices) {
            return;
        }

        const now =
            this.audioContext.currentTime;

        for (const voice of voices) {

            if (voice.stopped) {
                continue;
            }

            voice.stopped = true;

            const current =
                Math.max(
                    0,
                    voice.gain.gain.value
                );

            voice.gain.gain.cancelScheduledValues(now);

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
                    now + voice.release + 0.03
                );

            } catch (_) {}
        }

        this.activeNotes.delete(note);
    }


    // =========================================================
    // REVERB
    // =========================================================

    createReverb() {

        const seconds = 1.3;

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
                buffer.getChannelData(channel);

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
                        5
                    );

                data[i] =
                    (
                        Math.random() * 2 - 1
                    ) *
                    envelope *
                    0.12;
            }
        }

        return buffer;
    }
}
