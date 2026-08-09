export async function connectMIDI(organ) {

    if (!navigator.requestMIDIAccess) {

        console.error(
            "Ta przeglądarka nie obsługuje Web MIDI."
        );

        return;
    }

    const midi = await navigator.requestMIDIAccess();

    const inputs = [...midi.inputs.values()];

    if (inputs.length === 0) {

        console.log(
            "Nie znaleziono urządzenia MIDI."
        );

        return;
    }

    console.log("Znalezione urządzenia MIDI:");

    inputs.forEach(input => {

        console.log(
            input.name
        );

        input.onmidimessage = event => {

            const [
                status,
                note,
                velocity
            ] = event.data;

            const command = status & 0xf0;

            // NOTE ON
            if (
                command === 0x90 &&
                velocity > 0
            ) {

                organ.start();

                organ.noteOn(
                    note,
                    velocity
                );

            }

            // NOTE OFF
            if (
                command === 0x80 ||
                (
                    command === 0x90 &&
                    velocity === 0
                )
            ) {

                organ.noteOff(note);

            }

        };

    });

}