import pyttsx3
import os
import uuid
import threading

# Create a lock for thread-safe access to the pyttsx3 engine
tts_lock = threading.Lock()

def speak_question(question: str) -> str:
    """
    Converts question text into an audio file using pyttsx3.
    Uses a lock to ensure thread safety as pyttsx3 is not thread-safe.
    """
    with tts_lock:
        try:
            output_dir = "data/audio_questions"
            os.makedirs(output_dir, exist_ok=True)
            
            filename = f"question_{uuid.uuid4().hex}.mp3"
            file_path = os.path.join(output_dir, filename)
            
            # Initialize engine inside the lock to be safe
            engine = pyttsx3.init()
            engine.setProperty('rate', 175)
            engine.setProperty('volume', 0.9)
            
            # Save to file
            engine.save_to_file(question, file_path)
            engine.runAndWait()
            
            # Stop the engine to release resources
            engine.stop()
            
            # On some systems, the file might have a different extension or be saved differently
            # but usually it's fine. pyttsx3 on Windows uses SAPI5 which handles mp3/wav via file extension.
            
            return file_path
        except Exception as e:
            print(f"Error in TTS: {e}")
            return ""
