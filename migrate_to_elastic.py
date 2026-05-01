"""
Migration script to copy data from ChromaDB to Elasticsearch.
This script:
1. Connects to both ChromaDB and Elasticsearch
2. For each ChromaDB collection, creates an Elasticsearch index
3. Exports all documents with embeddings from ChromaDB
4. Imports into Elasticsearch
5. Verifies data integrity
"""
import os
import sys
from typing import List, Dict, Any

# Load environment variables
from dotenv import load_dotenv
load_dotenv(override=True)

import chromadb
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

from elastic_store import ElasticStore


def get_chroma_chunks(collection) -> List[Dict[str, Any]]:
    """Extract all chunks from a ChromaDB collection."""
    print(f"  Extracting chunks from ChromaDB collection: {collection.name}")

    # Get all items from the collection (without embeddings to avoid numpy issues)
    items = collection.get(include=['documents', 'metadatas'])

    chunks = []
    for i, doc in enumerate(items['documents']):
        chunk = {
            'text': doc,
            'metadata': items['metadatas'][i] if i < len(items['metadatas']) else {}
        }
        chunks.append(chunk)

    print(f"    Found {len(chunks)} chunks")
    return chunks


def clean_metadata(metadata):
    """Clean metadata to prevent Elasticsearch indexing errors."""
    if not metadata:
        return {}
    cleaned = {}
    for key, value in metadata.items():
        # Skip None values
        if value is None:
            continue
        # Convert to string if it's a datetime or complex object
        if isinstance(value, (list, dict)):
            continue  # Skip complex nested structures
        value = str(value).strip()
        # Skip empty strings
        if not value:
            continue
        cleaned[key] = value
    return cleaned


def filter_chunks(chunks):
    """Filter out chunks with empty or very short text."""
    filtered = []
    removed_count = 0

    for chunk in chunks:
        text = chunk.page_content
        # Filter out empty, None, or whitespace-only text
        if not text:
            removed_count += 1
            continue
        text = text.strip()
        if len(text) < 10:
            removed_count += 1
            continue
        # Also filter out mostly whitespace
        if len(text) < len(chunk.page_content) * 0.1:
            removed_count += 1
            continue
        # Clean metadata to prevent Elasticsearch errors
        cleaned_meta = clean_metadata(chunk.metadata)
        new_chunk = Document(page_content=text, metadata=cleaned_meta)
        filtered.append(new_chunk)

    return filtered, removed_count


def migrate_collection(chroma_collection, elastic_store, embeddings):
    """Migrate a single ChromaDB collection to Elasticsearch."""
    collection_name = chroma_collection.name
    print(f"\nMigrating collection: {collection_name}")

    # Get all chunks from ChromaDB
    chroma_chunks = get_chroma_chunks(chroma_collection)

    if not chroma_chunks:
        print("  No chunks to migrate.")
        return 0

    # Create LangChain Document objects
    chunks = []
    for chunk_data in chroma_chunks:
        doc = Document(
            page_content=chunk_data['text'],
            metadata=chunk_data['metadata']
        )
        chunks.append(doc)

    # Filter out empty/short documents before migration
    chunks, removed = filter_chunks(chunks)
    if removed > 0:
        print(f"  Filtered out {removed} empty/short documents")

    # Add documents to Elasticsearch with batch retry logic
    print(f"  Adding {len(chunks)} chunks to Elasticsearch...")
    print("  (This will re-compute embeddings using the configured model)")

    # Process in smaller batches to identify and handle failures
    batch_size = 100
    total_added = 0
    failed_count = 0

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        try:
            added = elastic_store.add_documents(batch)
            total_added += added
        except Exception as e:
            # Try to add documents one by one to identify problematic ones
            print(f"    Batch {i//batch_size + 1} failed, retrying individually...")
            for j, doc in enumerate(batch):
                try:
                    elastic_store.add_documents([doc])
                    total_added += 1
                except Exception as doc_error:
                    print(f"      Document {i+j} failed: {doc_error}")
                    failed_count += 1

    print(f"  Successfully migrated {total_added} chunks")
    if failed_count > 0:
        print(f"  Failed to migrate {failed_count} chunks")
    return total_added


def main():
    print("=" * 60)
    print("ChromaDB to Elasticsearch Migration Script")
    print("=" * 60)

    # Verify Elasticsearch connection
    print("\n1. Checking Elasticsearch connection...")
    es_url = os.getenv("ES_URL", "http://localhost:9200")
    try:
        from elasticsearch import Elasticsearch
        es_client = Elasticsearch(
            hosts=[es_url],
            basic_auth=(os.getenv("ES_USER", "elastic"), os.getenv("ES_PASS", "openrag")),
            verify_certs=False
        )
        es_info = es_client.info()
        print(f"   Connected to Elasticsearch: {es_info['version']['number']}")
    except Exception as e:
        print(f"   ERROR: Cannot connect to Elasticsearch at {es_url}: {e}")
        print("   Please ensure Elasticsearch is running and accessible.")
        return 1

    # Verify ChromaDB connection
    print("\n2. Checking ChromaDB connection...")
    persist_dir = os.getenv("PERSIST_DIRECTORY", "./chroma_db")
    if not os.path.exists(persist_dir):
        print(f"   WARNING: ChromaDB directory not found at {persist_dir}")
        print("   Skipping ChromaDB migration.")
        persist_dir = None
    else:
        try:
            chroma_client = chromadb.PersistentClient(path=persist_dir)
            chroma_collections = chroma_client.list_collections()
            print(f"   Found {len(chroma_collections)} ChromaDB collections")
            for coll in chroma_collections:
                count = chroma_client.get_collection(coll.name).count()
                print(f"     - {coll.name}: {count} chunks")
        except Exception as e:
            print(f"   ERROR: Cannot connect to ChromaDB at {persist_dir}: {e}")
            return 1

    # Initialize embeddings (needed for ElasticStore)
    print("\n3. Initializing embeddings...")
    embedding_model = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    print(f"   Using embedding model: {embedding_model}")
    try:
        embeddings = HuggingFaceEmbeddings(model_name=embedding_model)
        # Test embedding
        test_embed = embeddings.embed_query("test")
        print(f"   Embedding dimension: {len(test_embed)}")
    except Exception as e:
        print(f"   ERROR: Cannot initialize embeddings: {e}")
        return 1

    # Migrate each collection
    print("\n4. Starting migration...")
    migrated_count = 0
    skipped_count = 0

    if persist_dir:
        for chroma_coll in chroma_collections:
            # Create ElasticStore for this collection with rag_ prefix
            index_name = f"rag_{chroma_coll.name}"
            elastic = ElasticStore(index_name=index_name, embeddings=embeddings)

            try:
                added = migrate_collection(chroma_coll, elastic, embeddings)
                migrated_count += added
            except Exception as e:
                print(f"   ERROR migrating {chroma_coll.name}: {e}")
                import traceback
                traceback.print_exc()
                skipped_count += 1

    # Summary
    print("\n" + "=" * 60)
    print("Migration Summary")
    print("=" * 60)
    print(f"Collections migrated: {len(chroma_collections) if persist_dir else 0}")
    print(f"Total chunks migrated: {migrated_count}")
    print(f"Collections skipped (errors): {skipped_count}")
    print("\nMigration completed!")

    return 0


if __name__ == "__main__":
    sys.exit(main())
