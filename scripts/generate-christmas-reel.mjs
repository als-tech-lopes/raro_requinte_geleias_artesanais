import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const assetDir = path.join(rootDir, "docs", "reels", "assets");
const outputDir = path.join(rootDir, "outputs", "reels", "presentes-natalinos");
const workDir = path.join(outputDir, ".work");
const ffmpegPath = path.join(rootDir, ".reel-tools", "node_modules", "ffmpeg-static", "ffmpeg.exe");
const ffprobePath = path.join(rootDir, ".reel-tools", "node_modules", "ffprobe-static", "bin", "win32", "x64", "ffprobe.exe");

const WIDTH = 1080;
const HEIGHT = 1920;
const FPS = 30;
const TRANSITION = 0.25;
const VIDEO_DURATION = 18;
const colors = {
  wine: "#71162f",
  wineBright: "#9c2348",
  green: "#315c3e",
  cream: "#fff6e7",
  gold: "#e8b864",
  ink: "#271b17",
};

const scenes = [
  { duration: 2.6, transition: "fade" },
  { duration: 2.5, transition: "smoothleft" },
  { duration: 2.4, transition: "fade" },
  { duration: 1.8, transition: "slideleft" },
  { duration: 1.8, transition: "slideleft" },
  { duration: 1.8, transition: "slideleft" },
  { duration: 1.8, transition: "slideleft" },
  { duration: 2.8, transition: "fade" },
  { duration: 2.5, transition: "fade" },
];

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function svgDocument(body, extraDefs = "") {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
      <defs>
        <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#120408" flood-opacity="0.55"/>
        </filter>
        <linearGradient id="topShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#240810" stop-opacity="0.92"/>
          <stop offset="0.55" stop-color="#39101b" stop-opacity="0.52"/>
          <stop offset="1" stop-color="#39101b" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="bottomShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#25070f" stop-opacity="0"/>
          <stop offset="0.42" stop-color="#25070f" stop-opacity="0.52"/>
          <stop offset="1" stop-color="#25070f" stop-opacity="0.96"/>
        </linearGradient>
        <linearGradient id="winePanel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#9c2348"/>
          <stop offset="1" stop-color="#64132b"/>
        </linearGradient>
        ${extraDefs}
      </defs>
      ${body}
    </svg>
  `);
}

function textLines(lines, {
  x = 80,
  y = 200,
  size = 72,
  lineHeight = 1.08,
  family = "Georgia",
  weight = 700,
  fill = colors.cream,
  anchor = "start",
  shadow = true,
  letterSpacing = 0,
} = {}) {
  const tspans = lines.map((line, index) =>
    `<tspan x="${x}" dy="${index === 0 ? 0 : Math.round(size * lineHeight)}">${escapeXml(line)}</tspan>`,
  ).join("");
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${fill}" font-family="${family}" font-size="${size}" font-weight="${weight}" letter-spacing="${letterSpacing}" ${shadow ? 'filter="url(#shadow)"' : ""}>${tspans}</text>`;
}

function pill(text, { x = 80, y = 130, width = 500, fill = colors.wineBright, textFill = colors.cream } = {}) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="62" rx="31" fill="${fill}" filter="url(#shadow)"/>
    <text x="${x + 28}" y="${y + 41}" fill="${textFill}" font-family="Segoe UI" font-size="25" font-weight="800" letter-spacing="2.2">${escapeXml(text)}</text>
  `;
}

function brandMark({ x = 86, y = 86, light = true, scale = 1 } = {}) {
  const stroke = light ? colors.cream : colors.wine;
  const textFill = light ? colors.cream : colors.wine;
  return `
    <g transform="translate(${x} ${y}) scale(${scale})">
      <circle cx="34" cy="34" r="32" fill="none" stroke="${stroke}" stroke-width="3"/>
      <text x="34" y="44" text-anchor="middle" fill="${textFill}" font-family="Georgia" font-size="30" font-weight="700">RR</text>
      <text x="82" y="27" fill="${textFill}" font-family="Georgia" font-size="25" font-weight="700">RARO REQUINTE</text>
      <text x="82" y="53" fill="${textFill}" font-family="Segoe UI" font-size="15" font-weight="700" letter-spacing="2">PRODUTOS ARTESANAIS</text>
    </g>
  `;
}

async function containedPhoto(filename, { brightness = 0.92, saturation = 1.03, blurBrightness = 0.58 } = {}) {
  const input = path.join(assetDir, filename);
  const background = await sharp(input)
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "centre" })
    .blur(32)
    .modulate({ brightness: blurBrightness, saturation: 0.85 })
    .png()
    .toBuffer();
  const foreground = await sharp(input)
    .resize(WIDTH, HEIGHT, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .modulate({ brightness, saturation })
    .png()
    .toBuffer();
  return sharp(background).composite([{ input: foreground }]).png().toBuffer();
}

async function writeScene(index, base, overlay) {
  const scenePath = path.join(workDir, `scene-${String(index).padStart(2, "0")}.png`);
  await sharp(base).composite([{ input: svgDocument(overlay) }]).png().toFile(scenePath);
  return scenePath;
}

async function createScenes() {
  const kit1 = await containedPhoto("kit1.png");
  const kit2 = await containedPhoto("kit2.png");
  const kit3 = await containedPhoto("kit3.png");
  const kit4 = await containedPhoto("kit4.png", { brightness: 0.97, saturation: 1.08, blurBrightness: 0.62 });
  const founders = await containedPhoto("institutional.jpeg", { brightness: 0.97, saturation: 1.02, blurBrightness: 0.48 });
  const paths = [];

  paths.push(await writeScene(0, kit4, `
    <rect width="1080" height="850" fill="url(#topShade)"/>
    <rect y="1450" width="1080" height="470" fill="url(#bottomShade)"/>
    ${pill("NATAL ESTÁ CHEGANDO", { x: 76, y: 156, width: 410 })}
    ${textLines(["Ainda sem ideia", "de presente?"], { x: 76, y: 330, size: 88, lineHeight: 1.02 })}
    <text x="76" y="1580" fill="${colors.cream}" font-family="Segoe UI" font-size="32" font-weight="600">Pare de procurar. A gente facilita para você.</text>
    ${brandMark({ x: 76, y: 1630, scale: 0.8 })}
  `));

  paths.push(await writeScene(1, kit1, `
    <rect width="1080" height="1920" fill="#2a0712" opacity="0.42"/>
    <rect width="1080" height="1050" fill="url(#topShade)"/>
    ${brandMark({ x: 76, y: 105, scale: 0.82 })}
    <text x="76" y="330" fill="${colors.gold}" font-family="Segoe UI" font-size="26" font-weight="800" letter-spacing="3">A CORRERIA É REAL</text>
    ${textLines(["Sem tempo para", "montar algo", "realmente especial?"], { x: 76, y: 455, size: 78, lineHeight: 1.05 })}
    <rect x="76" y="805" width="650" height="8" rx="4" fill="${colors.gold}"/>
    <text x="76" y="875" fill="${colors.cream}" font-family="Segoe UI" font-size="32" font-weight="600">Cada detalhe já vem pronto para encantar.</text>
  `));

  paths.push(await writeScene(2, kit3, `
    <rect y="780" width="1080" height="1140" fill="url(#bottomShade)"/>
    ${brandMark({ x: 76, y: 105, scale: 0.82 })}
    ${textLines(["Presenteie com", "sabor, carinho", "e memória."], { x: 76, y: 1260, size: 79, lineHeight: 1.02 })}
    <rect x="76" y="1510" width="720" height="64" rx="32" fill="${colors.cream}"/>
    <text x="108" y="1553" fill="${colors.wine}" font-family="Segoe UI" font-size="27" font-weight="800">KITS ARTESANAIS PRONTOS PARA ENCANTAR</text>
  `));

  const productOverlay = ({ title, detail, price }) => `
    <rect y="0" width="1080" height="410" fill="url(#topShade)"/>
    <rect y="1120" width="1080" height="800" fill="url(#bottomShade)"/>
    ${brandMark({ x: 70, y: 95, scale: 0.76 })}
    <text x="70" y="310" fill="${colors.gold}" font-family="Segoe UI" font-size="25" font-weight="800" letter-spacing="3">PRESENTE DE NATAL</text>
    ${textLines([title], { x: 70, y: 1310, size: title.length > 18 ? 62 : 70, family: "Georgia" })}
    <text x="70" y="1395" fill="${colors.cream}" font-family="Segoe UI" font-size="31" font-weight="600">${escapeXml(detail)}</text>
    <rect x="70" y="1455" width="430" height="108" rx="54" fill="${colors.cream}" filter="url(#shadow)"/>
    <text x="285" y="1528" text-anchor="middle" fill="${colors.wine}" font-family="Segoe UI" font-size="45" font-weight="900">${escapeXml(price)}</text>
  `;

  paths.push(await writeScene(3, kit1, productOverlay({
    title: "Bolsa Natalina • Kit 1",
    detail: "1 geleia + torradinhas",
    price: "R$ 45,90",
  })));
  paths.push(await writeScene(4, kit2, productOverlay({
    title: "Bolsa Natalina • Kit 2",
    detail: "2 geleias + torradinhas",
    price: "R$ 72,00",
  })));
  paths.push(await writeScene(5, kit3, productOverlay({
    title: "Bolsa Natalina • Kit 3",
    detail: "2 geleias artesanais",
    price: "R$ 64,90",
  })));
  paths.push(await writeScene(6, kit4, productOverlay({
    title: "Globo Natalino",
    detail: "1 geleia + torradinhas",
    price: "R$ 39,90",
  })));

  const collageCanvas = sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 4, background: colors.wine },
  });
  const tileSpecs = [
    ["kit1.png", 0, 0],
    ["kit2.png", 544, 0],
    ["kit3.png", 0, 964],
    ["kit4.png", 544, 964],
  ];
  const tiles = await Promise.all(tileSpecs.map(async ([filename, left, top]) => ({
    input: await sharp(path.join(assetDir, filename)).resize(536, 956, { fit: "cover", position: "centre" }).toBuffer(),
    left,
    top,
  })));
  const collage = await collageCanvas.composite(tiles).png().toBuffer();
  paths.push(await writeScene(7, collage, `
    <rect width="1080" height="1920" fill="#2a0712" opacity="0.56"/>
    <rect x="60" y="450" width="960" height="890" rx="54" fill="url(#winePanel)" opacity="0.94" filter="url(#shadow)"/>
    ${brandMark({ x: 90, y: 505, scale: 0.86 })}
    <text x="540" y="760" text-anchor="middle" fill="${colors.cream}" font-family="Georgia" font-size="66" font-weight="700">Opções a partir de</text>
    <text x="540" y="925" text-anchor="middle" fill="${colors.gold}" font-family="Segoe UI" font-size="118" font-weight="900">R$ 39,90</text>
    <rect x="205" y="990" width="670" height="4" fill="${colors.gold}" opacity="0.7"/>
    <text x="540" y="1085" text-anchor="middle" fill="${colors.cream}" font-family="Segoe UI" font-size="34" font-weight="650">Bonito. Afetivo. Delicioso.</text>
    <text x="540" y="1160" text-anchor="middle" fill="${colors.cream}" opacity="0.88" font-family="Segoe UI" font-size="28">Escolha o kit que combina com quem você ama.</text>
  `));

  paths.push(await writeScene(8, founders, `
    <rect width="1080" height="540" fill="url(#topShade)"/>
    <rect y="890" width="1080" height="1030" fill="url(#bottomShade)"/>
    ${brandMark({ x: 76, y: 105, scale: 0.88 })}
    ${textLines(["Feito por pessoas.", "Para pessoas especiais."], { x: 76, y: 1125, size: 66, lineHeight: 1.08 })}
    <rect x="76" y="1305" width="928" height="112" rx="56" fill="${colors.cream}" filter="url(#shadow)"/>
    <text x="540" y="1377" text-anchor="middle" fill="${colors.wine}" font-family="Segoe UI" font-size="34" font-weight="900">ENCOMENDE PELO WHATSAPP</text>
    <text x="76" y="1510" fill="${colors.cream}" font-family="Segoe UI" font-size="42" font-weight="800">21 99507-4583</text>
    <text x="76" y="1572" fill="${colors.gold}" font-family="Segoe UI" font-size="34" font-weight="750">@rr_geleiaartesanal</text>
  `));

  return paths;
}

function synthesizeSoundtrack(filename) {
  const sampleRate = 48_000;
  const channels = 2;
  const frames = Math.ceil(VIDEO_DURATION * sampleRate);
  const dataSize = frames * channels * 2;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataSize, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(channels, 22);
  wav.writeUInt32LE(sampleRate, 24);
  wav.writeUInt32LE(sampleRate * channels * 2, 28);
  wav.writeUInt16LE(channels * 2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataSize, 40);

  const beat = 0.6;
  const bar = beat * 4;
  const chords = [
    [261.63, 329.63, 392.0],
    [196.0, 246.94, 392.0],
    [220.0, 261.63, 329.63],
    [174.61, 220.0, 261.63],
  ];
  const melody = [659.25, 783.99, 880.0, 783.99, 659.25, 587.33, 523.25, 587.33];
  const reveals = [6.75, 8.3, 9.85, 11.4, 12.95, 15.5];
  let seed = 0x13579bdf;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };
  const clamp = (value) => Math.max(-1, Math.min(1, value));

  for (let i = 0; i < frames; i += 1) {
    const t = i / sampleRate;
    const sectionGain = t < 4.6 ? 0.72 : 1;
    const chord = chords[Math.floor(t / bar) % chords.length];
    const barTime = t % bar;
    const padEnvelope = Math.min(1, barTime / 0.18) * Math.min(1, (bar - barTime) / 0.35);
    let pad = 0;
    for (const frequency of chord) {
      pad += Math.sin(Math.PI * 2 * (frequency / 2) * t) * 0.018;
      pad += Math.sin(Math.PI * 2 * frequency * t) * 0.007;
    }
    pad *= padEnvelope;

    const beatIndex = Math.floor(t / beat);
    const beatTime = t - beatIndex * beat;
    const bellFrequency = melody[beatIndex % melody.length];
    const bellEnvelope = Math.exp(-5.2 * beatTime);
    const bell = bellEnvelope * (
      Math.sin(Math.PI * 2 * bellFrequency * beatTime) * 0.045
      + Math.sin(Math.PI * 2 * bellFrequency * 2.01 * beatTime) * 0.018
      + Math.sin(Math.PI * 2 * bellFrequency * 3.98 * beatTime) * 0.008
    );

    const kickEnvelope = Math.exp(-15 * beatTime);
    const kick = Math.sin(Math.PI * 2 * (70 - 28 * Math.min(beatTime, 0.18)) * beatTime) * kickEnvelope * 0.085;
    const halfBeatTime = t % (beat / 2);
    const shimmer = random() * Math.exp(-42 * halfBeatTime) * 0.018;
    const reveal = reveals.reduce((sum, moment) => {
      const delta = t - moment;
      if (delta < 0 || delta > 0.75) return sum;
      const envelope = Math.exp(-5.8 * delta);
      return sum + envelope * (
        Math.sin(Math.PI * 2 * 1046.5 * delta) * 0.055
        + Math.sin(Math.PI * 2 * 1567.98 * delta) * 0.025
      );
    }, 0);
    const whooshDelta = t - 4.35;
    const whoosh = whooshDelta >= 0 && whooshDelta <= 0.8
      ? random() * Math.sin(Math.PI * whooshDelta / 0.8) * 0.025
      : 0;
    const introFade = Math.min(1, t / 0.35);
    const outroFade = Math.min(1, (VIDEO_DURATION - t) / 0.65);
    const master = Math.max(0, Math.min(introFade, outroFade));
    const mono = Math.tanh((pad + sectionGain * (bell + kick + shimmer + reveal) + whoosh) * 2.4) * master;
    const pan = Math.sin(Math.PI * 2 * 0.07 * t) * 0.08;
    const left = clamp(mono * (1 - pan));
    const right = clamp(mono * (1 + pan));
    wav.writeInt16LE(Math.round(left * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(right * 32767), 46 + i * 4);
  }
  return fs.writeFile(filename, wav);
}

function run(command, args, { capture = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      windowsHide: true,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${path.basename(command)} terminou com código ${code}.\n${stderr}`));
    });
  });
}

async function renderVideo(scenePaths, audioPath, videoPath) {
  const args = ["-y", "-hide_banner"];
  scenes.forEach((scene, index) => {
    args.push("-loop", "1", "-framerate", String(FPS), "-t", String(scene.duration), "-i", scenePaths[index]);
  });
  args.push("-i", audioPath);

  const filters = scenes.map((scene, index) => {
    const zoom = index % 2 === 0 ? "min(max(zoom,pzoom)+0.00035,1.035)" : "min(max(zoom,pzoom)+0.00025,1.025)";
    return `[${index}:v]scale=1134:2016,zoompan=z='${zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${WIDTH}x${HEIGHT}:fps=${FPS},trim=duration=${scene.duration},setpts=PTS-STARTPTS,format=yuv420p[v${index}]`;
  });

  let elapsed = scenes[0].duration;
  let previous = "v0";
  for (let index = 1; index < scenes.length; index += 1) {
    const offset = elapsed - index * TRANSITION;
    const output = index === scenes.length - 1 ? "vout" : `x${index}`;
    filters.push(`[${previous}][v${index}]xfade=transition=${scenes[index - 1].transition}:duration=${TRANSITION}:offset=${offset.toFixed(3)}[${output}]`);
    previous = output;
    elapsed += scenes[index].duration;
  }

  args.push(
    "-filter_complex", filters.join(";"),
    "-map", "[vout]",
    "-map", `${scenes.length}:a:0`,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "18",
    "-profile:v", "high",
    "-level", "4.2",
    "-pix_fmt", "yuv420p",
    "-r", String(FPS),
    "-c:a", "aac",
    "-b:a", "192k",
    "-ar", "48000",
    "-af", "loudnorm=I=-16:TP=-1.5:LRA=7",
    "-t", String(VIDEO_DURATION),
    "-movflags", "+faststart",
    "-metadata", "title=Presentes de Natal - Raro Requinte",
    "-metadata", "artist=Raro Requinte - Produtos Artesanais",
    "-metadata", "comment=Trilha original gerada para esta peça",
    videoPath,
  );
  await run(ffmpegPath, args);
}

async function createContactSheet(scenePaths) {
  const thumbWidth = 270;
  const thumbHeight = 480;
  const gap = 12;
  const sheetWidth = thumbWidth * 3 + gap * 4;
  const sheetHeight = thumbHeight * 3 + gap * 4;
  const composites = await Promise.all(scenePaths.map(async (scenePath, index) => ({
    input: await sharp(scenePath).resize(thumbWidth, thumbHeight, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer(),
    left: gap + (index % 3) * (thumbWidth + gap),
    top: gap + Math.floor(index / 3) * (thumbHeight + gap),
  })));
  await sharp({ create: { width: sheetWidth, height: sheetHeight, channels: 3, background: "#1b1715" } })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toFile(path.join(outputDir, "previa-storyboard.jpg"));
}

async function writeCompanionFiles(scenePaths) {
  await sharp(scenePaths[0]).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toFile(path.join(outputDir, "capa-reel.jpg"));
  await createContactSheet(scenePaths);
  const caption = `Ainda sem ideia de presente para o Natal? 🎁\n\nA Raro Requinte preparou kits artesanais cheios de sabor e carinho — prontos para transformar um gesto em memória.\n\n✨ Opções a partir de R$ 39,90\n📲 Encomendas: 21 99507-4583\n📸 @rr_geleiaartesanal\n\nEscolha o seu e presenteie alguém especial.\n\n#RaroRequinte #GeleiasArtesanais #PresentesDeNatal #KitNatalino #NatalArtesanal #PresenteComAfeto #EmpreendedorismoLocal`;
  await fs.writeFile(path.join(outputDir, "legenda-instagram.txt"), caption, "utf8");
}

async function verify(videoPath) {
  const result = await run(ffprobePath, [
    "-v", "error",
    "-show_entries", "format=duration,size,bit_rate:stream=index,codec_name,codec_type,width,height,pix_fmt,r_frame_rate,sample_rate,channels",
    "-of", "json",
    videoPath,
  ], { capture: true });
  const metadata = JSON.parse(result.stdout);
  const video = metadata.streams.find((stream) => stream.codec_type === "video");
  const audio = metadata.streams.find((stream) => stream.codec_type === "audio");
  if (!video || video.codec_name !== "h264" || video.width !== WIDTH || video.height !== HEIGHT || video.pix_fmt !== "yuv420p") {
    throw new Error(`Vídeo fora da especificação: ${JSON.stringify(video)}`);
  }
  if (!audio || audio.codec_name !== "aac" || Number(audio.sample_rate) !== 48_000) {
    throw new Error(`Áudio fora da especificação: ${JSON.stringify(audio)}`);
  }
  const duration = Number(metadata.format.duration);
  if (Math.abs(duration - VIDEO_DURATION) > 0.15) throw new Error(`Duração inesperada: ${duration}s`);
  await fs.writeFile(path.join(outputDir, "validacao.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return metadata;
}

async function main() {
  await Promise.all([ffmpegPath, ffprobePath].map(async (binary) => {
    try { await fs.access(binary); } catch { throw new Error(`Binário ausente: ${binary}`); }
  }));
  await fs.mkdir(outputDir, { recursive: true });
  await fs.rm(workDir, { recursive: true, force: true });
  await fs.mkdir(workDir, { recursive: true });

  console.log("Criando as nove cenas verticais...");
  const scenePaths = await createScenes();
  console.log("Criando trilha original...");
  const audioPath = path.join(workDir, "trilha-original.wav");
  await synthesizeSoundtrack(audioPath);
  console.log("Renderizando Reel 1080x1920...");
  const videoPath = path.join(outputDir, "rr-reel-presentes-natalinos.mp4");
  await renderVideo(scenePaths, audioPath, videoPath);
  await writeCompanionFiles(scenePaths);
  console.log("Validando codecs e dimensões...");
  const metadata = await verify(videoPath);
  await fs.rm(workDir, { recursive: true, force: true });
  console.log(`Reel concluído: ${videoPath}`);
  console.log(`Duração: ${metadata.format.duration}s | Tamanho: ${metadata.format.size} bytes`);
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});
