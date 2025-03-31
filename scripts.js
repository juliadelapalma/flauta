const sheetContainer = document.getElementById('sheet');
const logo = document.getElementById('logo');
const inputBeatsPerMeasure = document.getElementById('beatsPerMeasure');
const inputBeatUnit = document.getElementById('beatUnit');
const playButton = document.getElementById('button--play');
const addButton = document.getElementById('button--add');
const deleteButton = document.getElementById('button--delete');
const soundButton = document.querySelector('#button--sound input');
const scrollButton = document.querySelector('#button--scroll input');
const exportButton = document.getElementById('button--export');
const importButton = document.getElementById('button--import');

const notesArray = [
    { key: 'do4', name: 'Do', },
    { key: 're4', name: 'Re', },
    { key: 'mi4', name: 'Mi', },
    { key: 'fa4', name: 'Fa', },
    { key: 'sol4', name: 'Sol', },
    { key: 'la4', name: 'La', },
    { key: 'si4', name: 'Si', },
    { key: 'do5', name: "Do'", },
    { key: 're5', name: "Re'", }
];

const noteFigures = {
    whole: 4,       // Redonda (4 tiempos)
    half: 2,        // Blanca (2 tiempos)
    quarter: 1,     // Negra (1 tiempo)
    eighth: 0.5,    // Corchea (1/2 tiempo)
    sixteenth: 0.25 // Semicorchea (1/4 tiempo)
};

/* === Sound functions === */

let isPlaying = false;
let timeouts = [];
let audio = new Audio();

function playNoteSound(noteName) {
    if (!soundButton.checked) return;

    return new Promise((resolve, reject) => {
        audio.src = `assets/sounds/${noteName}.mp3`;
        audio.currentTime = 0;
        audio.play()
            .then(resolve)
            .catch(error => {
                console.error("Error playing sound:", error);
                reject(error);
            });
    });
}

/* async function playComposition() {
    if (!soundButton.checked) return;

    if (isPlaying) {
        stopComposition();
        return;
    }

    isPlaying = true;
    const bpm = parseInt(document.querySelector('#input--bpm input').value) || 120;
    const notes = document.querySelectorAll('.sheet__measure__note');
    let time = 0;

    playButton.querySelector('img').src = 'assets/button-stop.svg';
    logo.classList.add('playing');
    logo.querySelectorAll('path').forEach(path => {
        path.style.animationDuration = `${(60 / bpm) * noteFigures['half']}s`;
    });

    for (const [index, note] of notes.entries()) {
        note.classList.add('playing');
        const noteName = note.dataset.noteKey || null;
        const figure = note.dataset.figure || 'sixteenth';
        const duration = (60 / bpm) * noteFigures[figure]; // Duration in seconds

        if (noteName) {
            const timeoutId = setTimeout(() => {
                playNoteSound(noteName);
                note.classList.remove('playing');
            }, time * 1000);
            timeouts.push(timeoutId);
        }

        // Add up time
        time += duration;
    }

    const stopTimeout = setTimeout(() => {
        stopComposition();
    }, time * 1000);

    timeouts.push(stopTimeout);
} */

async function playComposition() {
    if (!soundButton.checked) return;

    if (isPlaying) {
        stopComposition();
        return;
    }

    isPlaying = true;
    const bpm = parseInt(document.querySelector('#input--bpm input').value) || 120;
    const notes = document.querySelectorAll('.sheet__measure__note');
    let time = 0;

    playButton.querySelector('img').src = 'assets/button-stop.svg';
    logo.classList.add('playing');
    logo.querySelectorAll('path').forEach(path => {
        path.style.animationDuration = `${(60 / bpm) * noteFigures['half']}s`;
    });

    if (scrollButton.checked) moveScrollAndHighlight(notes[0].parentElement);

    for (const [index, note] of notes.entries()) {
        note.classList.add('playing');
        const noteName = note.dataset.noteKey || null;
        const figure = note.dataset.figure || 'sixteenth';
        const duration = (60 / bpm) * noteFigures[figure]; // Duration in seconds

        // Hightlight current measure
        if (scrollButton.checked) {
            if (index > 0 && index % inputBeatsPerMeasure.value === 0) {
                const timeoutIdForScroll = setTimeout(() => {
                    moveScrollAndHighlight(note.parentElement);
                }, time * 1000);
                timeouts.push(timeoutIdForScroll);
            }
        }

        // Add timeout to play current note
        if (noteName) {
            const timeoutId = setTimeout(() => {
                playNoteSound(noteName);
                note.classList.remove('playing');
            }, time * 1000);
            timeouts.push(timeoutId);
        }

        // Add up time
        time += duration;
    }

    const stopTimeout = setTimeout(() => {
        stopComposition();
    }, time * 1000);

    timeouts.push(stopTimeout);
}

function moveScrollAndHighlight(currentMeasureDiv) {
    // Cambiar el compás actual
    const measures = document.querySelectorAll('.sheet__measure');
    measures.forEach(measure => measure.classList.remove('active'));
    currentMeasureDiv.classList.add('active');

    // Mover el scroll para que el compás actual sea visible
    currentMeasureDiv.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
    });
}


function stopComposition() {
    isPlaying = false;
    logo.classList.remove('playing');
    playButton.querySelector('img').src = 'assets/button-play.svg';

    timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    timeouts = [];

    const notesPlaying = document.querySelectorAll('.sheet__measure__note.playing');
    notesPlaying.forEach(note => note.classList.remove('playing'));

    const measures = document.querySelectorAll('.sheet__measure');
    measures.forEach(measure => measure.classList.remove('active'));

    sheetContainer.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
    });
}

/* === Save and Create Sequencies === */

function createSequence(json) {
    // Empty the sheet
    const measures = document.querySelectorAll('.sheet__measure');
    for (const measure of measures) {
        deleteMeasure(measure);
    }

    // Fill the sheet with measures again
    const totalMeasures = json.sequence.length / (json.beatsPerMeasure * json.beatUnit);
    for (let i = 0; i < totalMeasures; i++) {
        createNewMeasure(json.beatsPerMeasure, json.beatUnit);
    }

    // Update the beatsPerMeasure, beatUnit and BPM
    inputBeatsPerMeasure.value = json.beatsPerMeasure;
    inputBeatUnit.value = json.beatUnit;
    document.querySelector('#input--bpm input').value = json.bpm;

    // Mark the notes in the sheet
    const notes = document.querySelectorAll('.sheet__measure__note');
    for (const [index, noteDiv] of notes.entries()) {
        noteDiv.dataset.figure = json.sequence[index].figure;
        noteDiv.classList.add(`note--${json.sequence[index].figure}`)
        if (json.sequence[index].noteKey) {
            updateNote(noteDiv, json.sequence[index].noteKey);
        }
    }
}

function obtainSequence() {
    const notes = document.querySelectorAll('.sheet__measure__note');
    let sequence = [];

    for (const note of notes) {
        let noteObject = {}
        noteObject.noteKey = note.dataset.noteKey || null;
        noteObject.figure = note.dataset.figure || 'sixteenth';
        sequence.push(noteObject);
    }

    return sequence;
}

/* === Export and Import functions === */

function importJson(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        const json = JSON.parse(reader.result);
        createSequence(json);
    };
    reader.readAsText(file);
}

function exportJson() {
    const dataToSave = {
        bpm: parseInt(document.querySelector('#input--bpm input').value),
        beatsPerMeasure: parseInt(inputBeatsPerMeasure.value),
        beatUnit: parseInt(inputBeatUnit.value),
        sequence: obtainSequence(),
    };
    const json = JSON.stringify(dataToSave);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Get the date for the file name
    let today = new Date().toISOString().slice(0, 10)
    link.download = `song-${today}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/* === Sheet Creation functions === */

function displayNoteName(noteDiv, noteName) {
    noteDiv.querySelector('.note__name').textContent = noteName;
}

function hideNoteName(noteDiv) {
    noteDiv.querySelector('.note__name').textContent = '';
}

function removeNote(noteDiv) {
    hideNoteName(noteDiv);
    noteDiv.querySelector('.note__image').src = 'assets/note-placeholder.svg';
    noteDiv.classList.remove('active');
    noteDiv.querySelector('.note__symbol.active').classList.remove('active');
    noteDiv.dataset.figure = 'sixteenth';
    noteDiv.removeAttribute('data-note-key');
}

function updateNote(noteDiv, note) {
    const foundNote = notesArray.find(n => n.key === note);
    displayNoteName(noteDiv, foundNote.name);
    noteDiv.querySelector('.note__image').src = `assets/note-${foundNote.key}.svg`;
    noteDiv.classList.add('active');
    noteDiv.dataset.noteKey = foundNote.key;

    const noteSymbols = noteDiv.querySelectorAll('.note__symbol');
    for (symbol of noteSymbols) {
        if (symbol.dataset.note == note) {
            symbol.classList.add('active');
        } else {
            symbol.classList.remove('active');
        }
    }
}

function hideNoteOptions() {
    const noteOptions = document.querySelector(".note__options");
    if (!noteOptions) return;

    noteOptions.style.opacity = 0;
    window.setTimeout(() => {
        noteOptions.remove()
    }, 300);
}

function displayNoteOptions(buttonsDiv) {
    hideNoteOptions();

    if (buttonsDiv.classList.contains('active')) return;

    const optionsContainer = document.createElement('div');
    optionsContainer.classList.add('note__options');

    for (const figure in noteFigures) {
        const figureButton = document.createElement('button');
        const figureImage = document.createElement('img');
        figureImage.src = `assets/note-${figure}.svg`;
        figureButton.append(figureImage);
        optionsContainer.append(figureButton);

        figureButton.addEventListener('click', () => {
            for (const figure2 in noteFigures) {
                buttonsDiv.parentElement.classList.remove(`note--${figure2}`);
            }
            buttonsDiv.parentElement.dataset.figure = figure;
            buttonsDiv.parentElement.classList.add(`note--${figure}`);
        })
    }

    const removeButton = document.createElement('button');
    const removeImage = document.createElement('img');
    removeImage.src = 'assets/button-remove.svg';
    removeButton.append(removeImage);
    optionsContainer.append(removeButton);

    removeButton.addEventListener('click', () => {
        removeNote(buttonsDiv.parentElement);
    })

    buttonsDiv.appendChild(optionsContainer);
    optionsContainer.style.opacity = 1;
}

function deleteMeasure(measure) {
    measure.parentNode.removeChild(measure);
}

function createNewMeasure(beatsPerMeasure, beatUnit) {
    const measure = document.createElement('div');
    measure.classList.add('sheet__measure');

    const totalNotes = beatsPerMeasure * beatUnit;

    for (let i = 0; i < totalNotes; i++) {
        const noteContainer = document.createElement('div');
        noteContainer.classList.add('sheet__measure__note');
        noteContainer.dataset.figure = 'sixteenth';

        if ((i + 1) % beatUnit === 0) {
            noteContainer.classList.add('beat-marker');
        }

        const noteImage = document.createElement('img');
        noteImage.classList.add('note__image');
        noteImage.src = 'assets/note-placeholder.svg';

        const noteButtons = document.createElement('div');
        noteButtons.classList.add('note__buttons');

        notesArray.forEach(note => {
            const noteSymbol = document.createElement('div');
            noteSymbol.classList.add('note__symbol');
            noteSymbol.dataset.note = note.key;
            noteButtons.appendChild(noteSymbol);

            noteSymbol.addEventListener('mouseover', () => {
                if (!noteContainer.classList.contains('active')) displayNoteName(noteContainer, note.name)
            });
            noteSymbol.addEventListener('mouseout', () => {
                if (!noteContainer.classList.contains('active')) hideNoteName(noteContainer);
            });
            noteSymbol.addEventListener('click', (event) => {
                updateNote(noteContainer, note.key);
                displayNoteOptions(noteButtons);
                playNoteSound(note.key);
                // We consider that this is no longer a song in the library
                const selectedRadio = document.querySelector('.dropdown--library input[type="radio"]:checked');
                if (selectedRadio) selectedRadio.checked = false;
                // Stop propagation
                event.stopPropagation();
            });
        });

        const noteName = document.createElement('div');
        noteName.classList.add('note__name');

        noteContainer.appendChild(noteImage);
        noteContainer.appendChild(noteButtons);
        noteContainer.appendChild(noteName);
        measure.appendChild(noteContainer);
    }

    sheetContainer.insertBefore(measure, addButton);
    return measure;
}


/* === Dropdown functions === */

const dropdowns = document.querySelectorAll('.dropdown');

dropdowns.forEach(dropdown => {
    const button = dropdown.querySelector('.dropdown button');

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        closeAllDropdowns();
        dropdown.classList.toggle('open');
    });

    document.addEventListener('click', () => dropdown.classList.remove('open'));
});

function closeAllDropdowns() {
    dropdowns.forEach(d => d.classList.remove('open'));
}


/* === Events === */

document.addEventListener("click", hideNoteOptions);

playButton.addEventListener("click", playComposition);

exportButton.addEventListener("click", exportJson);
importButton.addEventListener("change", importJson);

addButton.addEventListener("click", () => createNewMeasure(inputBeatsPerMeasure.value, inputBeatUnit.value));
deleteButton.addEventListener("click", () => document.querySelectorAll('.sheet__measure').forEach(deleteMeasure));

const libraryOptions = document.querySelectorAll('.dropdown--library input[type="radio"]');
for (const song of libraryOptions) {
    song.addEventListener('change', (event) => {
        const selectedJson = `assets/sheets/${event.target.value}.json`;
        fetch(selectedJson)
            .then(response => response.json())
            .then(data => createSequence(data))
            .catch(error => console.error('Error al cargar el JSON:', error));
    });
}


/* === Initial load: Create a few measures === */

document.addEventListener("DOMContentLoaded", () => {
    const selectedJson = 'assets/sheets/oda-a-la-alegria.json';
    fetch(selectedJson)
        .then(response => response.json())
        .then(data => createSequence(data))
        .catch(error => console.error('Error al cargar el JSON:', error));
});