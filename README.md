# Vocalis

Vocalis is a web-based Text-to-Speech application that converts written text into natural-sounding speech directly from the browser. It provides two voice engines: the browser's native Web Speech API for free and offline-capable synthesis, and ElevenLabs AI for more natural multilingual voice generation.

The application is designed with a clean, responsive interface and focuses on making text-to-speech generation simple while still providing useful controls for voice selection, playback, history, and audio export.

## Features

- Text-to-Speech generation from a simple text editor
- Character and word counter with a configurable text limit
- Browser voice engine using the Web Speech API
- ElevenLabs AI voice engine
- Multilingual AI voice support through `eleven_multilingual_v2`
- Voice selection and voice preview support
- Browser voice controls:
  - Speech speed
  - Pitch
- ElevenLabs voice controls:
  - Stability
  - Similarity
- Audio playback controls:
  - Play / pause
  - Stop
  - Progress tracking
- Audio download:
  - `.webm` for browser-generated speech recording
  - `.mp3` for ElevenLabs-generated speech
- Generation history stored locally in the browser
- Light, dark, and system theme support
- Responsive layout for desktop and smaller screens
- Server-side ElevenLabs API proxy so the API key is not exposed to the browser
- Basic API rate limiting and request validation
- Security-related HTTP response headers

## Tech Stack

### Frontend

- HTML5
- CSS3
- Vanilla JavaScript (ES Modules)
- Web Speech API
- MediaRecorder API
- LocalStorage API

### Backend

- Node.js
- Express.js
- REST API
- dotenv

### External Service

- ElevenLabs Text-to-Speech API
- `eleven_multilingual_v2`

### Development & Deployment

- npm
- Git / GitHub
- Vercel-compatible serverless API entry point

## Architecture

Vocalis uses a provider-based Text-to-Speech architecture.

```text
Browser
  |
  v
Vocalis Frontend
  |
  +----------------------+
  |                      |
  v                      v
Browser Provider     ElevenLabs Provider
  |                      |
  v                      v
Web Speech API       /api/voices
                     /api/tts
                          |
                          v
                  Node.js / Express
                          |
                          v
                  ElevenLabs API
```

The frontend communicates with the ElevenLabs service through the Express backend instead of sending the API key directly to the browser.

## Project Structure

```text
speach/
├── api/
│   └── [...path].js
├── public/
│   ├── css/
│   │   ├── base.css
│   │   ├── components.css
│   │   ├── layout.css
│   │   ├── reset.css
│   │   ├── responsive.css
│   │   └── variables.css
│   ├── js/
│   │   ├── components/
│   │   │   ├── audio-player.js
│   │   │   ├── history-panel.js
│   │   │   ├── modal.js
│   │   │   ├── settings-panel.js
│   │   │   ├── text-editor.js
│   │   │   ├── toast.js
│   │   │   ├── voice-gallery.js
│   │   │   └── voice-selector.js
│   │   ├── core/
│   │   │   ├── error-handler.js
│   │   │   ├── state.js
│   │   │   └── storage.js
│   │   ├── providers/
│   │   │   ├── base-provider.js
│   │   │   ├── browser-provider.js
│   │   │   └── elevenlabs-provider.js
│   │   ├── services/
│   │   │   ├── history-service.js
│   │   │   └── tts-service.js
│   │   └── utils/
│   │       ├── debounce.js
│   │       ├── dom.js
│   │       ├── format.js
│   │       ├── locale.js
│   │       └── validation.js
│   └── index.html
├── api/
│   └── [...path].js
├── server.js
├── package.json
└── .env
```

## Getting Started

### Requirements

- Node.js 18 or newer
- npm
- An ElevenLabs API key if AI voice generation is required

### Installation

Clone the repository and install dependencies:

```bash
git clone <your-repository-url>
cd speach
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
ELEVENLABS_API_KEY=your_elevenlabs_api_key
MAX_TEXT_LENGTH=2000
```

The ElevenLabs API key is only used by the backend and should never be exposed in frontend JavaScript.

### Run Locally

Start the application:

```bash
npm start
```

For development with automatic restart:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Voice Engines

### Browser Engine

The Browser engine uses the native Web Speech API. It does not require an ElevenLabs API key and can use voices provided by the user's browser and operating system.

Supported controls include:

- Voice selection
- Language selection
- Speech speed
- Pitch

Vocalis also provides an experimental recording feature using `getDisplayMedia()` and `MediaRecorder` to capture browser speech as a `.webm` file. This requires the user to share the browser tab audio and works best on supported Chromium-based desktop browsers.

### ElevenLabs AI Engine

The ElevenLabs engine generates speech through the backend proxy.

The frontend sends:

```text
POST /api/tts
```

The server then communicates with ElevenLabs using:

```text
eleven_multilingual_v2
```

The API key remains on the server and is never sent to the client.

## API Endpoints

### Check AI Configuration

```http
GET /api/status
```

Returns whether the ElevenLabs API key is configured.

### Get Voices

```http
GET /api/voices
```

Returns available ElevenLabs voices.

### Generate Speech

```http
POST /api/tts
Content-Type: application/json
```

Example request:

```json
{
  "text": "Hello from Vocalis.",
  "voiceId": "voice_id",
  "stability": 0.5,
  "similarity": 0.75
}
```

The endpoint returns generated audio as `audio/mpeg`.

## Security Considerations

Vocalis includes several server-side protections:

- ElevenLabs API key is stored in environment variables
- API key is never included in frontend code
- Request body size is limited
- Text length is validated
- Voice IDs are validated
- API rate limiting is applied to voice-related endpoints
- Security-related HTTP headers are configured
- ElevenLabs API errors are handled through the backend

For production use, additional protections such as a distributed rate limiter, structured logging, monitoring, and stronger authentication may be added depending on the deployment requirements.

## Data & Privacy

Generation history is stored locally using the browser's `localStorage`. It is not stored in a database by the application.

When the ElevenLabs engine is used, the text submitted for synthesis is sent to the application's backend and then forwarded to ElevenLabs for voice generation.

Browser-based speech generation can run through the browser's native speech engine without using the ElevenLabs service.

## Limitations

- Available browser voices depend on the operating system and browser.
- Browser speech quality varies between devices.
- Browser audio download uses an experimental tab-audio recording workflow.
- ElevenLabs generation requires a valid API key and available API quota.
- The application currently does not use a database for user accounts or cloud-synchronized history.

## License