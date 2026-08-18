const SUPABASE_URL =
  "https://hgqujhmyamqfunkyokww.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_3QNt1LfRmiSrVaBUyxqfhw_ksSgSi-8";


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );


async function loadArchive() {

  const archiveArea =
    document.getElementById("archive-area");

  archiveArea.innerHTML =
    "<p>Loading the archive...</p>";


  try {

    const {
      data: prompts,
      error: promptsError
    } =
      await supabaseClient
        .from("prompts")
        .select("id, emotion, question, status, created_at")
        .in("status", ["active", "archived"])
        .order("created_at", {
          ascending: false
        });


    if (promptsError) {
      throw promptsError;
    }


    archiveArea.innerHTML = "";

    let voicesFound = false;


    for (const prompt of prompts) {

      const {
        data: answers,
        error: answersError
      } =
        await supabaseClient
          .from("answers")
          .select("id")
          .eq("prompt_id", prompt.id)
          .eq("status", "approved");


      if (answersError) {
        console.error(answersError);
        continue;
      }


      if (!answers || answers.length === 0) {
        continue;
      }


      const answerIds =
        answers.map(answer => answer.id);


      const {
        data: voices,
        error: voicesError
      } =
        await supabaseClient
          .from("voice_responses")
          .select("id, audio_path")
          .in("answer_id", answerIds)
          .eq("status", "approved")
          .order("created_at", {
            ascending: true
          });


      if (voicesError) {
        console.error(voicesError);
        continue;
      }


      if (!voices || voices.length === 0) {
        continue;
      }


      const promptSection =
        document.createElement("section");


      promptSection.innerHTML = `
        <div class="emotion">
          ${escapeHtml(prompt.emotion)}
        </div>

        <p class="prompt">
          ${escapeHtml(prompt.question)}
        </p>

        <div class="archive-voices"></div>
      `;


      const voiceContainer =
        promptSection.querySelector(
          ".archive-voices"
        );


      for (const voice of voices) {

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

          console.error(
            "Signed URL error:",
            signedError
          );

          continue;
        }


        if (!signedData?.signedUrl) {
          continue;
        }


        voicesFound = true;


        const block =
          document.createElement("div");

        block.className =
          "answer-card";


        const audio =
          document.createElement("audio");

        audio.controls = true;
        audio.preload = "metadata";
        audio.src = signedData.signedUrl;


        block.appendChild(audio);

        voiceContainer.appendChild(block);
      }


      if (
        voiceContainer.children.length > 0
      ) {

        archiveArea.appendChild(
          promptSection
        );
      }
    }


    if (!voicesFound) {

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
