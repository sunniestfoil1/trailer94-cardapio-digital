// Síntese de áudio pura via Web Audio API (não depende de arquivos externos ou assets MP3)
let audioCtx = null;

function obterAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Toca sino harmônico agradável para novos pedidos no KDS (C5 -> E5 -> G5)
 */
export function tocarSinoPedido() {
  try {
    const ctx = obterAudioContext();
    if (!ctx) return;

    const notas = [523.25, 659.25, 783.99, 1046.50]; // Acorde Dó Maior (C5, E5, G5, C6)
    const agora = ctx.currentTime;

    notas.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, agora + idx * 0.09);

      gain.gain.setValueAtTime(0, agora + idx * 0.09);
      gain.gain.linearRampToValueAtTime(0.25, agora + idx * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, agora + idx * 0.09 + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(agora + idx * 0.09);
      osc.stop(agora + idx * 0.09 + 0.85);
    });
  } catch (err) {
    console.warn('Web Audio não inicializado ou bloqueado pelo navegador:', err);
  }
}

/**
 * Toca bip duplo de radar para motoboys quando uma entrega estiver pronta
 */
export function tocarAlertaEntrega() {
  try {
    const ctx = obterAudioContext();
    if (!ctx) return;

    const agora = ctx.currentTime;
    const toques = [0, 0.18];

    toques.forEach((tempo) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, agora + tempo); // A5
      osc.frequency.exponentialRampToValueAtTime(1174.66, agora + tempo + 0.12); // D6

      gain.gain.setValueAtTime(0.2, agora + tempo);
      gain.gain.exponentialRampToValueAtTime(0.001, agora + tempo + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(agora + tempo);
      osc.stop(agora + tempo + 0.16);
    });
  } catch (err) {
    console.warn('Web Audio não inicializado ou bloqueado pelo navegador:', err);
  }
}
