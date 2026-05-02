# Load environment variables first
from dotenv import load_dotenv
load_dotenv(override=True)

import os
from datetime import datetime, timezone

import streamlit as st
import db
from rag_engine import RAGEngine
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI

db.init_db()

# Streamlit App Configuration
st.set_page_config(page_title="RAG KB ", layout="wide")

# Cached Resource Initialization
@st.cache_resource
def get_embeddings(model_name):
    return HuggingFaceEmbeddings(model_name=model_name)

@st.cache_resource
def get_llm(provider, model, base_url=None):
    if provider == "ollama":
        return ChatOllama(model=model, base_url=base_url)
    elif provider == "openai":
        return ChatOpenAI(model_name="gpt-3.5-turbo", api_key=os.getenv("OPENAI_API_KEY"))
    return None

# Session State for Collection Management
if "collection" not in st.session_state:
    st.session_state.collection = ""
if "conversation_collection" not in st.session_state:
    st.session_state.conversation_collection = None
if "conversation_id" not in st.session_state:
    st.session_state.conversation_id = None
if "last_qa_run_id" not in st.session_state:
    st.session_state.last_qa_run_id = None

# Sidebar: Collection Selection and Creation
with st.sidebar:
    st.title("Settings")

    # List Collections
    try:
        collections = RAGEngine.list_collections()
    except:
        collections = []

    # Create new collection (compact)
    with st.expander("Create New", expanded=False):
        new_collection_input = st.text_input("Name", key="new_collection_input", label_visibility="collapsed", help="Lowercase automatically")
        if st.button("Create", key="create_collection_btn", use_container_width=True):
            if new_collection_input:
                new_name_clean = new_collection_input.lower().strip()
                success, message = RAGEngine.create_collection(new_name_clean)
                if success:
                    st.session_state.collection = new_name_clean
                    st.session_state.conversation_collection = new_name_clean
                    st.session_state.conversation_id = db.create_conversation(new_name_clean)
                    st.success(message)
                    # Re-list collections to include the new one
                    try:
                        collections = RAGEngine.list_collections()
                    except:
                        collections = []
                    # Re-set the selectbox index to the new collection
                    if new_name_clean in collections:
                        st.session_state.collection = new_name_clean
                    st.rerun()
                else:
                    st.error(message)
            else:
                st.warning("Please enter a name.")

    # Select existing collection
    selected_collection = None
    if collections:
        if st.session_state.collection not in collections:
            st.session_state.collection = collections[0]

        selected_collection = st.selectbox(
            "Open",
            options=collections,
            index=collections.index(st.session_state.collection),
            key="collection_select"
        )
        st.session_state.collection = selected_collection

    # Manage current collection (inline, no divider)
    if selected_collection:
        st.caption(f"Active: {selected_collection}")

        col1, col2 = st.columns(2)
        with col1:
            new_name = st.text_input("Rename", key="rename_input", label_visibility="collapsed", placeholder="New name...")
            if st.button("Save", key="rename_btn", use_container_width=True):
                if new_name and new_name.lower().strip() != selected_collection:
                    new_name_clean = new_name.lower().strip()
                    valid, msg = RAGEngine.validate_collection_name(new_name_clean)
                    if valid:
                        success, rename_msg = RAGEngine.rename_collection(selected_collection, new_name_clean)
                        if success:
                            st.session_state.collection = new_name_clean
                            st.success(f"Renamed to {new_name_clean}")
                            st.rerun()
                        else:
                            st.error(f"Rename failed: {rename_msg}")
                    else:
                        st.error(msg)
        with col2:
            if st.button("Delete", type="primary", key="delete_btn", use_container_width=True):
                if RAGEngine.delete_collection(selected_collection):
                    st.session_state.collection = ""
                    st.session_state.conversation_collection = None
                    st.session_state.conversation_id = None
                    st.success(f"Deleted {selected_collection}")
                    st.rerun()
                else:
                    st.error("Delete failed.")

    # LLM Settings (Read Only from .env)
    st.divider()
    st.write(f"**LLM Provider:** {os.getenv('LLM_PROVIDER', 'ollama')}")
    st.write(f"**Model:** {os.getenv('OLLAMA_MODEL', 'qwen35b-64k:latest')}")
    # Force read from environment to ensure latest values are shown
    chunk_strat = os.getenv('CHUNKING_STRATEGY', 'recursive')
    st.write(f"**Chunking Strategy:** {chunk_strat}")
    st.write(f"**Reranking:** {os.getenv('RERANKING', 'false')}")

    # Query Optimization Settings
    st.divider()
    st.subheader("Query Optimization")
    q_trans = st.checkbox("Query Transformation", value=os.getenv("QUERY_TRANSFORMATION", "false").lower()=="true", help="Use LLM to clarify vague queries.")
    q_exp = st.checkbox("Query Expansion", value=os.getenv("QUERY_EXPANSION", "false").lower()=="true", help="Generate 3 variations of the query for better retrieval.")
    # Temporarily update environment for the current run
    os.environ["QUERY_TRANSFORMATION"] = str(q_trans).lower()
    os.environ["QUERY_EXPANSION"] = str(q_exp).lower()

    # RAGAS Toggle
    st.divider()
    enable_ragas = st.checkbox("Enable RAGAS Evaluation", value=False, help="Evaluation can take significant time for each question.")

    # Conversation memory: new thread when collection changes
    if selected_collection:
        st.divider()
        st.subheader("Conversation")
        if st.session_state.conversation_collection != selected_collection:
            st.session_state.conversation_collection = selected_collection
            st.session_state.conversation_id = db.create_conversation(selected_collection)
            # Load previous messages from database for this conversation
            st.session_state.messages = db.get_conversation_messages(st.session_state.conversation_id)
            st.session_state.last_qa_run_id = None

    # Recent Q&A history (same collection)
    if selected_collection:
        st.divider()
        st.subheader("Recent Q&A (DB)")
        try:
            recent = db.list_recent_qa_runs(selected_collection, limit=25)
        except Exception:
            recent = []
        if recent:
            # Show sequential numbers starting from 1 (oldest/first question is #1)
            labels = [f"#{i+1} — {r['question'][:60]}{'…' if len(r['question']) > 60 else ''}" for i, r in enumerate(recent)]
            pick = st.selectbox("Browse past answers", options=range(len(recent)), format_func=lambda i: labels[i], key="history_pick")
            row = recent[pick]
            full = db.get_qa_run(row["id"])
            if full:
                with st.expander("View stored answer"):
                    st.markdown(f"**Q:** {full['question']}")
                    st.markdown(f"**A:** {full['answer']}")
                    # Delete button for this QA run
                    if st.button("🗑️ Delete", key=f"delete_qa_{row['id']}"):
                        db.delete_qa_run(row["id"])
                        st.success("Deleted")
                        st.rerun()
        else:
            st.caption("No saved Q&A yet for this collection.")

    # Export training data (JSONL) for fine-tuning / preference pipelines
    st.divider()
    st.subheader("Export for training (JSONL)")
    st.caption("Each line is one JSON object. Use likes for SFT; pair with regenerated answers for DPO later.")
    exp_scope = st.radio("Scope", ["Current collection", "All collections"], horizontal=True, key="export_scope")
    exp_rating = st.selectbox(
        "Filter",
        ["All rows", "Likes only", "Dislikes only", "Rated only (any)"],
        key="export_rating",
    )
    exp_fmt_label = st.selectbox(
        "Line format",
        [
            "record (full metadata)",
            "sft_messages (chat pairs)",
            "sft_alpaca (instruction/input/output)",
        ],
        key="export_fmt_label",
    )
    fmt_map = {
        "record (full metadata)": "record",
        "sft_messages (chat pairs)": "sft_messages",
        "sft_alpaca (instruction/input/output)": "sft_alpaca",
    }
    exp_fmt = fmt_map[exp_fmt_label]

    rating_filter = None
    require_rating = False
    if exp_rating == "Likes only":
        rating_filter = "like"
    elif exp_rating == "Dislikes only":
        rating_filter = "dislike"
    elif exp_rating == "Rated only (any)":
        require_rating = True

    coll_export = None
    should_export = True
    if exp_scope == "Current collection":
        if selected_collection:
            coll_export = selected_collection
        else:
            st.warning("Select a collection first, or choose All collections.")
            should_export = False

    try:
        if should_export:
            export_bytes = db.export_training_jsonl_bytes(
                collection_name=coll_export,
                rating_filter=rating_filter,
                require_rating=require_rating,
                format_name=exp_fmt,
            )
        else:
            export_bytes = b""
    except Exception as e:
        export_bytes = b""
        st.error(str(e))

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    fname = f"training_{exp_fmt}_{ts}.jsonl"
    st.download_button(
        label="Download JSONL",
        data=export_bytes,
        file_name=fname,
        mime="application/x-ndjson",
        key="download_training_jsonl",
    )

# Initialize Components
emb = get_embeddings(os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2"))
llm = get_llm(
    os.getenv("LLM_PROVIDER", "ollama"),
    os.getenv("OLLAMA_MODEL", "qwen35b-64k:latest"),
    os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
)

# Initialize RAG Engine with persistent state (avoid rebuilding Chroma/engine on reruns)
rag_engine = None
if selected_collection:
    llm_provider = os.getenv("LLM_PROVIDER", "ollama").lower()
    llm_model = os.getenv("OLLAMA_MODEL", "qwen35b-64k:latest") if llm_provider == "ollama" else "gpt-3.5-turbo"
    llm_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434") if llm_provider == "ollama" else ""
    persist_directory = os.getenv("PERSIST_DIRECTORY", "./chroma_db")

    engine_key = (
        f"collection={selected_collection}"
        f"|embed={os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')}"
        f"|llm={llm_provider}:{llm_model}"
        f"|base_url={llm_base_url}"
        f"|persist={persist_directory}"
        f"|chunk_size={os.getenv('CHUNK_SIZE', '800')}"
        f"|chunk_overlap={os.getenv('CHUNK_OVERLAP', '100')}"
        f"|chunking={os.getenv('CHUNKING_STRATEGY', 'recursive').lower()}"
        f"|reranking={os.getenv('RERANKING', 'false').lower()}"
        f"|rerank_model={os.getenv('RERANK_MODEL', 'ms-marco-MiniLM-L-6-v2')}"
    )

    if st.session_state.get("rag_engine_key") != engine_key:
        st.session_state["rag_engine_key"] = engine_key
        st.session_state["rag_engine"] = RAGEngine(
            collection_name=selected_collection,
            embeddings=emb,
            llm=llm,
        )

    rag_engine = st.session_state.get("rag_engine")
    st.session_state["engine_key_string"] = engine_key

# Main Interface with Tabs
st.title("Retrieval-Augmented Generation Knowledge Base")
if selected_collection:
    st.write(f"Currently using collection: **{selected_collection}**")

    # Tabs: Ask | Manage | System Prompt
    tab_ask, tab_manage, tab_system = st.tabs(["Ask a Question", "Manage Documents", "System Prompt"])

    # ============== SYSTEM PROMPT TAB ==============
    with tab_system:
        st.subheader("System Prompt Manager")
        st.caption("Create and manage system prompts for AI safety and behavior control.")

        # List existing prompts
        try:
            prompts = db.list_system_prompts()
            if prompts:
                st.write("### Existing Prompts")
                for p in prompts:
                    if p['name'] == 'collection_guard':
                        # collection_guard is always active and protected
                        st.write(f"**{p['name']}** :lock: :white_check_mark:")
                        with st.expander("View content", expanded=False):
                            st.text(p.get("content", ""))
                        st.caption("_Always active - cannot be deleted or disabled_")
                    else:
                        # User prompts with enable/disable
                        st.write(f"**{p['name']}**")
                        with st.expander("View content", expanded=False):
                            st.text(p.get("content", ""))
                        # Enable/Disable toggle
                        is_enabled = not p.get("is_default", True)  # Non-default prompts are enabled
                        enabled = st.checkbox("Enabled", value=is_enabled, key=f"enable_prompt_{p['id']}")
                        if enabled != is_enabled:
                            db.update_system_prompt(p['id'], is_default=not enabled)
                            st.rerun()
                        col1, col2 = st.columns([1, 3])
                        with col1:
                            if st.button("Delete", key=f"del_prompt_{p['id']}"):
                                if db.delete_system_prompt(p['id']):
                                    st.success(f"Deleted prompt '{p['name']}'")
                                    st.rerun()
                                else:
                                    st.error("Failed to delete prompt")
                    st.divider()
            else:
                st.caption("No system prompts defined yet.")
        except Exception as e:
            st.error(f"Error loading prompts: {e}")

        st.divider()
        st.subheader("Add New Prompt")

        # Add new prompt form
        new_name = st.text_input("Prompt Name", key="new_prompt_name", placeholder="e.g., strict_retrieval")
        new_content = st.text_area("Prompt Content", key="new_prompt_content", height=200,
                                   placeholder="Enter the system prompt template...")

        if st.button("Create Prompt", key="create_prompt_btn"):
            if new_name and new_content:
                try:
                    db.insert_system_prompt(new_name.strip(), new_content, is_default=False)
                    st.success(f"Created prompt '{new_name.strip()}'")
                    st.rerun()
                except Exception as e:
                    if "UNIQUE constraint" in str(e):
                        st.error("A prompt with this name already exists.")
                    else:
                        st.error(f"Error creating prompt: {e}")
            else:
                st.warning("Please provide both a name and content for the prompt.")

    # ============== ASK TAB ==============
    with tab_ask:
        # Chat History
        if "messages" not in st.session_state:
            st.session_state.messages = []

        # Display Chat History
        for message in st.session_state.messages:
            with st.chat_message(message["role"]):
                st.markdown(message["content"])

        # User Input
        if prompt := st.chat_input("Enter your question here..."):
            # Add user message to history
            st.session_state.messages.append({"role": "user", "content": prompt})
            chat_history = [
                {"role": m["role"], "content": m["content"]}
                for m in st.session_state.messages[:-1]
            ]
            if st.session_state.conversation_id is None:
                st.session_state.conversation_id = db.create_conversation(selected_collection)
                st.session_state.conversation_collection = selected_collection

            try:
                db.insert_message(st.session_state.conversation_id, "user", prompt)
            except Exception:
                pass

            with st.chat_message("user"):
                st.markdown(prompt)

            # Generate Response with Streaming
            with st.chat_message("assistant"):
                try:
                    q_emb = None
                    try:
                        q_emb = emb.embed_query(prompt)
                    except Exception:
                        q_emb = None

                    long_term_mem = ""
                    try:
                        top_k_lt = int(os.getenv("LONG_TERM_MEMORY_TOP_K", "3"))
                        if q_emb is not None:
                            similar = db.search_similar_qa(
                                selected_collection,
                                q_emb,
                                top_k=top_k_lt,
                            )
                            if similar:
                                parts = []
                                for s in similar:
                                    ans = s.get("answer", "") or ""
                                    if len(ans) > 800:
                                        ans = ans[:800] + "…"
                                    parts.append(
                                        f"(similarity {s.get('similarity', 0):.3f})\nQ: {s.get('question', '')}\nA: {ans}"
                                    )
                                long_term_mem = "\n\n".join(parts)
                    except Exception:
                        long_term_mem = ""

                    # Stream with real-time reasoning display
                    full_text = ""
                    response = None
                    reasoning_placeholder = st.empty()

                    # Stream everything (collect while showing reasoning progress)
                    for phase, content in rag_engine.query_stream(
                        prompt,
                        enable_ragas=enable_ragas,
                        chat_history=chat_history or None,
                        long_term_memory=long_term_mem or None,
                    ):
                        if phase == "final":
                            response = content
                            break

                        full_text += content

                        # Show reasoning progress in real-time with code format to preserve line breaks
                        reasoning_text = full_text.replace("REASONING:", "").replace("ANSWER:", "").strip()
                        reasoning_placeholder.markdown(f"```\n🤔 Thinking...\n{reasoning_text}\n```")

                    # After streaming completes, parse final values
                    if response:
                        answer = response["answer"]
                        opt_log = response.get("optimization_log", "")
                    else:
                        answer = full_text.split("ANSWER:", 1)[-1].strip() if "ANSWER:" in full_text else full_text
                        opt_log = ""

                    # Don't clear the placeholder - the last "Thinking: ..." message stays visible
                    # It will be overwritten by the next user interaction anyway

                    # Process sources
                    raw_sources = response.get("sources", []) if response else []
                    processed_sources = []
                    for s in raw_sources:
                        if s and s != "Unknown":
                            basename = os.path.basename(s)
                            if basename not in processed_sources:
                                processed_sources.append(basename)

                    metrics = response.get("metrics", {}) if response else {}

                    # Final Answer
                    st.markdown(f"**Answer:**\n\n{answer}")

                    # Display metrics and sources
                    metrics_text = f"\n\n---\n📊 **Metrics:** {metrics.get('total_tokens', 0)} tokens | {metrics.get('tokens_per_second', 0)} tps | {metrics.get('duration', 0)}s"

                    ragas = metrics.get("ragas")
                    if ragas:
                        metrics_text += f"\n\n**RAGAS Evaluation:**"
                        if ragas.get("error"):
                            metrics_text += f"\n- RAGAS Error: {ragas.get('error')}"
                        else:
                            metrics_text += f"\n- Faithfulness: {ragas.get('faithfulness', 0):.2f}"
                            metrics_text += f"\n- Answer Relevance: {ragas.get('answer_relevancy', ragas.get('answer_relevance', 0)):.2f}"
                            metrics_text += f"\n- Context Precision: {ragas.get('context_precision', 0):.2f}"

                    sources_text = f"\n\n**Sources:** {', '.join(processed_sources)}" if processed_sources else ""

                    st.markdown(f"{sources_text}{metrics_text}")

                    # Add assistant message to history
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": answer
                    })

                    # Persist to database
                    try:
                        ragas_m = metrics.get("ragas")
                        if isinstance(ragas_m, dict) and "raw" in ragas_m:
                            ragas_m = {k: v for k, v in ragas_m.items() if k != "raw"}
                        metrics_for_db = {k: v for k, v in metrics.items() if k != "ragas"}
                        qa_run_id = db.insert_qa_run(
                            st.session_state.conversation_id,
                            selected_collection,
                            prompt,
                            answer,
                            processed_sources,
                            metrics_for_db,
                            ragas_m,
                            opt_log,
                            st.session_state.get("engine_key_string", ""),
                            list(q_emb) if q_emb is not None else None,
                        )
                        db.insert_message(
                            st.session_state.conversation_id,
                            "assistant",
                            full_text,
                            qa_run_id=qa_run_id,
                        )
                        st.session_state.last_qa_run_id = qa_run_id
                    except Exception as persist_err:
                        st.caption(f"Could not save to database: {persist_err}")
                except Exception as e:
                    st.error(f"Error: {e}")

        # Feedback for last answer
        if st.session_state.get("last_qa_run_id"):
            st.divider()
            fb1, fb2, _ = st.columns([1, 1, 6])
            with fb1:
                if st.button("👍 Like", key=f"like_{st.session_state.last_qa_run_id}"):
                    db.upsert_rating(st.session_state.last_qa_run_id, "like")
                    st.session_state.last_qa_run_id = None  # Clear to hide buttons after rating
                    st.success("Thanks!")
                    st.rerun()
            with fb2:
                if st.button("👎 Dislike", key=f"dislike_{st.session_state.last_qa_run_id}"):
                    db.upsert_rating(st.session_state.last_qa_run_id, "dislike")
                    st.session_state.last_qa_run_id = None  # Clear to hide buttons after rating
                    st.success("Thanks!")
                    st.rerun()

    # ============== MANAGE TAB ==============
    with tab_manage:
        # Manage Documents in Current Collection
        st.subheader("Uploaded Documents")
        docs_in_coll = rag_engine.list_documents() if rag_engine else []
        if docs_in_coll:
            for doc_name in docs_in_coll:
                col1, col2 = st.columns([0.8, 0.2])
                col1.write(doc_name)
                if col2.button("Delete", key=f"del_{doc_name}"):
                    if rag_engine.delete_document(doc_name):
                        st.success(f"Deleted {doc_name}")
                        st.rerun()
                    else:
                        st.error(f"Failed to delete {doc_name}")
        else:
            st.info("No documents in this collection yet.")

        # Document Upload Section
        st.divider()
        st.subheader("Upload Documents")
        uploaded_files = st.file_uploader("Upload HTML, PDF, CSV, TXT, XLSX, or DOCX files", type=["html", "htm", "pdf", "csv", "txt", "xlsx", "xls", "docx", "doc"], accept_multiple_files=True, key="upload_docs")

        if uploaded_files:
            if st.button("Process Documents", key="process_docs"):
                docs_dir = os.path.join("./documents", selected_collection)
                os.makedirs(docs_dir, exist_ok=True)

                total_chunks = 0
                progress_bar = st.progress(0, text="Processing documents...")

                for idx, uploaded_file in enumerate(uploaded_files):
                    file_path = os.path.join(docs_dir, uploaded_file.name)
                    with open(file_path, "wb") as f:
                        f.write(uploaded_file.getbuffer())

                    # Internal progress update function (idx bound via default arg to avoid closure trap)
                    def update_progress(p, _idx=idx, _total=len(uploaded_files), _name=uploaded_file.name):
                        overall_p = (_idx + p) / _total
                        progress_bar.progress(overall_p, text=f"Processing {_name} ({int(p*100)}%)...")

                    try:
                        chunks_added = rag_engine.add_documents(file_path, progress_callback=update_progress)
                        total_chunks += chunks_added
                    except Exception as e:
                        st.error(f"Error processing {uploaded_file.name}: {e}")

                progress_bar.empty()
                st.success(f"Added {len(uploaded_files)} documents and created {total_chunks} chunks.")
else:
    st.warning("Please create a collection in the sidebar to get started.")
