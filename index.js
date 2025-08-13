const express = require("express");
const bodyParser = require("body-parser");
const { twiml: { VoiceResponse } } = require("twilio");

const app = express();
app.use(bodyParser.urlencoded({ extended: false })); // Twilio posts form-encoded

// Health check for browsers
app.get("/", (req, res) => res.status(200).send("OK"));

// ===== Twilio voice webhook (defensive: supports multiple paths/methods) =====
function respondTwiML(req, res) {
  const vr = new VoiceResponse();
  const msg =
    process.env.GREETING_MESSAGE ||
    "Hello, you’ve reached Blindz Now in Sylvan Lake. This is your AI receptionist Rachel. This is a test call to confirm the correct voice, greeting, and call recording are working. Please hang up after the beep.";
  vr.say({ voice: "alice" }, msg);
  vr.record({ playBeep: true, maxLength: 30 });
  res.type("text/xml").send(vr.toString());
}

app.post("/voice", respondTwiML); // preferred by Twilio
app.get("/voice", respondTwiML);  // handy for browser test
app.post("/", respondTwiML);      // works even if Twilio still points to root
// ===========================================================================

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`AI receptionist backend listening on ${port}`));

