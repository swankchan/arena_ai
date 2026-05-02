# Load environment variables first
from dotenv import load_dotenv
load_dotenv(override=True)

import os
import json
import pandas as pd
from datetime import datetime, timezone

import streamlit as st
import db
from rag_engine import RAGEngine
from tabular_engine import TabularDataHandler
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI

db.init_db()

# Streamlit App Configuration
st.set_page_config(page_title="RAG KB ", layout="wide")

# Custom CSS for chat message avatar colors (high contrast)
st.markdown("""
<style>
[data-testid="stChatAvatarIcon-user"] { color: #FFD700 !important; }
[data-testid="stChatAvatarIcon-assistant"] { color: #00FF00 !important; }
</style>
""", unsafe_allow_html=True)

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
if "name_entered" not in st.session_state:
    st.session_state.name_entered = False

# Sidebar: Collection Selection and Creation
with st.sidebar:
    st.title("Settings")

    # List Collections
    try:
        collections = RAGEngine.list_collections()
    except:
        collections = []

    # Select existing collection
    selected_collection = None
    if collections:
        if st.session_state.collection not in collections:
            st.session_state.collection = collections[0]

        selected_collection = st.selectbox(
            "",
            options=collections,
            index=collections.index(st.session_state.collection),
            key="collection_select"
        )
        st.session_state.collection = selected_collection

        # Load previous messages from database for this conversation when switching collections
        if st.session_state.conversation_collection != selected_collection:
            st.session_state.conversation_collection = selected_collection
            st.session_state.conversation_id = db.create_conversation(selected_collection)
            st.session_state.messages = db.get_conversation_messages(st.session_state.conversation_id)
            st.session_state.last_qa_run_id = None

    # Manage current collection section
    # Show caption only when a collection is selected
    # if selected_collection:
    #     st.caption(f"Active: {selected_collection}")

    # Shared input for both Rename and Create
    # When selected_collection exists: input is for rename
    # When no collection: input is for create
    # Use on_change callback to track when user enters text
    def on_name_change():
        st.session_state.name_entered = True

    new_name = st.text_input("New name...", key="collection_action_input", label_visibility="collapsed",
                             placeholder="Rename / New" if selected_collection else "Collection name...",
                             on_change=on_name_change)

    # Determine if name was entered (user interaction)
    name_entered = st.session_state.get("name_entered", False) and bool(new_name)

    # Rename and Create buttons side by side
    col1, col2 = st.columns(2)

    with col1:
        # Save button - dimmed when no collection selected OR no name entered
        save_disabled = not bool(selected_collection) or not name_entered
        if st.button("Save", key="rename_btn", use_container_width=True, disabled=save_disabled):
            if selected_collection and new_name:
                if new_name.lower().strip() != selected_collection:
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
        # Create button - dimmed when no name entered
        create_disabled = not name_entered
        if st.button("Create", key="create_collection_btn", use_container_width=True,
                     disabled=create_disabled):
            if new_name:
                new_name_clean = new_name.lower().strip()
                # Get embedding dimensions for the index mapping
                embedding_dims = None
                try:
                    emb = get_embeddings(os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2"))
                    embedding_dims = len(emb.embed_query("test"))
                except Exception:
                    # Fallback to default
                    embedding_dims = int(os.getenv("EMBEDDING_DIMS", 1024))
                success, message = RAGEngine.create_collection(new_name_clean, embedding_dims)
                if success:
                    st.session_state.collection = new_name_clean
                    st.session_state.conversation_collection = new_name_clean
                    st.session_state.conversation_id = db.create_conversation(new_name_clean)
                    st.success(message)
                    st.rerun()
                else:
                    st.error(message)

    # Delete button - full width below the Rename/Create buttons
    if selected_collection:
        # Confirmation modal for delete
        if "delete_confirm_stage" not in st.session_state:
            st.session_state.delete_confirm_stage = 0  # 0: no action, 1: confirm shown

        # Stage 1: Show delete button
        if st.session_state.delete_confirm_stage == 0:
            if st.button("Delete", type="primary", key="delete_btn", use_container_width=True):
                st.session_state.delete_confirm_stage = 1
                st.rerun()

        # Stage 2: Show confirmation dialog
        elif st.session_state.delete_confirm_stage == 1:
            # Warning box
            st.warning(f"Delete collection '{selected_collection}'?", icon="⚠️")
            st.caption("Type the collection name to confirm:")

            # Input for confirmation
            confirm_name = st.text_input(
                "Confirm collection name",
                key="confirm_delete_input",
                label_visibility="collapsed",
                placeholder="Type collection name..."
            )

            col1, col2 = st.columns(2)
            with col1:
                if st.button("Confirm", type="primary", key="confirm_delete_btn", use_container_width=True):
                    if confirm_name.strip() == selected_collection:
                        if RAGEngine.delete_collection(selected_collection):
                            st.session_state.collection = ""
                            st.session_state.conversation_collection = None
                            st.session_state.conversation_id = None
                            st.session_state.delete_confirm_stage = 0
                            st.toast(f"✅ Deleted collection: {selected_collection}", icon="🎉")
                            st.rerun()
                        else:
                            st.error("Delete failed.")
                            st.session_state.delete_confirm_stage = 0
                    else:
                        st.error("Collection name does not match.")
            with col2:
                if st.button("Cancel", key="cancel_delete_btn", use_container_width=True):
                    st.session_state.delete_confirm_stage = 0
                    st.rerun()

    # Query Optimization Settings
    st.divider()
    st.subheader("Query Optimization")
    q_trans = st.checkbox("Query Transformation", value=os.getenv("QUERY_TRANSFORMATION", "false").lower()=="true", help="Use LLM to clarify vague queries.")
    q_exp = st.checkbox("Query Expansion", value=os.getenv("QUERY_EXPANSION", "false").lower()=="true", help="Generate 3 variations of the query for better retrieval.")
    # Temporarily update environment for the current run
    os.environ["QUERY_TRANSFORMATION"] = str(q_trans).lower()
    os.environ["QUERY_EXPANSION"] = str(q_exp).lower()

    # LLM Settings (Read Only from .env)
    st.divider()
    st.subheader("Technical Details")
    chunk_strat = os.getenv('CHUNKING_STRATEGY', 'semantic')
    st.write(f"**Chunking:** {chunk_strat}")
    st.write(f"**Embedding:** {os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')}")
    st.write(f"**Searching: Elasticsearch**")  # Hardcoded for now since we're using Elasticsearch for search
    st.write(f"**Rerank:** {os.getenv('RERANK_MODEL', 'ms-marco-MiniLM-L-6-v2')}")
    st.write(f"**LLM:** {os.getenv('OLLAMA_MODEL', 'gemma4:26b')}")
    
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

    # Tabs: Ask | Q&A History | Manage | Tabular Analysis | System Prompt
    tab_ask, tab_history, tab_manage, tab_tabular, tab_system = st.tabs(["Ask a Question", "Q&A History", "Manage Documents", "Tabular Analysis", "System Prompt"])

    # ============== TABULAR DATA ANALYSIS TAB ==============
    with tab_tabular:
        st.subheader("Tabular Data Analysis")
        st.caption("Upload and analyze Excel/CSV files with SQL and Pandas.")

        # Re-initialize tabular handler to get latest files
        try:
            if rag_engine:
                rag_engine.tabular_handler = TabularDataHandler(selected_collection)
        except:
            pass

        # Show stored tabular files
        try:
            tabular_files = []
            if rag_engine and hasattr(rag_engine, 'tabular_handler'):
                tabular_files = rag_engine.tabular_handler.get_stored_files()

            if tabular_files:
                # Display uploaded files
                st.write("### Uploaded Tabular Files")
                for tf in tabular_files:
                    st.write(f"#### {tf['filename']}")
                    st.caption(f"Row count: {tf['row_count']} | Table name: `{tf['table_name']}`")
                    st.caption(f"Uploaded: {datetime.fromtimestamp(tf['created_at']).strftime('%Y-%m-%d %H:%M:%S')}")
                    st.divider()

                # Natural Language to SQL Interface
                st.write("### Natural Language Query")
                st.caption("Ask questions about your data in plain English. The AI will generate and execute SQL for you.")

                if tabular_files:
                    tf = tabular_files[0]
                    columns_data = json.loads(tf.get('columns_json', '{}'))
                    column_names = list(columns_data.keys())
                    table_name = tf['table_name']

                    st.code(f"Table: {table_name}\nColumns: {', '.join(column_names)}", language="text")

                    # Natural Language Input
                    nl_query = st.text_area(
                        "Ask a question about your data",
                        placeholder="e.g., What is the total sales? Show me the top 10 records. What is the average value?",
                        height=80,
                        key="nl_query_input"
                    )

                    if st.button("Generate & Run SQL", key="generate_sql_btn"):
                        if nl_query:
                            try:
                                # Use the RAGEngine to generate and execute SQL
                                if rag_engine:
                                    rag_engine.tabular_handler = TabularDataHandler(selected_collection)
                                    result = rag_engine._query_tabular_sql(nl_query)

                                    if result.get('sql_used'):
                                        st.success(f"SQL Query generated: `{result.get('sql_query', '')}`")
                                        if result.get('sql_generation_log'):
                                            st.caption(result.get('sql_generation_log'))

                                        results = result.get('results', [])
                                        if results and isinstance(results, list) and len(results) > 0:
                                            st.success(f"Query returned {len(results)} rows")
                                            results_df = pd.DataFrame(results)
                                            max_display_rows = 1000
                                            if len(results) > max_display_rows:
                                                st.info(f"Showing {max_display_rows} of {len(results)} rows.")
                                                results_df = results_df.head(max_display_rows)
                                            st.dataframe(results_df, use_container_width=True, height=600)

                                            csv = results_df.to_csv(index=False)
                                            st.download_button(
                                                label="Download Results (CSV)",
                                                data=csv,
                                                file_name="nl_query_results.csv",
                                                mime="text/csv"
                                            )
                                        else:
                                            st.info("Query executed successfully (no rows returned)")
                                    else:
                                        st.error(f"Could not generate SQL: {result.get('error', 'Unknown error')}")
                                else:
                                    st.error("RAG Engine not available. Please ensure the system is initialized.")
                            except Exception as e:
                                st.error(f"Error: {e}")
                        else:
                            st.warning("Please enter a question in natural language.")

                    st.divider()

                # SQL Query Interface
                st.write("### Query Data with SQL")
                st.caption("Write and execute SQL queries directly on your uploaded data.")

                # Get columns for reference
                if tabular_files:
                    tf = tabular_files[0]
                    columns_data = json.loads(tf.get('columns_json', '{}'))
                    column_names = list(columns_data.keys())
                    table_name = tf['table_name']

                    st.code(f"Table: {table_name}\nColumns: {', '.join(column_names)}", language="text")

                    # SQL Query Input
                    # Use a larger default to show more data (max 1000 for display)
                    default_query = f"SELECT * FROM {table_name} LIMIT 1000"
                    sql_query = st.text_area("SQL Query", value=default_query, height=100, key="sql_query_input")

                    col1, col2 = st.columns(2)
                    with col1:
                        if st.button("Run Query", key="run_sql_btn"):
                            try:
                                # Execute the query
                                handler = TabularDataHandler(selected_collection)
                                docs_dir = os.path.join("./documents", selected_collection)
                                tabular_files_local = [f for f in os.listdir(docs_dir) if f.endswith(('.csv', '.xlsx', '.xls'))]

                                if tabular_files_local:
                                    fname = tabular_files_local[0]
                                    fpath = os.path.join(docs_dir, fname)
                                    df, _ = handler.load_file(fpath)
                                    sql_conn = handler.create_sqlite_db(df, table_name)
                                    results = handler.query_sql(sql_conn, sql_query)

                                    if results and isinstance(results, list) and len(results) > 0:
                                        # Display results
                                        st.success(f"Query returned {len(results)} rows")
                                        results_df = pd.DataFrame(results)
                                        # Show up to 1000 rows (Streamlit default is ~200)
                                        max_display_rows = 1000
                                        if len(results) > max_display_rows:
                                            st.info(f"Showing {max_display_rows} of {len(results)} rows. Use download button for full data.")
                                            results_df = results_df.head(max_display_rows)
                                        st.dataframe(results_df, use_container_width=True, height=600)

                                        # Download button
                                        csv = results_df.to_csv(index=False)
                                        st.download_button(
                                            label="Download Results (CSV)",
                                            data=csv,
                                            file_name="query_results.csv",
                                            mime="text/csv"
                                        )
                                    else:
                                        st.info("Query executed successfully (no rows returned)")
                            except Exception as e:
                                st.error(f"Error executing query: {e}")

                    with col2:
                        pass

            else:
                st.info("No tabular data uploaded yet. Upload a CSV, XLSX, or XLS file in the 'Manage Documents' tab.")
        except Exception as e:
            st.error(f"Error loading tabular data: {e}")

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

                    sources_text = f"\n\n**Sources:** {', '.join(processed_sources)}" if processed_sources else ""

                    st.markdown(f"{sources_text}{metrics_text}")

                    # Add assistant message to history
                    st.session_state.messages.append({
                        "role": "assistant",
                        "content": answer
                    })

                    # Persist to database
                    try:
                        metrics_for_db = {k: v for k, v in metrics.items()}
                        qa_run_id = db.insert_qa_run(
                            st.session_state.conversation_id,
                            selected_collection,
                            prompt,
                            answer,
                            processed_sources,
                            metrics_for_db,
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

    # ============== Q&A HISTORY TAB ==============
    with tab_history:
        st.subheader("Recent Q&A (DB)")
        st.caption("Browse and manage past Q&A runs stored in the database.")
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
                        import traceback
                        err_type = type(e).__name__
                        err_msg = str(e)
                        err_trace = traceback.format_exc()
                        st.error(f"Error processing {uploaded_file.name}: {err_type}: {err_msg}")
                        with st.expander("View full traceback"):
                            st.code(err_trace)

                progress_bar.empty()
                st.success(f"Added {len(uploaded_files)} documents and created {total_chunks} chunks.")
else:
    st.warning("Please create a collection in the sidebar to get started.")
