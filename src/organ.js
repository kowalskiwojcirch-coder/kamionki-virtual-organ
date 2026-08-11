export class Organ {

    constructor() {

        this.audioContext = new AudioContext();


        // =====================================================
        // MASTER
        // =====================================================

        this.master =
            this.audioContext.createGain();

        // Stała głośność.
        // Velocity MIDI nie wpływa na głośność.
        this.master.gain.value = 0.18;


        // =====================================================
        // DELIKATNY REVERB
        // =====================================================

        this.reverb =
            this.audioContext.createConvolver();

        this.reverb.buffer =
            this.createSmallChurchReverb();


        this.directGain =
            this.audioContext.createGain();

        this.reverbGain =
            this.audioContext.createGain();


        // Większość dźwięku bezpośrednio,
        // tylko mała ilość pogłosu.
        this.directGain.gain.value = 0.88;

        this.reverbGain.gain.value = 0.12;


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

                file:
                    "./samples/geingenprincipal1.mp3",

                enabled: true,

                volume: 0.82,

                baseNote: 60,

                loopStart: 0.18,

                loopEnd: 0.85,

                attack: 0.025,

                release: 0.12
            },


            gedact: {

                name: "Gedact 8'",

                file:
                    "./samples/gedact1.mp3",

                enabled: false,

                volume: 0.78,

                baseNote: 60,

                loopStart: 0.16,

                loopEnd: 0.82,

                attack: 0.030,

                release: 0.14
            },


            sacional: {

                name: "Sacional 8'",

                file:
                    "./samples/sacional1.mp3",

                enabled: false,

                volume: 0.75,

                baseNote: 60,

                loopStart: 0.20,

                loopEnd: 0.88,

                attack: 0.035,

                release: 0.15
            },


            flute: {

                name: "Flute",

                file:
                    "./samples/flute1.mp3",

                enabled: false,

                volume: 0.78,

                baseNote: 60,

                loopStart: 0.15,

                loopEnd: 0.82,

                attack: 0.025,

                release: 0.13
            }
        };


        // =====================================================
        // CACHE PRÓBEK
        // =====================================================

        this.buffers = {};

        this.loading = {};


        // =====================================================
        // AKTYWNE NUTY
        //
        // Map pozwala trzymać wiele nut jednocześnie.
        //
        // C4
        // D4
        // E4
        // G4
        //
        // wszystko może grać jednocześnie.
        // =====================================================

        this.activeNotes =
            new Map();
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
            "ORGANY GOTOWE"
        );
    }


    // =========================================================
    // ŁADOWANIE WSZYSTKICH PRÓBEK
    // =========================================================

    async loadAllSamples() {

        for (
            const name
            of Object.keys(
                this.samples
            )
        ) {

            try {

                await this.loadSample(
                    name
                );

            } catch (error) {

                console.error(
                    "Błąd ładowania:",
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

                    if (
                        !response.ok
                    ) {

                        throw new Error(
                            "HTTP " +
                            response.status
                        );
                    }


                    return response.arrayBuffer();
                })

                .then(data => {

                    return this.audioContext
                        .decodeAudioData(
                            data
                        );
                })

                .then(buffer => {

                    this.buffers[name] =
                        buffer;


                    console.log(
                        "Załadowano:",
                        sample.name,
                        buffer.duration.toFixed(2) +
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
            this.samples[name]
        ) {

            this.samples[name].enabled =
                true;
        }
    }


    disableRegister(name) {

        if (
            this.samples[name]
        ) {

            this.samples[name].enabled =
                false;
        }
    }


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


        // Jeżeli nuta już gra,
        // nie twórz drugiej kopii.
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


        // =====================================================
        // WSZYSTKIE WŁĄCZONE REJESTRY
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
                this.createVoice(
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
    // TWORZENIE GŁOSU
    // =========================================================

    createVoice(
        name,
        buffer,
        midiNote
    ) {

        const sample =
            this.samples[name];


        // =====================================================
        // PRZESTRAJANIE
        // =====================================================

        const semitones =
            midiNote -
            sample.baseNote;


        const playbackRate =
            Math.pow(
                2,
                semitones / 12
            );


        if (
            !Number.isFinite(
                playbackRate
            )
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


        // Bardzo małe rozstrojenie.
        source.detune.value =
            (
                Math.random() - 0.5
            ) * 0.8;


        // =====================================================
        // GAIN
        // =====================================================

        const gain =
            this.audioContext
                .createGain();


        gain.gain.value = 0;


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


        // Bezpieczne granice.

        loopStart =
            Math.max(
                0.01,
                Math.min(
                    loopStart,
                    buffer.duration - 0.08
                )
            );


        loopEnd =
            Math.max(
                loopStart + 0.03,
                Math.min(
                    loopEnd,
                    buffer.duration - 0.02
                )
            );


        source.loop = true;

        source.loopStart =
            loopStart;

        source.loopEnd =
            loopEnd;


        // =====================================================
        // ATAK
        // =====================================================

        const now =
            this.audioContext.currentTime;


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
        // KAŻDY GŁOS TEJ NUTY
        // =====================================================

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


            // =================================================
            // NATYCHMIAST PRZESTAJE BYĆ PODTRZYMYWANY
            // =================================================

            voice.gain.gain.cancelScheduledValues(
                now
            );


            voice.gain.gain.setValueAtTime(
                current,
                now
            );


            // Bardzo krótki naturalny ogon.
            voice.gain.gain.linearRampToValueAtTime(
                0,
                now + release
            );


            // =================================================
            // CAŁKOWITE ZATRZYMANIE
            // =================================================

            try {

                voice.source.stop(
                    now +
                    release +
                    0.01
                );

            } catch (error) {}
        }


        // =====================================================
        // USUWAMY TĘ NUTĘ
        //
        // Inne nuty nadal pozostają aktywne!
        // =====================================================

        this.activeNotes.delete(
            note
        );
    }


    // =========================================================
    // DELIKATNY REVERB
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
                    0.30;
            }
        }


        return impulse;
    }
}
