# Reel — presentes natalinos

Peça vertical de 18 segundos criada para Instagram Reels com foco na dor de quem quer oferecer um presente especial, mas está sem ideia e sem tempo.

## Entregáveis

- Vídeo: `outputs/reels/presentes-natalinos/rr-reel-presentes-natalinos.mp4`
- Capa: `outputs/reels/presentes-natalinos/capa-reel.jpg`
- Legenda: `outputs/reels/presentes-natalinos/legenda-instagram.txt`
- Prévia das cenas: `outputs/reels/presentes-natalinos/previa-storyboard.jpg`
- Validação técnica: `outputs/reels/presentes-natalinos/validacao.json`

## Formato

- 1080 × 1920 (9:16)
- 30 fps
- H.264 + AAC, compatível com Instagram
- Trilha instrumental original, sintetizada pelo próprio gerador
- Área segura reservada para a interface do Reels

## Regenerar

Instale os binários temporários de renderização e execute o gerador:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' install --prefix '.reel-tools' --cache '.reel-cache' --no-save --package-lock=false ffmpeg-static ffprobe-static
node scripts/generate-christmas-reel.mjs
```

As pastas `.reel-tools` e `.reel-cache` são ignoradas pelo Git e podem ser removidas depois da renderização.

As fotos em `assets/` vieram do catálogo público da Raro Requinte e correspondem aos quatro kits natalinos e à imagem institucional disponíveis em 12 de novembro de 2026.
