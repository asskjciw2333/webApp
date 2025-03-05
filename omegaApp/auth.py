import requests
from flask import current_app


def authentication_ita():
    user = current_app.config["DCIM_USER"]
    password = current_app.config["DCIM_PASSWORD"]
    dcim_base_url = current_app.config["DCIM_BASE_URL"]

    data = f'{{"password": "{password}", "userName": "{user}"}}'

    auth_url = f"{dcim_base_url}authentication"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": "bearer ",
    }
    response = requests.post(auth_url, data=data, headers=headers, verify=False)

    auth_success = True if response.status_code == 200 else False
    if auth_success:
        headers["Authorization"] += response.json()["token"]
    return auth_success, headers
