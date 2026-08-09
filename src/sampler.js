export class Sampler {

    constructor(audioContext) {

        this.audioContext =
            audioContext;

        this.buffers =
            new Map();
    }


    async load(name, url) {

        console.log(
            "Ładowanie próbki:",
            name
        );


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                `Nie można pobrać próbki: ${url}`
            );

        }


        const data =
            await response.arrayBuffer();


        const buffer =
            await this.audioContext
                .decodeAudioData(data);


        this.buffers.set(
            name,
            buffer
        );


        console.log(
            "Załadowano:",
            name
        );


        return buffer;
    }


    has(name) {

        return this.buffers.has(name);

    }


    play(
        name,
        destination,
        playbackRate = 1
    ) {

        const buffer =
            this.buffers.get(name);


        if (!buffer) {

            console.warn(
                "Brak próbki:",
                name
            );

            return null;
        }


        const source =
            this.audioContext
                .createBufferSource();


        source.buffer =
            buffer;


        source.playbackRate.value =
            playbackRate;


        source.connect(
            destination
        );


        source.start();


        return source;
    }
}