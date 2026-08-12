import { Organ } from "./organ.js";


// ============================================================
// UI
// ============================================================

const startButton =
    document.getElementById(
        "start-audio"
    );

const status =
    document.getElementById(
        "status"
    );

const statusDot =
    document.getElementById(
        "status-dot"
    );

const registerButtons =
    document.querySelectorAll(
        ".register"
    );


// ============================================================
// ORGAN
// ============================================================

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

        status.textContent =
            text;
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


            button.classList.toggle(
                "active",
                sample.enabled
            );


            button.setAttribute(
                "aria-pressed",
                String(
                    sample.enabled
                )
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

        if (
            audioStarted
        ) {

            return;
        }


        try {

            startButton.disabled =
                true;


            setStatus(
                "Ładowanie organów..."
            );


            await organ.start();


            /*
             * Zawsze startujemy tylko
             * z Geigenprincipal.
             */

            Object.keys(
                organ.samples
            ).forEach(
                name => {

                    organ.samples[name].enabled =
                        name ===
                        "geingenprincipal";
                }
            );


            updateRegisters();


            await initMIDI();


            audioStarted =
                true;


            startButton.textContent =
                "ORGANY URUCHOMIONE";


            setStatus(
                "Organy gotowe — Geigenprincipal 8′",
                true
            );


        } catch (error) {

            console.error(
                "BŁĄD STARTU:",
                error
            );


            setStatus(
                "Nie udało się uruchomić organów."
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

                if (
                    !audioStarted
                ) {

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
                        "Nie znaleziono rejestru:",
                        name
                    );

                    return;
                }


                organ.toggleRegister(
                    name
                );


                updateRegisters();
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
            "Audio działa, ale MIDI nie jest obsługiwane.",
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
            "MIDI:",
            error
        );


        setStatus(
            "Audio działa, ale MIDI nie zostało podłączone.",
            true
        );
    }
}


// ============================================================
// MIDI INPUT
// ============================================================

function connectMIDIInputs() {

    if (
        !midiAccess
    ) {

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
            "Organy gotowe — podłącz klawiaturę MIDI.",
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
        `Organy gotowe — MIDI: ${inputs.length} urządzenie.`,
        true
    );
}


// ============================================================
// MIDI MESSAGE
// ============================================================

function handleMIDIMessage(
    event
) {

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


    // NOTE ON z velocity 0

    if (
        command === 0x90 &&
        velocity === 0
    ) {

        organ.noteOff(
            note
        );
    }
}
