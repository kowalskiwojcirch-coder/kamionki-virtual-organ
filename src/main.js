import { Organ } from "./Organ.js";


const organ =
    new Organ();


const $ =
    selector =>
        document.querySelector(selector);


const $$ =
    selector =>
        [...document.querySelectorAll(selector)];


let midiAccess = null;

const pressedComputerKeys =
    new Map();


const pressedMidiNotes =
    new Set();


let audioStarted = false;


// ============================================================
// NAZWY NUT
// ============================================================

const NOTE_NAMES = [
    "C",
    "C♯",
    "D",
    "D♯",
    "E",
    "F",
    "F♯",
    "G",
    "G♯",
    "A",
    "A♯",
    "B"
];


function noteName(note) {

    const octave =
        Math.floor(
            note / 12
        ) - 1;


    return (
        NOTE_NAMES[note % 12] +
        octave
    );
}


// ============================================================
// STATUS
// ============================================================

function setAudioStatus(
    text,
    ready = false
) {

    $("#audioStatus").textContent =
        text;


    $("#audioDot")
        .classList.toggle(
            "on",
            ready
        );
}


function updatePolyphony() {

    $("#polyCount").textContent =
        organ.activeNotes.size;
}


// ============================================================
// REJESTRY
// ============================================================

const REGISTER_NAMES = {

    geingenprincipal:
        "Geigenprincipal 8′",

    sacional:
        "Salicional 8′",

    gedact:
        "Gedackt 8′",

    flute:
        "Flaut Traverso 4′"
};


function updateRegisters() {

    $$(".register").forEach(
        button => {

            const name =
                button.dataset.voice;


            const active =
                organ.samples[name]
                    ?.enabled === true;


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


    const active =
        Object.entries(
            organ.samples
        )
        .filter(
            ([, sample]) =>
                sample.enabled
        )
        .map(
            ([name]) =>
                REGISTER_NAMES[name]
        );


    $("#activeRegisters")
        .textContent =
            active.join("  +  ");
}


// ============================================================
// KLIKANIE REJESTRÓW
// ============================================================

$$(".register").forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                if (!audioStarted) {
                    return;
                }


                const name =
                    button.dataset.voice;


                organ.toggleRegister(
                    name
                );


                updateRegisters();
            }
        );
    }
);


// ============================================================
// START AUDIO
// ============================================================

$("#startBtn").addEventListener(
    "click",
    async () => {

        const button =
            $("#startBtn");


        button.disabled =
            true;


        setAudioStatus(
            "Ładowanie próbek…"
        );


        try {

            // MIDI uruchamiamy od razu.
            await startMIDI();


            // Audio i próbki.
            await organ.start();


            audioStarted =
                true;


            setAudioStatus(
                "Gotowe · Geigenprincipal 8′",
                true
            );


            button.textContent =
                "✓ ORGANY GOTOWE";


            button.classList.add(
                "ready"
            );


            updateRegisters();


        } catch (error) {

            console.error(
                error
            );


            setAudioStatus(
                "Błąd ładowania próbek"
            );


            button.disabled =
                false;
        }
    }
);


// ============================================================
// MIDI
// ============================================================

async function startMIDI() {

    if (
        !navigator.requestMIDIAccess
    ) {

        $("#midiStatus")
            .textContent =
                "MIDI niedostępne w tej przeglądarce";

        return;
    }


    try {

        midiAccess =
            await navigator
                .requestMIDIAccess();


        attachMIDI();


        midiAccess.onstatechange =
            () => {

                attachMIDI();

                updateMIDIStatus();
            };


        updateMIDIStatus();


    } catch (error) {

        console.error(
            "MIDI:",
            error
        );


        $("#midiStatus")
            .textContent =
                "Brak dostępu MIDI";
    }
}


function attachMIDI() {

    if (!midiAccess) {
        return;
    }


    for (
        const input
        of midiAccess.inputs.values()
    ) {

        input.onmidimessage =
            handleMIDI;
    }
}


function updateMIDIStatus() {

    if (!midiAccess) {
        return;
    }


    const inputs =
        [
            ...midiAccess.inputs.values()
        ];


    if (inputs.length === 0) {

        $("#midiStatus")
            .textContent =
                "MIDI · podłącz klawiaturę";


        $("#midiDot")
            .classList.remove(
                "on"
            );


        return;
    }


    $("#midiStatus")
        .textContent =
            `MIDI · ${inputs.length} urządzenie` +
            (
                inputs.length > 1
                    ? "a"
                    : ""
            );


    $("#midiDot")
        .classList.add(
            "on"
        );
}


// ============================================================
// MIDI NOTE
// ============================================================

function handleMIDI(event) {

    const data =
        event.data;


    const status =
        data[0] & 0xf0;


    const note =
        data[1];


    const velocity =
        data[2];


    // NOTE ON

    if (
        status === 0x90 &&
        velocity > 0
    ) {

        if (
            !pressedMidiNotes.has(
                note
            )
        ) {

            pressedMidiNotes.add(
                note
            );


            organ.noteOn(
                note,
                velocity / 127
            );


            showNote(
                note
            );


            updatePolyphony();
        }


        return;
    }


    // NOTE OFF

    if (
        status === 0x80 ||
        (
            status === 0x90 &&
            velocity === 0
        )
    ) {

        pressedMidiNotes.delete(
            note
        );


        organ.noteOff(
            note
        );


        updatePolyphony();
    }
}


// ============================================================
// KLAWIATURA KOMPUTERA
// ============================================================

const COMPUTER_KEYS = {

    a: 60,
    w: 61,
    s: 62,
    e: 63,
    d: 64,
    f: 65,
    t: 66,
    g: 67,
    y: 68,
    h: 69,
    u: 70,
    j: 71,
    k: 72
};


document.addEventListener(
    "keydown",
    event => {

        if (
            event.repeat ||
            event.ctrlKey ||
            event.altKey ||
            event.metaKey
        ) {

            return;
        }


        const key =
            event.key.toLowerCase();


        const note =
            COMPUTER_KEYS[key];


        if (
            note === undefined
        ) {

            return;
        }


        if (
            pressedComputerKeys.has(
                key
            )
        ) {

            return;
        }


        pressedComputerKeys.set(
            key,
            note
        );


        organ.noteOn(
            note
        );


        showNote(
            note
        );


        markKeyboard(
            note,
            true
        );


        updatePolyphony();
    }
);


document.addEventListener(
    "keyup",
    event => {

        const key =
            event.key.toLowerCase();


        const note =
            pressedComputerKeys.get(
                key
            );


        if (
            note === undefined
        ) {

            return;
        }


        pressedComputerKeys.delete(
            key
        );


        organ.noteOff(
            note
        );


        markKeyboard(
            note,
            false
        );


        updatePolyphony();
    }
);


// ============================================================
// KLAWIATURA EKRANOWA
// ============================================================

function buildKeyboard() {

    const keyboard =
        $("#keyboard");


    const whiteNotes = [
        60,
        62,
        64,
        65,
        67,
        69,
        71,
        72
    ];


    const whiteNames = [
        "C",
        "D",
        "E",
        "F",
        "G",
        "A",
        "B",
        "C"
    ];


    whiteNotes.forEach(
        (note, index) => {

            const key =
                document.createElement(
                    "button"
                );


            key.className =
                "white-key";


            key.dataset.note =
                note;


            key.innerHTML =
                `
                    <span>
                        ${whiteNames[index]}
                    </span>
                    <small>
                        ${Math.floor(note / 12) - 1}
                    </small>
                `;


            key.addEventListener(
                "pointerdown",
                event => {

                    event.preventDefault();

                    key.setPointerCapture(
                        event.pointerId
                    );


                    organ.noteOn(
                        note
                    );


                    key.classList.add(
                        "pressed"
                    );


                    showNote(
                        note
                    );


                    updatePolyphony();
                }
            );


            key.addEventListener(
                "pointerup",
                () => {

                    organ.noteOff(
                        note
                    );


                    key.classList.remove(
                        "pressed"
                    );


                    updatePolyphony();
                }
            );


            key.addEventListener(
                "pointercancel",
                () => {

                    organ.noteOff(
                        note
                    );


                    key.classList.remove(
                        "pressed"
                    );


                    updatePolyphony();
                }
            );


            keyboard.appendChild(
                key
            );
        }
    );


    const blackNotes = [
        {
            note: 61,
            left: 12.5
        },
        {
            note: 63,
            left: 25
        },
        {
            note: 66,
            left: 50
        },
        {
            note: 68,
            left: 62.5
        },
        {
            note: 70,
            left: 75
        }
    ];


    blackNotes.forEach(
        item => {

            const key =
                document.createElement(
                    "button"
                );


            key.className =
                "black-key";


            key.dataset.note =
                item.note;


            key.style.left =
                `${item.left}%`;


            key.innerHTML =
                `
                    <span>
                        ${NOTE_NAMES[item.note % 12]}
                    </span>
                `;


            key.addEventListener(
                "pointerdown",
                event => {

                    event.preventDefault();

                    key.setPointerCapture(
                        event.pointerId
                    );


                    organ.noteOn(
                        item.note
                    );


                    key.classList.add(
                        "pressed"
                    );


                    showNote(
                        item.note
                    );


                    updatePolyphony();
                }
            );


            key.addEventListener(
                "pointerup",
                () => {

                    organ.noteOff(
                        item.note
                    );


                    key.classList.remove(
                        "pressed"
                    );


                    updatePolyphony();
                }
            );


            key.addEventListener(
                "pointercancel",
                () => {

                    organ.noteOff(
                        item.note
                    );


                    key.classList.remove(
                        "pressed"
                    );


                    updatePolyphony();
                }
            );


            keyboard.appendChild(
                key
            );
        }
    );
}


// ============================================================
// OSTATNIA NUTA
// ============================================================

function showNote(note) {

    $("#lastNote")
        .textContent =
            noteName(note);


    markKeyboard(
        note,
        true
    );
}


function markKeyboard(
    note,
    pressed
) {

    const key =
        document.querySelector(
            `[data-note="${note}"]`
        );


    if (!key) {
        return;
    }


    key.classList.toggle(
        "pressed",
        pressed
    );
}


// ============================================================
// SUWAKI
// ============================================================

$("#volume").addEventListener(
    "input",
    event => {

        const value =
            Number(
                event.target.value
            );


        $("#volumeValue")
            .textContent =
                `${Math.round(value * 100)}%`;


        if (audioStarted) {

            organ.setMasterVolume(
                value
            );
        }
    }
);


$("#attack").addEventListener(
    "input",
    event => {

        const value =
            Number(
                event.target.value
            );


        $("#attackValue")
            .textContent =
                `${Math.round(value * 1000)} ms`;


        organ.setAttack(
            value
        );
    }
);


$("#release").addEventListener(
    "input",
    event => {

        const value =
            Number(
                event.target.value
            );


        $("#releaseValue")
            .textContent =
                `${Math.round(value * 1000)} ms`;


        organ.setRelease(
            value
        );
    }
);


// ============================================================
// START
// ============================================================

buildKeyboard();

updateRegisters();

updatePolyphony();

$("#volumeValue")
    .textContent =
        "82%";

$("#attackValue")
    .textContent =
        "12 ms";

$("#releaseValue")
    .textContent =
        "220 ms";
