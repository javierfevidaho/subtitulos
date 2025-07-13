# 🎬 Subtitle Editor

Aplicación de escritorio construida con **Electron** para crear, editar y exportar subtítulos incrustados en videos, con soporte para sincronización precisa y mezcla de audio y video usando **FFmpeg**.

---

## 🚀 Funcionalidades

- ✅ Crear y editar subtítulos con precisión de tiempo.
- ✅ Guardar y cargar proyectos en formato `.lyp`.
- ✅ Mezclar video original con pistas de audio externas.
- ✅ Exportar video final con subtítulos incrustados (hardcoded).
- ✅ Vista previa en tiempo real y control de progreso.
- ✅ Soporte para FFmpeg y FFprobe automáticos (detecta rutas estáticas).

---

## 🛠️ Tecnologías utilizadas

- **Electron**: framework para aplicaciones de escritorio multiplataforma.
- **Node.js**: backend y procesamiento de archivos.
- **FFmpeg & FFprobe**: para renderizar y exportar video/audio.
- **fluent-ffmpeg**: wrapper para FFmpeg en Node.js.
- **HTML/CSS/JS**: interfaz gráfica.

---

## ⚙️ Configuración

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/javierfevidaho/subtitulos.git
cd subtitulos
```

### 2️⃣ Instalar dependencias

```bash
npm install
```

### 3️⃣ Ejecutar la aplicación

```bash
npm start
```

Si deseas abrir las herramientas de desarrollo (DevTools):

```bash
npm start -- --dev
```

---

## 💬 Uso

1. Abre la aplicación.
2. Importa tu video y pista de audio (opcional).
3. Crea y edita los subtítulos con sus tiempos de inicio y fin.
4. Guarda el proyecto para continuar después (formato `.lyp`).
5. Exporta el video final con subtítulos incrustados en formato MP4.

---

## 💡 Ejemplo de proyecto

El archivo `.lyp` guarda la información de tus subtítulos y rutas de archivo. Ejemplo:

```json
{
  "videoPath": "C:/Videos/ejemplo.mp4",
  "audioPath": "C:/Audios/voz.mp3",
  "subtitles": [
    {
      "timeStart": 1.5,
      "timeEnd": 4.0,
      "text": "Hola, bienvenidos al editor de subtítulos."
    },
    {
      "timeStart": 5.0,
      "timeEnd": 7.0,
      "text": "Este es un segundo ejemplo."
    }
  ]
}
```

---

## 🛡️ Licencia

MIT License.

---

## ❤️ Autor

Creado por **Javier Felix**.  
[GitHub](https://github.com/javierfevidaho)

---

## ⭐️ Contribuye

¡Pull requests y sugerencias son bienvenidas! Siéntete libre de abrir un issue o enviar mejoras.

---

## 🚨 Nota

⚠️ Es necesario tener FFmpeg y FFprobe configurados correctamente. La aplicación intenta detectar rutas automáticamente usando **ffmpeg-static** y **ffprobe-static**, pero asegúrate de que estén disponibles en tu sistema.