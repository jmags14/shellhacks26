from elevenlabs.client import ElevenLabs
from dotenv import load_dotenv
import os

load_dotenv()
client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

VOICES = {
    "rachel": "21m00Tcm4TlvDq8ikWAM",  # clear, natural voice
    "gordon": "d6FCRm6NZqBIdoDhGZ94",  # Gordon Ramsay
}

DEFAULT_VOICE = "gordon" # Gordon Ramsay

def get_voice_id(voice: str = DEFAULT_VOICE):
    return VOICES.get(voice, VOICES[DEFAULT_VOICE])

def narrate_recipe(title: str, steps: list, voice: str = DEFAULT_VOICE):
    script = f"Let's make {title}. " + " ".join(
        f"Step {i}: {step}" for i, step in enumerate(steps, start=1)
    )

    audio = client.text_to_speech.convert(
        voice_id=get_voice_id(voice),
        model_id="eleven_flash_v2_5",
        text=script,
        output_format="mp3_44100_128"
    )

    # audio is a generator of byte chunks - collect into one bytes object
    audio_bytes = b"".join(audio)

    return audio_bytes

def narrate_step(text: str, voice: str = DEFAULT_VOICE):
    audio = client.text_to_speech.convert(
        voice_id=get_voice_id(voice),
        model_id="eleven_flash_v2_5",
        text=text,
        output_format="mp3_44100_128"
    )
    return b"".join(audio)
