import { Organ } from "./organ.js";

// ============================================================
// ELEMENTY UI
// ============================================================

const startButton = document.getElementById("start-audio");
const status = document.getElementById("status");
const statusDot = document.getElementById("status-dot");

const registerButtons =
    document.querySelectorAll(".register");


// ============================================================
// ORGAN
// ============================================================

const organ = new Organ();

let audioStarted = false;
let midiAccess = null;


// ============================================================
// STATUS
// ============================================================

function setStatus(text, ready = false) {

    if (status) {
        status.textContent = text;
    }

    if (statusDot) {
        statusDot.classList.toggle(
            "ready",
            ready
        );
    }
}


// ============================================================
// AKTUALIZACJA REJESTRÓW
// ============================================================

function updateRegisters() {

    registerButtons.forEach(button => {

        // WAŻNE:
        // index.html używa data-register
        const name =
            button.dataset.register;

        const sample =
            organ.samples[name];

        if (!sample) {
            return;
        }

        const active =
            sample.enabled;

        button.classList.toggle(
            "active",
            active
        );

        button.setAttribute(
            "aria-pressed",
            String(active)
        );
    });
}


// ============================================================
// START
// ============================================================

startButton.addEventListener(
    "click",
    async () => {

        if (audioStarted) {
            return;
        }

        try {

            startButton.disabled = true;

            setStatus(
                "Ładowanie próbek..."
            );


            // --------------------------------------------
            // URUCHOM AUDIO
            // --------------------------------------------

            await organ.start();


            // --------------------------------------------
            // TYLKO PIERWSZY REJESTR
            // --------------------------------------------

            Object.keys(
                organ.samples
            ).forEach(name => {

                organ.samples[name].enabled =
                    name === "geingenprincipal";
            });


            updateRegisters();


            // --------------------------------------------
            // MIDI
            // --------------------------------------------

            await initMIDI();


            audioStarted = true;


            startButton.textContent =
                "ORGANY URUCHOMIONE";


            setStatus(
                "Organy gotowe — Geigenprincipal 8′ aktywny.",
                true
            );


        } catch (error) {

            console.error(
                "BŁĄD STARTU ORGANÓW:",
                error
            );


            setStatus(
                "Błąd. Sprawdź konsolę przeglądarki."
            );


            startButton.disabled =
                false;
        }
    }
);


// ============================================================
// REJESTRY
// ============================================================

registerButtons.forEach(button => {

    button.addEventListener(
        "click",
        () => {

            if (!audioStarted) {

                setStatus(
                    "Najpierw uruchom organy."
                );

                return;
            }


            // WAŻNE:
            // data-register, NIE data-voice
            const name =
                button.dataset.register;


            if (!organ.samples[name]) {

                console.error(
                    "Nie znaleziono rejestru:",
                    name
                );

                return;
            }


            const enabled =
                organ.toggleRegister(name);


            button.classList.toggle(
                "active",
                enabled
            );


            button.setAttribute(
                "aria-pressed",
                String(enabled)
            );


            console.log(
                organ.samples[name].name,
                enabled
                    ? "ON"
                    : "OFF"
            );
        }
    );
});


// ============================================================
// MIDI
// ============================================================

async function initMIDI() {

    if (!navigator.requestMIDIAccess) {

        setStatus(
            "Organy działają, ale ta przeglądarka nie obsługuje Web MIDI.",
            true
        );

        return;
    }


    try {

        midiAccess =
            await navigator.requestMIDIAccess();


        connectMIDIInputs();


        midiAccess.onstatechange =
            () => {

                connectMIDIInputs();
            };


    } catch (error) {

        console.error(
            "MIDI ERROR:",
            error
        );


        setStatus(
            "Organy działają, ale nie udało się uruchomić MIDI.",
            true
        );
    }
}


// ============================================================
// PODŁĄCZANIE MIDI
// ============================================================

function connectMIDIInputs() {

    if (!midiAccess) {
        return;
    }


    const inputs =
        Array.from(
            midiAccess.inputs.values()
        );


    if (inputs.length === 0) {

        setStatus(
            "Organy gotowe — podłącz klawiaturę MIDI.",
            true
        );

        return;
    }


    inputs.forEach(input => {

        input.onmidimessage =
            handleMIDIMessage;
    });


    setStatus(
        `Organy gotowe — MIDI: ${inputs.length} urządzenie.`,
        true
    );


    console.log(
        "MIDI INPUTS:",
        inputs.map(
            input => input.name
        )
    );
}


// ============================================================
// MIDI MESSAGE
// ============================================================

function handleMIDIMessage(event) {

    const data =
        event.data;


    if (
        !data ||
        data.length < 2
    ) {
        return;
    }


    const statusByte =
        data[0];


    const command =
        statusByte & 0xf0;


    const note =
        data[1];


    const velocity =
        data.length > 2
            ? data[2]
            : 0;


    // ========================================================
    // NOTE ON
    // ========================================================

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


    // ========================================================
    // NOTE OFF
    // ========================================================

    if (
        command === 0x80
    ) {

        organ.noteOff(
            note
        );

        return;
    }


    // ========================================================
    // NOTE ON + VELOCITY 0
    // = NOTE OFF
    // ========================================================

    if (
        command === 0x90 &&
        velocity === 0
    ) {

        organ.noteOff(
            note
        );
    }
}
