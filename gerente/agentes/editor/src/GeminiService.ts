import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const IMAGE_MODEL = 'gemini-3-pro-image-preview';

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY não encontrado. Verifique o arquivo .env na pasta gerente/');
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateCatalogImage(
    imageBuffer: Buffer,
    mimeType: string = 'image/jpeg'
  ): Promise<Buffer> {
    return retryRequest(() =>
      this.ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [{
          role: 'user',
          parts: [
            { text: buildCatalogPrompt() },
            { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
          ],
        }],
        config: { responseModalities: ['IMAGE'] },
      })
    );
  }

  async changeColor(
    imageBuffer: Buffer,
    hexColor: string,
    mimeType: string = 'image/png'
  ): Promise<Buffer> {
    return retryRequest(() =>
      this.ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [{
          role: 'user',
          parts: [
            { text: buildColorChangePrompt(hexColor) },
            { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
          ],
        }],
        config: { responseModalities: ['IMAGE'] },
      })
    );
  }
}

async function retryRequest(fn: () => Promise<any>, maxAttempts = 3): Promise<Buffer> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fn();
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const imageData = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

    if (imageData) return Buffer.from(imageData.inlineData.data, 'base64');

    const finishReason = candidate?.finishReason ?? 'UNKNOWN';
    if (finishReason === 'MALFORMED_FUNCTION_CALL' && attempt < maxAttempts) {
      console.log(`  Tentativa ${attempt} falhou (${finishReason}), tentando novamente...`);
      await new Promise(r => setTimeout(r, 2000 * attempt));
      continue;
    }

    return extractImageFromResponse(response);
  }
  throw new Error('Todas as tentativas falharam.');
}

function extractImageFromResponse(response: any): Buffer {
  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];

  for (const part of parts) {
    if (part.inlineData?.mimeType?.startsWith('image/')) {
      return Buffer.from(part.inlineData.data, 'base64');
    }
  }

  const finishReason = candidate?.finishReason ?? 'UNKNOWN';
  const safetyRatings = candidate?.safetyRatings ?? [];
  const text = parts.filter((p: any) => p.text).map((p: any) => p.text).join(' ');
  const blocked = safetyRatings.filter((r: any) => r.blocked).map((r: any) => r.category);

  const motivo = finishReason === 'MALFORMED_FUNCTION_CALL'
    ? 'A imagem nao e compativel com o modelo.\n' +
      'Use apenas fotos tiradas com celular ou camera diretamente do produto.\n' +
      'Imagens criadas em Canva, Photoshop ou outros editores nao sao suportadas.'
    : `Motivo: ${finishReason}${blocked.length > 0 ? ` | Bloqueado: ${blocked.join(', ')}` : ''}`;

  throw new Error(`Gemini nao gerou a imagem.\n${motivo}`);
}

function buildCatalogPrompt(): string {
  return `You are a specialist in professional product photography for Brazilian e-commerce platforms (Mercado Livre, Shopee, Amazon Brasil, Magalu). You work as the official photo editor for a product seller and your job is to transform raw product photos into perfect hero images ready for product listings.

=== CONTEXT AND PURPOSE ===
This image will be used as the MAIN COVER PHOTO of a product listing on e-commerce marketplaces. It is the first image a customer sees and directly impacts the click-through rate and sales conversion. It must meet all marketplace technical requirements and look indistinguishable from a professional studio photo.

The reference photo provided is the official product photo. It is the ONLY source of truth for what this product looks like. Every physical characteristic visible in that photo must be preserved exactly.

=== TECHNICAL REQUIREMENTS ===
- FORMAT: Square image (1:1 ratio), 1200x1200 pixels
- BACKGROUND: Pure white (#FFFFFF), RGB 255 255 255. No off-white, no grey, no gradients, no patterns
- WATERMARKS: Absolutely none. No logos, stamps, text overlays, or any markings of any kind
- SHADOWS: Only a very soft, natural shadow directly beneath the product to ground it. No cast shadows on the background

=== PRODUCT FIDELITY - HIGHEST PRIORITY ===
The product shown in the reference photo must be reproduced with 100% fidelity. This is non-negotiable:

TEXTURE: Reproduce every micro-detail of the material surface including weave patterns, fiber structure, knit loops, surface grain, and thread crossings. The texture must be as detailed and sharp as in the original photo. Do NOT smooth, blur, soften, or stylize the surface in any way.

COLOR: Maintain the exact color of the product as seen in the reference photo. Same hue, same saturation, same tone. Do not brighten, saturate, or alter the color in any way.

SHAPE AND VOLUME: Keep the exact three-dimensional shape, proportions, and form of the product. Do not flatten, reshape, or idealize the silhouette.

MATERIAL IDENTITY: The material must remain true to what it is. If it is woven elastic fabric, it must look like woven elastic fabric. If it is rubber, it must look like rubber. If it is plastic, it must look like plastic. Do not transform the material into something it is not.

=== RETOUCHING INSTRUCTIONS ===
1. BACKGROUND REMOVAL: Replace the entire background with pure white (#FFFFFF). The cutout around the product must be clean and precise with no halo, no fringe, and no semi-transparent edges.
2. PLASTIC FILM: If the product is wrapped in transparent plastic film or packaging, remove it completely to reveal the clean product surface.
3. LABELS AND STICKERS: Remove all labels, stickers, and price tags from the product surface. Show the clean material underneath.
4. LIGHTING: Apply soft, even, diffused studio lighting coming from the upper-front. The lighting must be bright enough to show the product clearly but not so harsh that it creates blown highlights or deep shadows on the product itself. It must enhance the visibility of the texture, not flatten it.
5. CENTERING: Position the product perfectly centered in the frame, occupying 75 to 85 percent of the image area. Correct any tilt or angle so the product is upright and straight.
6. CLEANUP: Remove dirt, dust particles, smudges, and fingerprints. Do not remove or alter the natural texture of the material.
7. SHARPNESS: The product must be in sharp focus throughout. Enhance sharpness and clarity if needed, especially on the textured surfaces.

=== ABSOLUTE PROHIBITIONS ===
- Do NOT add any watermark, logo, brand name, text, or overlay of any kind
- Do NOT change the color or tone of the product
- Do NOT smooth, blur, or plastify the texture of the material
- Do NOT alter the shape, size, or proportions of the product
- Do NOT add decorative elements, props, or context that were not in the original photo
- Do NOT use a grey, off-white, or tinted background. It must be pure white (#FFFFFF)
- Do NOT crop or cut off any part of the product

=== FINAL OUTPUT ===
A single, clean, professional product listing photo:
- Square composition on pure white background
- Product centered, sharp, and fully visible
- No watermarks, no text, no logos, no decorations
- Material texture preserved exactly as in the original reference photo
- Lighting that is professional, even, and flattering without distorting the product
- Indistinguishable from a photo taken in a high-end product photography studio

Return ONLY the final image. No explanations, no text, no comments.`;
}

function buildColorChangePrompt(hexColor: string): string {
  return `You are an expert product colorization specialist for e-commerce. Your task is to change the color of the product in this image to a new color, while making it look completely photorealistic.

=== TARGET COLOR ===
New color (hex): ${hexColor}

=== THIS IS NOT A FILTER — IT IS A RE-RENDER ===
You must re-render the product as if it was manufactured in the target color from the beginning. This means:
- The new color must interact naturally with the material's texture — highlights will be lighter, shadows will be darker, weave grooves will show depth
- The color must penetrate the texture, not sit on top of it like paint
- Threads, fibers, or woven patterns must each individually reflect the new color with natural variation
- Sheen, matte finish, or surface reflectivity must match the original material — just in the new color

=== WHAT TO CHANGE ===
- The color of the product's main material — change it completely to ${hexColor}
- Re-render all highlights, mid-tones, and shadows based on the new hue
- Ensure the color looks natural and saturated, not washed out or artificially tinted

=== WHAT TO KEEP EXACTLY ===
- TEXTURE: Every detail of the weave, fiber pattern, surface structure — unchanged
- SHAPE: The product's exact form, proportions, and dimensions — unchanged
- BACKGROUND: Pure white (#FFFFFF) — unchanged
- LIGHTING: Same studio lighting direction and softness — unchanged
- SHADOW: The soft ground shadow beneath the product — unchanged
- POSITION: Same centering and alignment — unchanged

=== DO NOT ===
- Do not overlay a color filter — this must look like the product was made in this color
- Do not smooth or blur the texture when applying the new color
- Do not change the background
- Do not add any text, labels, or watermarks
- Do not change the shape or size of the product

=== OUTPUT ===
A single photorealistic product image where the product appears naturally manufactured in color ${hexColor}, with all original texture and material detail fully preserved. The result must be indistinguishable from a real studio photo of the product in this color.

Return ONLY the final image. No explanations, no text.`;
}
