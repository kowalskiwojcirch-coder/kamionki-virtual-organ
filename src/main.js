import { Organ } from "./Organ.js";


// ============================================================
// ELEMENTY UI
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

    status.textContent =
        text;


    statusDot.classList.toggle(
        "ready",
        ready
    );
}


// ============================================================
// AKTUALIZACJA PRZYCISKÓW
// ============================================================

function updateRegisters() {

    registerButtons.forEach(
        button => {

            const name =
                button.dataset.voice;


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


            audioStarted =
                true;


            // =================================================
            // MIDI
            // =================================================

            await initMIDI();


            // =================================================
            // PIERWSZY REJESTR
            // =================================================

            Object.keys(
                organ.samples
            ).forEach(
                name => {

                    organ.samples[name].enabled =
                        name === "geingenprincipal";
                }
            );


            updateRegisters();


            setStatus(
                "Organy gotowe — Geigenprincipal 8′ aktywny.",
                true
            );


            startButton.textContent =
                "ORGANY URUCHOMIONE";


        } catch (error) {

            console.error(
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
// REJESTRY
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
                    button.dataset.voice;


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
            "Audio działa, ale ta przeglądarka nie obsługuje Web MIDI."
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
            "MIDI:",
            error
        );


        setStatus(
            "Audio działa, ale nie udało się uruchomić MIDI."
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


    if (!data || data.length < 2) {

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
    // NOTE ON Z VELOCITY 0 = NOTE OFF
    // ========================================================

    if (
        command === 0x90 &&
        velocity === 0
    ) {

        organ.noteOff(
            note
        );

        return;
    }
}
