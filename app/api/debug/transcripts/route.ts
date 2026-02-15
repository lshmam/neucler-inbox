
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const filename = searchParams.get('filename');
        const transcriptsDir = path.join(process.cwd(), 'transcripts');

        // Ensure directory exists
        if (!fs.existsSync(transcriptsDir)) {
            fs.mkdirSync(transcriptsDir, { recursive: true });
            // specific creation of sample if empty happens usually manually, but we handle empty case
        }

        if (filename) {
            // Read specific file
            const filePath = path.join(transcriptsDir, filename);
            if (!fs.existsSync(filePath)) {
                return NextResponse.json({ error: 'File not found' }, { status: 404 });
            }
            const content = fs.readFileSync(filePath, 'utf-8');
            return NextResponse.json({ content });
        } else {
            // List files
            const files = fs.readdirSync(transcriptsDir).filter(file => file.endsWith('.txt'));
            return NextResponse.json({ files });
        }
    } catch (error) {
        console.error('Error reading transcripts:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
