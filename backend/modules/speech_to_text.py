from faster_whisper import WhisperModel
import os

# Switch to "tiny" for much faster transcription in mock sessions
model_size = "tiny"
try:
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
except Exception as e:
    print(f"Error loading Whisper model: {e}")
    model = None

def transcribe_audio(audio_path: str) -> str:
    """
    Transcribes audio file to text using faster-whisper.
    
    Args:
        audio_path (str): Path to the audio file (wav, mp3, etc.)
        
    Returns:
        str: Transcribed text.
    """
    if not model:
        return "Error: Whisper model not loaded."
        
    if not os.path.exists(audio_path):
        return f"Error: Audio file not found at {audio_path}."
        
    try:
        # beam_size=1 is much faster than 5 for real-time interaction
        segments, info = model.transcribe(audio_path, beam_size=1)
        
        transcript = ""
        for segment in segments:
            transcript += segment.text + " "
            
        return transcript.strip()
    except Exception as e:
        return f"Error during transcription: {str(e)}"
