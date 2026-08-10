export async function connectMIDI(organ) {

    if (!navigator.requestMIDIAccess) {

        document.getElementById("status").textContent =
            "Ta przeglądarka nie obsługuje Web MIDI.";

        return;
    }


    try {

        const midi =
            await navigator.requestMIDIAccess();


        const inputs =
            [...midi.inputs.values()];


        if (inputs.length === 0) {

            document.getElementById("status").textContent =
                "Audio działa, ale nie znaleziono MIDI.";

            return;
        }


        console.log(
            "Znalezione urządzenia MIDI:",
            inputs.length
        );


        inputs.forEach(input => {

            console.log(
                "MIDI:",
                input.name
            );


            input.onmidimessage =
                event => {

                    if (
                        !event.data ||
                        event.data.length < 3
                    ) {
                        return;
                    }


                    const status =
                        Number(event.data[0]);

                    const note =
                        Number(event.data[1]);

                    const velocity =
                        Number(event.data[2]);


                    if (
                        !Number.isFinite(status) ||
                        !Number.isFinite(note) ||
                        !Number.isFinite(velocity)
                    ) {
                        return;
                    }


                    const command =
                        status & 0xf0;


                    // NOTE ON

                    if (
                        command === 0x90 &&
                        velocity > 0
                    ) {

                        organ.noteOn(
                            note,
                            velocity
                        );

                        return;
                    }


                    // NOTE OFF

                    if (
                        command === 0x80 ||
                        (
                            command === 0x90 &&
                            velocity === 0
                        )
                    ) {

                        organ.noteOff(
                            note
                        );
                    }
                };
        });


        document.getElementById("status").textContent =
            "MIDI GOTOWE: " +
            inputs[0].name;


    } catch (error) {

        console.error(
            "Błąd MIDI:",
            error
        );


        document.getElementById("status").textContent =
            "Błąd MIDI.";
    }
}