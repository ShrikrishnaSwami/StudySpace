import json
import os

try:
    from google import genai
    from google.genai import types
except ModuleNotFoundError:
    genai = None
    types = None


def get_gemini_api_key() -> str:
    """Return the API key from the environment or raise a clear setup error."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is missing. Set it in your environment before running the tutor."
        )
    return api_key


# 1. Initialize the client only if the SDK and key are available
client = None
if genai is not None:
    try:
        client = genai.Client(api_key=get_gemini_api_key())
    except RuntimeError:
        client = None


# 2. Define the tool function for finding educational resources
def search_educational_resources(topic: str, resource_type: str = "any") -> str:
    """Searches for study materials, educational games, videos, or articles based on subject.

    Args:
        topic: The academic topic or subject (e.g., 'Calculus', 'Photosynthesis').
        resource_type: The format needed ('video', 'game', 'interactive_quiz', 'article', 'any').
    """
    mock_database = {
        "photosynthesis": [
            {
                "title": "Photosynthesis Interactive Lab",
                "type": "game",
                "url": "https://biomanbio.com/Games/photosynthesingame.html",
            },
            {
                "title": "Khan Academy: Light Reactions",
                "type": "video",
                "url": "https://www.khanacademy.org/science/biology",
            },
        ],
        "calculus": [
            {
                "title": "Derivative Visualization Tool",
                "type": "game",
                "url": "https://www.desmos.com/calculator",
            },
            {
                "title": "3Blue1Brown Essence of Calculus",
                "type": "video",
                "url": "https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5We",
            },
        ],
    }

    topic_lower = topic.lower()
    for key, resources in mock_database.items():
        if key in topic_lower:
            filtered = [
                r for r in resources if r["type"] == resource_type or resource_type == "any"
            ]
            return json.dumps(filtered if filtered else resources)

    return json.dumps(
        [
            {
                "title": f"Explore {topic} on Quizlet",
                "type": "quiz",
                "url": f"https://quizlet.com/search?query={topic}",
            },
            {
                "title": f"YouTube Lessons on {topic}",
                "type": "video",
                "url": f"https://www.youtube.com/results?search_query={topic}+tutorial",
            },
        ]
    )


# Map local executable functions
available_tools = {
    "search_educational_resources": search_educational_resources,
}

# 3. Configure System Persona and Function Tools
system_instruction = """
You are 'Astra', an empathetic and highly structured AI Study Tutor.
- Help students learn complex concepts step-by-step using the Socratic method.
- Help them learn not just memorize but truly understand concepts. Break ideas down into concise, learnable explanations.
- When a user asks for extra practice, learning games, videos, or external resources, execute the `search_educational_resources` tool.
- Always remain concise, structured, and friendly.
"""

if types is not None:
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        tools=[search_educational_resources],
        temperature=0.7,
    )
else:
    config = None


# 4. Handle conversation with automated function calling
def talk_to_tutor(user_input: str, history=None):
    """Return the tutor response for a prompt, or a helpful setup message if prerequisites are missing."""
    if genai is None:
        return "The Google GenAI package is not installed. Run: pip install google-genai"

    if client is None:
        return (
            "The tutor is not ready yet. Set GEMINI_API_KEY in your environment and run the app again."
        )

    try:
        chat = client.chats.create(model="gemini-2.5-flash", config=config, history=history)
        response = chat.send_message(user_input)
        return response.text
    except Exception as exc:
        return (
            "The tutor is temporarily unavailable. Check your GEMINI_API_KEY and internet connection. "
            f"Details: {exc}"
        )


def main():
    prompt = "I'm struggling to visualize Photosynthesis. Do you have any interactive games or videos for this?"
    print("User:", prompt)
    print("Astra:", talk_to_tutor(prompt))


# --- Example Run ---
if __name__ == "__main__":
    main()
