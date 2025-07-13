const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');

function configureFfmpeg() {
    try {
        const ffmpegPath = require('ffmpeg-static');
        const ffprobePath = require('ffprobe-static').path;
        ffmpeg.setFfmpegPath(ffmpegPath);
        ffmpeg.setFfprobePath(ffprobePath);
        if (!fs.existsSync(ffmpegPath)) {
            throw new Error('FFmpeg no encontrado');
        }
    } catch (error) {
        throw new Error(`Error configurando FFmpeg: ${error.message}`);
    }
}

let mainWindow;

function createWindow() {
    try {
        configureFfmpeg();
        mainWindow = new BrowserWindow({
            width: 1400,
            height: 800,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            },
            title: 'Editor de Subtítulos'
        });
        mainWindow.loadFile('index.html');
    } catch (error) {
        dialog.showErrorBox('Error de Inicialización', error.message);
        app.quit();
    }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on('save-project', (event, data) => {
    try {
        const savePath = dialog.showSaveDialogSync(mainWindow, {
            title: 'Guardar Proyecto',
            defaultPath: path.join(app.getPath('documents'), 'proyecto.lyp'),
            filters: [{ name: 'Proyecto de Subtítulos', extensions: ['lyp'] }]
        });

        if (savePath) {
            fs.writeFileSync(savePath, JSON.stringify(data, null, 2));
            event.sender.send('project-saved', 'Proyecto guardado exitosamente');
        }
    } catch (error) {
        event.sender.send('project-save-error', `Error al guardar: ${error.message}`);
    }
});

ipcMain.on('load-project', (event) => {
    try {
        const result = dialog.showOpenDialogSync(mainWindow, {
            title: 'Cargar Proyecto',
            defaultPath: app.getPath('documents'),
            filters: [{ name: 'Proyecto de Subtítulos', extensions: ['lyp'] }],
            properties: ['openFile']
        });

        if (result && result[0]) {
            const projectData = JSON.parse(fs.readFileSync(result[0], 'utf-8'));
            event.sender.send('project-loaded', projectData);
        }
    } catch (error) {
        event.sender.send('project-load-error', `Error al cargar: ${error.message}`);
    }
});

ipcMain.on('export-video', async (event, data) => {
    try {
        const exportPath = dialog.showSaveDialogSync(mainWindow, {
            title: 'Exportar Video',
            defaultPath: path.join(app.getPath('videos'), 'video.mp4'),
            filters: [{ name: 'Video MP4', extensions: ['mp4'] }]
        });

        if (!exportPath) return;

        const videoPath = data.videoPath.replace(/^file:\/\/\//, '');
        const audioPath = data.audioPath.replace(/^file:\/\/\//, '');

        if (!fs.existsSync(videoPath)) throw new Error('Video no encontrado');
        if (!fs.existsSync(audioPath)) throw new Error('Audio no encontrado');

        const subtitlesPath = path.join(app.getPath('temp'), `subtitles_${Date.now()}.srt`);
        const srtContent = generateSRT(data.subtitles.filter(s => s && s.timeStart !== null));
        fs.writeFileSync(subtitlesPath, srtContent);

        const subtitlesPathEscaped = subtitlesPath.replace(/\\/g, '/').replace(/:/g, '\\:');

        const command = ffmpeg()
            .input(videoPath)
            .inputOptions(['-stream_loop -1'])
            .input(audioPath)
            .videoCodec('libx264')
            .audioCodec('aac')
            .outputOptions([
                '-pix_fmt yuv420p',
                '-preset ultrafast',
                '-threads 4',
                '-movflags +faststart',
                '-map 0:v:0',
                '-map 1:a:0',
                '-shortest',
                `-vf subtitles='${subtitlesPathEscaped}'`
            ])
            .on('start', cmd => {
                console.log('FFmpeg comando:', cmd);
            })
            .on('progress', progress => {
                if (progress.percent) {
                    event.sender.send('export-progress', Math.round(progress.percent));
                }
            })
            .on('end', () => {
                try {
                    if (fs.existsSync(subtitlesPath)) {
                        fs.unlinkSync(subtitlesPath);
                    }
                    event.sender.send('export-success', 'Video exportado exitosamente');
                } catch (err) {
                    console.error('Error limpiando temporales:', err);
                }
            })
            .on('error', (err, stdout, stderr) => {
                console.error('Error FFmpeg:', { error: err, stdout, stderr });
                try {
                    if (fs.existsSync(subtitlesPath)) {
                        fs.unlinkSync(subtitlesPath);
                    }
                } catch (e) {
                    console.error('Error limpiando temporales:', e);
                }
                event.sender.send('export-error', `Error en la exportación: ${err.message}`);
            })
            .save(exportPath);

    } catch (error) {
        console.error('Error exportación:', error);
        event.sender.send('export-error', `Error: ${error.message}`);
    }
});

function generateSRT(subtitles) {
    return subtitles
        .map((subtitle, index) => {
            if (!subtitle || subtitle.timeStart === null) return '';
            const startTime = formatSRTTime(subtitle.timeStart);
            const endTime = formatSRTTime(subtitle.timeEnd || subtitle.timeStart + 5);
            return `${index + 1}\n${startTime} --> ${endTime}\n${subtitle.text}\n\n`;
        })
        .join('');
}

function formatSRTTime(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) {
        throw new Error('Tiempo inválido para formato SRT');
    }
    const date = new Date(Math.round(seconds * 1000));
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const secs = String(date.getUTCSeconds()).padStart(2, '0');
    const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${secs},${ms}`;
}

module.exports = { app, BrowserWindow };