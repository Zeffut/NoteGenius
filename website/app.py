import os, fitz, langid, uuid, json, requests
from langdetect import DetectorFactory
from flask import Flask, render_template, redirect, url_for, request, flash, jsonify, session, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(__name__)
app.config['SECRET_KEY'] = 'fCJUOf0*&0gS^mvodcaRyO$Jh3$'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Initialiser le seed pour le détecteur de langue
DetectorFactory.seed = 0

# Définir le dossier de téléchargement et la taille maximale du fichier
script_dir = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(script_dir, 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

debug = True  # Variable de débogage

def debug_print(message):
    if debug:
        print(f"\033[94m[Debug]\033[0m {message}")

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('home'))
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            update_user_info()  # Mettre à jour les informations de l'utilisateur après la connexion
            flash('Connexion réussie !', 'success')
            return redirect(url_for('home'))
        flash('Identifiant ou mot de passe incorrect', 'danger')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
        new_user = User(username=username, password=hashed_password)
        try:
            db.session.add(new_user)
            db.session.commit()
            flash('Compte créé avec succès !', 'success')
            return redirect(url_for('login'))
        except:
            flash('Le nom d\'utilisateur existe déjà.', 'danger')
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    flash('Déconnexion réussie.', 'info')
    return redirect(url_for('home'))

# Mettre à jour les résultats globaux
def update_results(new_results):
    global results
    results = new_results

# Route pour la page d'accueil
@app.route("/")
def home():
    session['isAnalysing'] = False
    session['results'] = "Aucun résultat n'a été reçu."

    # Vérifier si l'utilisateur est authentifié ou si c'est un utilisateur invité
    if current_user.is_authenticated or 'user_token' in session:
        update_user_info()
    return render_template("index.html")

def get_user_upload_folder():
    if current_user.is_authenticated:
        user_folder = os.path.join(app.config['UPLOAD_FOLDER'], current_user.username, 'docs')
    else:
        if 'user_token' not in session:
            session['user_token'] = str(uuid.uuid4())
            guest_user = User(username=session['user_token'], password=generate_password_hash('guest_password'))
            db.session.add(guest_user)
            db.session.commit()
            session['guest_user_id'] = guest_user.id
        user_folder = os.path.join(app.config['UPLOAD_FOLDER'], session['user_token'], 'docs')
    
    if not os.path.exists(user_folder):
        os.makedirs(user_folder)
    return user_folder

def update_user_info():
    if current_user.is_authenticated:
        user_info = {
            "username": current_user.username,
            "last_login": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "user_id": current_user.id,
            "token": session.get('user_token', '')
        }
        user_info_folder = os.path.join(app.config['UPLOAD_FOLDER'], current_user.username)
    else:
        if 'user_token' not in session:
            session['user_token'] = str(uuid.uuid4())
        user_info = {
            "username": "guest",
            "last_login": datetime.now().strftime("%Y-%m-%d %H:%:%S"),
            "user_id": "guest",
            "token": session['user_token']
        }
        user_info_folder = os.path.join(app.config['UPLOAD_FOLDER'], session['user_token'])
    
    if not os.path.exists(user_info_folder):
        os.makedirs(user_info_folder)
    with open(os.path.join(user_info_folder, 'user_info.json'), 'w') as f:
        json.dump(user_info, f)

@app.route('/upload', methods=['POST'])
def upload_files():
    user_folder = get_user_upload_folder()
    if not user_folder:
        return jsonify({'error': 'User folder not found'}), 400

    if 'files' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    files = request.files.getlist('files')
    
    if not files:
        return jsonify({'error': 'No selected file'}), 400

    file_paths = []
    for file in files:
        if file and file.filename:
            file_path = os.path.join(user_folder, file.filename)
            file.save(file_path)
            file_paths.append(file_path)

    return jsonify({'files': file_paths})

@app.route("/files/list", methods=["GET"])
def get_file_list():
    user_folder = get_user_upload_folder()
    if not user_folder:
        return jsonify({'error': 'User folder not found'}), 400

    files = os.listdir(user_folder)
    return jsonify(files)

def get_available_server():
    debug_print("Fetching available server")
    with open('servers.json', 'r') as f:
        servers = json.load(f)
    for server in servers:
        ip = server.get('ip')
        port = server.get('port')
        status = get_server_status(ip, port)
        debug_print(f"Server {server['name']} status: {status}")
        if status == 'available':
            debug_print(f"Server {server['name']} is available")
            return server
    debug_print("No available server found")
    return None

def get_server_progress(ip, port):
    url = f'http://{ip}:{port}/progress'
    response = requests.get(url)
    if response.status_code == 200:
        return response.json().get('progress')
    else:
        return None

def get_server_status(ip, port):
    url = f'http://{ip}:{port}/status'
    response = requests.get(url)
    if response.status_code == 200:
        return response.json().get('status')
    else:
        return None

def start_analysis_on_server(ip, port):
    url = f'http://{ip}:{port}/analyse'
    response = requests.post(url)
    return response.json()

def send_file_to_server(file_path, ip, port):
    url = f'http://{ip}:{port}/upload'
    with open(file_path, 'rb') as file:
        files = {'file': file}
        response = requests.post(url, files=files)
    return response.json()

@app.route('/analyse', methods=['POST'])
def analyse_files():
    debug_print("Analysis request received")
    if 'isAnalysing' in session and session['isAnalysing']:
        debug_print("Analysis already in progress")
        return jsonify({'error': 'Une analyse est déjà en cours'}), 400

    user_folder = get_user_upload_folder()
    if not user_folder:
        debug_print("User folder not found")
        return jsonify({'error': 'User folder not found'}), 400

    pdf_files = [f for f in os.listdir(user_folder) if f.endswith('.pdf')]
    if not pdf_files:
        debug_print("No PDF files found")
        return jsonify({'error': 'No PDF files found'}), 400
    
    session['isAnalysing'] = True
    session.modified = True
    
    server = get_available_server()
    if not server:
        debug_print("No available server")
        session['isAnalysing'] = False
        session.modified = True
        return jsonify({'error': 'Aucun serveur disponible'}), 400

    ip = server.get('ip')
    port = server.get('port')
    session['server_ip'] = ip
    session['server_port'] = port
    session.modified = True

    for filename in pdf_files:
        debug_print(f"""Sending file "{filename}" to server {server['name']}""")
        send_file_to_server(os.path.join(user_folder, filename), ip, port)

    start_analysis_on_server(ip, port)
    debug_print("Analysis started on server")

    return jsonify({'message': 'Analyse lancée avec succès'})

@app.route('/files/delete', methods=['POST'])
def delete_file():
    user_folder = get_user_upload_folder()
    if not user_folder:
        return jsonify({'error': 'User folder not found'}), 400

    file_name = request.json.get('file')
    if not file_name:
        return jsonify({'error': 'No file specified'}), 400

    file_path = os.path.join(user_folder, file_name)
    if os.path.exists(file_path):
        os.remove(file_path)
        return jsonify({'message': f'File {file_name} deleted successfully'})
    else:
        return jsonify({'error': f'File {file_name} not found'}), 404

@app.route('/files/delete_all', methods=['POST'])
def delete_all_files():
    user_folder = get_user_upload_folder()
    if not user_folder:
        return jsonify({'error': 'User folder not found'}), 400

    for filename in os.listdir(user_folder):
        file_path = os.path.join(user_folder, filename)
        if os.path.exists(file_path):
            os.remove(file_path)

    return jsonify({'message': 'All files deleted successfully'})

# Route pour obtenir la progression de l'analyse
@app.route('/progress', methods=['GET'])
def get_progress():
    if current_user.is_authenticated:
        user_progress = get_server_progress(session['server_ip'], session['server_port'])
        if user_progress:
            return jsonify({'progress': user_progress}), 200
    return jsonify({'error': 'No progress information available'}), 400

@app.route('/status', methods=['GET'])
def get_status():
    if current_user.is_authenticated:
        status = get_server_status(session['server_ip'], session['server_port'])
        if status:
            return jsonify({'status': status}), 200
    return jsonify({'error': 'No status information available'}), 400

# Route pour obtenir les résultats de l'analyse
def delete_all_files_in_folder(folder):
    for filename in os.listdir(folder):
        file_path = os.path.join(folder, filename)
        if os.path.exists(file_path):
            os.remove(file_path)

@app.route('/results', methods=['GET'])
def get_results():
    debug_print("Fetching analysis results")
    if 'server_ip' in session and 'server_port' in session:
        ip = session['server_ip']
        port = session['server_port']
        url = f'http://{ip}:{port}/response'
        response = requests.get(url)
        if response.status_code == 200:
            results = response.json().get('response')
            session['results'] = results
            session.modified = True
            user_folder = get_user_upload_folder()
            delete_all_files_in_folder(user_folder)  # Supprimer tous les fichiers après avoir envoyé le résultat
            debug_print("Results fetched successfully")
            return jsonify({'revision_cards': results}), 200
        else:
            debug_print("Failed to get results from server")
            return jsonify({'error': 'Failed to get results from server'}), 500
    else:
        debug_print("No server information available")
        return jsonify({'error': 'No server information available'}), 400

# Planificateur pour les tâches de nettoyage
scheduler = BackgroundScheduler()
scheduler.start()

# Fonction pour nettoyer les fichiers des utilisateurs inactifs
def clean_inactive_user_files():
    now = datetime.now()
    for root, dirs, files in os.walk(app.config['UPLOAD_FOLDER']):
        for dir_name in dirs:
            user_info_path = os.path.join(root, dir_name, 'user_info.json')
            if os.path.exists(user_info_path):
                with open(user_info_path, 'r') as f:
                    user_info = json.load(f)
                    last_login = datetime.strptime(user_info.get('last_login'), "%Y-%m-%d %H:%M:%S")
                    if now - last_login > timedelta(weeks=1):
                        user_folder = os.path.join(root, dir_name)
                        for file_name in os.listdir(user_folder):
                            file_path = os.path.join(user_folder, file_name)
                            if file_name != 'user_info.json' and os.path.exists(file_path):
                                os.remove(file_path)

# Planifier la tâche de nettoyage toutes les 24 heures
scheduler.add_job(clean_inactive_user_files, 'interval', hours=24)
with app.app_context():
    db.create_all()
debug_print("Starting application")
app.run(host="0.0.0.0", port=8080, debug=False)
