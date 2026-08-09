export class Organ {

    constructor() {

        this.audioContext = new AudioContext();

        // MASTER
        this.master =
            this.audioContext.createGain();

        this.master.gain.value = 0.8;

        this.master.connect(
            this.audioContext.destination
        );


        // REJESTRY

        this.registers = {

            geigenprincipal8: {
                name: "Geigenprincipal 8'",
                enabled: true,
                samples: {}
            },

            salicional8: {
                name: "Salicional 8'",
                enabled: false,
                samples: {}
            },

            gedeckt8: {
                name: "Gedeckt 8'",
                enabled: false,
                samples: {}
            },

            flauttraverso4: {
                name: "Flaut traverso 4'",
                enabled: false,
                samples: {}
            },

            waldflote2: {
                name: "Waldflöte 2'",
                enabled: false,
                samples: {}
            },

            subbass16: {
                name: "Subbass 16'",
                enabled: false,
                samples: {}
            }
        };


        // AKTYWNE DŹWIĘKI

        this.activeNotes = new Map();
    }


    async start() {

        if (
            this.audioContext.state !== "running"
        ) {

            await this.audioContext.resume();

        }

        console.log(
            "Audio:",
            this.audioContext.state
        );
    }


    enableRegister(name) {

        if (!this.registers[name]) {
            console.error(
                "Nie ma takiego rejestru:",
                name
            );

            return;
        }

        this.registers[name].enabled = true;

        console.log(
            "Włączono:",
            this.registers[name].name
        );
    }


    disableRegister(name) {

        if (!this.registers[name]) {
            return;
        }

        this.registers[name].enabled = false;

        console.log(
            "Wyłączono:",
            this.registers[name].name
        );
    }


    toggleRegister(name) {

        if (!this.registers[name]) {
            return;
        }

        this.registers[name].enabled =
            !this.registers[name].enabled;

        console.log(
            this.registers[name].name,
            this.registers[name].enabled
                ? "ON"
                : "OFF"
        );
    }


    noteOn(note, velocity = 127) {

        console.log(
            "NOTE ON:",
            note,
            velocity
        );


        // Na razie tylko informacja.
        // Prawdziwe próbki dołożymy za chwilę.

        const enabledRegisters =
            Object.values(this.registers)
                .filter(register => register.enabled);


        console.log(
            "Aktywne głosy:",
            enabledRegisters.map(
                register => register.name
            )
        );
    }


    noteOff(note) {

        console.log(
            "NOTE OFF:",
            note
        );
    }
}