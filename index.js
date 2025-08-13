// ===== Twilio voice webhook (defensive: support multiple paths/methods) =====
const { twiml: { VoiceResponse } } = require("twilio");

function respondTwiML(req, res) {
  const vr = new VoiceResponse();
  const msg =
    process.env.GREETING_MESSAGE ||
    "Hello, you’ve reached Blindz Now in Sylvan Lake. This is your AI receptionist Rachel. This is a test call to confirm the correct voice, greeting, and call recording are working. Please hang up after the beep.";
  vr.say({ voice: "alice" }, msg);
  vr.record({ playBeep: true, maxLength: 30 });
  res.type("text/xml").send(vr.toString());
}

app.post("/voice", respondTwiML); // preferred
app.get("/voice", respondTwiML);  // allows quick browser test
app.post("/", respondTwiML);      // if Twilio is still pointed at root
// =========================================================================== 

