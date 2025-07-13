const { ipcRenderer } = require('electron');
const path = require('path');

document.addEventListener('DOMContentLoaded', () => {
    const videoElement = document.getElementById('videoPreview');
    const audioElement = document.getElementById('audioPreview');
    const lyricsEditor = document.getElementById('lyricsEditor');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const progressOverlay = document.querySelector('.progress-overlay');
    const progressCircle = document.getElementById('progress');
    const progressText = document.querySelector('.progress-text');

    videoElement.loop = true;
    audioElement.loop = false;

    let subtitles = [];
    let isPlaying = false;
    let currentLyricIndex = 0;
    let animationFrameId = null;
    let subtitleConfig = {
        fontSize: 80,
        position: 75,
        fontFamily: ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Impact']
    };

    document.addEventListener('keydown', (event) => {
        if (event.code === 'Space' && !event.repeat) {
            event.preventDefault();
            handleTimeMarking();
        }
    });

    function handleTimeMarking() {
        const currentTime = parseFloat(audioElement.currentTime.toFixed(2)) || 
                          parseFloat(videoElement.currentTime.toFixed(2));
                          
        if (isNaN(currentTime)) return;

        const allLines = lyricsEditor.value.split('\n');
        const hasTimestamp = /\[\d+\.\d+\]$/;

        let nextLineIndex = -1;
        for (let i = 0; i < allLines.length; i++) {
            if (allLines[i].trim() && !hasTimestamp.test(allLines[i])) {
                nextLineIndex = i;
                break;
            }
        }

        if (nextLineIndex === -1) return;

        let currentLine = allLines[nextLineIndex].trim();
        allLines[nextLineIndex] = `${currentLine} [${currentTime.toFixed(2)}]`;

        subtitles[nextLineIndex] = {
            text: currentLine,
            timeStart: currentTime,
            timeEnd: currentTime + 5
        };

        if (nextLineIndex > 0 && subtitles[nextLineIndex - 1]) {
            subtitles[nextLineIndex - 1].timeEnd = currentTime;
        }

        lyricsEditor.value = allLines.join('\n');
        showCurrentSubtitle(currentLine);
        // Modificar la función handleTimeMarking para marcar líneas
        function markLine(lineIndex) {
            const lines = lyricsEditor.value.split('\n');
            const start = lines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
            const end = start + lines[lineIndex].length;

            const range = document.createRange();
            const selection = window.getSelection();

            range.setStart(lyricsEditor.firstChild, start);
            range.setEnd(lyricsEditor.firstChild, end);

            selection.removeAllRanges();
            selection.addRange(range);

            lyricsEditor.scrollTop = lineIndex * parseFloat(getComputedStyle(lyricsEditor).lineHeight);
        }
        // Resaltar línea actual
        const start = allLines.slice(0, nextLineIndex).join('\n').length + 
                     (nextLineIndex > 0 ? 1 : 0);
        const end = start + allLines[nextLineIndex].length;
        lyricsEditor.setSelectionRange(start, end);
        lyricsEditor.focus();
    }

    function showCurrentSubtitle(text) {
        if (!text) return;
    
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        if (videoElement.videoWidth > 0) {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        }
    
        const verticalPosition = canvas.height * (subtitleConfig.position / 100);
    
        // Dividir el texto en líneas basadas en el ancho del canvas
        const maxWidth = canvas.width * 0.8; // Ancho máximo del texto en el canvas
        const lines = splitTextIntoLines(text, maxWidth);
    
        // Fondo del subtítulo
        const totalHeight = lines.length * (subtitleConfig.fontSize + 10); // Altura total del bloque de subtítulos
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, verticalPosition - totalHeight / 2 - 10, canvas.width, totalHeight + 20);
    
        // Configurar estilo de fuente
        ctx.font = `bold ${subtitleConfig.fontSize}px ${subtitleConfig.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 4;
    
        // Dibujar cada línea de subtítulos
        const lineHeight = subtitleConfig.fontSize + 10; // Espaciado entre líneas
        lines.forEach((line, index) => {
            const yPosition = verticalPosition - totalHeight / 2 + index * lineHeight + subtitleConfig.fontSize / 2;
    
            // Texto con borde negro
            ctx.strokeText(line, canvas.width / 2, yPosition);
    
            // Texto blanco
            ctx.fillStyle = 'white';
            ctx.fillText(line, canvas.width / 2, yPosition);
        });
    }
    
    
    function splitTextIntoLines(text, maxWidth) {
        const words = text.split(' '); // Dividir el texto en palabras
        let lines = [];
        let currentLine = words[0];
    
        ctx.font = `bold ${subtitleConfig.fontSize}px ${subtitleConfig.fontFamily}`;
    
        for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            const testWidth = ctx.measureText(testLine).width;
    
            if (testWidth > maxWidth) {
                lines.push(currentLine); // Agregar la línea actual al arreglo
                currentLine = words[i]; // Iniciar una nueva línea con la palabra actual
            } else {
                currentLine = testLine; // Continuar agregando palabras a la línea actual
            }
        }
    
        lines.push(currentLine); // Agregar la última línea al arreglo
        return lines;
    }
    
    

    function handleVideoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const filePath = file.path;
            videoElement.src = filePath;
            videoElement.dataset.originalPath = filePath;
            
            videoElement.onloadedmetadata = () => {
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;
                updateCanvas();
            };
        } catch (error) {
            console.error('Error cargando video:', error);
            alert('Error al cargar el video');
        }
    }

    function handleAudioUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const filePath = file.path;
            audioElement.src = filePath;
            audioElement.dataset.originalPath = filePath;
        } catch (error) {
            console.error('Error cargando audio:', error);
            alert('Error al cargar el audio');
        }
    }

    function handleLyricsUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                lyricsEditor.value = e.target.result;
                subtitles = [];
                currentLyricIndex = 0;
            } catch (error) {
                console.error('Error cargando subtítulos:', error);
                alert('Error al cargar los subtítulos');
            }
        };
        reader.readAsText(file);
    }

    function togglePlayPause() {
        if (!videoElement.src && !audioElement.src) {
            alert('Por favor, carga un video o audio primero.');
            return;
        }

        if (isPlaying) {
            pauseMedia();
        } else {
            playMedia();
        }
    }

    function playMedia() {
        Promise.all([
            videoElement.play().catch(() => {}),
            audioElement.play().catch(() => {})
        ]).then(() => {
            isPlaying = true;
            updateCanvas();
        }).catch(error => {
            console.error('Error en reproducción:', error);
        });
    }

    function pauseMedia() {
        videoElement.pause();
        audioElement.pause();
        isPlaying = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    function updateCanvas() {
        if (!isPlaying) return;
    
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        if (videoElement.videoWidth > 0) {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        }
    
        // Mostrar el nombre de la canción en la esquina superior izquierda
        const songName = document.getElementById('songName').value.trim();
        if (songName) {
            ctx.font = `bold 30px Arial`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'white';
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3;
    
            // Dibujar texto con borde
            ctx.strokeText(songName, 10, 10);
            ctx.fillText(songName, 10, 10);
        }
    
        const currentTime = audioElement.currentTime || videoElement.currentTime;
        const currentSubtitle = subtitles.find(
            sub => sub && sub.timeStart <= currentTime && sub.timeEnd > currentTime
        );
    
        if (currentSubtitle) {
            showCurrentSubtitle(currentSubtitle.text);
        }
    
        animationFrameId = requestAnimationFrame(updateCanvas);
    }
    

    document.getElementById('playPause').addEventListener('click', togglePlayPause);
    document.getElementById('markTime').addEventListener('click', handleTimeMarking);
    document.getElementById('videoUpload').addEventListener('change', handleVideoUpload);
    document.getElementById('audioUpload').addEventListener('change', handleAudioUpload);
    document.getElementById('lyricsUpload').addEventListener('change', handleLyricsUpload);
    

    document.getElementById('generateVideo').addEventListener('click', () => {
        if (!videoElement.dataset.originalPath || !audioElement.dataset.originalPath) {
            alert('Asegúrate de cargar video y audio primero');
            return;
        }

        const validSubtitles = subtitles.filter(s => s && s.timeStart !== null && s.text);
        if (validSubtitles.length === 0) {
            alert('No hay subtítulos válidos para generar el video');
            return;
        }

        progressOverlay.style.display = 'flex';
        progressCircle.style.setProperty('--progress', 0);
        progressCircle.setAttribute('data-progress', 0);
        progressText.textContent = 'Iniciando exportación...';

        ipcRenderer.send('export-video', {
            videoPath: videoElement.dataset.originalPath,
            audioPath: audioElement.dataset.originalPath,
            subtitles: validSubtitles
            
        });
    });
    document.getElementById('fontSize').addEventListener('input', (e) => {
        subtitleConfig.fontSize = parseInt(e.target.value);
        document.getElementById('fontSizeValue').textContent = `${e.target.value}px`;
        updateCanvas();
    });
    
    document.getElementById('subtitlePosition').addEventListener('input', (e) => {
        subtitleConfig.position = parseInt(e.target.value);
        document.getElementById('positionValue').textContent = `${e.target.value}%`;
        updateCanvas();
    });
    
    document.getElementById('fontStyle').addEventListener('change', (e) => {
        subtitleConfig.fontFamily = e.target.value;
        updateCanvas();
    });

    document.getElementById('saveProject').addEventListener('click', () => {
        if (!videoElement.dataset.originalPath || !audioElement.dataset.originalPath) {
            alert('Asegúrate de cargar video y audio primero');
            return;
        }

        const lines = lyricsEditor.value.split('\n');
        const lyrics = [];
        const timestamps = [];

        lines.forEach(line => {
            const timeMatch = line.match(/\[(\d+\.\d+)\]$/);
            if (timeMatch) {
                lyrics.push(line.replace(/\s*\[\d+\.\d+\]$/, '').trim());
                timestamps.push(timeMatch[1]);
            } else {
                lyrics.push(line);
                timestamps.push(null);
            }
        });

        ipcRenderer.send('save-project', {
            lyrics,
            timestamps,
            videoPath: videoElement.dataset.originalPath,
            audioPath: audioElement.dataset.originalPath,
            songName: document.getElementById('songName').value.trim()
        });
        
    });

    audioElement.addEventListener('ended', () => {
        isPlaying = false;
        videoElement.pause();
        cancelAnimationFrame(animationFrameId);
    });

    videoElement.addEventListener('ended', () => {
        if (!audioElement.ended) {
            videoElement.currentTime = 0;
            videoElement.play();
        }
    });

    document.getElementById('loadProject').addEventListener('click', () => {
        ipcRenderer.send('load-project');
    });

    ipcRenderer.on('project-loaded', (event, projectData) => {
        try {
            if (!projectData.lyrics || !projectData.timestamps) return;

            subtitles = [];
            currentLyricIndex = 0;

            if (projectData.videoPath) {
                videoElement.src = projectData.videoPath;
                videoElement.dataset.originalPath = projectData.videoPath;
            }

            if (projectData.audioPath) {
                audioElement.src = projectData.audioPath;
                audioElement.dataset.originalPath = projectData.audioPath;
            }
            
            if (projectData.songName) {
                document.getElementById('songName').value = projectData.songName;
            }
            

            const combinedText = projectData.lyrics.map((line, index) => {
                if (line.trim() && projectData.timestamps[index]) {
                    subtitles.push({
                        text: line,
                        timeStart: parseFloat(projectData.timestamps[index]),
                        timeEnd: index < projectData.timestamps.length - 1 ? 
                                parseFloat(projectData.timestamps[index + 1]) : 
                                parseFloat(projectData.timestamps[index]) + 5
                    });
                    return `${line} [${projectData.timestamps[index]}]`;
                }
                return line;
            });

            lyricsEditor.value = combinedText.join('\n');
        } catch (error) {
            console.error('Error al cargar el proyecto:', error);
            alert('Error al cargar el proyecto: ' + error.message);
        }
    });

    ipcRenderer.on('export-progress', (event, progress) => {
        progressOverlay.style.display = 'flex';
        progressCircle.style.setProperty('--progress', progress);
        progressCircle.setAttribute('data-progress', Math.round(progress));
        progressText.textContent = 'Generando video...';
    });

    ipcRenderer.on('export-success', (event, message) => {
        progressText.textContent = '¡Video exportado exitosamente!';
        setTimeout(() => {
            progressOverlay.style.display = 'none';
        }, 2000);
        alert(message);
    });

    ipcRenderer.on('export-error', (event, message) => {
        progressText.textContent = 'Error en la exportación';
        setTimeout(() => {
            progressOverlay.style.display = 'none';
        }, 2000);
        alert(`Error: ${message}`);
    });

    ipcRenderer.on('project-saved', (event, message) => {
        alert(message);
    });
});