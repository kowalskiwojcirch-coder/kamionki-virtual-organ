export class Organ {

    constructor() {

        this.audioContext = new AudioContext();

        // =====================================================
        // GŁOŚNOŚĆ
        // =====================================================

        this.master = this.audioContext.createGain();

        // Stała głośność.
        // Velocity MIDI NIE wpływa na głośność.
        this.master.gain.value = 0.22;


        // =====================================================
        // POGŁOS
        // =====================================================

        this.reverb = this.audioContext.createConvolver();

        this.reverb.buffer =
            this.createChurchReverb(5.0, 2.5);


        this.directGain =
            this.audioContext.createGain();

        this.reverbGain =
            this.audioContext.createGain();


        this.directGain.gain.value = 0.82;
        this.reverbGain.gain.value = 0.18;


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
                name: "Geigenprincipal 8'",
                file: "./samples/geingenprincipal1.mp3",
                enabled: true,
                volume: 1.0
            },

            gedact: {
                name: "Gedact 8'",
                file: "./samples/gedact1.mp3",
                enabled: false,
                volume: 0.95
            },

            sacional: {
                name: "Sacional 8'",
                file: "./samples/sacional1.mp3",
                enabled: false,
                volume: 0.90
            },

            flute: {
                name: "Flute",
                file: "./samples/flute1.mp3",
                enabled: false,
                volume: 0.90
            }
        };


        // =====================================================
        // CACHE AUDIO
        // =====================================================

        this.buffers = {};

        this.loading = {};


        // =====================================================
        // AKTYWNE NUTY
        // =====================================================

        this.activeNotes = new Map();


        // =====================================================
        // C4 = MIDI 60
        // =====================================================

        this.baseMidiNote = 60;
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


        console.log(
            "Organy gotowe."
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


        for (
            const name
            of names
        ) {

            try {

                await this.loadSample(
                    name
                );

            } catch (error) {

                console.error(
                    "Nie udało się załadować:",
                    name,
                    error
                );
            }
        }
    }


    // =========================================================
    // ŁADOWANIE JEDNEJ PRÓBKI
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
                            "HTTP " +
                            response.status +
                            ": " +
                            sample.file
                        );
                    }

                    return response.arrayBuffer();
                })
                .then(data => {

                    return this.audioContext.decodeAudioData(
                        data
                    );

                })
                .then(buffer => {

                    this.buffers[name] =
                        buffer;

                    console.log(
                        "Załadowano:",
                        sample.name
                    );

                    return buffer;
                });


        return this.loading[name];
    }


    // =========================================================
    // WŁĄCZ REJESTR
    // =========================================================

    enableRegister(name) {

        if (
            this.samples[name]
        ) {

            this.samples[name].enabled =
                true;
        }
    }


    // =========================================================
    // WYŁĄCZ REJESTR
    // =========================================================

    disableRegister(name) {

        if (
            this.samples[name]
        ) {

            this.samples[name].enabled =
                false;
        }
    }


    // =========================================================
    // PRZEŁĄCZ REJESTR
    // =========================================================

    toggleRegister(name) {

        if (
            !this.samples[name]
        ) {
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

    async noteOn(
        note,
        velocity = 127
    ) {

        note =
            Number(note);


        if (
            !Number.isFinite(note)
        ) {
            return;
        }


        note =
            Math.round(note);


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
        // Czekamy na audio
        // =====================================================

        if (
            this.audioContext.state !== "running"
        ) {

            await this.audioContext.resume();
        }


        const voices = [];


        // =====================================================
        // KAŻDY WŁĄCZONY GŁOS
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


            const buffer =
                await this.loadSample(
                    name
                );


            if (!buffer) {
                continue;
            }


            const voice =
                this.playSample(
                    name,
                    buffer,
                    note
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
    // ODTWARZANIE PRÓBKI
    // =========================================================

    playSample(
        name,
        buffer,
        midiNote
    ) {

        const sample =
            this.samples[name];


        // =====================================================
        // C4 -> żądana nuta
        // =====================================================

        const semitones =
            midiNote -
            this.baseMidiNote;


        const playbackRate =
            Math.pow(
                2,
                semitones / 12
            );


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


        // =====================================================
        // DELIKATNE NATURALNE ROZSTROJENIE
        // =====================================================

        const cents =
            (
                Math.random() - 0.5
            ) *
            1.5;


        source.detune.value =
            cents;


        // =====================================================
        // GŁOŚNOŚĆ
        // =====================================================

        const gain =
            this.audioContext
                .createGain();


        gain.gain.value =
            sample.volume;


        // =====================================================
        // POŁĄCZENIE
        // =====================================================

        source.connect(
            gain
        );


        gain.connect(
            this.master
        );


        // =====================================================
        // START
        // =====================================================

        source.start();


        return {

            source,

            gain,

            name
        };
    }


    // =========================================================
    // NOTE OFF
    // =========================================================

    noteOff(note) {

        note =
            Number(note);


        if (
            !Number.isFinite(note)
        ) {
            return;
        }


        note =
            Math.round(note);


        const voices =
            this.activeNotes.get(
                note
            );


        if (!voices) {
            return;
        }


        const now =
            this.audioContext.currentTime;


        // =====================================================
        // NATURALNY RELEASE
        // =====================================================

        for (
            const voice
            of voices
        ) {

            if (
                !voice.gain
            ) {
                continue;
            }


            const current =
                Math.max(
                    0,
                    voice.gain.value
                );


            voice.gain.cancelScheduledValues(
                now
            );


            voice.gain.setValueAtTime(
                current,
                now
            );


            voice.gain.linearRampToValueAtTime(
                0,
                now + 0.18
            );


            try {

                voice.source.stop(
                    now + 0.22
                );

            } catch (error) {}
        }


        this.activeNotes.delete(
            note
        );
    }


    // =========================================================
    // POGŁOS KOŚCIELNY
    // =========================================================

    createChurchReverb(
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


                data[i] =
                    (
                        Math.random() * 2 - 1
                    ) *
                    envelope *
                    0.6;
            }
        }


        return impulse;
    }
}
