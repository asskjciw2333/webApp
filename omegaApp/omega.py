from flask import (
    Blueprint,
    render_template,
    session,
    flash,
)
from .auth import authentication_ita

bp = Blueprint("omega", __name__)


@bp.route("/")
def index():
    try:
        session["authentication"] = authentication_ita()

        if session["authentication"][0] is False:
            flash("יש לנו בעיה עם החיבור לDCIM - נסה לרענן את הדף")
    except Exception as e:
        flash("יש לנו בעיה עם החיבור לDCIM - נסה לרענן את הדף")
    return render_template("index.html")
