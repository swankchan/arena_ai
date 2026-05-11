"""
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

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

# Custom CSS for chat message avatars
st.markdown("""
<style>
/* Hide default Streamlit chat avatars */
.stChatAvatarIcon {
    display: none !important;
}
/* Chat message container spacing */
.stChatMessage { gap: 0.5rem; }
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
if "show_thread_manager" not in st.session_state:
    st.session_state.show_thread_manager = False

# Load existing conversations from DB on startup for persistence
@st.cache_data(ttl=60)
def get_existing_conversation_ids():
    """Get existing conversation IDs per collection."""
    conversations = db.list_conversations(st.session_state.collection) if st.session_state.collection else []
    return conversations

# Sidebar: Collection Selection and Creation
with st.sidebar:
    st.title("Settings")

    # List Collections - from both Elasticsearch and database
    try:
        es_collections = set(RAGEngine.list_collections())
    except:
        es_collections = set()

    # Get collections with conversations from DB
    try:
        db_collections = set()
        conn = db.get_connection()
        conv_rows = conn.execute(
            "SELECT DISTINCT collection_name FROM conversations"
        ).fetchall()
        db_collections = {row["collection_name"] for row in conv_rows}
        conn.close()
    except:
        db_collections = set()

    # Combine: ES collections first, then DB-only collections
    all_collections = list(es_collections) + [c for c in db_collections if c not in es_collections]

    # Select existing collection
    if all_collections:
        # Use collection_select as the source of truth (it's updated by Streamlit before script runs)
        # Fall back to collection if collection_select is not set or invalid
        if "collection_select" in st.session_state and st.session_state.collection_select in all_collections:
            selected_collection = st.session_state.collection_select
        elif st.session_state.collection in all_collections:
            selected_collection = st.session_state.collection
        else:
            selected_collection = all_collections[0]
            st.session_state.collection = selected_collection

        current_index = all_collections.index(selected_collection)

        # Display the collection selector
        st.selectbox(
            "",
            options=all_collections,
            index=current_index,
            key="collection_select"
        )

        # Update session state to ensure consistency
        st.session_state.collection = selected_collection

        # Load previous messages from database for this conversation when switching collections
        if st.session_state.conversation_collection != selected_collection:
            st.session_state.conversation_collection = selected_collection
            # Get existing conversations for this collection, most recent first
            conversations = db.list_conversations(selected_collection)
            if conversations:
                # Reuse most recent conversation
                st.session_state.conversation_id = conversations[0]["id"]
            else:
                # No existing conversation - create new one
                st.session_state.conversation_id = db.create_conversation(selected_collection)
            st.session_state.messages = db.get_conversation_messages(st.session_state.conversation_id)
            st.session_state.last_qa_run_id = None
    else:
        selected_collection = None

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
                             on_change=on_name_change,
                             help="Enter a name to rename the current collection or create a new one")

    # Determine if name was entered (user interaction)
    name_entered = st.session_state.get("name_entered", False) and bool(new_name)

    # Rename and Create buttons side by side
    col1, col2 = st.columns(2)

    with col1:
        # Rename button - only shown when a collection is selected
        rename_disabled = not bool(selected_collection) or not name_entered
        if st.button("Rename", key="rename_btn", use_container_width=True, disabled=rename_disabled):
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
                    emb = get_embeddings(os.getenv("EMBEDDING_MODEL", "BAAI/bge-large-en-v1.5"))
                    embedding_dims = len(emb.embed_query("test"))
                except Exception:
                    # Fallback to default
                    embedding_dims = int(os.getenv("EMBEDDING_DIMS", 1024))
                success, message = RAGEngine.create_collection(new_name_clean, embedding_dims)
                if success:
                    st.session_state.collection = new_name_clean
                    st.session_state.conversation_collection = new_name_clean
                    st.session_state.conversation_id = db.create_conversation(new_name_clean)
                    st.session_state.messages = []  # Clear messages for new collection
                    st.session_state.rag_engine = None  # Clear cached engine to force re-initialization
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
                if st.button("Confirm", type="primary", key="confirm_delete_btn", use_container_width=True,
                             help="Confirm deletion of the collection and all its data"):
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
                if st.button("Cancel", key="cancel_delete_btn", use_container_width=True,
                             help="Cancel the deletion operation"):
                    st.session_state.delete_confirm_stage = 0
                    st.rerun()

    # Thread Manager Section
    st.divider()
    st.subheader("Threads")

    if selected_collection:
        # Get all conversations for this collection
        conversations = db.list_conversations(selected_collection)
        current_conv_id = st.session_state.get("conversation_id")

        # Display current thread info
        if current_conv_id:
            current_conv = db.get_conversation_by_id(current_conv_id)
            if current_conv:
                # Show current thread with an indicator
                thread_name = current_conv.get("name") or "Untitled"
                st.info(f"**Current Thread:** {thread_name}... ({current_conv_id[:8]}...)")

        # "New Thread" button
        if st.button("➕ New Thread", use_container_width=True, key="new_thread_btn",
                     help="Create a new conversation thread"):
            new_conv_id = db.create_conversation(selected_collection)
            st.session_state.conversation_id = new_conv_id
            st.session_state.messages = []
            st.session_state.last_qa_run_id = None
            st.rerun()

        # Thread selection dropdown
        st.divider()
        st.write("**Switch Thread:**")

        # Create options for dropdown
        conv_options = {}
        current_conv_in_list = False
        current_conv_index = 0
        for i, conv in enumerate(conversations):
            conv_id = conv["id"]
            if conv_id == current_conv_id:
                current_conv_in_list = True
                current_conv_index = i
            # Create a display label with name, message count and last active
            msg_count = conv.get("message_count", 0)
            last_active = conv.get("last_active")
            thread_name = conv.get("name") or "Untitled"
            if last_active:
                last_active_str = datetime.fromtimestamp(last_active).strftime('%m/%d %H:%M')
            else:
                last_active_str = "never"

            conv_options[conv_id] = f"{thread_name}... ({conv_id[:8]}...) ({msg_count} msgs, active {last_active_str})"

        # Create selectbox for thread switching
        selected_conv_id = st.selectbox(
            " ",
            options=list(conv_options.keys()),
            format_func=lambda x: conv_options[x],
            key="thread_selector",
            label_visibility="collapsed",
            index=current_conv_index if current_conv_in_list else 0
        )

        # Switch thread if different
        if selected_conv_id and selected_conv_id != current_conv_id:
            st.session_state.conversation_id = selected_conv_id
            st.session_state.messages = db.get_conversation_messages(selected_conv_id)
            st.session_state.last_qa_run_id = None
            st.rerun()

        # Delete thread button
        if conversations:
            st.divider()
            st.write("**Delete Thread:**")

            # Process delete request if confirmation received
            delete_requested = st.session_state.get("_delete_thread_requested")
            if delete_requested:
                conv_id_to_delete = delete_requested
                if db.delete_conversation(conv_id_to_delete):
                    if st.session_state.conversation_id == conv_id_to_delete:
                        # If deleting current thread, switch to most recent
                        remaining = db.list_conversations(selected_collection)
                        if remaining:
                            st.session_state.conversation_id = remaining[0]["id"]
                            st.session_state.messages = db.get_conversation_messages(st.session_state.conversation_id)
                        else:
                            # No remaining threads, create new one
                            st.session_state.conversation_id = db.create_conversation(selected_collection)
                            st.session_state.messages = []
                            st.session_state.last_qa_run_id = None
                    st.toast("✅ Thread deleted", icon="🎉")
                    st.session_state["_delete_thread_requested"] = None
                    st.rerun()
                else:
                    st.error("Failed to delete thread")
                    st.session_state["_delete_thread_requested"] = None

            # Create buttons for each thread
            for conv in conversations:
                conv_id = conv["id"]
                col_btn1, col_btn2 = st.columns([3, 1])
                thread_name = conv.get("name") or "Untitled"
                with col_btn1:
                    marker = " →" if conv_id == current_conv_id else "   "
                    st.write(f"{marker} {thread_name}... ({conv_id[:8]}...)")
                with col_btn2:
                    if st.button("🗑️", key=f"delete_conv_{conv_id}", help="Delete this thread"):
                        st.session_state["_delete_thread_requested"] = conv_id
                        st.rerun()

    # Query Optimization Settings
    st.divider()
    st.subheader("Query Optimization")
    q_trans = st.checkbox("Query Transformation", value=os.getenv("QUERY_TRANSFORMATION", "false").lower()=="true",
                          help="Use LLM to clarify vague queries. Enable when your question is ambiguous or needs rephrasing for better search results.")
    q_exp = st.checkbox("Query Expansion", value=os.getenv("QUERY_EXPANSION", "false").lower()=="true",
                        help="Generate 3 query variations for better coverage. Enable for complex questions needing multiple angles.")
    # Temporarily update environment for the current run
    os.environ["QUERY_TRANSFORMATION"] = str(q_trans).lower()
    os.environ["QUERY_EXPANSION"] = str(q_exp).lower()

    # LLM Settings (Read Only from .env)
    st.divider()
    st.subheader("Technical Details")
    chunk_strat = os.getenv('CHUNKING_STRATEGY', 'semantic')
    st.write(f"**Chunking:** {chunk_strat}")
    st.write(f"**Embedding:** {os.getenv('EMBEDDING_MODEL', 'BAAI/bge-large-en-v1.5')}")
    st.write(f"**Searching: [Elasticsearch](https://www.elastic.co/elasticsearch/)**")
    st.write(f"**Rerank:** {os.getenv('RERANK_MODEL', 'ms-marco-MiniLM-L-12-v2')}")
    st.write(f"**LLM:** {os.getenv('OLLAMA_MODEL', 'qwen3.5:9b')}")
    
# Initialize Components
emb = get_embeddings(os.getenv("EMBEDDING_MODEL", "BAAI/bge-large-en-v1.5"))
llm = get_llm(
    os.getenv("LLM_PROVIDER", "ollama"),
    os.getenv("OLLAMA_MODEL", "qwen3-coder-next:latest"),
    os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
)

# Initialize RAG Engine with persistent state (avoid rebuilding Chroma/engine on reruns)
rag_engine = None
if selected_collection:
    llm_provider = os.getenv("LLM_PROVIDER", "ollama").lower()
    llm_model = os.getenv("OLLAMA_MODEL", "qwen3-coder-next:latest") if llm_provider == "ollama" else "gpt-3.5-turbo"
    llm_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434") if llm_provider == "ollama" else ""
    persist_directory = os.getenv("PERSIST_DIRECTORY", "./chroma_db")

    engine_key = (
        f"collection={selected_collection}"
        f"|embed={os.getenv('EMBEDDING_MODEL', 'BAAI/bge-large-en-v1.5')}"
        f"|llm={llm_provider}:{llm_model}"
        f"|base_url={llm_base_url}"
        f"|persist={persist_directory}"
        f"|chunk_size={os.getenv('CHUNK_SIZE', '500')}"
        f"|chunk_overlap={os.getenv('CHUNK_OVERLAP', '100')}"
        f"|chunking={os.getenv('CHUNKING_STRATEGY', 'semantic').lower()}"
        f"|reranking={os.getenv('RERANKING', 'false').lower()}"
        f"|rerank_model={os.getenv('RERANK_MODEL', 'ms-marco-MiniLM-L-12-v2')}"
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
st.title("RAG KB")
if selected_collection:
    st.write(f"Currently using collection: **{selected_collection}**")

    # Tabs: Ask | Q&A History | Manage | Tabular Analysis | System Prompt | Help & About
    tab_ask, tab_history, tab_manage, tab_tabular, tab_system, tab_help = st.tabs(["Ask a Question", "Q&A History", "Manage Documents", "Tabular Analysis", "System Prompt", "Help & About"])

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
                # Display uploaded files with table selection
                st.write("## Uploaded Tabular Files")

                # Table selector dropdown
                table_options = {tf['filename']: tf for tf in tabular_files}
                selected_filename = st.selectbox(
                    "Select table to analyze",
                    options=list(table_options.keys()),
                    key="tabular_table_selector",
                    help="Choose the table to analyze. Tables are created from uploaded CSV/XLSX files."
                )
                tf = table_options[selected_filename]

                st.caption(f"Row count: {tf['row_count']} | Table name: `{tf['table_name']}`")
                st.caption(f"Uploaded: {datetime.fromtimestamp(tf['created_at']).strftime('%Y-%m-%d %H:%M:%S')}")

                # Delete button for selected file
                col1, col2 = st.columns([3, 1])
                with col2:
                    if st.button("Delete", key=f"delete_{tf['id']}",
                                help=f"Delete '{tf['filename']}' and its associated data"):
                        try:
                            if rag_engine and hasattr(rag_engine, 'tabular_handler'):
                                if rag_engine.tabular_handler.delete_file(tf['id']):
                                    st.success(f"Deleted '{tf['filename']}'")
                                    st.rerun()
                                else:
                                    st.error("Failed to delete file")
                        except Exception as e:
                            st.error(f"Error deleting file: {e}")

                st.divider()

                # Natural Language to SQL Interface
                st.write("### Natural Language Query")
                st.caption("Ask questions about your data in plain English. The AI will generate and execute SQL for you.")

                columns_data = json.loads(tf.get('columns_json', '{}'))
                column_names = list(columns_data.keys())
                table_name = tf['table_name']

                st.code(f"Table: {table_name}\nColumns: {', '.join(column_names)}", language="text")

                # Natural Language Input
                nl_query = st.text_area(
                    "Ask a question about your data",
                    placeholder="e.g., What is the total sales? Show me the top 10 records. What is the average value?",
                    height=80,
                    key="nl_query_input",
                    help="Ask questions in plain English. The AI will generate SQL for you using pattern matching or LLM fallback."
                )

                if st.button("Generate & Run SQL", key="generate_sql_btn",
                             help="Generate SQL from your natural language question and execute it on the selected table"):
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
                                        mime="text/csv",
                                        help="Export query results as CSV for analysis in Excel or other tools"
                                    )
                                else:
                                    st.info("Query executed successfully (no rows returned)")
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

                # Get columns for reference (use the already selected table)
                columns_data = json.loads(tf.get('columns_json', '{}'))
                column_names = list(columns_data.keys())
                table_name = tf['table_name']

                st.code(f"Table: {table_name}\nColumns: {', '.join(column_names)}", language="text")

                # SQL Query Input
                # Use a larger default to show more data (max 1000 for display)
                default_query = f"SELECT * FROM {table_name} LIMIT 1000"
                sql_query = st.text_area("SQL Query", value=default_query, height=100, key="sql_query_input",
                                         help="Write and execute raw SQL queries directly on your uploaded data. Use the table schema shown above.")

                col1, col2 = st.columns(2)
                with col1:
                    if st.button("Run Query", key="run_sql_btn",
                                 help="Execute the SQL query on the selected table"):
                        try:
                            # Execute the query using the selected file's table name
                            handler = TabularDataHandler(selected_collection)
                            docs_dir = os.path.join("./documents", selected_collection)
                            tabular_files_local = [f for f in os.listdir(docs_dir) if f.endswith(('.csv', '.xlsx', '.xls'))]

                            # Find the selected file by matching table_name
                            fname = None
                            for f in tabular_files_local:
                                # Generate expected table name from filename
                                test_handler = TabularDataHandler(selected_collection)
                                expected_name = f"tabular_{test_handler._sanitize_table_name(selected_collection)}"
                                if test_handler._sanitize_table_name(f.rsplit('.', 1)[0]) in table_name:
                                    fname = f
                                    break

                            if fname is None and tabular_files_local:
                                fname = tabular_files_local[0]

                            if fname:
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
        new_name = st.text_input("Prompt Name", key="new_prompt_name", placeholder="e.g., strict_retrieval",
                                 help="Enter a descriptive name for your system prompt (e.g., 'strict_retrieval', 'casual_tone')")
        new_content = st.text_area("Prompt Content", key="new_prompt_content", height=200,
                                   placeholder="Enter the system prompt template...",
                                   help="Enter the system prompt template that guides AI behavior. This will be appended to the collection guard (always-active safety prompt).")

        if st.button("Create Prompt", key="create_prompt_btn",
                     help="Create a new system prompt that will be appended to the collection guard (always-active safety prompt)."):
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
            avatar = "🧑" if message["role"] == "user" else "👽"
            with st.chat_message(message["role"], avatar=avatar):
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

            with st.chat_message("user", avatar="🧑"):
                st.markdown(prompt)

            # Generate Response with Streaming
            with st.chat_message("assistant", avatar="👽"):
                try:
                    q_emb = None
                    try:
                        q_emb = emb.embed_query(prompt)
                    except Exception:
                        q_emb = None

                    # Stream with real-time reasoning display
                    full_text = ""
                    response = None
                    reasoning_placeholder = st.empty()

                    # Stream everything (collect while showing reasoning progress)
                    for phase, content in rag_engine.query_stream(
                        prompt,
                        chat_history=chat_history or None,
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

        # Use a session state key that is reset AFTER rerun to clear the uploader
        upload_key = f"upload_docs_{st.session_state.get('upload_reset_counter', 0)}"
        uploaded_files = st.file_uploader("Upload HTML, PDF, CSV, TXT, XLSX, or DOCX files", type=["html", "htm", "pdf", "csv", "txt", "xlsx", "xls", "docx", "doc"], accept_multiple_files=True, key=upload_key)

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

                # Increment counter to force a new uploader key on rerun
                st.session_state.upload_reset_counter = st.session_state.get('upload_reset_counter', 0) + 1
                st.rerun()

    # ============== HELP & ABOUT TAB ==============
    with tab_help:
        st.title("Help & About")

        st.markdown("""
        ## 🎓 Welcome to the RAG Knowledge Base

        This application uses **Retrieval-Augmented Generation (RAG)** to answer questions based on your documents.
        It combines vector search with large language models to provide accurate, sourced answers.
        """)

        # What is RAG
        with st.expander("📚 What is RAG?", expanded=True):
            st.markdown("""
            **Retrieval-Augmented Generation (RAG)** is an AI framework that:

            1. **Retrieves** relevant information from your documents
            2. **Augments** the LLM's knowledge with this information
            3. **Generates** answers based on both the retrieved context and the LLM's training

            **Why RAG instead of a regular LLM?**
            - ✅ Answers are grounded in your specific documents
            - ✅ Provides source citations for verification
            - ✅ Can be updated without retraining the model
            - ✅ Reduces hallucinations (made-up answers)
            """)

        # The RAG Pipeline
        with st.expander("⚙️ The RAG Pipeline", expanded=True):
            st.markdown("""
            ### Step-by-Step: How Your Question Becomes an Answer

            ```mermaid
            flowchart TD
                A[Your Question] --> B{Query Optimization?}
                B -->|Yes| C[LLM Rewrites Question]
                B -->|No| D[Original Question]
                C --> E[Convert to Vector]
                D --> E
                E --> F[Elasticsearch Search]
                F --> G{Rerank?}
                G -->|Yes| H[FlashRank Relevance Sort]
                G -->|No| I[Return Top K Results]
                H --> I
                I --> J[Build Context]
                J --> K[LLM Reasoning]
                K --> L[Final Answer]
            ```

            #### 1. Query Optimization (Optional)
            - **Transformation**: LLM rewrites vague questions for better search
            - **Expansion**: Generates 3 question variations for better coverage

            #### 2. Vector Retrieval
            - Your question → 1024-dimensional embedding vector
            - Searches Elasticsearch for similar vectors (cosine similarity)
            - Returns TOP_K most relevant document chunks

            #### 3. Reranking (Optional)
            - FlashRank model re-scores documents by relevance
            - Ensures best results appear first

            #### 4. Context Assembly
            - Combines retrieved documents + chat history + system prompts
            - Builds rich prompt for the LLM

            #### 5. Response Generation
            - LLM reasons step-by-step first
            - Then provides concise final answer
            - Tracks performance metrics
            """)

        # Technical Deep Dives
        with st.expander("🚀 Technical Deep Dives", expanded=True):
            st.markdown("""
            ### Elasticsearch - Production-Grade Vector Store

            **Why Elasticsearch?**
            - Scalable to millions of documents
            - Advanced filtering capabilities
            - Hybrid search (vector + keyword)
            - Production-ready with replication and sharding

            **How it works:**
            - Each document chunk → vector embedding
            - Vectors stored in `rag_{collection_name}` index
            - Cosine similarity search for relevance

            ---

            ### HuggingFace Embeddings - Language Understanding

            **Model**: `bge-large-en-v1.5` (1024 dimensions)

            **What is an embedding?**
            - Numerical representation of text as a vector
            - 1024 numbers capture semantic meaning
            - Similar meanings → similar vectors

            **Example:**
            ```
            "Apple fruit"    → [0.1, 0.8, -0.3, ...]
            "Apple company"  → [0.2, 0.7, -0.2, ...]  ← Similar!
            "Banana fruit"   → [-0.5, 0.3, 0.9, ...]  ← Different
            ```

            ---

            ### FlashRank - Lightweight Reranking

            **Model**: `ms-marco-MiniLM-L-12-v2`

            **Why rerank?**
            - First-pass search finds candidates
            - Reranker re-scores by relevance
            - Better results with minimal overhead

            **Under the hood:**
            - Cross-encoder scores each document
            - Re-sorts by relevance score
            - Takes ~50ms per document

            ---

            ### Token-Aware Processing

            Prevents context overflow by:
            - Counting tokens (not just characters)
            - Truncating long messages
            - Managing conversation history size

            **Key limits:**
            - `CHAT_HISTORY_MAX_MESSAGES`: 12 turns
            - `CHAT_HISTORY_MAX_CHARS_PER_MESSAGE`: 2000 chars

            ---

            ### Conversation Memory

            The RAG system maintains two types of memory:

            **1. Short-Term Memory (Active in Current Thread)**
            - Contains recent conversation history from the current chat thread
            - Limited to 12 messages (configurable via `CHAT_HISTORY_MAX_MESSAGES`)
            - Used for follow-up questions where the user refers to "it", "that", etc.
            - Stored in SQLite `messages` table

            **2. Long-Term Memory (Similar Past Q&A)**
            - Searches past Q&A runs in the same collection for similar questions
            - Uses cosine similarity on question embeddings to find relevant past interactions
            - Limited to top 3 most similar past Q&A pairs (configurable)
            - **Note**: Currently stored but not actively injected into prompts (feature ready for activation)
            - Stored in SQLite `qa_runs` table with question embeddings

            **Memory Flow:**
            ```
            User Question
                 ↓
            [Short-term] Chat history (last 12 messages) → Injected into context
                 ↓
            [Long-term] Search similar past Q&A (top 3) → Available for injection
                 ↓
            [Vector Search] Retrieve relevant document chunks (TOP_K)
                 ↓
            [LLM] Combine all context → Generate answer
            ```

            ---

            ### Multi-Query Expansion

            **Problem**: Single query may miss relevant docs
            **Solution**: Generate 3 variations

            **Example:**
            ```
            Original: "Tell me about the financial results"

            Variation 1: "What were the Q4 2024 revenue figures?"
            Variation 2: "Show me the profit and loss statement"
            Variation 3: "What was the earnings per share?"

            Results are merged and deduplicated.
            ```
            """)

        # Best Practices
        with st.expander("💡 Best Practices", expanded=True):
            st.markdown("""
            ### For Better Search Results

            1. **Be specific**
               - ❌ "Tell me about the numbers"
               - ✅ "What was the revenue in Q4 2024?"

            2. **Use key terms**
               - Include product names, dates, metrics

            3. **Try different phrasings**
               - If first answer isn't great, rephrase

            ### Query Optimization Settings

            | Setting | When to Enable | Example |
            |---|---|---|
            | Query Transformation | Vague questions | "Tell me about results" |
            | Query Expansion | Complex questions | "Compare Q1, Q2, Q3 results" |

            ### Document Preparation

            - Break large PDFs into logical sections
            - Use clear, descriptive filenames
            - Include metadata in document text
            """)

        # System Architecture
        with st.expander("🏗️ System Architecture", expanded=True):
            st.markdown("""
            ### Components Overview

            ```
            ┌────────────────────────────────────────────────────┐
            │      Streamlit Web Interface (app.py)              │
            │            (Your browser)                          │
            └────────────────┬───────────────────────────────────┘
                             │
                             ▼
            ┌────────────────────────────────────────────────────┐
            │         RAG Engine (rag_engine.py)                 │
            │      - Query processing                            │
            │      - Retrieval orchestration                     │
            │      - Response generation                         │
            └──────────────┬───────────────────────────┬─────────┘
                           │                           │
                           ▼                           ▼
            ┌──────────────────────┐  ┌──────────────────────────┐
            │      Elasticsearch   │  │       SQLite Database    │
            │      (Vector Store)  │  │       (Conversations,    │
            └──────────────────────┘  └──────────────────────────┘
            ```


            ### Data Flow

            1. **Document Ingestion**:
               ```
               File Upload → Text Splitter → Embedding → Vector → Elasticsearch
               ```

            2. **Query Processing**:
               ```
               User Question → Vector → Elasticsearch → Documents → LLM → Answer
               ```

            3. **Persistence**:
               ```
               Chat messages → SQLite
               QA runs → SQLite with ratings
               System prompts → SQLite
               ```
            """)

        # Configuration Reference
        with st.expander("⚙️ Configuration Reference", expanded=True):
            st.markdown("""
            ### Environment Variables

            | Variable | Purpose | Default |
            |---|---|---|
            | `LLM_PROVIDER` | LLM provider (ollama/openai) | `ollama` |
            | `OLLAMA_MODEL` | Model name for Ollama | `qwen3-coder-next:latest` |
            | `CHUNK_SIZE` | Text chunk size (tokens) | `1000` |
            | `CHUNK_OVERLAP` | Chunk overlap (tokens) | `100` |
            | `TOP_K` | Documents to retrieve | `4` |
            | `QUERY_TRANSFORMATION` | Enable query rewriting | `false` |
            | `QUERY_EXPANSION` | Enable multi-query | `false` |
            | `RERANKING` | Enable FlashRank | `false` |

            ### Key Files

            | File | Purpose |
            |---|---|
            | `app.py` | Streamlit web interface |
            | `rag_engine.py` | Core RAG logic |
            | `db.py` | SQLite persistence |
            | `tabular_engine.py` | SQL & Excel analysis |
            | `elastic_store.py` | Elasticsearch integration |
            """)

        # Quick Start Guide
        with st.expander("🚀 Quick Start Guide", expanded=True):
            st.markdown("""
            ### First Time Setup

            1. **Start Elasticsearch**
               ```bash
               docker compose -f docker-compose.elasticsearch.yml up -d
               ```

            2. **Start the app**
               ```bash
               streamlit run app.py
               ```

            3. **Create a collection**
               - Enter a name in the sidebar
               - Click "Create"

            4. **Upload documents**
               - Go to "Manage Documents" tab
               - Select files (PDF, CSV, etc.)
               - Click "Process Documents"

            5. **Ask questions**
               - Go to "Ask a Question" tab
               - Type your question
               - Watch the AI search and answer!

            ### Need Help?

            - Check the "Help & About" tab for detailed explanations
            - Review the sidebar "Technical Details" for system info
            - Enable query optimization for better results
            """)

        # Application Usage
        with st.expander("📱 Application Usage", expanded=True):
            st.markdown("""
            ### Overview

            The RAG Knowledge Base provides multiple tabs for managing your documents and asking questions.
            Below is a walkthrough of each feature.

            ---

            ### 1. Collection Management (Sidebar)

            Collections organize your document knowledge bases. Think of each collection as a separate "workspace".

            **Create a new collection:**
            1. Enter a name (e.g., "project-alpha", "customer-support")
            2. Click **Create**

            **Rename a collection:**
            1. Select the collection from the dropdown
            2. Enter a new name in the text box
            3. Click **Save**

            **Delete a collection:**
            1. Click **Delete** button
            2. Confirm by typing the collection name
            3. Click **Confirm**

            ---

            ### 2. Thread Management (Sidebar)

            Each collection can have multiple conversation threads (threads).

            **Create a new thread:**
            - Click **+ New Thread** in the sidebar

            **Switch between threads:**
            - Use the dropdown under "Switch Thread"
            - Select any thread to load its conversation history

            **Delete a thread:**
            - Click the trash icon next to a thread
            - Toggle the confirmation switch
            - Click again to confirm

            ---

            ### 3. Ask a Question Tab

            This is where you interact with your knowledge base.

            **Typical workflow:**
            1. Type your question in the input box
            2. Press Enter or click the send button
            3. Watch the AI:
               - Process your question
               - Retrieve relevant documents
               - Generate a reasoning chain
               - Provide the final answer
            4. Rate the answer with 👍 or 👍

            **Tips for better results:**
            - Be specific and clear
            - Include key terms and context
            - Try different phrasings if the first answer isn't good

            ---

            ### 4. Query Optimization Settings

            Located in the sidebar under "Query Optimization":

            **Query Transformation:**
            - **Enable when:** Your question is vague or needs rephrasing
            - **Example:** "Tell me about results" → "What were the Q4 2024 revenue figures?"
            - **Use case:** When the AI doesn't understand your intent

            **Query Expansion:**
            - **Enable when:** You need comprehensive coverage
            - **What it does:** Generates 3 query variations and merges results
            - **Example:** "Compare performance" → 3 different angle queries

            ---

            ### 5. Q&A History Tab

            Browse past conversations stored in the database.

            **Features:**
            - View up to 25 most recent Q&A runs
            - Click to expand and see the full answer
            - Delete individual Q&A runs

            **Note:** Deleting a Q&A run also deletes associated messages.

            ---

            ### 6. Manage Documents Tab

            Upload and manage documents for your collection.

            **Upload documents:**
            1. Select files (PDF, CSV, TXT, HTML, DOCX, XLSX, XLS)
            2. Click **Process Documents**
            3. Wait for processing to complete
            4. Review the chunk count

            **Supported formats:**
            - **Text-based:** PDF, TXT, HTML, CSV, DOCX, XLSX, XLS
            - **Document handling:** Text extraction and chunking

            **Delete documents:**
            - Click the trash icon next to a document
            - This removes all chunks for that document

            ---

            ### 7. Tabular Analysis Tab

            Analyze CSV/Excel data with SQL and natural language.

            **Upload data:**
            1. Go to "Manage Documents" tab
            2. Upload your CSV or Excel file
            3. Process it normally

            **Natural Language Query:**
            1. Select a table from the dropdown
            2. Ask questions in plain English
            3. The system converts to SQL and executes

            **Direct SQL Query:**
            1. View the table schema (columns shown)
            2. Write your SQL query
            3. Click "Run Query"
            4. View results and download as CSV

            ---

            ### 8. System Prompt Tab

            Manage AI behavior with custom prompts.

            **Built-in prompts:**
            - `collection_guard` - Always active, safety prompt
              - Cannot be deleted or disabled
              - Ensures AI sticks to document context

            **Custom prompts:**
            - Click to expand and view content
            - Toggle "Enabled" checkbox to activate
            - Click trash icon to delete

            **Prompt order:**
            - `collection_guard` is always applied first
            - All enabled custom prompts are appended after

            ---

            ### 9. Help & About Tab

            This tab contains:
            - RAG explanation
            - Architecture details
            - Technical deep dives
            - Configuration reference

            ---

            ### Screenshot Reference

            ```
            ┌─────────────────────────────────────────────────────────────────────────────┐
            │                        RAG Knowledge Base                                   │
            ├─────────────────────────────┬───────────────────────────────────────────────┤
            │  [Collections ▼]            │  Ask a Question              Q&A History      │
            │  [New name...]  Create      │  ┌──────────────────────────────────────────┐ │
            │  [Rename] [Save] [Delete]   │  │ User: What is the revenue?               │ │
            │                             │  │ Assistant: [Answer...]                   │ │
            │  Threads                    │  │                                          │ │
            │  [New Thread]               │  │ [👍 Like] [👎 Dislike]                   │ │
            │  [Thread selector ▼]        │  └──────────────────────────────────────────┘ │
            │                             │                                               │
            │  Query Optimization         │  Manage Documents        Tabular Analysis     │
            │  [✓] Query Transformation   │  ┌──────────────────────────────────────────┐ │
            │  [ ] Query Expansion        │  │ Document list with delete buttons        │ │
            │                             │  │ [Upload] Process Documents               │ │
            │  Technical Details          │  └──────────────────────────────────────────┘ │
            │  - Chunking: semantic       │                                               │
            │  - Embedding: BAAI/bge...   │  System Prompt           Help & About         │
            │  - Searching: Elasticsearch │  ┌──────────────────────────────────────────┐ │
            │  - Rerank: FlashRank        │  │ [Prompt list with enable/delete]         │ │
            │  - LLM: qwen3.5:9b          │  │ [Add new prompt form]                    │ │
            │                             │  └──────────────────────────────────────────┘ │
            └─────────────────────────────┴───────────────────────────────────────────────┘
            ```

            """)

        # Footer
        st.divider()
        st.caption(f"Apache 2.0 License | Developed by Swank Canton | Contact: swankchan@link.cuhk.edu.hk")

    # ============== ASK TAB ==============
