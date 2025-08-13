const express = require("express");
const bodyParser = require("body-parser");
const { twiml: { VoiceResponse } } = require("twilio");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Health check for browsers
app.get("/", (req, res) => res.status(200).send("OK"));

// --- Twilio voice webhook (defensive + logging) ---
function respondTwiML(req, res) {
  console.log(`[VOICE] ${req.method} ${req.path} hit`);
  const vr = new VoiceResponse();
  const msg =
    process.env.GREETING_MESSAGE ||
    "Hello, you’ve reached Blindz Now in Sylvan Lake. This is your AI receptionist Rachel. This is a test call to confirm the correct voice, greeting, and call recording are working. Please hang up after the beep.";
  vr.say({ voice: "alice" }, msg);
  vr.record({ playBeep: true, maxLength: 30 });
  res.type("text/xml").send(vr.toString());
}

app.post("/voice", respondTwiML); // preferred (what Twilio should call)
app.get("/voice", respondTwiML);  // handy for a quick browser check
app.post("/", respondTwiML);      // catches wrong root POSTs

// Basic error guard so we don't 500 on unexpected input
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(200).type("text/xml").send(new VoiceResponse().say("Sorry, please try again.").toString());
});

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`AI receptionist backend listening on ${port}`));
