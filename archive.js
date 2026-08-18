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


      voices.forEach((voice, index) => {

        const block =
          document.createElement("div");

        block.className =
          "answer-card";


        const audioUrl =
          `${SUPABASE_URL}/storage/v1/object/voice-responses/${encodeURI(voice.audio_path)}`;


        block.innerHTML = `
          <div class="answer-label">
            Voice ${index + 1}
          </div>

          <audio controls preload="none">
            <source
              src="${audioUrl}"
              type="audio/webm"
            >
            Your browser doesn't support audio playback.
          </audio>
        `;


        voiceContainer.appendChild(block);

      });


      archiveArea.appendChild(section);

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


function escapeHtml(text) {

  const div =
    document.createElement("div");

  div.textContent = text;

  return div.innerHTML;
}


loadArchive();
