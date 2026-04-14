package com.folio.editor;

import javafx.event.EventType;
import javafx.scene.input.KeyCode;
import javafx.scene.input.KeyEvent;
import org.fxmisc.richtext.CodeArea;

import java.util.ArrayList;
import java.util.List;

/**
 * Records and plays back key events for macro functionality.
 * Ctrl+Shift+R to start/stop recording, Ctrl+Shift+P to playback.
 */
public class MacroRecorder {

    private boolean recording = false;
    private final List<RecordedEvent> events = new ArrayList<>();
    private CodeArea codeArea;

    /**
     * Represents a recorded key event.
     */
    public static class RecordedEvent {
        public final EventType<KeyEvent> eventType;
        public final KeyCode code;
        public final String character;
        public final String text;
        public final boolean shiftDown;
        public final boolean controlDown;
        public final boolean altDown;
        public final boolean metaDown;

        @SuppressWarnings("unchecked")
        public RecordedEvent(KeyEvent event) {
            this.eventType = (EventType<KeyEvent>) event.getEventType();
            this.code = event.getCode();
            this.character = event.getCharacter();
            this.text = event.getText();
            this.shiftDown = event.isShiftDown();
            this.controlDown = event.isControlDown();
            this.altDown = event.isAltDown();
            this.metaDown = event.isMetaDown();
        }
    }

    public MacroRecorder() {
    }

    public void setCodeArea(CodeArea codeArea) {
        this.codeArea = codeArea;
    }

    /**
     * Start recording key events.
     */
    public void startRecording() {
        events.clear();
        recording = true;
    }

    /**
     * Stop recording key events.
     */
    public void stopRecording() {
        recording = false;
    }

    /**
     * Toggle recording state.
     * @return true if recording started, false if stopped
     */
    public boolean toggleRecording() {
        if (recording) {
            stopRecording();
            return false;
        } else {
            startRecording();
            return true;
        }
    }

    /**
     * Record a key event if currently recording.
     * Call this from the editor's key event handler.
     * @return true if the event was recorded
     */
    public boolean recordEvent(KeyEvent event) {
        if (!recording) return false;

        // Don't record the toggle/playback shortcut itself
        if (isMacroShortcut(event)) return false;

        events.add(new RecordedEvent(event));
        return true;
    }

    /**
     * Play back the recorded macro by firing events on the code area.
     */
    public void playback() {
        if (codeArea == null || events.isEmpty()) return;
        if (recording) return; // Don't play while recording

        for (RecordedEvent recorded : events) {
            KeyEvent syntheticEvent = new KeyEvent(
                    recorded.eventType,
                    recorded.character,
                    recorded.text,
                    recorded.code,
                    recorded.shiftDown,
                    recorded.controlDown,
                    recorded.altDown,
                    recorded.metaDown
            );

            if (recorded.eventType == KeyEvent.KEY_TYPED) {
                // For typed events, insert the character directly
                if (recorded.character != null && !recorded.character.isEmpty()
                        && !recorded.character.equals(KeyEvent.CHAR_UNDEFINED)) {
                    codeArea.insertText(codeArea.getCaretPosition(), recorded.character);
                }
            } else {
                codeArea.fireEvent(syntheticEvent);
            }
        }
    }

    /**
     * Check if a key event is the macro toggle or playback shortcut.
     */
    public static boolean isMacroShortcut(KeyEvent event) {
        if (event.getCode() == KeyCode.R && event.isShortcutDown() && event.isShiftDown()) {
            return true; // Ctrl/Cmd+Shift+R = toggle recording
        }
        if (event.getCode() == KeyCode.P && event.isShortcutDown() && event.isShiftDown()) {
            return true; // Ctrl/Cmd+Shift+P = playback
        }
        return false;
    }

    public boolean isRecording() {
        return recording;
    }

    public int getEventCount() {
        return events.size();
    }

    public boolean hasMacro() {
        return !events.isEmpty();
    }

    /**
     * Clear the recorded macro.
     */
    public void clear() {
        events.clear();
        recording = false;
    }
}
