export async function connectMIDI(organ) {

    if (!navigator.requestMIDIAccess) {

        document.getElementById("status").textContent =
            "MIDI nie jest obsługiwane w tej przeglądarce.";

        return;
    }

    const midi = await navigator.requestMIDIAccess();

    const inputs = [...midi.inputs.values()];

    if (inputs.length === 0) {

        document.getElementById("status").textContent =
            "Brak klawiatury MIDI.";

        return;
    }

    const input = inputs[0];

    document.getElementById("status").textContent =
        "MIDI GOTOWE: " + input.name;

    input.onmidimessage = event => {

        const [status, note, velocity] = event.data;

        const command = status & 0xf0;

        // Naciśnięcie klawisza
        if (command === 0x90 && velocity > 0) {

            organ.start();

            organ.noteOn(
                note,
                velocity
            );
        }

        // Puszczenie klawisza
        if (
            command === 0x80 ||
            (command === 0x90 && velocity === 0)
        ) {

            organ.noteOff(note);
        }
    };
}