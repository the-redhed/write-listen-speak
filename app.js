const SUPABASE_URL =
  "https://hgqujhmyamqfunkyokww.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_3QNt1LfRmiSrVaBUyxqfhw_ksSgSi-8";


let activePrompt = null;
let selectedAnswer = null;

let mediaRecorder = null;
let mediaStream = null;
let audioChunks = [];
let audioBlob = null;
let audioURL = null;

let recordingSeconds = 0;
let timerInterval = null;

const MAX_RECORDING_SECONDS = 90;


async function loadPrompt() {

  const promptArea =
    document.getElementById("prompt-area");

  try {

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/prompts?status=eq.active&select=id,emotion,question&limit=1`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error("Could not load prompt");
    }

    const prompts = await response.json();

    if (prompts.length === 0) {

      promptArea.innerHTML = `
        <p class="message">
          There isn't an active question right now.
        </p>
      `;

      return;
    }

    activePrompt = prompts[0];

    promptArea.innerHTML = `
      <div class="emotion">
        ${escapeHtml(activePrompt.emotion)}
      </div>

      <p class="prompt">
        ${escapeHtml(activePrompt.question)}
      </p>

      <button id="begin-button">
        Begin
      </button>
    `;

    document
      .getElementById("begin-button")
      .addEventListener("click", showWriteScreen);

  }

  catch (error) {

    console.error(error);

    promptArea.innerHTML = `
      <p class="message">
        Something went wrong loading the question.
      </p>
    `;
  }
}


function showWriteScreen() {

  hideAllScreens();

  document
    .getElementById("write-screen")
    .classList.remove("hidden");

  document.getElementById("write-emotion").textContent =
    activePrompt.emotion;

  document.getElementById("write-question").textContent =
    activePrompt.question;
}


function showHomeScreen() {

  hideAllScreens();

  document
    .getElementById("home-screen")
    .classList.remove("hidden");
}


async function submitAnswer() {

  const box =
    document.getElementById("answer-box");

  const button =
    document.getElementById("submit-button");

  const message =
    document.getElementById("submit-message");

  const body = box.value.trim();


  if (!body) {

    message.textContent =
      "Write something before submitting.";

    return;
  }


  button.disabled = true;

  message.textContent =
    "Sending...";


  try {

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/answers`,
      {
        method: "POST",

        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },

        body: JSON.stringify({
          prompt_id: activePrompt.id,
          body: body,
          status: "pending"
        })
      }
    );


    if (!response.ok) {
      throw new Error("Could not submit answer");
    }


    box.value = "";

    message.textContent =
      "Thank you. Finding someone for you to hear...";


    await loadStrangerAnswer();

  }

  catch (error) {

    console.error(error);

    message.textContent =
      "Something went wrong. Please try again.";

    button.disabled = false;
  }
}


async function loadStrangerAnswer() {

  try {

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/answers?prompt_id=eq.${activePrompt.id}&status=eq.approved&select=id,body`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );


    if (!response.ok) {
      throw new Error("Could not load an answer");
    }


    const answers = await response.json();


    if (answers.length === 0) {

      document.getElementById("submit-message").textContent =
        "Your answer was received. There isn't another answer ready to hear yet.";

      document.getElementById("submit-button").disabled = false;

      return;
    }


    const randomIndex =
      Math.floor(Math.random() * answers.length);

    selectedAnswer =
      answers[randomIndex];


    showListenScreen();

  }

  catch (error) {

    console.error(error);

    document.getElementById("submit-message").textContent =
      "Your answer was received, but we couldn't find another answer right now.";

    document.getElementById("submit-button").disabled = false;
  }
}


function showListenScreen() {

  hideAllScreens();

  document
    .getElementById("listen-screen")
    .classList.remove("hidden");


  document.getElementById("listen-emotion").textContent =
    activePrompt.emotion;

  document.getElementById("listen-question").textContent =
    activePrompt.question;

  document.getElementById("stranger-answer").textContent =
    selectedAnswer.body;
}


function showVoiceScreen() {

  hideAllScreens();

  document
    .getElementById("voice-screen")
    .classList.remove("hidden");


  document.getElementById("voice-emotion").textContent =
    activePrompt.emotion;

  document.getElementById("voice-question").textContent =
    activePrompt.question;

  document.getElementById("voice-answer").textContent =
    selectedAnswer.body;
}


async function startRecording() {

  const message =
    document.getElementById("voice-message");

  message.textContent = "";


  if (!navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia) {

    message.textContent =
      "Your browser doesn't support microphone recording.";

    return;
  }


  try {

    mediaStream =
      await navigator.mediaDevices.getUserMedia({
        audio: true
      });


    let options = {};

if (
  MediaRecorder.isTypeSupported(
    "audio/mp4"
  )
) {
  options.mimeType =
    "audio/mp4";
}
else if (
  MediaRecorder.isTypeSupported(
    "audio/webm;codecs=opus"
  )
) {
  options.mimeType =
    "audio/webm;codecs=opus";
}

mediaRecorder =
  new MediaRecorder(
    mediaStream,
    options
  );


    audioChunks = [];
    audioBlob = null;


    mediaRecorder.addEventListener(
      "dataavailable",
      event => {

        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }

      }
    );


    mediaRecorder.addEventListener(
      "stop",
      finishRecording
    );


    mediaRecorder.start();


    recordingSeconds = 0;

    updateTimer();


    document
      .getElementById("start-recording")
      .classList.add("hidden");

    document
      .getElementById("stop-recording")
      .classList.remove("hidden");

    document
      .getElementById("review-recording")
      .classList.add("hidden");


    timerInterval =
      setInterval(() => {

        recordingSeconds++;

        updateTimer();


        if (
          recordingSeconds >=
          MAX_RECORDING_SECONDS
        ) {

          stopRecording();

        }

      }, 1000);

  }

  catch (error) {

    console.error(error);

    message.textContent =
      "Microphone access wasn't allowed. Please allow microphone access and try again.";
  }
}


function stopRecording() {

  if (
    mediaRecorder &&
    mediaRecorder.state !== "inactive"
  ) {

    mediaRecorder.stop();

  }


  clearInterval(timerInterval);


  document
    .getElementById("stop-recording")
    .classList.add("hidden");
}


function finishRecording() {

  const mimeType =
    mediaRecorder.mimeType || "audio/webm";


  audioBlob =
    new Blob(
      audioChunks,
      { type: mimeType }
    );


  if (audioURL) {
    URL.revokeObjectURL(audioURL);
  }


  audioURL =
    URL.createObjectURL(audioBlob);


  const preview =
    document.getElementById("audio-preview");


  preview.src = audioURL;


  document
    .getElementById("review-recording")
    .classList.remove("hidden");


  document
    .getElementById("start-recording")
    .classList.add("hidden");


  stopMicrophone();
}


function recordAgain() {

  if (audioURL) {
    URL.revokeObjectURL(audioURL);
  }

  audioURL = null;
  audioBlob = null;
  audioChunks = [];

  recordingSeconds = 0;

  updateTimer();


  document
    .getElementById("audio-preview")
    .removeAttribute("src");


  document
    .getElementById("review-recording")
    .classList.add("hidden");


  document
    .getElementById("start-recording")
    .classList.remove("hidden");


  document.getElementById("voice-message").textContent =
    "";
}


function updateTimer() {

  const minutes =
    Math.floor(recordingSeconds / 60);

  const seconds =
    recordingSeconds % 60;


  document.getElementById("timer").textContent =
    `${minutes}:${seconds.toString().padStart(2, "0")}`;
}


function stopMicrophone() {

  if (mediaStream) {

    mediaStream
      .getTracks()
      .forEach(track => track.stop());

    mediaStream = null;
  }
}


async function sendRecording() {

  const button =
    document.getElementById("send-recording");

  const message =
    document.getElementById("voice-message");


  if (!audioBlob) {

    message.textContent =
      "Record your voice before sending.";

    return;
  }


  button.disabled = true;

  message.textContent =
    "Sending your voice...";


  try {

   let extension = "webm";

if (
  audioBlob.type.includes("mp4")
) {
  extension = "mp4";
}
else if (
  audioBlob.type.includes("ogg")
) {
  extension = "ogg";
}
else if (
  audioBlob.type.includes("wav")
) {
  extension = "wav";
}


    const filename =
      `${crypto.randomUUID()}.${extension}`;


    const storagePath =
      `prompt-${activePrompt.id}/answer-${selectedAnswer.id}/${filename}`;


    const uploadResponse =
      await fetch(
        `${SUPABASE_URL}/storage/v1/object/voice-responses/${storagePath}`,
        {
          method: "POST",

          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type":
              audioBlob.type || "audio/webm",
            "x-upsert": "false"
          },

          body: audioBlob
        }
      );


    if (!uploadResponse.ok) {

      const uploadError =
        await uploadResponse.text();

      console.error(uploadError);

      throw new Error(
        "Could not upload audio"
      );
    }


    const databaseResponse =
      await fetch(
        `${SUPABASE_URL}/rest/v1/voice_responses`,
        {
          method: "POST",

          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },

          body: JSON.stringify({
            answer_id: selectedAnswer.id,
            audio_path: storagePath,
            status: "pending"
          })
        }
      );


    if (!databaseResponse.ok) {

      const databaseError =
        await databaseResponse.text();

      console.error(databaseError);

      throw new Error(
        "Could not save voice response"
      );
    }


    showThankYouScreen();

  }

  catch (error) {

    console.error(error);

    message.textContent =
      "Something went wrong sending your recording. Please try again.";

    button.disabled = false;
  }
}


function showThankYouScreen() {

  hideAllScreens();

  document
    .getElementById("thank-you-screen")
    .classList.remove("hidden");
}


function hideAllScreens() {

  [
    "home-screen",
    "write-screen",
    "listen-screen",
    "voice-screen",
    "thank-you-screen"
  ]
  .forEach(id => {

    document
      .getElementById(id)
      .classList.add("hidden");

  });
}


function escapeHtml(text) {

  const div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}


document
  .getElementById("back-button")
  .addEventListener(
    "click",
    showHomeScreen
  );


document
  .getElementById("submit-button")
  .addEventListener(
    "click",
    submitAnswer
  );


document
  .getElementById("voice-button")
  .addEventListener(
    "click",
    showVoiceScreen
  );


document
  .getElementById("start-recording")
  .addEventListener(
    "click",
    startRecording
  );


document
  .getElementById("stop-recording")
  .addEventListener(
    "click",
    stopRecording
  );


document
  .getElementById("record-again")
  .addEventListener(
    "click",
    recordAgain
  );


document
  .getElementById("send-recording")
  .addEventListener(
    "click",
    sendRecording
  );


loadPrompt();
