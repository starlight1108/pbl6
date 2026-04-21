import os
import uuid
from PIL import Image


def allowed_file(filename, allowed_extensions):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in allowed_extensions


def save_avatar(file, upload_folder):
    os.makedirs(upload_folder, exist_ok=True)

    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f'{uuid.uuid4().hex}.{ext}'
    filepath = os.path.join(upload_folder, filename)

    img = Image.open(file)
    img.thumbnail((200, 200))
    img.save(filepath, quality=85, optimize=True)

    return filename
