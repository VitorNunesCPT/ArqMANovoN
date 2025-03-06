from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi import Request
import socketio
from ultralytics import YOLO
import cv2
import numpy as np
import base64
import logging

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inicialização do FastAPI e SocketIO
app = FastAPI()
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

# Montando diretórios estáticos e templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Carregando o modelo YOLO
try:
    model = YOLO('weights/best.pt')
    logger.info("Modelo YOLO carregado com sucesso!")
except Exception as e:
    logger.error(f"Erro ao carregar o modelo YOLO: {e}")
    model = None

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@sio.on('connect')
async def connect(sid, environ):
    logger.info(f"Cliente conectado: {sid}")

@sio.on('disconnect')
async def disconnect(sid):
    logger.info(f"Cliente desconectado: {sid}")

@sio.on('process_frame')
async def process_frame(sid, data):
    try:
        # Decodificar a imagem base64
        image_data = data.split(',')[1]
        image_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if model is not None:
            # Processar o frame com YOLO
            results = model(frame)
            
            # Desenhar as detecções
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0]
                    conf = box.conf[0]
                    cls = int(box.cls[0])
                    
                    # Desenhar retângulo e texto
                    cv2.rectangle(frame, (int(x1), int(y1)), (int(x2), int(y2)), (0, 255, 0), 2)
                    cv2.putText(frame, f"{model.names[cls]} {conf:.2f}", 
                              (int(x1), int(y1) - 10), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

        # Converter frame processado para base64
        _, buffer = cv2.imencode('.jpg', frame)
        processed_image = base64.b64encode(buffer).decode('utf-8')
        
        # Enviar resultado processado de volta
        await sio.emit('processed_frame', f'data:image/jpeg;base64,{processed_image}', room=sid)
        
    except Exception as e:
        logger.error(f"Erro no processamento do frame: {e}")
        await sio.emit('error', str(e), room=sid)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=8000) 