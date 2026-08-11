export class Sampler {

    constructor(audioContext) {

        this.audioContext =
            audioContext;

        this.buffers =
            new Map();

        this.loading =
            new Map();
    }


    async load(url) {

        if (this.buffers.has(url)) {
            return this.buffers.get(url);
        }


        if (this.loading.has(url)) {
            return this.loading.get(url);
        }


        const promise =
            fetch(url)
                .then(response => {

                    if (!response.ok) {

                        throw new Error(
                            `${url}: HTTP ${response.status}`
                        );
                    }

                    return response.arrayBuffer();
                })
                .then(data => {

                    return this.audioContext
                        .decodeAudioData(data);
                })
                .then(buffer => {

                    this.buffers.set(
                        url,
                        buffer
                    );

                    this.loading.delete(url);

                    return buffer;
                })
                .catch(error => {

                    this.loading.delete(url);

                    throw error;
                });


        this.loading.set(
            url,
            promise
        );


        return promise;
    }
}
