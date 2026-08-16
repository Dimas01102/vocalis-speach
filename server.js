require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const ELEVENLABS_API_KEY = (process.env.ELEVENLABS_API_KEY || "").trim();
const MAX_TEXT_LENGTH = parseInt(process.env.MAX_TEXT_LENGTH || "2000", 10);
const ELEVEN_API_BASE = "https://api.elevenlabs.io/v1";

app.set("trust proxy", 1);

app.use(express.json({ limit: "100kb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "display-capture=(self)");
  next();
});

app.use(express.static(path.join(__dirname, "public")));

const hitLog = new Map();
function rateLimit({ windowMs, max, message }) {
  return (req, res, next) => {
    const ip = req.ip || "unknown";
    const now = Date.now();
    const windowStart = now - windowMs;
    const recent = (hitLog.get(ip) || []).filter((t) => t > windowStart);

    if (recent.length >= max) {
      return res
        .status(429)
        .json({
          error:
            message || "Terlalu banyak permintaan. Coba lagi sebentar lagi.",
        });
    }

    recent.push(now);
    hitLog.set(ip, recent);
    next();
  };
}

setInterval(
  () => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const [ip, timestamps] of hitLog.entries()) {
      const kept = timestamps.filter((t) => t > cutoff);
      if (kept.length) hitLog.set(ip, kept);
      else hitLog.delete(ip);
    }
  },
  60 * 60 * 1000,
).unref();

app.get("/api/status", (req, res) => {
  res.json({
    elevenlabsConfigured: !!ELEVENLABS_API_KEY,
  });
});

app.get(
  "/api/voices",
  rateLimit({ windowMs: 60_000, max: 30 }),
  async (req, res) => {
    if (!ELEVENLABS_API_KEY) {
      return res
        .status(503)
        .json({ error: "Suara AI belum dikonfigurasi di server ini." });
    }

    try {
      const upstream = await fetch(`${ELEVEN_API_BASE}/voices`, {
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      });

      if (!upstream.ok) {
        console.error(
          "[ElevenLabs] /voices failed:",
          upstream.status,
          await safeText(upstream),
        );
        return res
          .status(502)
          .json({ error: "Gagal mengambil daftar suara dari ElevenLabs." });
      }

      const data = await upstream.json();
      res.json(data);
    } catch (err) {
      console.error("[ElevenLabs] /voices exception:", err);
      res.status(502).json({ error: "Gagal terhubung ke layanan suara AI." });
    }
  },
);

app.post(
  "/api/tts",
  rateLimit({
    windowMs: 60_000,
    max: 8,
    message:
      "Terlalu banyak permintaan suara AI. Tunggu sebentar lalu coba lagi.",
  }),
  async (req, res) => {
    if (!ELEVENLABS_API_KEY) {
      return res
        .status(503)
        .json({ error: "Suara AI belum dikonfigurasi di server ini." });
    }

    const { text, voiceId, stability, similarity } = req.body || {};

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Teks tidak boleh kosong." });
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return res
        .status(400)
        .json({
          error: `Teks terlalu panjang (maksimal ${MAX_TEXT_LENGTH} karakter per permintaan).`,
        });
    }

    if (typeof voiceId !== "string" || !/^[a-zA-Z0-9]{1,64}$/.test(voiceId)) {
      return res.status(400).json({ error: "Voice ID tidak valid." });
    }

    try {
      const upstream = await fetch(
        `${ELEVEN_API_BASE}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": ELEVENLABS_API_KEY,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: clamp01(stability, 0.5),
              similarity_boost: clamp01(similarity, 0.75),
            },
          }),
        },
      );

      if (!upstream.ok) {
        console.error(
          "[ElevenLabs] /tts failed:",
          upstream.status,
          await safeText(upstream),
        );
        if (upstream.status === 429) {
          return res
            .status(429)
            .json({
              error:
                "Kuota suara AI bulan ini habis. Coba lagi bulan depan, atau pakai suara Browser.",
            });
        }

        return res
          .status(502)
          .json({ error: "Gagal membuat suara. Coba lagi." });
      }

      const arrayBuffer = await upstream.arrayBuffer();
      res.setHeader("Content-Type", "audio/mpeg");
      res.send(Buffer.from(arrayBuffer));
    } catch (err) {
      console.error("[ElevenLabs] /tts exception:", err);
      res.status(502).json({ error: "Gagal terhubung ke layanan suara AI." });
    }
  },
);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found." });
});

function clamp01(val, fallback) {
  const n = typeof val === "number" ? val : parseFloat(val);
  if (Number.isNaN(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

async function safeText(res) {
  try {
    return await res.text();
  } catch (e) {
    return "";
  }
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Vocalis server running at http://localhost:${PORT}`);
    if (!ELEVENLABS_API_KEY) {
      console.log(
        "  -> ELEVENLABS_API_KEY is not set in .env: AI voices are disabled, Browser voices still work fine.",
      );
    }
  });
}

module.exports = app;
