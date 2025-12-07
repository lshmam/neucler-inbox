// check_models.js
const apiKey = "AIzaSyAls87CLoT7LhATkn9qIKyrXje3sxCzgic";

async function listModels() {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log("=== AVAILABLE MODELS ===");
        if (data.models) {
            data.models.forEach(model => {
                // Filter for "generateContent" models only (chat models)
                if (model.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`Name: ${model.name.replace("models/", "")}`);
                    console.log(`Description: ${model.description.substring(0, 60)}...`);
                    console.log("-------------------------");
                }
            });
        } else {
            console.log("No models found. Check your API Key or Quota.");
            console.log(data);
        }
    } catch (error) {
        console.error("Error fetching models:", error);
    }
}

listModels();