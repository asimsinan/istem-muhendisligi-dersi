# Prompt Engineering

**Language / Dil:** [Türkçe](README.md) · English

## Computer Engineering — 4th Year Elective

### From Prompt to Context and Loop Engineering

**Version:** 3.5 · **Last updated:** July 2026  
**Status:** Draft — will be updated as the field evolves.

Artificial intelligence tools are no longer just a curiosity; they have become part of the daily workflow in many professions. However, working productively with these tools requires far more than "asking good questions": systematically designing what information the model receives, which tools it can use, and when the process should stop is an engineering skill. This course is designed to build that skill from the ground up, through hands-on practice. [📺 Course introduction video](https://youtu.be/NW00MA3qW-E) (the video may be from an older version; the current framework is defined in this document).

![Prompt Engineering roadmap](infografik.en.png)

---

## Who is this course for?

This curriculum has been designed as a **Computer Engineering 4th-year** elective course. That said, readers from law, medicine, business, education, design, and similar fields who work with ChatGPT-like tools and want to go beyond *"asking AI good questions"* toward *building systems* can also follow this document with ease.

Even without programming experience, you can follow the conceptual sections and the glossary below; the lab and homework sections form the applied layer of the course. Readers who can write code can get the most out of the course by following the glossary, weekly plan, and assessment sections in their entirety.

### What is useful to know before starting this course?


| Level                            | What is expected?                                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Sufficient**                   | Having tried a tool such as ChatGPT or Claude at least once                                      |
| **Ideal for the course**         | Basic Python (variables, functions, file I/O) and familiarity with the command line              |
| **Not required but helpful**     | A machine learning or deep learning course; software engineering (writing tests, using Git)       |


### API and cost

In the course, we will primarily use the [OpenRouter](https://openrouter.ai) platform for cloud-based model access. There are two key reasons for this choice: with a single account and a single API key, you can access many models (OpenAI, Anthropic Claude, Google Gemini, and open-source models); this way, you do not need to create separate subscriptions or pay double bills.


| Path                              | When?                                            | Cost                                                                          |
| --------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| **OpenRouter** (recommended cloud)| Course labs, agents, structured output           | Single wallet; you pay as you go. Low-cost models can be selected             |
| **Ollama / LM Studio** (local)   | Privacy, free trials, offline work               | No API fee; only computer resources are required                              |


#### Cost management and security

It is critically important for security that you do not include your API keys in source code or GitHub repositories; we recommend using a `.env` file instead (`OPENROUTER_API_KEY`). OpenRouter provides an **OpenAI-compatible** endpoint for most client libraries (only `base_url` is changed); therefore, you do not need to learn separate SDKs.

Tracking rate limits and token consumption is important; an uncontrolled loop can lead to unexpected billing increases (we will cover this topic in detail in Weeks 11–12). As a general principle, rather than routing every task to the most expensive model, we recommend trying small, cost-effective models for simple tasks (we will cover model routing in Week 3).

> Optionally, direct OpenAI or Anthropic keys can also be used; however, they are not required in this course.

---

## What is this course about?

Working effectively with tools like ChatGPT starts with being able to write good **prompts**. However, in real-world applications, asking good questions alone is not enough; you need to design *which information*, *in which order*, and *with which tools* the model receives, *when the work is done*, and *under which rules* it operates. This design process is an engineering discipline.

This course takes good prompt writing as its foundation; it then combines this skill with layers such as **context management**, **document-grounded answer generation (RAG)**, **tool-using agents**, and **verifier loops with a mini harness** to transform it into a holistic engineering competency.

---

## How to read this

Every topic in the curriculum is addressed at three levels. The table below summarizes what each level expects from you:


| Label                        | Meaning                                                                       |
| ---------------------------- | ----------------------------------------------------------------------------- |
| **Required (apply)**         | Done in class or submitted as homework                                        |
| **Conceptual (recognize)**   | Understanding the concept is enough; you are not expected to write code (a short demo may occur) |
| **Further reading**          | Provided for the curious and those who want to do projects; not required      |


---

## Short glossary

English terms dominate the AI field. In the table below, we present concepts you will frequently encounter during the course. This allows you to navigate both English and Turkish resources with ease.


| Term                                      | Short definition                                                                                      | Example                                                                              |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Large language model (LLM)**            | An AI model that generates text from text                                                             | ChatGPT, Claude, or a model on OpenRouter                                            |
| **Token**                                 | The small text unit the model processes                                                               | A sentence split into 12–20 tokens; count ≈ cost                                     |
| **BPE (Byte Pair Encoding)**              | A common tokenization method that builds a vocabulary by merging frequent pieces                      | A rare or long word split into several tokens                                        |
| **Token embedding**                       | The layer that turns each token into a numeric vector *inside* the LLM (for generating answers)       | The vectors attention operates on; Week 2                                            |
| **Prompt**                                | The question or instruction you write to the model                                                    | "Rewrite this email in a formal tone."                                               |
| **Context**                               | All text the model sees for that answer: system rules, chat history, documents, tool list             | A PDF snippet you paste into the chat                                                |
| **Context window**                        | The maximum text you can fit into the model in one request (measured in tokens)                       | Being able to send a long document with a 128K window; still no need to send everything |
| **Attention budget**                      | The model cannot focus on every word in the context with equal quality                                | Missing a sentence in the middle of a 50-page text                                   |
| **Context rot**                           | Important information given early weakens as the context grows longer                                 | After 40 messages, not applying "the rule from step 1"                               |
| **Structured output**                     | A fixed-field answer instead of a free paragraph (usually JSON)                                       | `{"sentiment":"positive","confidence":0.9}`                                          |
| **Retrieval-augmented generation (RAG)**  | Finding the relevant snippet from your files first, adding it to the model, then generating an answer | "Is there a make-up exam?" → find the clause in the regulation PDF → give to model → answer |
| **Search embedding (embedding, RAG)**     | Turning text into numbers to *search* "is this semantically close?" (often a separate model)          | "vacation leave" ≈ "annual leave"; Week 8 — different purpose from token embedding   |
| **Overlap**                               | Consecutive chunks overlapping a little                                                               | Reducing mid-sentence cuts with 15% overlap                                          |
| **Hybrid search**                         | Using vector (meaning) and keyword (BM25) search together                                             | Not missing article numbers or product codes                                         |
| **Rerank**                                | Re-ranking the first candidate list with a second model                                               | Find 30 chunks → give the best 5 to the model                                        |
| **Contextual retrieval**                  | Embedding a chunk after adding a short summary of where it sits in the document                       | "This chunk is from the leave section of regulation X" + chunk text                  |
| **Late chunking**                         | The idea of embedding long text first, then setting chunk boundaries                                  | Reducing boundary loss in reference-dense text                                       |
| **Model routing**                         | Routing simple work to a cheap/fast model and hard work to a strong model                             | "Hello" → small model; long analysis → large model                                   |
| **Observability**                         | Logging model, tokens, duration, cost, and tool steps on every call                                   | Log line: model=… tokens=… latency_ms=… cost≈…                                       |
| **Guardrails**                            | Automatically filtering requests or answers for security and policy rules                             | PII masking; rejecting on suspected injection                                        |
| **Chunking**                              | Splitting a long document into small pieces for search                                                | Splitting an 80-page PDF into ~500–1000 word sections                                |
| **Agent**                                 | A system that can advance work by calling defined tools when needed                                   | "Get today's rate, convert to TRY" → first rate API, then answer                     |
| **Function / tool calling**               | The model saying "run this function with these parameters"; your code executes it                     | `get_weather(city="Isparta")`                                                        |
| **ReAct (Reason + Act)**                  | Think → use tool → read result → repeat if needed                                                     | Searches first, then takes the second step after seeing the result                   |
| **Model Context Protocol (MCP)**          | A common connection standard for linking tools and data sources to the model                          | Connecting the same calendar tool similarly across different chat apps               |
| **A2A (Agent-to-Agent Protocol)**         | A protocol enabling different agents to communicate with each other in a standard way                 | MCP connects to tools; A2A connects agents to each other                             |
| **Skill**                                 | An instruction file written as "this job is done like this" (`SKILL.md`); not a tool                  | A guide containing steps for "How to write a pull request summary?"                  |
| **Loop**                                  | An automatic cycle that repeats until the job is done or a limit is hit                               | Write code → run tests → fix if error → at most 5 times                              |
| **Verifier**                              | An automatic check asking "Is this output acceptable?"                                                | Valid JSON? Does the answer contain `06`? Are tests green?                           |
| **Agent harness**                         | Rules wrapping the loop: open tools, step limit, log, verifier                                        | Only `search` and `calculator` open; `delete_file` closed                            |
| **Tool allowlist**                        | A closed list of tools the agent is allowed to use                                                    | Allowed: `search`, `get_weather` · Forbidden: sending email                          |
| **Compaction**                            | Summarizing a long chat and continuing with the summary                                               | Reducing 30 messages to 1 paragraph and pasting into a new session                   |
| **Progressive disclosure**                | Not giving the whole document up front; reading the relevant part as needed                           | File names first; when told "read section 3", add only that                          |
| **Context poisoning**                     | The model degrading when wrong or malicious text enters the context                                   | User text saying "ignore previous rules"                                             |
| **Agent memory**                          | Short-term (in-session) and long-term (cross-session) information storage layer                       | Remembering user preferences across sessions; Mem0, Zep                              |
| **Minimum viable product (MVP)**          | A narrow-scope but truly working first version                                                        | RAG with 3 PDFs first; not the entire university archive                             |
| **OWASP**                                 | An organization listing common security risks in software and LLM applications                       | In this course: LLM Top 10 (2025) list                                               |
| **RAGAS**                                 | An evaluation framework for measuring RAG quality (faithfulness, relevance, context precision)        | Scoring golden set answers for faithfulness and relevance                             |


### Three sibling concepts

The following three concepts are often confused; it is important to clearly know the difference between them:

1. **Function calling:** The model can directly call a Python function you wrote.
2. **Model Context Protocol (MCP):** A protocol that enables connecting such tools in a *standard way* (mostly covered at introductory level in the course).
3. **Skill:** Not a tool; an instruction package describing *how a specific job should be done*.

### ReAct, loop, and harness — three layers

These three concepts answer different questions about agent architecture. The table below summarizes the relationship between them:


| Layer                                 | Question it answers                                                         | In this course                              |
| ------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| **ReAct (Week 10)**                   | What should the model think and which tool should it call in one step?      | Defines the agent's *inner* behavior        |
| **Loop (Week 11)**                    | How many attempts, when to stop, which test says "done"?                    | Repeating cycle and verifier                |
| **Harness (Week 11)**                 | Which tools are open, is there a log, are permissions limited?              | Rules and controls outside the loop         |


In short: ReAct determines what to do in one step, the loop defines when to stop, and the harness specifies which permissions and controls the entire process runs under.

---

## Evolution of the field (2022–2026) — with examples

Since 2022, "asking good questions" has ceased to be sufficient in AI applications, and the field's focus has gradually expanded. The following four layers summarize this evolution:

```text
1) PROMPT         →  Asking well: "Write me a summary"
2) CONTEXT        →  Putting the right documents / history on the table for the summary
3) HARNESS        →  Which tools to give the assistant, with which permissions
4) LOOP           →  Write → check → fix → stop when done (automatic)
```

Prompt writing remains foundational and continues to be important; however, it is not sufficient on its own in real-world applications. This course covers all four layers progressively.

---

## Course objectives

A student who successfully completes this course will have acquired the following competencies:

- Can explain the fundamental working principles of large language models (LLMs), including tokenization, BPE, and token embedding.
- Can design effective prompts, version prompts, and obtain model output in a structured format such as **form or JSON**.
- Can experiment with a cloud API (**OpenRouter**) or a local model; can grasp the basic idea of **model routing**.
- Can deliberately manage the information given to the model (context) and identify context-related failures.
- Can build a simple **RAG** system that generates answers from their own documents (chunking, embedding, citing sources).
- Can develop a simple **agent** that uses tools.
- Can build a small **loop and mini harness** with **verifier, step limit, tool permissions, and basic observation log**.
- Can explain major security risks, the basic idea of **guardrails**, and ethical responsibilities with examples.
- Can produce a **small but working** solution (MVP) to a real problem.

MCP, A2A, GraphRAG, fine-tuning labs, DSPy, and advanced memory products are covered at the **recognize** level only. Multimodal (image and audio) models are out of scope for this course.

---

## Assessment

Assessment consists of three core components. Each component aims to measure a different skill set: weekly homework ensures regular practice, the midterm evaluates your conceptual foundation, and the final project assesses your ability to develop an integrated application.


| Component                    | Weight | What is expected?                                                                                   |
| ---------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| **Homework and practice**    | 30%    | 6–8 short assignments (each about 1–3 hours). Not a large project; one script and a short note      |
| **Midterm exam**             | 30%    | Weeks 1–6 topics: concepts, prompt writing, and short code reading (60 minutes)                     |
| **Final project**            | 40%    | Groups of 2–3: working application, presentation, and report                                        |


Homework grades do not mix into the midterm. Homework examples include "compare three different prompts," "build a Q&A system with 3 PDFs," and "write an agent with at most 5 steps and 5 tests."

### Final project (MVP) — rules

The final project announcement will be made **after Week 8**; submission deadline will be in **Weeks 13–14**. The following components are required in every project:

1. Working code and a README file explaining setup.
2. A short document explaining which prompts were used and why (**prompt file or version notes**).
3. **Either** a document-based Q&A system (RAG) **or** a tool-using agent (you are not expected to go deep on both).
4. **Verifier:** Must include at least **5 checks** (golden set). Example checks:
   - Is the output actually valid JSON?
   - For "What is Ankara's plate code?", does the answer contain `06`?
   - Does the agent avoid calling a forbidden tool?
   - Does the process complete in at most N steps?
5. If you chose RAG, you must show **sources and citations** in answers; if you chose agent, you must keep a **token and duration log**.
6. **Short ethics evaluation note** (½ page): Does your project have hallucination risk? Bias risk? Is the user informed that the response was generated by AI?

Optional bonus items: skill file, ready MCP tool integration, compaction experiment, model routing note, PII masking, and connecting golden set tests to a simple CI/CD pipeline (e.g., GitHub Actions).

> **Important:** A verifier does not mean the model saying "I am correct" by itself. A verifier consists of automatic check functions or a small test list that you write.

---

## Weekly plan (14 weeks)

### Week 1 — Introduction to Generative AI

**What will you learn this week?** You will understand which AI family ChatGPT-like tools belong to and take your first look at the holistic map formed by prompt, context, loop, and harness concepts.

- The relationship between artificial intelligence, machine learning, and generative AI will be discussed (focus in this course: **text**).
- The difference between discriminative models (classify) and generative models (produce new content) will be examined.
- Current model families such as GPT, Claude, Gemini, and LLaMA will be introduced.
- A very brief introduction to the Transformer architecture will be given.
- **Conceptual:** The Prompt → Context → Harness → Loop map will be presented with the examples above.

**Required:** You are expected to try 5 tasks with two different chat tools and write a short note about your observations.

---

### Week 2 — How does a model roughly work?

**What will you learn this week?** You will see step by step how text enters the model: **tokenization / BPE** → **token embedding** → attention mechanism → next-token prediction → sampling with temperature.

The basic flow can be summarized as follows:

```text
Text → split into tokens (e.g. BPE)
     → each token becomes a vector (token embedding)
     → self-attention: tokens "look at" each other
     → the model predicts the next token
     → answer is produced with temperature / top-p
```

#### 1) Tokenization

- **Token** is the small text unit the model processes (it can be a word, subword, or character piece).
- **BPE (Byte Pair Encoding)** is a common method that builds a vocabulary by merging frequent character and subword pairs. For example, compound spellings or rare words can be split into several tokens.
- Why does the token count matter? Token count directly affects both cost and context window consumption; the same sentence can be split into different numbers of tokens across different models.
- **Lab idea:** Split the same sentence with a tokenizer and observe the token list and count.

#### 2) Token embedding — foundation of the LLM

- Each token is converted into a fixed-size **numeric vector** inside the model; the attention mechanism operates on these vectors.
- Position encoding is also added, because order matters.
- **A critical distinction for this course:**
  - **Embedding here** is the LLM's inner layer, used for generating answers.
  - **Embedding in Week 8** is a separate (or similar) embedding model used for searching documents. Both use the concept of "vectors," but their purposes differ.

#### 3) Attention mechanism and generation

- Self-attention answers the question "which token looks at which token?" (detailed math will not be covered in this course).
- Next-token prediction is the principle of predicting the next piece.
- Model size (e.g., 7B ≈ approximately 7 billion parameters): generally more capable but more expensive and heavier.
- Temperature and Top-p parameters allow you to make the answer more creative or more conservative.
- **Conceptual preview:** The problem of attention dilution on very long text will be covered in Week 6.

**Required:**

1. Generate the same sentence at different temperature values and report the difference.
2. Short tokenizer experiment: observe how a sentence is split into tokens and determine the approximate token count (understanding the BPE idea is sufficient).

---

### Week 3 — Prompt writing, OpenRouter API, and structured output

**What will you learn this week?** You will learn the distinction between system and user messages, teaching by example, putting the answer into JSON format, and calling a model from Python with a **single OpenRouter key**.

- **Zero-shot:** Asking directly without providing any examples.
- **Few-shot:** Showing the model the desired pattern by giving a few examples.
- **Chain-of-Thought:** Asking the model to "think step by step."
- **Structured output:** Creating an answer format with fixed fields such as `{ "sentiment": "positive" }` instead of a free paragraph.
- **OpenRouter setup:** Account creation → API key generation → saving to `.env` file (`OPENROUTER_API_KEY`).
- OpenAI-compatible client usage: you can call different models using the same SDK pattern with `base_url="https://openrouter.ai/api/v1"`.
- Trying different models with the same code skeleton (cheap vs. strong model comparison).
- **Model routing idea:** Routing simple classification tasks to a cheap model and hard reasoning tasks to a strong model (**covered at conceptual level; two models will be compared in homework**).
- **Prompt versioning:** Keeping prompts in a file separate from code (`prompts/v1.txt`) and tracking changes in Git.
- Rate limit and token consumption concepts will be introduced.
- **Conceptual:** Streaming (the answer arriving piece by piece) and prompt/prefix caching (cost reduction on repeating system prompts) will be introduced.

**Required:** OpenRouter setup, few-shot and JSON output homework (short comparison with at least two different model names), and keeping the prompt in a separate file.

---

### Week 4 — Better prompts and first security warning

**What will you learn this week?** You will learn to give clear instructions, use section separators, apply the "act like an expert" (persona) technique, and understand the risk of breaking rules with malicious prompts.

- Writing clearly and specifically is the fundamental requirement of a good prompt.
- Splitting text with `###` or XML tags reduces the likelihood of the model mixing up information.
- **Right altitude:** Neither an overly rigid pile of rules nor an instruction as vague as "be good" should be given; balance is important.
- **Instruction hierarchy:** A priority order exists: system rules > developer instruction > user text. The user should not be able to override system instructions by saying "ignore previous rules" — this topic will be covered at **conceptual** level and is linked to Week 12.
- **Conceptual:** Multi-path approaches (Self-Consistency) and tree-like thinking (Tree of Thoughts) will be introduced; you are not expected to implement them.
- **Conceptual:** DSPy — an approach that automates prompt optimization by defining the program's logic (modules) and a success metric rather than manually editing prompt text. It can be thought of as "automation of prompt engineering." It is not applied in this course but represents the field's future direction.
- A short introduction to prompt injection and jailbreak concepts will be given (the main lab is in Week 12).

**Required:** Writing a persona prompt for a profession and conducting a small injection attempt.

---

### Week 5 — Running a model on your computer

**What will you learn this week?** You will try running a model on your own computer without sending data to the internet. You will work hands-on with **Ollama** (command-line interface) and gain an alternative experience with **LM Studio** (visual interface); this way, you will directly observe cost and privacy advantages.

- **Ollama (primary local tool):** Setup, model download, and calling via terminal or API will be covered. It is the most practical local tool for scripts and automation.
- **LM Studio (alternative GUI):** Setup and chat interface will be introduced; optionally, a local server (OpenAI-compatible endpoint) can be set up. Suitable for exploration and GUI-based trials.
- Local model vs. cloud (OpenRouter) comparison: privacy, cost, speed, and quality trade-offs will be examined.
- Quantization: the idea of shrinking the model to run on computers with lower hardware requirements will be introduced at **conceptual** level.
- Observing token and context window limits locally will serve as a bridge to Week 6.

**Required:** Set up a model in Ollama, run a short task test with the same prompt, and write a short observation note comparing "OpenRouter vs. Ollama." You are encouraged to also set up and try LM Studio, but an in-depth examination is not expected.

---

### Week 6 — Context engineering

**What will you learn this week?** Asking good questions alone is not enough; you need to put the *right information* on the table, in the *right order*, with *as little noise as possible*. This week, we will cover the anatomy of context and core strategies against context failures.

#### 1) Context anatomy (what goes into the model?)

A typical package sent to the model consists of the following layers:

1. System instruction (role and rules)
2. Tool definitions (if any)
3. Chat history
4. Externally added documents or RAG chunks
5. The user's latest message

Exercise: On a chat screenshot or log, answer the question "which line belongs to which layer?" by labeling.

#### 2) Why does context break? (failure types)


| Problem                  | What happens?                                  | Simple fix                                            |
| ------------------------ | ---------------------------------------------- | ----------------------------------------------------- |
| **Context rot**          | Important info is lost as text grows            | Summarize (compaction) or remove unnecessary parts    |
| **Lost-in-the-middle**   | Middle information gets less attention          | Place important info at start or end; shorten         |
| **Noise / too many tools** | Too many options spoil the model's decision   | Define few and clear tools; apply progressive disclosure |
| **Context poisoning**    | Wrong or harmful text leaks into the context   | Source control and separators (link to Week 12)       |


#### 3) Three core strategies

- **Compaction:** Summarizing long chat history and continuing with a new context window.
- **Progressive disclosure / just-in-time (JIT):** Instead of loading all information upfront, providing the file path and reading the relevant section only when needed.
- **High signal / low token:** Getting the same job done with less but more carefully selected text.

**Required lab (try both, deepen one in homework):**

1. Compaction: Summarize a long chat and continue; note answer quality before and after the summary.
2. JIT: Compare burying a large text entirely in context vs. reading it piece by piece in terms of token count and quality.

**Homework:** Short report (at most 1 page): "Which strategy is effective in which situation? One failed context example and the fix you applied."

**Conceptual:** The idea of splitting work across sub-agents to separate context (sub-agent isolation) will be introduced; no code will be written.  
**Further reading:** Anthropic's context engineering article.

---

### Week 7 — Midterm exam

We will evaluate the topics covered in the first six weeks with this exam: concepts, prompt design, structured output, local model usage, context anatomy, and context strategies.

**Format:** Short answer, prompt writing, and short code reading questions · 60 minutes.

After the exam, the course's focus will shift: in the second half, you will transform the conceptual foundation you built in the first half into practical applications. Topics such as document-grounded answer generation (RAG), agent development, and automatic loop design will enable you to apply what you have learned to real-world problems.

---

### Week 8 — RAG: Generating answers from your documents

**What will you learn this week?** You will learn the RAG approach as a practical solution to the problem of "the model doesn't know or makes things up": **chunk the document correctly** → embed → search → give the relevant chunk to the model → generate an answer. This process forms the *retrieval* leg of context engineering. Most weak RAG performance comes not from the model but from **bad chunking**.

The simple (naive) flow can be summarized as follows:

```text
Documents → chunk → embed → store (vector DB)
         → find chunks close to the query → add to model → generate answer
```

#### Why is RAG necessary?

- The model's knowledge cutoff may be old or too general.
- Hallucination risk can be reduced by grounding answers in concrete documents.
- It is essential when reliable answers based on institutional, course, or company documents are needed.

#### Chunking — the backbone of this week


| Strategy                              | What does it do?                                                    | When is it used?                                       |
| ------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| **Fixed size**                        | Creates slices of, for example, 500 or 1000 tokens                  | Fast start (required in lab)                           |
| **Overlap**                           | Slices overlap a little (e.g., 10–20%)                              | To reduce information loss at sentence or topic boundaries |
| **Structure-aware / recursive**       | Tries to split by heading, paragraph, and sentence boundaries first | Structured texts like Markdown, reports, and regulations |
| **Semantic**                          | Starts a new chunk when the topic changes (**conceptual**)          | Long texts with mixed topics                           |
| **Metadata**                          | Stores source file, page, and heading information with the chunk    | For citation and filtering in answers                  |


**Caution:** If chunks are too small, context is missing; if too large, search becomes noisy and token cost increases. You are expected to measure this balance in the lab.

#### Search embedding — mini module (~30–40 min)

- The purpose of this module is to convert a chunk into a vector and search for "semantically close" ones (different purpose from Week 2's token embedding).
- Similarity idea: close vectors indicate close meaning (cosine similarity; no formula memorization expected).
- Practical choice: OpenRouter or a small local embedding model can be used; queries and documents must be embedded with the **same** embedding family.
- Pitfalls: language mismatch, very short or very long chunks, and missing exact matches like codes or article numbers with "vector only" (addressed with hybrid search in Week 9).

#### Other components

- **Vector database:** **Chroma** will be used in the lab; alternatives like Qdrant will be introduced by name (**conceptual**).
- Retrieved chunks are also part of the context; an irrelevant chunk means noise (linked to Week 6).
- **Source and citation (grounding):** The answer must show which file or chunk it is based on (at minimum, file name and short quote).

**Required lab:**
Build a RAG system with 3 PDF or text files; **compare at least two chunk settings** (e.g., 500 vs. 1000 tokens; overlap 0% vs. 15%) and **show sources** in answers. Short note: which works better for which type of question?

**Note:** Final project topics will become clear after this week.

#### When what? (decision table — conceptual)


| Need                                             | Generally preferred approach                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Defining behavior, format, or role               | Prompt and structured output                                                                |
| Grounding in current or institutional documents  | RAG                                                                                         |
| Permanently changing the model's style or domain | Fine-tuning — **no lab in this course**; knowing when to consider it is sufficient           |
| Multi-step tool use                              | Agent, loop, and harness                                                                    |


---

### Week 9 — Modern RAG improvements

**What will you learn this week?** You will learn about layers that frequently prove effective in practice during the 2025–2026 period: **hybrid search**, **rerank**, **query transformation**, and **contextual / late chunking**. Simple vector-based search alone does not deliver sufficient results in most real-world scenarios.

#### Current "what works well" stack (summary)

```text
Chunk well
  → Hybrid retrieval: dense (vector) + sparse (BM25 / keyword)
  → Merge (e.g. RRF)
  → Rerank (first 20–50 → best 3–5)
  → Give to model + source/citation when possible
```

Optional upper layers: query rewriting, contextual embedding, and the agent deciding "should I search?"

#### Required topics (apply — code **one** in the lab)


| Technique                            | Short definition                                             | Why is it trending?                                           |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------------------------------------------- |
| **Hybrid search**                    | Doing vector and keyword (BM25) search together              | Not missing exact matches like codes, names, and article numbers |
| **Rerank**                           | Re-ranking found candidates with a second model              | Significantly improves the quality of the top 3–5 chunks      |
| **Query rewriting / expansion**      | Making the user question more suitable for search            | Improves recall on short or vague questions                    |
| **HyDE**                             | Generating an "ideal answer text" and searching with it      | Can be effective when question and document language differ greatly |


#### Conceptual topics (recognize level — code not required; 20–25 min)


| Technique                                   | What is it good for?                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Contextual retrieval**                    | Adding a short summary of where each chunk sits in the document, *then* embedding (Anthropic approach; high gain, index cost exists) |
| **Late chunking**                           | Embedding long text first, then setting chunk boundaries — the idea of reducing meaning loss at boundaries                     |
| **Agentic / adaptive RAG**                  | The model decides "should I search, change the query, is it enough?" (linked to Weeks 10–11)                                   |
| **GraphRAG**                                | Designed for multi-hop questions like "who is related to whom?"                                                                |
| **Memory vs. RAG**                          | RAG draws from documents; memory holds user and session preferences (Mem0, Letta)                                              |
| **ACE**                                     | An approach of keeping context as a "playbook" that improves over time                                                        |


**RAG evaluation — RAGAS metrics (conceptual + short lab):**

The **RAGAS** framework is widely used in the industry for systematically evaluating RAG outputs. The three core metrics are:

- **Faithfulness:** Was the answer actually generated from the provided document?
- **Answer relevance:** How relevant is the answer to the question?
- **Context precision:** Were the chunks given to the model actually the correct ones?

Prepare a fixed golden set of 5 questions and run a simple regression test by comparing these metrics before and after improvements.

**Required homework:** Compare naive RAG (Week 8) with **one** modern technique you choose (hybrid, rerank, query writing, or HyDE) on the same 5 questions; half to one page results report and showing sources.

**Further reading:** Anthropic Contextual Retrieval, Late Chunking (arXiv), hybrid search with RRF summaries, and RAGAS documentation.

---

### Week 10 — Agents: Tool-using AI

**What will you learn this week?** You will enable the model not just to write text, but to call tools such as a calculator, search engine, or a function you wrote. You will directly observe that tool definitions are also *part of the context*.

- An agent is fundamentally a structure consisting of LLM, tools, and steps.
- ReAct approach: think → use tool → read result → continue.
- Function calling lab: a tool-calling-capable model via OpenRouter will be used.
- Tool descriptions must be kept short and clear; a poorly written tool description creates context noise.
- **MCP (Model Context Protocol):** A protocol that connects tools to the model in a standard way — will be introduced at **demo and conceptual** level (no writing a server from scratch).
- **A2A (Agent-to-Agent Protocol):** A protocol enabling different agents to communicate with each other in a standard way — introduced by name. MCP connects to tools, A2A connects agents to each other; these two standards together form the "connection protocols" family.
- **Skill:** Writing a `SKILL.md` instruction file for a specific job.
- LangChain and CrewAI: knowing they exist is sufficient; they are not a required framework in this course.
- **Bridge to Week 11:** Running an agent without bounds can be dangerous; therefore, we need loop and harness concepts.

#### Agent memory — conceptual

Agents may need to retain information beyond the current session's context window. This need gives rise to the concept of "agent memory":

- **Short-term memory:** The current context window and session history.
- **Long-term memory:** Persistent information across sessions; user preferences, learned rules, and past decisions are kept in this layer.
- Tools like Mem0, Zep, and Letta are prominent solutions in this area (introduced by name).
- RAG draws information from documents; memory holds user and session information — they are different layers.

**Required:** Develop a small agent with 2–3 tools and write a `SKILL.md` file.

---

### Week 11 — Loop and harness: "When is it done? Under which rules?"

**What will you learn this week?** Instead of writing every step by hand, you will learn to build an automatic cycle with a goal, step limit, verifier, and **mini harness** — permissions and log.

#### Loop

```text
give goal → agent takes one step → did the verifier pass?
  if no and steps < N, repeat
  if yes, STOP (success)
  if steps = N, STOP (limit; even if failed)
```

- Stopping conditions: test passed, schema matched, **human approval (HITL)**, or step limit reached.
- Risk of infinite loops and token bills (linked to OWASP LLM10).
- **Conceptual:** Andrew Ng's three speeds — (1) the agent's fast loop, (2) your guidance, (3) the outside world or user feedback.
- **Error and retry:** Do not panic when a tool or API fails; try 1–2 times, then stop or ask the user if unsuccessful.
- **Fallback:** If the primary model or tool is unavailable, fall back to a backup model or return an "I cannot answer" message.

#### Mini harness

The harness can be thought of as a shell wrapping the loop. We are not expected to build a production-level system like Claude Code or Codex; however, you need to code the following **checklist**:


| Component                        | Student implementation                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------- |
| Tool allowlist                   | Only 2–3 allowed functions can be called                                                        |
| Step limit (`max_steps`)         | For example, 5 steps                                                                            |
| Verifier                         | At least 5 asserts or test cases                                                                |
| **Observation log**              | Each step: model name, called tool, summary result, **token count**, **duration (ms)**, approx. **cost** |
| Error behavior                   | If a tool errors: log and retry or stop                                                         |
| HITL (optional)                  | Request human approval for risky actions such as deletion or sending                            |


**Conceptual (no code):** Advanced concepts like sandbox, worktree, hooks, and multi-agent orchestration will be introduced; they will not be implemented in this course.

**Required lab and homework:**
Develop a mini agent loop with tool allowlist, `max_steps`, verifier, and step log containing **token, duration, and cost** fields. Write a 5–7 item "harness checklist" in your README explaining why each rule is necessary.

---

### Week 12 — Security, ethics, and "is it working well?" checks

**What will you learn this week?** You will cover major security risks — especially prompt injection, over-privileged agents, and unbounded consumption — discuss ethical responsibilities, and build a small evaluation set. This week combines the Week 11 harness concept with security: the tool allowlist is a practical defense against the Excessive Agency risk.

**OWASP LLM Top 10 (2025) — summary list:**


| Code  | Risk (plain language)                                             |
| ----- | ----------------------------------------------------------------- |
| LLM01 | Prompt injection — user text overrides system rules               |
| LLM02 | Sensitive information disclosure                                  |
| LLM03 | Supply chain risk (library or model source)                       |
| LLM04 | Data or model poisoning                                           |
| LLM05 | Running model output without trust (code or commands)             |
| LLM06 | Excessive agency — agent has more tools or permissions than needed |
| LLM07 | System prompt leakage                                             |
| LLM08 | Vector and embedding weaknesses (RAG side)                        |
| LLM09 | Misinformation (hallucination)                                    |
| LLM10 | Unbounded consumption — uncontrolled cost or requests             |


**Lab focus:** LLM01, LLM06, and LLM10.

**Guardrails — conceptual and short practice:**

- **Input side:** Injection pattern detection and excessively long input detection.
- **Output side:** Schema validation (covered in previous weeks); awareness of PII (name, phone, national ID) leakage — a simple regex or masking attempt is sufficient.
- Do not feed model output directly into `exec` or shell (LLM05).

#### Ethics and responsible AI (conceptual discussion, ~15 min)

Beyond security risks, evaluating the ethical dimension of AI applications is an engineering responsibility:

- **Bias:** Examples of gender, language, and culture-based bias in model outputs will be examined.
- **Transparency:** The need to inform the user that "this response was generated by AI" will be discussed.
- **Responsibility:** Models can produce hallucinations; the final decision should always be made by humans.
- **Regulatory awareness:** The EU AI Act and developments in Turkey will be introduced at name level.

**Evaluation discipline:**

- Fixed **golden set** (5–20 examples) with schema/assert validation.
- A short look at the LLM-as-judge approach.
- **RAGAS metrics** (introduced in Week 9) can be used in project evaluation.
- Traditional metrics (BLEU, ROUGE) are now considered insufficient for generative AI evaluation; knowing them as a reference is sufficient.

**Required:** Try an injection example; prepare a draft 5-item verifier and golden set for the project (including allowlist note); write a short PII awareness note.

---

### Weeks 13–14 — Project presentations and wrap-up

The last two weeks are dedicated to project presentations. Each group will be given 15–20 minutes; a live demo is required.

A general summary of the semester will be provided: context management, loops, and mini harness will be discussed as a whole, and the corresponding career paths for these skills will be explored. Job titles in the industry are changing rapidly (Context Engineer, Agent Engineer, Harness Engineer, etc.); however, the core skill remains the same: **prompt, context, and verifier loop**.

---

## Project submission checklist

The following components are expected to be submitted completely in your final project:

1. **GitHub repository:** Working code and a README file explaining setup.
2. **Documentation:** Architectural decisions, setup steps, prompt-context notes, and verifier explanation.
3. **Demo video:** A short introduction video of 3–5 minutes.
4. **Presentation:** Presentation file in PDF format.
5. **Report:** Written report of 5–10 pages.
6. **Ethics evaluation note:** A short ½-page evaluation (hallucination risk, bias risk, and user notification).

### Topic examples

The following examples are meant to give you ideas; you can also propose a different topic:

- Q&A system from course notes (RAG) with 5 test scenarios.
- Tool-using research assistant: with step limit and tool allowlist.
- Quiz-generating bot: validation with JSON schema tests.
- Email classification: using structured output.
- Document summarization: with compaction experiment.
- Agent with mini harness: log, max_steps, and verifier.

---

## Tools

### Tools we will actually use in the course

The following tools and libraries have been selected with both industry-practice alignment and ease of learning in mind:

- Python, Pydantic, and JSON Schema
- **OpenRouter** (primary cloud API — one key, multiple models)
- `openai` Python SDK (used with OpenRouter by changing `base_url`)
- **Ollama** (primary local tool; CLI and API)
- **LM Studio** (alternative local GUI)
- Chroma (vector database)

### Tools we will recognize by name

MCP, A2A, Agent Skills, LangChain, CrewAI, DSPy, RAGAS, Mem0; OpenAI and Anthropic SDKs (creating a direct account is not required).

---

## Resources

### Short and priority

1. [Anthropic — Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
2. [OWASP LLM Top 10 2025](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
3. [OpenRouter Docs](https://openrouter.ai/docs) — OpenAI-compatible API usage
4. [Anthropic — Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)
5. [RAGAS Documentation](https://docs.ragas.io/) — RAG evaluation metrics
6. [ReAct: Reasoning and Acting](https://arxiv.org/abs/2210.03629) (Yao et al., 2023) — reading a **summary** is sufficient
7. [Retrieval-Augmented Generation](https://arxiv.org/abs/2005.11401) (Lewis et al., 2020) — reading a **summary** is sufficient

### Further resources (not required)

1. [Context Engineering survey](https://arxiv.org/abs/2507.13334)
2. [ACE](https://arxiv.org/abs/2510.04618)
3. [Hugging Face Context Course](https://huggingface.co/learn/context-course/unit0/introduction)
4. [Model Context Protocol](https://modelcontextprotocol.io)
5. [Google A2A Protocol](https://google.github.io/A2A/)
6. [DSPy — Programming, not Prompting](https://dspy.ai)
7. [LangChain — The Anatomy of an Agent Harness](https://www.langchain.com/blog/the-anatomy-of-an-agent-harness) (conceptual reading)

### Tutorial sites

- [Learn Prompting](https://learnprompting.org)
- [Prompting Guide](https://www.promptingguide.ai)
- [DeepLearning.AI — ChatGPT Prompt Engineering for Developers](https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/)
- [DeepLearning.AI — AI Agentic Design Patterns](https://www.deeplearning.ai/courses/)
- [Hugging Face — The Context Course](https://huggingface.co/learn/context-course/unit0/introduction)
- [OpenRouter Docs](https://openrouter.ai/docs)
- [Ollama Docs](https://docs.ollama.com)
- [LM Studio](https://lmstudio.ai)

---

## End-of-term outcomes (checklist)

Ask yourself this list at the end of the semester; if you can confidently say "yes" to each item, you have achieved the course objectives.

- [ ] I can explain what an LLM is and the difference between token, BPE, and token embedding concepts.
- [ ] I can design effective prompts and create JSON output formats; I can version prompts in a file.
- [ ] I can work with OpenRouter, Ollama, or LM Studio; I can make informed choices between cheap and strong models.
- [ ] I can explain the difference between context and prompt with examples.
- [ ] I can simplify context using compaction or JIT methods.
- [ ] I can build a simple RAG system; I can experiment with chunk, overlap, and embedding settings; I can show sources.
- [ ] I can explain and try at least one modern RAG improvement (hybrid search, rerank, or query writing).
- [ ] I can explain what RAGAS metrics are used for.
- [ ] I can write a tool-using mini agent.
- [ ] I can build a mini loop and harness with allowlist, max_steps, verifier, and token/duration log.
- [ ] I can state the differences between MCP, A2A, and Skill.
- [ ] I can exemplify at least 3 risks from OWASP and a simple guardrail idea.
- [ ] I can discuss fundamental ethical responsibilities in AI applications (bias, transparency, responsibility).
- [ ] I can deliver a working MVP application.

---

## Closing note

Throughout this course, we will go beyond simply using AI tools and lay the foundations for working with them systematically. The field is evolving rapidly; the tools and models we use today may change tomorrow. However, the systematic thinking skill you acquire in this course — writing effective prompts, managing context, building loops and control mechanisms — will provide you with a solid foundation regardless of which tools emerge.

Questions and suggestions: [asimyuksel@sdu.edu.tr](mailto:asimyuksel@sdu.edu.tr)
