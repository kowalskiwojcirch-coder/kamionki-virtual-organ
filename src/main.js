import { Organ } from "./organ.js";

const startButton =
    document.getElementById("start-audio");

const status =
    document.getElementById("status");

const statusDot =
    document.getElementById("status-dot");

const registerButtons =
    document.querySelectorAll(".register");

const organ =
    new Organ();

let audioStarted =
    false;

let midiAccess =
    null;


// ============================================================
// STATUS
// ============================================================

function setStatus(
    text,
    ready = false
) {

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
// REJESTRY
// ============================================================

function updateRegisters() {

    registerButtons.forEach(
        button => {

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
        }
    );
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

            startButton.disabled =
                true;

            setStatus(
                "Ładowanie próbek..."
            );


            await organ.start();


            // Tylko Geigenprincipal na starcie.

            Object.keys(
                organ.samples
            ).forEach(
                name => {

                    organ.samples[name].enabled =
                        name === "geingenprincipal";
                }
            );


            updateRegisters();


            await initMIDI();


            audioStarted =
                true;


            startButton.textContent =
                "ORGANY URUCHOMIONE";


            setStatus(
                "Organy gotowe — Geigenprincipal 8′.",
                true
            );

        } catch (error) {

            console.error(
                "START ERROR:",
                error
            );

            setStatus(
                "Błąd uruchamiania — sprawdź konsolę."
            );

            startButton.disabled =
                false;
        }
    }
);


// ============================================================
// PRZYCISKI REJESTRÓW
// ============================================================

registerButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                if (!audioStarted) {

                    setStatus(
                        "Najpierw uruchom organy."
                    );

                    return;
                }


                const name =
                    button.dataset.register;


                if (
                    !organ.samples[name]
                ) {

                    console.error(
                        "Nie znaleziono:",
                        name
                    );

                    return;
                }


                const enabled =
                    organ.toggleRegister(
                        name
                    );


                button.classList.toggle(
                    "active",
                    enabled
                );


                button.setAttribute(
                    "aria-pressed",
                    String(enabled)
                );
            }
        );
    }
);


// ============================================================
// MIDI
// ============================================================

async function initMIDI() {

    if (
        !navigator.requestMIDIAccess
    ) {

        setStatus(
            "Audio działa, ale przeglądarka nie obsługuje MIDI.",
            true
        );

        return;
    }


    try {

        midiAccess =
            await navigator.requestMIDIAccess();


        connectMIDIInputs();


        midiAccess.onstatechange =
            connectMIDIInputs;

    } catch (error) {

        console.error(
            "MIDI ERROR:",
            error
        );

        setStatus(
            "Nie udało się uruchomić MIDI.",
            true
        );
    }
}


// ============================================================
// MIDI INPUT
// ============================================================

function connectMIDIInputs() {

    if (!midiAccess) {
        return;
    }


    const inputs =
        Array.from(
            midiAccess.inputs.values()
        );


    if (
        inputs.length === 0
    ) {

        setStatus(
            "Organy gotowe — podłącz MIDI.",
            true
        );

        return;
    }


    inputs.forEach(
        input => {

            input.onmidimessage =
                handleMIDIMessage;
        }
    );


    setStatus(
        `Organy gotowe — MIDI: ${inputs.length}.`,
        true
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


    const command =
        data[0] & 0xf0;


    const note =
        data[1];


    const velocity =
        data.length >= 3
            ? data[2]
            : 0;


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
        command === 0x80
    ) {

        organ.noteOff(
            note
        );

        return;
    }


    // NOTE ON velocity 0 = NOTE OFF

    if (
        command === 0x90 &&
        velocity === 0
    ) {

        organ.noteOff(
            note
        );
    }
}
