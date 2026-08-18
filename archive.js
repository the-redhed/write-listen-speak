const SUPABASE_URL =
  "https://hgqujhmyamqfunkyokww.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_3QNt1LfRmiSrVaBUyxqfhw_ksSgSi-8";


async function loadArchive() {

  const archiveArea =
    document.getElementById("archive-area");

  try {

    const promptResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/prompts?select=id,emotion,question,status&order=created_at.desc`,
      {
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!promptResponse.ok) {
      throw new Error("Could not load prompts");
    }

    const prompts =
      await promptResponse.json();

    const archivedPrompts =
      prompts.filter(prompt =>
        prompt.status === "archived" ||
        prompt.status === "active"
      );

    if (archivedPrompts.length === 0) {

      archiveArea.innerHTML = `
        <p class="message">
          The archive is still waiting for its first voices.
        </p>
      `;

      return;
    }

    archiveArea.innerHTML = "";


    for (const prompt of archivedPrompts) {

      const answersResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/answers?prompt_id=eq.${prompt.id}&status=eq.approved&select=id`,
        {
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (!answersResponse.ok) {
        continue;
      }

      const answers =
        await answersResponse.json();

      const answerIds =
        answers.map(answer => answer.id);

      if (answerIds.length === 0) {
        continue;
      }

      const voiceResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/voice_responses?answer_id=in.(${answerIds.join(",")})&status=eq.approved&select=id,audio_path&order=created_at.asc`,
        {
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (!voiceResponse.ok) {
        continue;
      }

      const voices =
        await voiceResponse.json();

      if (voices.length === 0) {
        continue;
      }

      const section =
        document.createElement("section");

      section.innerHTML = `
        <div class="emotion">
          ${escapeHtml(prompt.emotion)}
        </div>

        <p class="prompt">
          ${escapeHtml(prompt.question)}
        </p>

        <div class="archive-voices"></div>
      `;

      const voiceContainer =
        section.querySelector(".archive-voices");


      for (const voice of voices) {

        const signedUrl =
          await createSignedAudioUrl(
            voice.audio_path
          );

        if (!signedUrl) {
          continue;
        }

        const block =
          document.createElement("div");

        block.className =
          "answer-card";

        block.innerHTML = `
          <audio controls preload="none">
            <source
              src="${signedUrl}"
            >
            Your browser doesn't support audio playback.
          </audio>
        `;

        voiceContainer.appendChild(block);
      }

      if (voiceContainer.children.length > 0) {
        archiveArea.appendChild(section);
      }
    }


    if (!archiveArea.innerHTML.trim()) {

      archiveArea.innerHTML = `
        <p class="message">
          The archive is still waiting for its first voices.
        </p>
      `;
    }

  }

  catch (error) {

    console.error(error);

    archiveArea.innerHTML = `
      <p class="message">
        Something went wrong loading the archive.
      </p>
    `;
  }
}


async function createSignedAudioUrl(audioPath) {

  try {

    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/voice-responses/${encodeURI(audioPath)}`,
      {
        method: "POST",

        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          expiresIn: 3600
        })
      }
    );

    if (!response.ok) {

      console.error(
        "Could not create signed URL:",
        await response.text()
      );

      return null;
    }

    const data =
      await response.json();

    const signedPath =
      data.signedURL || data.signedUrl;

    if (!signedPath) {
      return null;
    }

    if (signedPath.startsWith("http")) {
      return signedPath;
    }

    return `${SUPABASE_URL}/storage/v1${signedPath}`;

  }

  catch (error) {

    console.error(error);

    return null;
  }
}


function escapeHtml(text) {

  const div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}


loadArchive();
