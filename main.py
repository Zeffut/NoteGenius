import os
import streamlit as st
from functions import is_api_available, turn_on_api, read_pdfs_from_folder, generate_revision_cards, update_results

UPLOAD_FOLDER = 'docs'

if st.session_state.results:
    st.markdown(st.session_state.results, unsafe_allow_html=False)
else:
    st.title("NoteGenius")

    if 'analyzing' not in st.session_state:
        st.session_state.analyzing = False
    if 'results' not in st.session_state:
        st.session_state.results = ""

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)

    uploaded_files = st.file_uploader("Upload PDF files", type="pdf", accept_multiple_files=True)

    if uploaded_files:
        for uploaded_file in uploaded_files:
            file_path = os.path.join(UPLOAD_FOLDER, uploaded_file.name)
            with open(file_path, "wb") as f:
                f.write(uploaded_file.getbuffer())

    analyze_button = st.button("Analyze Documents", disabled=st.session_state.analyzing)

    if analyze_button and not st.session_state.analyzing:
        st.session_state.analyzing = True
        st.rerun()

    if st.session_state.analyzing:
        if not is_api_available():
            turn_on_api()

        all_cleaned_text = read_pdfs_from_folder(UPLOAD_FOLDER)

        if not all_cleaned_text.strip():
            st.session_state.results = "No text was extracted from the PDF files."
        else:
            revision_cards = generate_revision_cards(all_cleaned_text)
            st.session_state.results = revision_cards if revision_cards else "No revision cards generated."

        update_results(st.session_state.results)
        st.session_state.analyzing = False
        st.rerun()
