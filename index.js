import express from 'express';
import axios from 'axios';
import { Configuration, OpenAIApi } from 'openai';

const app = express();
app.use(express.urlencoded({ extended: false }));

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

app.post('/voice', async (req, res) => {
  try {
    const fromNumber = req.body.From;
    const incomingText = req.body.SpeechResult || 'Hello'; // fallback if no speech result

    // Call OpenAI to generate response text
    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful receptionist assistant.' },
        { role: 'user', content: incomingText },
      ],
    });
    const replyText = aiResponse.data.choices[0].message.content;

    // Call ElevenLabs to generate speech audio
    const elevenLabsResponse = await axios.post('https://api.elevenlabs.io/v1/text-to-speech/VOICE_ID', {
      text: replyText,
      voice_settings: { stability: 0.7, similarity_boost: 0.75 },
    }, {
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      responseType: 'arraybuffer',
    });

    // Save audio file somewhere or get URL from ElevenLabs if supported

    // Respond to Twilio with TwiML to play audio (placeholder URL for now)
    res.type('text/xml');
    res.send(`
      <Response>
        <Play>https://example.com/generated_audio.mp3</Play>
      </Response>
    `);
  } catch (error) {
    console.error('Error in /voice:', error);
    res.type('text/xml');
    res.send(`<Response><Say>Sorry, there was an error handling your call.</Say></Response>`);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
