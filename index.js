import express from 'express';
import axios from 'axios';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

// ---------- Config ----------
const PORT = process.env.PORT || 3000;
const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVEN_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // default popular voice
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.use(express.urlencoded({ extended: true }));

// In-memory audio store (ephemeral). For production, use S3 or similar.
const audioStore = new Map();

app.get('/', (_req, res) => res.send('OK'));

// Twilio webhook
app.post('/voice', async (req, res) => {
  try {
    const userText = (req.body.SpeechResult || req.body.Body || '').trim() || 'Caller says hello.';

    // Compose a short, friendly receptionist reply for Blindz Now
    const system = "You are a friendly phone receptionist for Blindz Now in Sylvan Lake. Store hours: Tue–Fri 10am–5pm, Sat 11am–4pm, closed Sun & Mon. Address: Bay 1-24, Cuendet Industrial Way, Sylvan Lake, Alberta. We manufacture our blinds locally. If unsure, keep replies under 2 sentences.";

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userText }
      ],
      temperature: 0.4,
    });

    const replyText = completion.choices?.[0]?.message?.content?.trim() || "Thanks for calling Blindz Now. How can I help you today?";

    // Try ElevenLabs TTS
    let audioId = null;
    if (ELEVEN_API_KEY) {
      try {
        const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}/stream`;
        const ttsResp = await axios.post(
          ttsUrl,
          { text: replyText, voice_settings: { stability: 0.6, similarity_boost: 0.8 } },
          { headers: { 'xi-api-key': ELEVEN_API_KEY, 'Content-Type': 'application/json' }, responseType: 'arraybuffer', timeout: 20000 }
        );
        const buf = Buffer.from(ttsResp.data);
        audioId = uuidv4();
        audioStore.set(audioId, buf);
      } catch (e) {
        console.error('ElevenLabs TTS failed, falling back to <Say>:', e.message);
      }
    }

    res.type('text/xml');
    if (audioId) {
      const audioUrl = `${req.protocol}://${req.get('host')}/audio/${audioId}`;
      res.send(`<Response><Play>${audioUrl}</Play></Response>`);
    } else {
      // Fallback to Twilio <Say> (Polly voice) if TTS fails
      const safe = replyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      res.send(`<Response><Say voice="Polly.Joanna">${safe}</Say></Response>`);
    }
  } catch (err) {
    console.error('Error in /voice:', err);
    res.type('text/xml').send('<Response><Say>Sorry, there was an error.</Say></Response>');
  }
});

// Serve generated audio to Twilio
app.get('/audio/:id', (req, res) => {
  const buf = audioStore.get(req.params.id);
  if (!buf) {
    res.status(404).send('Not found');
    return;
  }
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  res.send(buf);
});

app.listen(PORT, () => console.log(`AI receptionist backend listening on ${PORT}`));
