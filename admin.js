const SUPABASE_URL =
  "https://hgqujhmyamqfunkyokww.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_3QNt1LfRmiSrVaBUyxqfhw_ksSgSi-8";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


async function checkSession() {

  const {
    data: { session }
  } =
    await supabaseClient.auth.getSession();

  if (session) {
    showAdmin();
    await loadModeration();
  }
}


async function signIn() {

  const email =
    document
      .getElementById("admin-email")
      .value
      .trim();

  const password =
    document
      .getElementById("admin-password")
      .value;

  const message =
    document.getElementById("login-message");

  message.textContent =
    "Signing in...";


  const {
    data,
    error
  } =
    await supabaseClient.auth.signInWithPassword({
      email,
      password
    });


  if (error) {

    console.error(error);

    message.textContent =
      "Sign in failed. Check your email and password.";

    return;
  }


  message.textContent = "";

  showAdmin();

  await loadModeration();
}


async function signOut() {

  await supabaseClient.auth.signOut();

  document
    .getElementById("admin-screen")
    .classList.add("hidden");

  document
    .getElementById("login-screen")
    .classList.remove("hidden");
}


function showAdmin() {

  document
    .getElementById("login-screen")
    .classList.add("hidden");

  document
    .getElementById("admin-screen")
    .classList.remove("hidden");
}


async function loadModeration() {

  await Promise.all([
    loadPendingAnswers(),
    loadPendingVoices()
  ]);
}


async function loadPendingAnswers() {

  const area =
    document.getElementById("answers-area");

  area.innerHTML =
    "<p>Loading...</p>";


  const {
    data: answers,
    error
  } =
    await supabaseClient
      .from("answers")
      .select("id, body, status, created_at")
      .eq("status", "pending")
      .order("created_at", {
        ascending: true
      });


  if (error) {

    console.error(error);

    area.innerHTML =
      "<p class='message'>Could not load written answers.</p>";

    return;
  }


  if (!answers || answers.length === 0) {

    area.innerHTML =
      "<p class='message'>No written answers waiting for review.</p>";

    return;
  }


  area.innerHTML = "";


  answers.forEach(answer => {

    const card =
      document.createElement("div");

    card.className =
      "answer-card";


    const body =
      document.createElement("p");

    body.className =
      "stranger-answer";

    body.textContent =
      answer.body;


    const controls =
      document.createElement("div");


    const approve =
      document.createElement("button");

    approve.textContent =
      "Approve";

    approve.addEventListener(
      "click",
      () =>
        updateAnswerStatus(
          answer.id,
          "approved"
        )
    );


    const reject =
      document.createElement("button");

    reject.textContent =
      "Reject";

    reject.className =
      "secondary";

    reject.addEventListener(
      "click",
      () =>
        updateAnswerStatus(
          answer.id,
          "rejected"
        )
    );


    controls.appendChild(approve);
    controls.appendChild(reject);

    card.appendChild(body);
    card.appendChild(controls);

    area.appendChild(card);
  });
}


async function updateAnswerStatus(
  id,
  status
) {

  const {
    error
  } =
    await supabaseClient
      .from("answers")
      .update({
        status
      })
      .eq("id", id);


  if (error) {

    console.error(error);

    alert(
      "Could not update the written answer."
    );

    return;
  }


  await loadPendingAnswers();
}


async function loadPendingVoices() {

  const area =
    document.getElementById("voices-area");

  area.innerHTML =
    "<p>Loading...</p>";


  const {
    data: voices,
    error
  } =
    await supabaseClient
      .from("voice_responses")
      .select(
        "id, answer_id, audio_path, status, created_at"
      )
      .eq("status", "pending")
      .order("created_at", {
        ascending: true
      });


  if (error) {

    console.error(error);

    area.innerHTML =
      "<p class='message'>Could not load voice responses.</p>";

    return;
  }


  if (!voices || voices.length === 0) {

    area.innerHTML =
      "<p class='message'>No voice responses waiting for review.</p>";

    return;
  }


  area.innerHTML = "";


  for (const voice of voices) {

    const card =
      document.createElement("div");

    card.className =
      "answer-card";


    const {
      data: signedData,
      error: signedError
    } =
      await supabaseClient
        .storage
        .from("voice-responses")
        .createSignedUrl(
          voice.audio_path,
          3600
        );


    if (signedError) {

      console.error(signedError);

      continue;
    }


    const audio =
      document.createElement("audio");

    audio.controls = true;
    audio.preload = "metadata";
    audio.src =
      signedData.signedUrl;


    const controls =
      document.createElement("div");


    const approve =
      document.createElement("button");

    approve.textContent =
      "Approve";

    approve.addEventListener(
      "click",
      () =>
        updateVoiceStatus(
          voice.id,
          "approved"
        )
    );


    const reject =
      document.createElement("button");

    reject.textContent =
      "Reject";

    reject.className =
      "secondary";

    reject.addEventListener(
      "click",
      () =>
        updateVoiceStatus(
          voice.id,
          "rejected"
        )
    );


    const download =
      document.createElement("a");

    download.href =
      signedData.signedUrl;

    download.download =
      voice.audio_path
        .split("/")
        .pop();

    download.textContent =
      "Download";

    download.style.display =
      "inline-block";

    download.style.margin =
      "5px";

    download.style.padding =
      "16px 30px";

    download.style.borderRadius =
      "30px";

    download.style.border =
      "1px solid rgba(36, 33, 31, 0.3)";

    download.style.textDecoration =
      "none";

    download.style.color =
      "#24211f";


    controls.appendChild(approve);
    controls.appendChild(reject);
    controls.appendChild(download);

    card.appendChild(audio);
    card.appendChild(controls);

    area.appendChild(card);
  }
}


async function updateVoiceStatus(
  id,
  status
) {

  const {
    error
  } =
    await supabaseClient
      .from("voice_responses")
      .update({
        status
      })
      .eq("id", id);


  if (error) {

    console.error(error);

    alert(
      "Could not update the voice response."
    );

    return;
  }


  await loadPendingVoices();
}


document
  .getElementById("login-button")
  .addEventListener(
    "click",
    signIn
  );


document
  .getElementById("logout-button")
  .addEventListener(
    "click",
    signOut
  );


checkSession();
