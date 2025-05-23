# Transitioning from OpenAI API to Local Llama 3 (8B) Model

This document outlines the steps required to switch the application's AI backend from relying on the OpenAI API to using a local, self-contained Llama 3 (8B) model for tasks like rule interpretation and document validation.

## I. Infrastructure & Model Setup

1.  **Hardware Assessment & Acquisition (if necessary):**
    *   **Requirement:** Llama 3 8B, even quantized, requires a decent amount of RAM (for the model weights, at least 8-16GB for a quantized version, more for unquantized) and a capable CPU. A GPU (NVIDIA recommended for best performance and tooling like CUDA) would be highly beneficial, if not essential, for acceptable inference speeds, especially for interactive tasks like rule preview.
    *   **Action:** Determine if your current development machine (or a target deployment server) meets these requirements. If not, plan for hardware upgrades or a dedicated machine/VM.

2.  **Choose an Inference Server/Framework:**
    *   You need a way to load the Llama 3 model and expose it as an API endpoint that your Next.js backend can call, similar to how it calls the OpenAI API.
    *   **Popular Options:**
        *   **Ollama:** Very popular for local LLM setup. It simplifies downloading models (like Llama 3) and serves them via a local HTTP API. It handles much of the complexity of model loading and serving.
        *   **LM Studio:** A desktop application that provides a GUI for downloading and running various LLMs, also exposing a local server compatible with OpenAI's API format.
        *   **llama.cpp (server mode):** The core C/C++ implementation. Can be compiled with server capabilities (`./server` command) to expose an HTTP endpoint. More low-level, offers fine-grained control.
        *   **Text Generation WebUI (oobabooga):** A comprehensive web UI for running LLMs, also provides an API.
        *   **Python frameworks (e.g., FastAPI/Flask with Hugging Face Transformers):** If you want more custom control over the serving logic, you could build your own Python-based inference server using libraries like `transformers` from Hugging Face, `bitsandbytes` (for quantization), etc.
    *   **Action:** Research these options and select one that balances ease of use, performance, and compatibility with your needs. For a Next.js app, something that exposes an OpenAI-compatible endpoint (like Ollama or LM Studio can) is often the easiest to integrate.

3.  **Download Llama 3 Model Weights:**
    *   **Source:** Obtain the Llama 3 8B model weights. This could be from Meta directly (if you have access) or, more commonly, from Hugging Face (often in GGUF format for llama.cpp-based servers like Ollama, or PyTorch/Safetensors format for Transformers-based servers).
    *   **Quantization:** Decide if you need a quantized version (e.g., 4-bit, 5-bit, 8-bit). Quantization reduces model size and computational requirements, making it feasible to run on less powerful hardware, but can slightly impact performance/accuracy. GGUF models are typically pre-quantized.
    *   **Action:** Download the chosen model format and quantization level compatible with your selected inference server.

4.  **Install and Configure the Inference Server:**
    *   **Action:** Follow the installation instructions for your chosen server (e.g., install Ollama, set up LM Studio, compile llama.cpp). Configure it to load your downloaded Llama 3 8B model. Ensure it starts correctly and exposes an HTTP endpoint (e.g., `http://localhost:11434` for Ollama by default).

## II. Application Code Changes (Next.js Backend)

5.  **Update API Client Configuration:**
    *   In `src/app/api/validate/route.ts` and `src/app/api/preview-rules/route.ts`:
        *   The current `OpenAI` client initialization will need to be changed or supplemented.
        *   If your local inference server exposes an OpenAI-compatible API (many do, e.g., Ollama via `http://localhost:11434/v1`), you might be able to simply change the `baseURL` for the `OpenAI` client to point to your local server and potentially remove the `apiKey` or use a dummy one if the local server doesn't require it.
        *   If the local server has a different API schema, you'll need to use a different HTTP client (like `fetch` or `axios`) and adapt the request/response handling code.
    *   **Action:** Modify the API client setup. Add a new environment variable (e.g., `LOCAL_LLM_API_ENDPOINT`) in your `.env.local` to specify the URL of your local Llama 3 server.

6.  **Adapt API Call Logic (`performOpenAIValidationForRule`, `getOpenAIInterpretation`):**
    *   **Endpoint:** Change the URL from OpenAI's to your local server's.
    *   **Model Name:** The `model` parameter in the request body will need to be changed from `"gpt-3.5-turbo"` to the specific model name your local Llama 3 server uses (e.g., `"llama3:8b"` for Ollama).
    *   **Request Payload:**
        *   Llama 3 might respond best to slightly different system prompts or user message formatting than GPT-3.5 Turbo. You'll need to experiment with the prompts (especially the system prompt) to get the desired JSON output and validation behavior.
        *   The `response_format: { type: "json_object" }` parameter is an OpenAI-specific feature (and relatively new). Your local Llama 3 setup might not support this directly. You might need to rely on strong prompting to get JSON output and then parse it more robustly, or the server itself might have a way to enforce JSON output.
    *   **Authentication:** Remove OpenAI API key handling if your local server doesn't require authentication (most local setups don't for simplicity).
    *   **Error Handling:** Adjust error handling for differences in API responses or network issues when connecting to the local server.
    *   **Action:** Refactor the `performOpenAIValidationForRule` function in `validate/route.ts` and `getOpenAIInterpretation` in `preview-rules/route.ts` to target your local Llama 3 API. This will involve significant changes to the request construction and possibly response parsing.

7.  **Prompt Engineering for Llama 3:**
    *   **Requirement:** Llama 3 has its own instruction-following capabilities and optimal prompt formats. The prompts currently used for GPT-3.5 Turbo will likely need tuning.
    *   **Key Areas:**
        *   **System Prompt:** This is crucial for defining the AI's role and desired output format (especially if `response_format: { type: "json_object" }` isn't available). You'll need to be very explicit about wanting JSON with `"passed": boolean` and `"details": string`.
        *   **User Prompt:** How you present the document text and the rule.
    *   **Action:** Iteratively test and refine prompts by sending requests directly to your Llama 3 server (e.g., using `curl` or a tool like Postman/Insomnia) until you consistently get the desired output format and accuracy. Then, integrate these refined prompts into your Next.js backend code.

8.  **Resource Management & Asynchronous Handling:**
    *   **Consideration:** Local LLM inference can be slower than calling a highly optimized cloud API, especially without a good GPU.
    *   **Action:** Ensure your Next.js API routes handle these potentially longer processing times gracefully. Keep asynchronous operations non-blocking. You might need to consider longer timeouts or provide feedback to the user if processing takes time (though for rule preview/validation, it should ideally still be relatively quick).

## III. Testing & Deployment

9.  **Thorough Testing:**
    *   **Functionality:** Test both rule preview and document validation extensively with various rules and documents.
    *   **Performance:** Assess the speed of responses. Is it acceptable for the user experience?
    *   **Accuracy:** Compare Llama 3's validation results against your expectations and previous OpenAI results.
    *   **Robustness:** Test edge cases, empty inputs, malformed rules, etc.
    *   **Action:** Rigorous testing and iteration on prompts/code.

10. **Deployment Considerations (if moving beyond local development):**
    *   **Server:** If deploying this for others to use, the Llama 3 inference server needs to be hosted somewhere accessible to your Next.js backend (e.g., on the same machine, a powerful VM in the cloud, or a dedicated AI inference hosting service).
    *   **Scalability:** A single local Llama 3 instance might not scale well for many concurrent users. Consider solutions like Kubernetes with GPU support, or services that manage LLM scaling if wider deployment is planned.
    *   **Cost:** Running a machine (especially with a GPU) 24/7 has costs, compared to the pay-per-use model of APIs like OpenAI.
    *   **Action:** Plan the deployment architecture if this is intended for more than just your local machine.

**In summary, the main phases are:**
1.  Set up the local Llama 3 inference server (Ollama is often a good starting point for ease of use).
2.  Modify your Next.js backend API routes to call this local server instead of OpenAI. This involves changing API endpoints, model names, and significantly re-working prompts and potentially response parsing.
3.  Extensive testing and prompt engineering. 