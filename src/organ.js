export class Organ {

    constructor() {

        this.audioContext = new AudioContext();

        // =====================================================
        // MASTER
        // =====================================================

        this.master = this.audioContext.createGain();
        this.master.gain.value = 0.20;

        // Delikatny limiter / kompresor
        this.compressor =
            this.audioContext.createDynamicsCompressor();

        this.compressor.threshold.value = -12;
        this.compressor.knee.value = 10;
        this.compressor.ratio.value = 3;
        this.compressor.attack.value = 0.008;
        this.compressor.release.value = 0.15;

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

        this.directGain.gain.value = 0.94;
        this.reverbGain.gain.value = 0.06;

        this.master.connect(this.compressor);

        this.compressor.connect(this.directGain);
        this.compressor.connect(this.reverbGain);

        this.directGain.connect(
            this.audioContext.destination
        );

        this.reverbGain.connect(this.reverb);

        this.reverb.connect(
            this.audioContext.destination
        );

        // =====================================================
        // GŁOSY
        //
        // TYLKO GEIGENPRINCIPAL JEST WŁĄCZONY NA START
        // =====================================================

        this.samples = {

            geingenprincipal: {

                name: "Geigenprincipal 8'",
                file: "./samples/geingenprincipal1.mp3",

                enabled: true,

                volume: 0.62,

                baseNote: 60,

                // Na razie bez brutalnego loopa.
                // Później ustawimy dokładny loop
                // po analizie próbki.

                loopStart: 0.35,
                loopEnd: 0.85,

                attack: 0.018,
                release: 0.18
            },


            sacional: {

                name: "Salicional 8'",
                file: "./samples/sacional1.mp3",

                enabled: false,

                volume: 0.48,

                baseNote: 60,

                loopStart: 0.35,
                loopEnd: 0.85,

                attack: 0.025,
                release: 0.20
            },


            gedact: {

                name: "Gedackt 8'",
                file: "./samples/gedact1.mp3",

                enabled: false,

                volume: 0.50,

                baseNote: 60,

                loopStart: 0.35,
                loopEnd: 0.85,

                attack: 0.022,
                release: 0.20
            },


            flute: {

                name: "Flaut Traverso 4'",
                file: "./samples/flute1.mp3",

                enabled: false,

                volume: 0.42,

                baseNote: 60,

                loopStart: 0.35,
                loopEnd: 0.85,

                attack: 0.020,
                release: 0.18
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

        // ŁADUJEMY WSZYSTKO OD RAZU.
        // Dzięki temu później MIDI nie czeka
        // na pobranie/dekodowanie MP3.

        await this.loadAllSamples();

        console.log("ORGANY GOTOWE");
    }


    // =========================================================
    // LOAD ALL
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


    // =========================================================
    // LOAD SAMPLE
    // =========================================================

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
                            `Nie można pobrać ${sample.file}`
                        );
                    }

                    return response.arrayBuffer();
                })
                .then(data =>
                    this.audioContext.decodeAudioData(data)
                )
                .then(buffer => {

                    this.buffers[name] = buffer;

                    console.log(
                        `Załadowano ${sample.name}:`,
                        buffer.duration.toFixed(3),
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

        if (this.samples[name]) {
            this.samples[name].enabled = true;
        }
    }


    disableRegister(name) {

        if (this.samples[name]) {
            this.samples[name].enabled = false;
        }
    }


    toggleRegister(name) {

        if (!this.samples[name]) {
            return;
        }

        this.samples[name].enabled =
            !this.samples[name].enabled;

        console.log(
            this.samples[name].name,
            this.samples[name].enabled
                ? "ON"
                : "OFF"
        );
    }


    // =========================================================
    // NOTE ON
    // =========================================================

    async noteOn(note, velocity = 127) {

        note = Math.round(Number(note));

        if (
            !Number.isFinite(note) ||
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
            const [name, sample]
            of Object.entries(this.samples)
        ) {

            if (!sample.enabled) {
                continue;
            }

            // UWAGA:
            // Próbki powinny już być załadowane.
            // Nie blokujemy rozpoczęcia nuty
            // pobieraniem MP3.

            const buffer =
                this.buffers[name];

            if (!buffer) {
                continue;
            }

            const voice =
                this.createVoice(
                    name,
                    buffer,
                    note
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


    // =========================================================
    // CREATE VOICE
    // =========================================================

    createVoice(
        name,
        buffer,
        midiNote
    ) {

        const sample =
            this.samples[name];

        // =====================================================
        // TRANSPOSYCJA
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
            this.audioContext.createBufferSource();

        source.buffer = buffer;

        source.playbackRate.value =
            playbackRate;

        // Minimalne różnice między głosami.
        // Bardzo małe, żeby nie robić fałszu.

        source.detune.value =
            (Math.random() - 0.5) * 0.25;

        // =====================================================
        // GAIN
        // =====================================================

        const gain =
            this.audioContext.createGain();

        gain.gain.value = 0;

        source.connect(gain);
        gain.connect(this.master);

        // =====================================================
        // LOOP
        // =====================================================

        let loopStart =
            Math.max(
                0.05,
                sample.loopStart
            );

        let loopEnd =
            Math.min(
                sample.loopEnd,
                buffer.duration - 0.03
            );

        // Jeżeli próbka jest krótsza niż
        // zakładane ustawienia.

        if (
            loopEnd <= loopStart + 0.10
        ) {

            loopStart =
                Math.min(
                    0.20,
                    buffer.duration * 0.25
                );

            loopEnd =
                Math.max(
                    loopStart + 0.10,
                    buffer.duration - 0.05
                );
        }

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

        const targetVolume =
            sample.volume;

        gain.gain.cancelScheduledValues(now);

        gain.gain.setValueAtTime(
            0,
            now
        );

        gain.gain.linearRampToValueAtTime(
            targetVolume,
            now + sample.attack
        );

        // =====================================================
        // START
        // =====================================================

        source.start(now);

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

        note = Math.round(Number(note));

        if (!Number.isFinite(note)) {
            return;
        }

        const voices =
            this.activeNotes.get(note);

        if (!voices) {
            return;
        }

        const now =
            this.audioContext.currentTime;

        for (
            const voice of voices
        ) {

            if (voice.stopped) {
                continue;
            }

            voice.stopped = true;

            const release =
                voice.release;

            const current =
                Math.max(
                    0,
                    voice.gain.gain.value
                );

            voice.gain.gain.cancelScheduledValues(
                now
            );

            voice.gain.gain.setValueAtTime(
                current,
                now
            );

            voice.gain.gain.exponentialRampToValueAtTime(
                0.0001,
                now + release
            );

            try {

                voice.source.stop(
                    now + release + 0.03
                );

            } catch (error) {}
        }

        this.activeNotes.delete(note);
    }


    // =========================================================
    // REVERB
    // =========================================================

    createSmallChurchReverb() {

        const seconds = 2.2;
        const decay = 4.5;

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
                impulse.getChannelData(channel);

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
                    0.30;
            }
        }

        return impulse;
    }
}
