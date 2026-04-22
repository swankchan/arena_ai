import os
from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI
try:
    from langchain.chains import RetrievalQA
except ImportError:
    from langchain_classic.chains import RetrievalQA

# Load environment variables from .env file
load_dotenv()

def main():
    # 1. Load documents from the 'data' directory
    print("Loading documents...")
    loader = DirectoryLoader('./data', glob="**/*.txt", loader_cls=TextLoader)
    documents = loader.load()
    print(f"Loaded {len(documents)} documents.")

    # 2. Split documents into chunks
    print("Splitting documents into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = text_splitter.split_documents(documents)
    print(f"Created {len(chunks)} chunks.")

    # 3. Create embeddings and store in Chroma vector store
    # We use a local HuggingFace embedding model to avoid needing an API key for this step
    print("Creating embeddings and storing in Chroma...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    
    # Persistent directory for the vector store
    persist_directory = "./chroma_db"
    
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=persist_directory
    )
    print(f"Vector store created and saved to {persist_directory}.")

    # 4. Set up the RetrievalQA chain
    # Note: ChatOpenAI requires the OPENAI_API_KEY environment variable to be set
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("\nWARNING: OPENAI_API_KEY not found in .env file.")
        print("Please add your OpenAI API key to the .env file to use the LLM for answering questions.")
        return

    llm = ChatOpenAI(model_name="gpt-3.5-turbo", temperature=0)
    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=vectorstore.as_retriever()
    )

    # 5. Query the system
    query = "What is RAG and how does it help with LLMs?"
    print(f"\nQuerying: {query}")
    
    try:
        response = qa_chain.invoke(query)
        print("\nResponse:")
        print(response["result"])
    except Exception as e:
        print(f"\nError during LLM invocation: {e}")

if __name__ == "__main__":
    main()
