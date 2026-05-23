const fastify = require('fastify')({ logger: false });
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

const PORT = 8080;
const ENTERTAINMENT_DIR = 'D:/Entertainment';

// Register static file serving
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/',
});

// Recursively scan directory
function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      scanDirectory(filePath, fileList);
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.mp4', '.mkv', '.avi'].includes(ext)) {
        fileList.push({
          name: file,
          path: filePath
        });
      }
    }
  }
  return fileList;
}

// API endpoint to list movies
fastify.get('/api/movies', async (request, reply) => {
  try {
    const movies = scanDirectory(ENTERTAINMENT_DIR);
    return movies;
  } catch (error) {
    fastify.log.error(error);
    reply.status(500).send({ error: 'Failed to scan directory' });
  }
});

// API endpoint to get metadata (duration)
fastify.get('/api/metadata', async (request, reply) => {
  const filePath = request.query.path;
  if (!filePath || !fs.existsSync(filePath)) {
    return reply.status(404).send({ error: 'File not found' });
  }

  return new Promise((resolve, reject) => {
    const ffprobeArgs = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      filePath
    ];
    let durationStr = '';
    const ffprobe = spawn('ffprobe', ffprobeArgs);
    
    ffprobe.stdout.on('data', (data) => { durationStr += data.toString(); });
    ffprobe.on('close', (code) => {
      if (code === 0 && durationStr.trim()) {
        resolve({ duration: parseFloat(durationStr.trim()) });
      } else {
        resolve({ duration: 0 }); // fallback
      }
    });
    
    ffprobe.on('error', () => {
      resolve({ duration: 0 }); // fallback if ffprobe not found
    });
  });
});

// Stream endpoint
fastify.get('/stream', async (request, reply) => {
  const filePath = request.query.path;
  const seekTime = request.query.seek || '0';

  if (!filePath || !fs.existsSync(filePath)) {
    reply.status(404).send({ error: 'File not found' });
    return;
  }

  if (seekTime === '0') {
    console.log(`🎬 Now streaming: ${path.basename(filePath)}`);
  }

  reply.raw.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes'
  });

  const ffmpegArgs = [
    '-ss', seekTime,
    '-i', filePath,
    '-map', '0:v:0',
    '-map', '0:a:0',
    '-sn',
    '-c:v', 'h264_amf',
    '-quality', 'speed',
    '-b:v', '3M',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-ac', '2',
    '-b:a', '128k',
    '-movflags', 'frag_keyframe+empty_moov+faststart',
    '-f', 'mp4',
    'pipe:1'
  ];

  const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

  try {
    os.setPriority(ffmpegProcess.pid, os.constants.priority.PRIORITY_BELOW_NORMAL);
  } catch (err) {
    fastify.log.warn('Could not set ffmpeg priority');
  }

  ffmpegProcess.stdout.pipe(reply.raw);

  ffmpegProcess.stderr.on('data', (data) => {
    // fastify.log.info(`ffmpeg stderr: ${data}`);
  });

  ffmpegProcess.on('close', (code) => {
    // ffmpeg closed
  });

  ffmpegProcess.on('error', (err) => {
    console.error(`FFmpeg process error: ${err.message}`);
    if (!reply.raw.headersSent) {
      reply.raw.writeHead(500);
    }
    reply.raw.end();
  });

  // Handle client disconnect
  request.raw.on('close', () => {
    ffmpegProcess.kill('SIGKILL');
  });

  // Fastify needs us to return reply to prevent hanging, or we can just await reply
  return reply;
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
start();
