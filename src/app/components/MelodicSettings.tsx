import { useMemo, useState } from "react";
import * as R from "ramda";
import { useTuningContext } from "../tuningContext";
import MelodeonButton, { MelodeonButtonWrapper } from "./MelodeonButton";
import {
  Bass,
  DefinedDirection,
  Direction,
  Note,
  TuningNoteButton,
} from "../types";
import { useSongContext } from "../songContext";
import MusicSheetSelector from "./MusicSheetSelector";

const MelodicSettings = () => {
  const { tuning } = useTuningContext();
  const {
    activeBeat,
    song,
    setMelodicButton,
    setBassButton,
    setDirection,
    splitMelodicPart,
    splitBassPart,
  } = useSongContext();
  const [selectedNotes, setSelectedNotes] = useState<Note[]>([]);
  const [selectedBasses, setSelectedBasses] = useState<Bass[]>([]);
  const [selectedDirection, setSelectedDirection] =
    useState<Direction>("empty");

  console.log("Active beat", {
    activeBeat,
    song,
  });

  const [hoveredNote, setHoveredNote] = useState<Note | null>({
    note: "c",
    pitch: 2,
  });

  const [selectedMelodicButtons, setSelectedMelodicButtons] = useState<{
    buttons: { row: number; button: number }[];
    direction: DefinedDirection;
  } | null>(null);
  console.log("selectedMelodicButtons", selectedMelodicButtons);
  const [hoveredBass, setHoveredBass] = useState<Bass | null>(null);

  const handleAddSelectedNote = (note: Note, newDirection?: Direction) => {
    setSelectedNotes((sn) =>
      sn.find((n) => n.note === note.note && n.pitch === note.pitch)
        ? sn.filter((n) => n.note !== note.note || n.pitch !== note.pitch)
        : [...sn, note]
    );

    if (newDirection) {
      setSelectedDirection(newDirection);
    }
  };

  const handleAddSelectedBass = (bass: Bass, direction: DefinedDirection) => {
    setSelectedBasses((sb) =>
      sb.find((b) => b === bass) ? sb.filter((b) => b !== bass) : [...sb, bass]
    );
    setDirection(direction);
  };

  if (!activeBeat) {
    return null;
  }

  const beat = song.bars[activeBeat.barIndex].beats[activeBeat.beatIndex];
  beat.melodic;

  const suggestedButtons = useMemo(() => {
    const pullButtons =
      selectedDirection !== "push"
        ? tuning.melodic.flatMap((row) => {
            return row.buttons
              .filter(({ pull }) =>
                selectedNotes.find(
                  (selectedNote) =>
                    selectedNote.note === pull.note &&
                    selectedNote.pitch === pull.pitch
                )
              )
              .map((button) => ({
                ...button,
                direction: "pull" as const,
                row: row.row,
              }));
          })
        : [];
    const pushButtons =
      selectedDirection !== "pull"
        ? tuning.melodic.flatMap((row) => {
            return row.buttons
              .filter(({ push }) =>
                selectedNotes.find(
                  (selectedNote) =>
                    selectedNote.note === push.note &&
                    selectedNote.pitch === push.pitch
                )
              )
              .map((button) => ({
                ...button,
                direction: "push" as const,
                row: row.row,
              }));
          })
        : [];
    console.log("pullButtons", pullButtons);
    console.log("pushButtons", pushButtons);

    const getSuggestion = <B extends TuningNoteButton>(
      notes: Note[],
      buttons: B[],
      direction: DefinedDirection
    ): B[][] => {
      if (notes.length === 0) {
        return [];
      }
      const [firstNote, ...restNotes] = notes;
      const noteButtons = buttons.filter(
        (button) =>
          button[direction].note === firstNote.note &&
          button[direction].pitch === firstNote.pitch
      );

      const restSuggestions = getSuggestion(restNotes, buttons, direction);
      console.log("get suggestions", {
        firstNote,
        noteButtons,
        restSuggestions,
      });

      if (restSuggestions.length === 0) {
        return noteButtons.map((noteButton) => [noteButton]);
      }

      return noteButtons.flatMap((noteButton) =>
        restSuggestions.map((restSuggestion) => [noteButton, ...restSuggestion])
      );

      // return noteButtons.flatMap((noteButton) => [
      //   noteButton,
      //   ...getSuggestion(restNotes, buttons, direction),
      // ]);
    };
    // console.log(
    //   "Pull suggestion",
    //   getSuggestion(selectedNotes, pullButtons, "pull")
    // );
    console.log(
      "Push suggestion",
      getSuggestion(selectedNotes, pushButtons, "push")
    );

    return {
      push: getSuggestion(selectedNotes, pushButtons, "push").filter(
        (suggestion) => suggestion.length === selectedNotes.length
      ),
      pull: getSuggestion(selectedNotes, pullButtons, "pull").filter(
        (suggestion) => suggestion.length === selectedNotes.length
      ),
    };
  }, [selectedNotes, selectedDirection, tuning.melodic]);

  const hasBassPart = !!beat.bass.subCells[activeBeat.subBeatIndex];
  const hasMelodicPart = beat.melodic.some(
    (cell) => !!cell.subCells[activeBeat.subBeatIndex]
  );

  return (
    <div className="absolute p-20">
      <div className="flex gap-4 flex-wrap">
        <div>
          Výber nôt zo stupnice:
          <MusicSheetSelector
            setHoveredNote={setHoveredNote}
            onSelectNote={handleAddSelectedNote}
          />
        </div>
        <div className="flex items-center justify-between">
          {hasBassPart && (
            <div className="flex items-center flex-row">
              {tuning.bass.map((row) => {
                const cellItems =
                  beat.bass.subCells[activeBeat.subBeatIndex].items;
                const activeNotes = new Set(
                  cellItems.map((item) =>
                    item.type === "bass" ? item.note.note : null
                  )
                );
                return (
                  <div key={row.row} className="flex flex-col">
                    {row.buttons.map((button) => (
                      <MelodeonButton
                        onClick={(direction) => {
                          console.log("clicked");
                          // const note =
                          //   direction === "pull" ? button.pull : button.push;
                          // setBassButton(note, direction);
                          handleAddSelectedBass(button[direction], direction);
                        }}
                        // disabled={!!hoveredNote && button.pull.note != hoveredNote}
                        button={button}
                        buttonNumberHidden
                        hoveredNote={hoveredBass}
                        setHoveredNote={setHoveredBass}
                        direction={
                          selectedMelodicButtons?.direction ?? selectedDirection
                        }
                        selected={
                          activeNotes.has(button.pull.note) ||
                          activeNotes.has(button.push.note)
                        }
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-5 mx-8">
            <MelodeonButtonWrapper
              selected={
                selectedMelodicButtons
                  ? selectedMelodicButtons.direction === "pull"
                  : selectedDirection === "pull"
              }
              onClick={() => setSelectedDirection("pull")}
            >
              {"<----"}
            </MelodeonButtonWrapper>
            <MelodeonButtonWrapper
              selected={
                !selectedMelodicButtons && selectedDirection === "empty"
              }
              onClick={() => setSelectedDirection("empty")}
            >
              {"-"}
            </MelodeonButtonWrapper>
            <MelodeonButtonWrapper
              selected={
                selectedMelodicButtons
                  ? selectedMelodicButtons.direction === "push"
                  : selectedDirection === "push"
              }
              onClick={() => setSelectedDirection("push")}
            >
              {"--->"}
            </MelodeonButtonWrapper>
          </div>
          {hasMelodicPart && (
            <div className="flex items-center flex-row-reverse">
              {tuning.melodic.map((row) => {
                const cellItems =
                  beat.melodic[row.row - 1].subCells[activeBeat.subBeatIndex]
                    .items;
                const activeButtons = new Set(
                  cellItems.map((item) =>
                    item.type === "note" ? item.button : null
                  )
                );
                return (
                  <div key={row.row} className="flex flex-col-reverse">
                    {row.buttons.map((button) => (
                      <MelodeonButton
                        key={row.row + button.button}
                        onClick={(direction) => {
                          console.log("clicked");
                          // setMelodicButton(row.row, button.button, direction);
                          handleAddSelectedNote(button[direction], direction);
                        }}
                        // disabled={!!hoveredNote && button.pull.note != hoveredNote}
                        button={button}
                        hoveredNote={hoveredNote}
                        setHoveredNote={setHoveredNote}
                        direction={
                          selectedMelodicButtons?.direction ?? selectedDirection
                        }
                        selected={
                          activeButtons.has(button.button) ||
                          !!selectedMelodicButtons?.buttons.find(
                            (b) =>
                              b.button === button.button && b.row === row.row
                          )
                        }
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="flex">
        Vybrané noty:
        {selectedNotes.map((note) => (
          <div>
            {note.note}
            <sup className="top-[-0.5em]">{note.pitch}</sup>
          </div>
        ))}
      </div>
      <div className="flex">
        Vybrané basy:
        {selectedBasses.map((note) => (
          <div>{note.note}</div>
        ))}
      </div>
      <button
        className="border border-black px-1 rounded-md bg-gray-50"
        onClick={() => {
          setSelectedNotes([]);
          setSelectedDirection("empty");
        }}
      >
        Vymazať
      </button>
      <button
        className="border border-black px-1 rounded-md bg-gray-50"
        onClick={() => splitMelodicPart()}
      >
        Rozdeliť melodickú časť
      </button>
      <button
        className="border border-black px-1 rounded-md bg-gray-50"
        onClick={() => splitBassPart()}
      >
        Rozdeliť basovú časť
      </button>
      <div className="flex">
        Navrhované kombinácie:
        {[...suggestedButtons.push, ...suggestedButtons.pull].map((buttons) => (
          <div
            className="flex border border-black p-1 cursor-pointer mx-1"
            onMouseEnter={() =>
              buttons[0] &&
              setSelectedMelodicButtons({
                buttons: buttons.map((button) => ({
                  row: button.row,
                  button: button.button,
                })),
                direction: buttons[0].direction,
              })
            }
            onMouseLeave={() => setSelectedMelodicButtons(null)}
          >
            {buttons[0] && (buttons[0].direction === "pull" ? "<" : ">")}
            {buttons.map((button) => (
              <div>
                {button.button}
                <sup className="top-[-0.5em]">{button.row}</sup>
              </div>
            ))}
          </div>
        ))}
        {/* {suggestedButtons.pull.map((buttons) => (
          <div
            className="flex border border-black p-1 cursor-pointer mx-1"
            onMouseEnter={() =>
              setSelectedMelodicButtons({
                buttons: buttons.map((button) => ({
                  row: button.row,
                  button: button.button,
                })),
                direction: "pull",
              })
            }
            onMouseLeave={() => setSelectedMelodicButtons(null)}
          >
            {"<"}
            {buttons.map((button) => (
              <div>
                {button.button}
                <sup className="top-[-0.5em]">{button.row}</sup>
              </div>
            ))}
          </div>
        ))} */}
      </div>
      {/* <div onMouseEnter={() => setHoveredNote("c")}>C</div>
      <div onMouseEnter={() => setHoveredNote("d")}>D</div>
      <div onMouseEnter={() => setHoveredNote("e")}>E</div>
      <div onMouseEnter={() => setHoveredNote("f")}>F</div>
      <div onMouseEnter={() => setHoveredNote("g")}>G</div>
      <div onMouseEnter={() => setHoveredNote("a")}>A</div>
      <div onMouseEnter={() => setHoveredNote("b")}>B</div>
      <div onMouseEnter={() => setHoveredNote("h")}>H</div> */}
    </div>
  );
};

export default MelodicSettings;
