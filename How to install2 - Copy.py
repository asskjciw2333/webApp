import subprocess
import platform


# function to run a command
def run_command(command, shell=True):
    print(f"Running: {command}")
    result = subprocess.run(command, shell=shell, check=True)
    return result


# Check if the OS is Windows
is_windows = platform.system() == "Windows"

# part 1: create a virtual environment
print("Creating virtual environment...")
run_command("py -m venv venv")

# part 2: activate the virtual environment
activate_command = (
    "venv\\Scripts\\activate.bat" if is_windows else "source venv/bin/activate"
)
print("Activating virtual environment...")
if is_windows:
    subprocess.call(activate_command, shell=True)
else:
    run_command(activate_command)

# part 3: install dependencies
try:
    print("Installing dependencies from packages folder...")
    run_command(
        "py -m pip install --no-index --find-links=packages -r requirements.txt"
    )
except:
    print(
        "Failed to install dependencies from packages folder. Installing from PyPI..."
    )

try:
    # part 4: install the application
    print("Installing the application...")
    run_command("pip install path_to_application_build")
except:
    print("Failed to install the application. Please install it manually.")

print("Setup complete!")
