from g4f.client import Client
import requests

#def chat(message, endpoint="http://humble-mantis-evident.ngrok-free.app", model="llama3.2"):
#    headers = {'Content-Type': 'application/json'}
#    data = {'model': model, 'message': message}

#    try:
#        response = requests.post(endpoint + "/chat", json=data, headers=headers)
#
#        if response.status_code == 200:
#            json_response = response.json()
#            return json_response.get('response', "Aucune réponse valide reçue.")
#        else:
#            return f"Erreur : {response.status_code} - {response.text}"

#    except requests.RequestException as e:
#        return f"Erreur de requête : {str(e)}"

def chat(message):
    client = Client()
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": message}],
    )
    return response.choices[0].message.content
