export class MIDIController {

    constructor(organ) {

        this.organ = organ;

        this.midiAccess = null;

        this.inputs = new Set();

        this.onStatus = null;
    }


    async start() {

        if (!navigator.requestMIDIAccess) {

            this.setStatus(
                "Ta przeglądarka nie obsługuje Web MIDI."
            );

            return false;
        }


        try {

            this.midiAccess =
                await navigator.requestMIDIAccess();

        } catch (error) {

            console.error(
                "MIDI:",
                error
            );

            this.setStatus(
                "Brak dostępu do MIDI."
            );

            return false;
        }


        this.connectInputs();


        this.midiAccess.onstatechange =
            () => {

                this.connectInputs();
            };


        return true;
    }


    connectInputs() {

        if (!this.midiAccess) {
            return;
        }


        for (const input of this.inputs) {

            input.onmidimessage = null;
        }

        this.inputs.clear();


        const inputs =
            Array.from(
                this.midiAccess.inputs.values()
            );


        for (const input of inputs) {

            input.onmidimessage =
                event => {

                    this.handleMessage(event);
                };

            this.inputs.add(input);
        }


        if (inputs.length === 0) {

            this.setStatus(
                "Organy gotowe — podłącz MIDI."
            );

        } else {

            this.setStatus(
                `MIDI podłączone — ${inputs.length} urządzenie.`
            );
        }
    }


    handleMessage(event) {

        const data =
            event.data;

        if (!data || data.length < 2) {
            return;
        }


        const command =
            data[0] & 0xf0;

        const note =
            data[1];

        const velocity =
            data[2] || 0;


        // NOTE ON

        if (
            command === 0x90 &&
            velocity > 0
        ) {

            this.organ.noteOn(
                note,
                velocity
            );

            return;
        }


        // NOTE OFF

        if (
            command === 0x80
        ) {

            this.organ.noteOff(note);

            return;
        }


        // NOTE ON velocity 0 = NOTE OFF

        if (
            command === 0x90 &&
            velocity === 0
        ) {

            this.organ.noteOff(note);
        }
    }


    setStatus(text) {

        if (
            typeof this.onStatus === "function"
        ) {

            this.onStatus(text);
        }
    }
}
