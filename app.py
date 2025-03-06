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
import time
from typing import Optional

# Configuração de logging mais detalhada
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Inicialização do FastAPI e SocketIO
app = FastAPI()
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    ping_timeout=30,
    ping_interval=15,
    max_http_buffer_size=5e6  # 5MB
)
socket_app = socketio.ASGIApp(sio, app)

# Montando diretórios estáticos e templates
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Variáveis para monitoramento
last_frame_time: dict[str, float] = {}
frames_processed: dict[str, int] = {}
model: Optional[YOLO] = None

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
    logger.info(f"Cliente conectado: {sid} - IP: {environ.get('REMOTE_ADDR')}")
    last_frame_time[sid] = time.time()
    frames_processed[sid] = 0

@sio.on('disconnect')
async def disconnect(sid):
    logger.info(f"Cliente desconectado: {sid}")
    if sid in last_frame_time:
        del last_frame_time[sid]
    if sid in frames_processed:
        del frames_processed[sid]

@sio.on('process_frame')
async def process_frame(sid, data):
    try:
        # Atualizar contadores
        current_time = time.time()
        if sid in last_frame_time:
            elapsed = current_time - last_frame_time[sid]
            fps = 1 / elapsed if elapsed > 0 else 0
            frames_processed[sid] = frames_processed.get(sid, 0) + 1
            if frames_processed[sid] % 30 == 0:  # Log a cada 30 frames
                logger.info(f"Cliente {sid}: FPS={fps:.2f}, Frames processados={frames_processed[sid]}")
        last_frame_time[sid] = current_time

        # Verificar tamanho dos dados
        data_size = len(data) / 1024  # KB
        if data_size > 1024:  # Se maior que 1MB
            logger.warning(f"Frame muito grande recebido: {data_size:.2f}KB")

        # Decodificar a imagem base64
        try:
            image_data = data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                raise ValueError("Frame decodificado é None")
                
            logger.debug(f"Frame decodificado: {frame.shape}")
        except Exception as e:
            logger.error(f"Erro ao decodificar frame: {e}")
            await sio.emit('error', "Erro ao decodificar imagem", room=sid)
            return

        if model is not None:
            # Processar o frame com YOLO
            try:
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
                
                logger.debug(f"Frame processado com sucesso: {len(boxes)} detecções")
            except Exception as e:
                logger.error(f"Erro no processamento YOLO: {e}")
                await sio.emit('error', "Erro no processamento da imagem", room=sid)
                return

        # Converter frame processado para base64
        try:
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            processed_image = base64.b64encode(buffer).decode('utf-8')
            
            # Enviar resultado processado de volta
            await sio.emit('processed_frame', f'data:image/jpeg;base64,{processed_image}', room=sid)
        except Exception as e:
            logger.error(f"Erro ao codificar frame processado: {e}")
            await sio.emit('error', "Erro ao enviar imagem processada", room=sid)
            
    except Exception as e:
        logger.error(f"Erro geral no processamento do frame: {e}")
        await sio.emit('error', str(e), room=sid)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        socket_app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True
    ) 