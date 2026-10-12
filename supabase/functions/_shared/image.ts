import { imageSize } from 'npm:image-size@2.0.2';
export function validateImage(bytes: Uint8Array, mime: string) {
 const info = imageSize(bytes);
 const expected: Record<string,string> = {'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
 if (!expected[mime] || info.type !== expected[mime]) throw new Error('The file contents do not match its image type');
 if (!info.width || !info.height || info.width > 8000 || info.height > 8000) throw new Error('Images may be at most 8,000 pixels per side');
 return info;
}
export async function boundedBody(req: Request, limit = 11 * 1024 * 1024): Promise<ArrayBuffer> {
 if (!req.body) throw new Error('Upload body required');
 const reader = req.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
 try { while (true) { const {done,value} = await reader.read(); if(done) break; size += value.length; if(size > limit) throw new Error('Upload too large'); chunks.push(value); } }
 finally { await reader.cancel(); }
 const result = new Uint8Array(size); let offset = 0;
 for(const chunk of chunks) { result.set(chunk,offset); offset += chunk.length; }
 return result.buffer;
}
